"use client";

const OPEN_EVENT = "vytlacto3d:open-cookie-banner";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-3">
        <div>
          <div className="text-xl font-bold text-neutral-900">
            VytlačTo<span className="text-[#FFAE00]">3D</span>
          </div>

          <p className="mt-4 max-w-sm text-sm text-neutral-600">
            Online kalkulátor a výroba 3D tlače. Nahraj STL model, nastav parametre a zisti cenu okamžite.
          </p>
        </div>

        <div>
          <div className="text-base font-semibold text-neutral-900">Kontakt</div>

          <div className="mt-4 space-y-2 text-sm text-neutral-600">
            <div>
              Email:{" "}
              <a href="mailto:info@4frommedia.sk" className="hover:underline">
                info@4frommedia.sk
              </a>
            </div>

            <div>
              Tel:{" "}
              <a href="tel:+421907907097" className="hover:underline">
                +421 907 907 097
              </a>
            </div>
          </div>
        </div>

        <div>
          <div className="text-base font-semibold text-neutral-900">Prevádzkovateľ</div>

          <div className="mt-4 space-y-1 text-sm text-neutral-600">
            <div>4from media, s.r.o.</div>
            <div>Nezábudková 5</div>
            <div>821 01 Bratislava</div>
            <div className="pt-2">IČO: 35976063</div>
            <div>DIČ: 2022117966</div>
            <div>IČ DPH: SK2022117966</div>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 text-sm text-neutral-500 md:flex-row md:items-center md:justify-between">
          <div>
            © {new Date().getFullYear()} VytlačTo3D • Projekt spoločnosti 4from media, s.r.o.
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="/gdpr" className="hover:text-black">
              GDPR
            </a>
            <a href="/podmienky" className="hover:text-black">
              Obchodné podmienky
            </a>
            <a href="/kontakt" className="hover:text-black">
              Kontakt
            </a>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
              className="hover:text-black"
            >
              Nastavenia cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}