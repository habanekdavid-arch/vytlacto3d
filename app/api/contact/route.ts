import { NextRequest, NextResponse } from "next/server";
import { sendContactFormEmail } from "@/lib/email-contact";
import {
  CONTACT_BLOB_PREFIX,
  CONTACT_MAX_FILES,
  CONTACT_MAX_FILE_MB,
  isAllowedContactFile,
  type ContactAttachment,
} from "@/lib/contact-attachments";

export const runtime = "nodejs";
// Stiahnutie príloh z Blobu a ich odoslanie e-mailom môže chvíľu trvať.
export const maxDuration = 60;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Prijme len prílohy, ktoré sa nahrali cez náš formulár do nášho Blobu —
 * inak by sa dal cez formulár poslať do schránky odkaz kamkoľvek.
 */
function parseAttachments(raw: unknown): ContactAttachment[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > CONTACT_MAX_FILES) return null;
  const out: ContactAttachment[] = [];
  for (const a of raw) {
    let url: URL;
    try {
      url = new URL(String(a?.url ?? ""));
    } catch {
      return null;
    }
    const name = String(a?.name ?? "").trim().slice(0, 200);
    const size = Number(a?.size);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".public.blob.vercel-storage.com") ||
      !url.pathname.startsWith(`/${CONTACT_BLOB_PREFIX}`) ||
      !name ||
      !isAllowedContactFile(name) ||
      !Number.isFinite(size) ||
      size < 0 ||
      size > CONTACT_MAX_FILE_MB * 1024 * 1024
    ) {
      return null;
    }
    out.push({ url: url.toString(), name, size, contentType: String(a?.contentType ?? "").slice(0, 100) });
  }
  return out;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const subject = String(body?.subject ?? "").trim();
  const message = String(body?.message ?? "").trim();
  // Hidden field — real users never fill it in, bots usually do.
  const honeypot = String(body?.website ?? "").trim();

  if (honeypot) {
    return NextResponse.json({ ok: true });
  }

  if (!name || name.length > 200) {
    return NextResponse.json({ error: "Zadajte platné meno." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Zadajte platný email." }, { status: 400 });
  }
  if (!subject || subject.length > 200) {
    return NextResponse.json({ error: "Zadajte predmet správy." }, { status: 400 });
  }
  if (!message || message.length < 5 || message.length > 5000) {
    return NextResponse.json({ error: "Správa musí mať 5 až 5000 znakov." }, { status: 400 });
  }

  const attachments = parseAttachments(body?.attachments);
  if (!attachments) {
    return NextResponse.json({ error: "Prílohy sa nepodarilo overiť. Nahrajte ich prosím znova." }, { status: 400 });
  }

  try {
    await sendContactFormEmail({ name, email, subject, message, attachments });
  } catch (err) {
    console.error("Contact form email failed:", err);
    return NextResponse.json(
      { error: "Správu sa nepodarilo odoslať. Skúste to prosím neskôr." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
