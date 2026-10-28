import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getSafeServerSession } from "@/lib/session";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { isLocale } from "@/lib/i18n/config";
import { CsgError, buildDrawingStl } from "@/lib/drawing-csg";
import { drawingAiAvailable, readDrawing } from "@/lib/drawing-ai";
import {
  DRAWING_MAX_BYTES,
  DRAWING_MODEL_PREFIX,
  DRAWING_NOTE_MAX_CHARS,
  type DrawingMediaType,
  type DrawingModelResult,
} from "@/lib/drawing-model";

export const runtime = "nodejs";
// Čítanie výkresu s vyšším úsilím trvá zvyčajne 1–3 minúty.
export const maxDuration = 300;

const PER_IP_HOUR = 5;
const PER_IP_DAY = 15;
const DAILY_LIMIT = Number(process.env.DRAWING_AI_DAILY_LIMIT) || 100;

let tableReady: Promise<void> | null = null;

/** Tabuľka je v migrácii 20261028000000_add_drawing_generation; založí sa aj sama. */
function ensureTable() {
  tableReady ??= (async () => {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "DrawingGeneration" (
      "id" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "ipHash" TEXT NOT NULL,
      "userId" TEXT,
      "fileName" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "detail" TEXT,
      "inputTokens" INTEGER,
      "outputTokens" INTEGER,
      CONSTRAINT "DrawingGeneration_pkey" PRIMARY KEY ("id")
    )`);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "DrawingGeneration_ipHash_createdAt_idx" ON "DrawingGeneration"("ipHash", "createdAt")`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "DrawingGeneration_createdAt_idx" ON "DrawingGeneration"("createdAt")`
    );
  })().catch((e) => {
    tableReady = null;
    throw e;
  });
  return tableReady;
}

/** Typ súboru podľa obsahu, nie podľa mena. */
function sniffType(b: Buffer): DrawingMediaType | null {
  if (b.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

function slug(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "model"
  );
}

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: NextRequest) {
  if (!drawingAiAvailable()) {
    return fail("Generovanie modelu z výkresu je dočasne nedostupné. Pošlite nám výkres cez kontaktný formulár.", 503);
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) return fail("Nahrajte výkres (PDF, PNG alebo JPG).", 400);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const captcha = await verifyRecaptcha(form.get("recaptcha"), "drawing", ip);
  if (!captcha.ok) {
    console.warn("Drawing-to-model blocked by reCAPTCHA:", captcha.reason);
    return fail("Overenie proti spamu sa nepodarilo. Obnovte stránku a skúste to znova.", 400);
  }

  if (file.size > DRAWING_MAX_BYTES) {
    return fail(`Výkres má viac ako ${DRAWING_MAX_BYTES / 1024 / 1024} MB. Zmenšite ho alebo uložte ako JPG.`, 413);
  }
  const data = Buffer.from(await file.arrayBuffer());
  const mediaType = sniffType(data);
  if (!mediaType) return fail("Výkres nahrajte ako PDF, PNG, JPG alebo WEBP.", 400);

  const note = String(form.get("note") ?? "").slice(0, DRAWING_NOTE_MAX_CHARS);
  const localeRaw = String(form.get("locale") ?? "sk");
  const locale = isLocale(localeRaw) ? localeRaw : "sk";
  const fileName = file.name.slice(0, 200) || "vykres";

  const session = await getSafeServerSession();
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const ipHash = crypto
    .createHash("sha256")
    .update(`${ip}|${process.env.NEXTAUTH_SECRET ?? ""}`)
    .digest("hex")
    .slice(0, 32);

  // Každé čítanie výkresu stojí — limit na návštevníka aj na deň.
  let logReady = true;
  try {
    await ensureTable();
    const now = Date.now();
    const [hour, day, total] = await Promise.all([
      prisma.drawingGeneration.count({ where: { ipHash, createdAt: { gte: new Date(now - 3600_000) } } }),
      prisma.drawingGeneration.count({ where: { ipHash, createdAt: { gte: new Date(now - 86400_000) } } }),
      prisma.drawingGeneration.count({ where: { createdAt: { gte: new Date(now - 86400_000) } } }),
    ]);
    if (hour >= PER_IP_HOUR || day >= PER_IP_DAY) {
      return fail("Dosiahli ste limit generovaní modelov. Skúste to znova neskôr alebo nám pošlite výkres cez kontaktný formulár.", 429);
    }
    if (total >= DAILY_LIMIT) {
      return fail("Generovanie modelov je dnes vyťažené. Skúste to zajtra alebo nám pošlite výkres cez kontaktný formulár.", 429);
    }
  } catch (e) {
    logReady = false;
    console.error("DRAWING LIMIT CHECK ERROR:", e);
  }

  const log = async (status: string, detail?: string, usage?: { inputTokens: number; outputTokens: number } | null) => {
    if (!logReady) return;
    try {
      await prisma.drawingGeneration.create({
        data: {
          ipHash,
          userId,
          fileName,
          status,
          detail: detail?.slice(0, 1000) ?? null,
          inputTokens: usage?.inputTokens ?? null,
          outputTokens: usage?.outputTokens ?? null,
        },
      });
    } catch (e) {
      console.error("DRAWING LOG ERROR:", e);
    }
  };

  let ai;
  try {
    ai = await readDrawing({ data, mediaType, note, locale });
  } catch (e) {
    console.error("DRAWING AI ERROR:", e);
    await log("error", e instanceof Error ? e.message : String(e));
    if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError || e instanceof Anthropic.APIConnectionError) {
      return fail("AI je momentálne preťažená. Skúste to o pár minút znova.", 503);
    }
    if (e instanceof Anthropic.BadRequestError) {
      return fail("Tento súbor sa nepodarilo prečítať. Skúste výkres uložiť ako PNG alebo JPG.", 422);
    }
    return fail("Model sa nepodarilo vygenerovať. Skúste to znova alebo nám pošlite výkres cez kontaktný formulár.", 502);
  }

  if (!ai.ok) {
    await log(ai.reason, ai.detail);
    if (ai.reason === "unavailable") {
      return fail("Generovanie modelu z výkresu je dočasne nedostupné. Pošlite nám výkres cez kontaktný formulár.", 503);
    }
    if (ai.reason === "refused") {
      return fail("Tento výkres nevieme spracovať automaticky. Pošlite nám ho cez kontaktný formulár.", 422);
    }
    return fail("Z výkresu sa nepodarilo poskladať model. Skúste ostrejší obrázok alebo pridajte poznámku s rozmermi.", 422);
  }

  const model = ai.model;
  if (!model.isTechnicalDrawing || !model.features.length) {
    await log("not_drawing", model.summary, ai.usage);
    return NextResponse.json(
      {
        error: "Na súbore sme nenašli technický výkres súčiastky s rozmermi.",
        detail: model.summary,
      },
      { status: 422 }
    );
  }

  let built;
  try {
    built = await buildDrawingStl(model);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("DRAWING CSG ERROR:", detail);
    await log("csg_error", detail, ai.usage);
    if (!(e instanceof CsgError)) {
      return fail("Model sa nepodarilo vygenerovať. Skúste to znova alebo nám pošlite výkres cez kontaktný formulár.", 500);
    }
    return fail("Z výkresu sa nepodarilo poskladať model. Skúste ostrejší obrázok alebo pridajte poznámku s rozmermi.", 422);
  }

  await log("ok", `${model.partName} · ${built.dims.x.toFixed(1)}×${built.dims.y.toFixed(1)}×${built.dims.z.toFixed(1)} mm`, ai.usage);

  const result: DrawingModelResult = {
    stlBase64: built.stl.toString("base64"),
    fileName: `${DRAWING_MODEL_PREFIX}${slug(model.partName)}.stl`,
    partName: model.partName,
    summary: model.summary,
    assumptions: model.assumptions,
    warnings: model.warnings,
    confidence: model.confidence,
    dims: {
      x: Math.round(built.dims.x * 10) / 10,
      y: Math.round(built.dims.y * 10) / 10,
      z: Math.round(built.dims.z * 10) / 10,
    },
  };
  return NextResponse.json(result);
}
