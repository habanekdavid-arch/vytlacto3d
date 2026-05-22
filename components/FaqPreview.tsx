"use client";

import Link from "next/link";
import { useState } from "react";

const faqs = [
  {
    question: "Aké súbory podporujete?",
    answer:
      "Podporujeme STL, OBJ a SVG súbory. STL a OBJ sa spracujú priamo, SVG vieme automaticky previesť na 3D model s nastaviteľnou hrúbkou.",
  },
  {
    question: "Ako sa počíta cena tlače?",
    answer:
      "Cena sa počíta podľa objemu modelu, zvoleného materiálu, kvality tlače, pevnosti výplne, veľkosti modelu a počtu kusov.",
  },
  {
    question: "Ako dlho trvá výroba?",
    answer:
      "Čas výroby závisí od veľkosti modelu a zvolených parametrov. Väčšina objednávok sa spracuje v priebehu niekoľkých dní.",
  },
  {
    question: "Môžem si vybrať farbu a materiál?",
    answer:
      "Áno. V konfigurátore si viete vybrať materiál, farbu, kvalitu tlače, mierku modelu, výplň a počet kusov.",
  },
  {
    question: "Vidím cenu ešte pred objednávkou?",
    answer:
      "Áno. Po nahratí modelu a nastavení parametrov sa cena vypočíta automaticky ešte pred odoslaním objednávky.",
  },
];

export default function FaqPreview() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative overflow-hidden bg-white px-6 py-24">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-16 h-80 w-80 -translate-x-1/2 rounded-full bg-[#FFAE00]/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#FFAE00]" />
            FAQ a užitočné informácie
          </div>

          <h2 className="mt-6 text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
            Často kladené otázky
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-neutral-600">
            Odpovede na najčastejšie otázky o 3D tlači, cenách, priebehu
            objednávky a technických požiadavkách na model.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={item.question}
                className={[
                  "group rounded-3xl border bg-white shadow-sm transition-all duration-300",
                  isOpen
                    ? "border-[#FFAE00]/50 shadow-xl shadow-[#FFAE00]/10"
                    : "border-neutral-200 hover:-translate-y-1 hover:border-[#FFAE00]/30 hover:shadow-lg",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={[
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-all duration-300",
                        isOpen
                          ? "bg-[#FFAE00] text-black rotate-6 scale-110"
                          : "bg-[#FFAE00]/10 text-[#FFAE00] group-hover:scale-110",
                      ].join(" ")}
                    >
                      ?
                    </div>

                    <h3 className="text-base font-extrabold text-neutral-900 sm:text-lg">
                      {item.question}
                    </h3>
                  </div>

                  <div
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-xl font-light text-neutral-500 transition-all duration-300",
                      isOpen ? "rotate-45 border-[#FFAE00] text-neutral-900" : "",
                    ].join(" ")}
                  >
                    +
                  </div>
                </button>

                <div
                  className={[
                    "grid transition-all duration-500 ease-in-out",
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  ].join(" ")}
                >
                  <div className="overflow-hidden">
                    <p className="px-20 pb-6 text-sm leading-7 text-neutral-600">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/blog"
            className="rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-bold text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Prejsť na blog
          </Link>

          <Link
            href="/#kalkulator"
            className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-bold text-neutral-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-50 hover:shadow-md"
          >
            Prejsť na kalkulátor
          </Link>
        </div>
      </div>
    </section>
  );
}