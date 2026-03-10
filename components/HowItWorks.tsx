function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-7 w-7"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 16V6"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 10L12 6L16 10"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 18H19"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-7 w-7"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z"
        stroke="white"
        strokeWidth="2.2"
      />
      <path
        d="M19.4 15A1.7 1.7 0 0 0 19.74 16.87L19.8 16.93A2 2 0 1 1 16.97 19.76L16.91 19.7A1.7 1.7 0 0 0 15.04 19.36A1.7 1.7 0 0 0 14 20.92V21A2 2 0 1 1 10 21V20.91A1.7 1.7 0 0 0 8.89 19.35A1.7 1.7 0 0 0 7.03 19.69L6.97 19.75A2 2 0 1 1 4.14 16.92L4.2 16.86A1.7 1.7 0 0 0 4.54 15A1.7 1.7 0 0 0 3 13.96H2.91A2 2 0 1 1 2.91 9.96H3A1.7 1.7 0 0 0 4.54 8.92A1.7 1.7 0 0 0 4.2 7.06L4.14 7A2 2 0 1 1 6.97 4.17L7.03 4.23A1.7 1.7 0 0 0 8.89 4.57H8.98A1.7 1.7 0 0 0 10 3V2.91A2 2 0 1 1 14 2.91V3A1.7 1.7 0 0 0 15.04 4.54A1.7 1.7 0 0 0 16.91 4.2L16.97 4.14A2 2 0 1 1 19.8 6.97L19.74 7.03A1.7 1.7 0 0 0 19.4 8.89V8.98A1.7 1.7 0 0 0 20.97 10H21.09A2 2 0 1 1 21.09 14H21A1.7 1.7 0 0 0 19.46 15.04L19.4 15Z"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-7 w-7"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22 2L11 13"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-7 w-7"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L20 6.5V17.5L12 22L4 17.5V6.5L12 2Z"
        stroke="white"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M4 6.5L12 11L20 6.5"
        stroke="white"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M12 11V22"
        stroke="white"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Nahrajte váš 3D model",
      text: "Nahrajte STL súbor vášho 3D modelu priamo na našu stránku. Náš systém automaticky analyzuje model a vypočíta objem, hmotnosť a presný čas tlače.",
      icon: <UploadIcon />,
    },
    {
      number: "2",
      title: "Vyberte materiál a parametre",
      text: "Zvoľte si materiál podľa vašich potrieb, farbu, kvalitu tlače, pevnosť výplne a počet kusov. Cena sa automaticky prepočíta na základe vašich nastavení.",
      icon: <SettingsIcon />,
    },
    {
      number: "3",
      title: "Odoslanie objednávky",
      text: "Skontrolujte si finálnu cenu, vyberte dopravu a dokončite objednávku. Po úspešnej platbe systém objednávku automaticky spracuje.",
      icon: <SendIcon />,
    },
    {
      number: "4",
      title: "Výroba a dodanie",
      text: "Váš model vytlačíme na profesionálnej 3D tlačiarni, skontrolujeme kvalitu a bezpečne ho odošleme priamo na vašu adresu.",
      icon: <BoxIcon />,
    },
  ];

  return (
    <section id="how" className="bg-white px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
          Ako to funguje
        </h2>

        <div className="mt-16 grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => (
            <article key={step.number} className="text-center">
              <div className="mx-auto flex w-fit items-center justify-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#FFAE00] shadow-sm">
                  {step.icon}
                  <div className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#000000] text-sm font-bold text-white">
                    {step.number}
                  </div>
                </div>
              </div>

              <h3 className="mx-auto mt-6 max-w-xs text-2xl font-extrabold leading-snug text-neutral-900">
                {step.title}
              </h3>

              <p className="mx-auto mt-4 max-w-xs text-sm leading-8 text-neutral-600">
                {step.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}