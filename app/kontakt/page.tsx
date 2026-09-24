export default function KontaktPage() {
  return (
    <main className="bg-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="text-sm font-semibold text-brand">Kontakt</div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-neutral-900">
          Kontaktujte nás
        </h1>

        <p className="mt-4 text-base font-normal text-neutral-600">
          Ak máte otázky ohľadom 3D tlače alebo objednávky, napíšte alebo zavolajte.
        </p>

        <div className="mt-10 rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
          <div className="text-sm font-semibold text-neutral-900">VytlačTo3D / 4from media, s.r.o.</div>

          <div className="mt-4 space-y-2 text-sm font-normal text-neutral-700">
            <div>
              Email:{" "}
              <a className="underline" href="mailto:info@4frommedia.sk">
                info@4frommedia.sk
              </a>
            </div>

            <div>
              Tel:{" "}
              <a className="underline" href="tel:+421907907097">
                +421 907 907 097
              </a>
            </div>

            <div className="pt-3 text-sm text-neutral-600">
              Sídlo: Nezábudková 5, 821 01 Bratislava
            </div>

            <a
              href="https://www.instagram.com/vytlacto3d/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 pt-1 underline"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
              </svg>
              Instagram: @vytlacto3d
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}