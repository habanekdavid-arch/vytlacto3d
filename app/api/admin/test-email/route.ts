import { NextRequest, NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/session";
import { sendMail, FROM, ADMIN_INBOX, mailConfigSummary } from "@/lib/mailer";

async function requireAdmin() {
  const session = await getSafeServerSession();
  const userEmail = String((session?.user as any)?.email ?? "").toLowerCase();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return userEmail && adminEmails.includes(userEmail) ? userEmail : null;
}

/** Ukáže aktuálnu SMTP konfiguráciu (bez hesla) — na overenie env premenných. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(mailConfigSummary());
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as { to?: string }));
  // Bez explicitnej adresy ide test do internej schránky — overí sa tým naraz
  // odosielanie aj doručenie na tú istú adresu.
  const to = String(body?.to ?? "").trim() || ADMIN_INBOX;

  const info = await sendMail({
    from: FROM,
    to,
    subject: "Test emailu – VytlačTo3D",
    html: `
      <div style="font-family:Arial,sans-serif;padding:32px;background:#f7f7f7;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:16px;
                    padding:28px;border:1px solid #eee;">
          <div style="font-size:13px;color:#777;font-weight:700;text-transform:uppercase;">
            VytlačTo3D
          </div>
          <h1 style="margin:14px 0;font-size:22px;color:#111;">
            Testovací email funguje
          </h1>
          <p style="font-size:15px;color:#444;line-height:1.6;">
            Tento email bol odoslaný z adresy: <strong>${FROM}</strong><br/>
            Ak vidíš správnu odosielaciu adresu, konfigurácia emailu je v poriadku.
          </p>
          <p style="font-size:13px;color:#999;margin-top:24px;">
            VytlačTo3D • vytlacto3d.sk
          </p>
        </div>
      </div>
    `,
  });

  // transport === "fallback" znamená, že primárny SMTP zlyhal a mail odišiel
  // cez záložný Gmail — mail síce prišiel, ale konfigurácia je zle.
  return NextResponse.json({
    ok: true,
    from: info.transport === "fallback" ? info.envelope?.from ?? FROM : FROM,
    to,
    transport: info.transport,
    config: mailConfigSummary(),
  });
}
