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
          </div>
        </div>
      </div>
    </main>
  );
}