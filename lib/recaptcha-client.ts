/** reCAPTCHA v3 v prehliadači: skript sa načíta až pri vypĺňaní formulára. */
export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

type Grecaptcha = {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
};

let loading: Promise<Grecaptcha | null> | null = null;

export function loadRecaptcha(): Promise<Grecaptcha | null> {
  if (!RECAPTCHA_SITE_KEY || typeof window === "undefined") return Promise.resolve(null);
  loading ??= new Promise((resolve) => {
    const done = () => {
      const g = (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;
      if (g) g.ready(() => resolve(g));
      else resolve(null);
    };
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
    s.async = true;
    s.onload = done;
    s.onerror = () => {
      loading = null;
      resolve(null);
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Token pre jedno odoslanie (platí 2 minúty). Bez kľúča alebo pri chybe vráti "". */
export async function recaptchaToken(action: string): Promise<string> {
  const g = await Promise.race([loadRecaptcha(), new Promise<null>((r) => setTimeout(() => r(null), 8000))]);
  if (!g) return "";
  try {
    return await g.execute(RECAPTCHA_SITE_KEY, { action });
  } catch {
    return "";
  }
}
