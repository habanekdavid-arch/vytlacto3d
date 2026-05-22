"use client";

const OPEN_EVENT = "vytlacto3d:open-cookie-banner";

export default function Footer() {
  return (
    <footer className="mt-20 bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.04)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <div className="text-xl font-bold text-neutral-900">
            VytlačTo<span className="text-[#FFAE00]">3D</span>
          </div>

          <p className="mt-4 max-w-sm text-sm text-neutral-600">
            Online kalkulátor a výroba 3D tlače. Nahraj STL model, nastav
            parametre a zisti cenu okamžite.
          </p>
        </div>

        <div>
          <div className="text-base font-semibold text-neutral-900">
            Kontakt
          </div>

          <div className="mt-4 space-y-2 text-sm text-neutral-600">
            <div>
              Email:{" "}
              <a
                href="mailto:info@4frommedia.sk"
                className="transition hover:text-black hover:underline"
              >
                info@4frommedia.sk
              </a>
            </div>

            <div>
              Tel:{" "}
              <a
                href="tel:+421907907097"
                className="transition hover:text-black hover:underline"
              >
                +421 907 907 097
              </a>
            </div>
          </div>
        </div>

        <div>
          <div className="text-base font-semibold text-neutral-900">
            Výroba
          </div>

          <div className="mt-4 space-y-1 text-sm text-neutral-600">
            <div>4from media, s.r.o.</div>
            <div>M. Hodžu 393/5</div>
            <div>971 01 Prievidza</div>
            <div>Email: info@4frommedia.sk</div>
          </div>
        </div>
      </div>

      <div className="mx-auto h-px max-w-6xl bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />

      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-sm text-neutral-500 md:flex-row md:items-center md:justify-between">
        <div>
          © {new Date().getFullYear()} VytlačTo3D • Projekt spoločnosti
          {" "}
          <span className="font-medium text-neutral-700">
            4from media, s.r.o.
          </span>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <a
            href="/gdpr"
            className="transition hover:text-black"
          >
            GDPR
          </a>

          <a
            href="/podmienky"
            className="transition hover:text-black"
          >
            Obchodné podmienky
          </a>

          <a
            href="/kontakt"
            className="transition hover:text-black"
          >
            Kontakt
          </a>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
            className="transition hover:text-black"
          >
            Nastavenia cookies
          </button>
        </div>
      </div>
    </footer>
  );
}