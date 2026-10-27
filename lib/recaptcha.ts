/**
 * Google reCAPTCHA v3 (neviditeľná) — overenie na serveri.
 *
 * Kľúče z https://www.google.com/recaptcha/admin (typ „v3“, doména vytlacto3d.sk):
 *   NEXT_PUBLIC_RECAPTCHA_SITE_KEY — verejný kľúč pre prehliadač
 *   RECAPTCHA_SECRET_KEY           — tajný kľúč pre server
 * Kým nie sú nastavené, overenie sa preskočí (formulár funguje ako predtým).
 */

/** Pod týmto skóre (0 = bot, 1 = človek) správu odmietneme. */
export const RECAPTCHA_MIN_SCORE = 0.5;

export type RecaptchaResult = { ok: true; skipped?: boolean; score?: number } | { ok: false; reason: string };

export function isRecaptchaConfigured(): boolean {
  return Boolean(process.env.RECAPTCHA_SECRET_KEY);
}

export async function verifyRecaptcha(token: unknown, expectedAction: string, ip?: string | null): Promise<RecaptchaResult> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (typeof token !== "string" || !token) return { ok: false, reason: "missing-token" };

  const params = new URLSearchParams({ secret, response: token });
  if (ip) params.set("remoteip", ip);
  let data: { success?: boolean; score?: number; action?: string; "error-codes"?: string[] };
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
      cache: "no-store",
    });
    data = await res.json();
  } catch (e) {
    // Výpadok Google nemá zablokovať skutočných zákazníkov — pasca (honeypot) ostáva.
    console.error("reCAPTCHA verify failed:", e);
    return { ok: true, skipped: true };
  }

  if (!data.success) return { ok: false, reason: `invalid:${(data["error-codes"] ?? []).join(",")}` };
  if (data.action && data.action !== expectedAction) return { ok: false, reason: `action:${data.action}` };
  const score = typeof data.score === "number" ? data.score : 0;
  if (score < RECAPTCHA_MIN_SCORE) return { ok: false, reason: `score:${score}` };
  return { ok: true, score };
}
