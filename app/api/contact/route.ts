import { NextRequest, NextResponse } from "next/server";
import { sendContactFormEmail } from "@/lib/email-contact";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim();
  const phone = body?.phone ? String(body.phone).trim() : null;
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
  if (!message || message.length < 5 || message.length > 5000) {
    return NextResponse.json({ error: "Správa musí mať 5 až 5000 znakov." }, { status: 400 });
  }

  try {
    await sendContactFormEmail({ name, email, phone, message });
  } catch (err) {
    console.error("Contact form email failed:", err);
    return NextResponse.json(
      { error: "Správu sa nepodarilo odoslať. Skúste to prosím neskôr." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
