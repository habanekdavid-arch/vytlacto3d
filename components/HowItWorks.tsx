"use client";

const steps = [
  {
    number: "1",
    icon: "⤴",
    title: "Nahrajte váš 3D model",
    description:
      "Nahrajte STL, OBJ alebo SVG model priamo do konfigurátora. Systém automaticky analyzuje rozmery, objem a pripraví náhľad.",
  },
  {
    number: "2",
    icon: "⚙",
    title: "Vyberte materiál a parametre",
    description:
      "Zvoľte materiál, farbu, kvalitu tlače, mierku modelu a pevnosť výplne. Cena sa okamžite prepočíta.",
  },
  {
    number: "3",
    icon: "✈",
    title: "Odošlite objednávku",
    description:
      "Po kontrole konfigurácie dokončite objednávku a vyberte spôsob dopravy.",
  },
  {
    number: "4",
    icon: "◈",
    title: "Výroba a doručenie",
    description:
      "Model vytlačíme na profesionálnych tlačiarňach, skontrolujeme kvalitu a odošleme priamo k vám.",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-white px-6 py-28">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#FFAE00]/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#FFAE00]" />
            Proces výroby
          </div>

          <h2 className="mt-6 text-5xl font-extrabold tracking-tight text-neutral-900">
            Ako to funguje
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-lg text-neutral-600">
            Od nahrania modelu až po doručenie. Celý proces zvládnete za pár minút.
          </p>
        </div>

        <div className="relative mt-20">
          <div className="absolute left-0 right-0 top-16 hidden h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent lg:block" />

          <div className="grid gap-8 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="
                  group
                  relative
                  rounded-[32px]
                  border
                  border-neutral-200
                  bg-white/80
                  p-8
                  backdrop-blur
                  shadow-sm
                  transition-all
                  duration-500
                  hover:-translate-y-3
                  hover:border-[#FFAE00]/40
                  hover:shadow-2xl
                  hover:shadow-[#FFAE00]/10
                "
              >
                <div className="relative flex justify-center">
                  <div
                    className="
                      flex
                      h-20
                      w-20
                      items-center
                      justify-center
                      rounded-full
                      bg-[#FFAE00]
                      text-3xl
                      transition-all
                      duration-500
                      group-hover:scale-110
                      group-hover:rotate-6
                    "
                  >
                    {step.icon}
                  </div>

                  <div
                    className="
                      absolute
                      -right-2
                      -top-2
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-full
                      bg-black
                      text-sm
                      font-bold
                      text-white
                      transition-all
                      duration-500
                      group-hover:scale-110
                    "
                  >
                    {step.number}
                  </div>
                </div>

                <h3 className="mt-8 text-center text-2xl font-extrabold text-neutral-900">
                  {step.title}
                </h3>

                <p className="mt-4 text-center leading-8 text-neutral-600">
                  {step.description}
                </p>

                <div
                  className="
                    absolute
                    inset-0
                    rounded-[32px]
                    opacity-0
                    transition-opacity
                    duration-500
                    group-hover:opacity-100
                  "
                  style={{
                    boxShadow: "0 0 120px rgba(255,174,0,0.12)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}