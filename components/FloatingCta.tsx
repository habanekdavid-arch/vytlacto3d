"use client";

import { useEffect, useState } from "react";

export default function FloatingCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const section = document.getElementById("kalkulator");
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShow(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.15,
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  if (!show) return null;

  return (
    <a
      href="#kalkulator"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center justify-center rounded-2xl bg-[#FFAE00] px-5 py-3 text-sm font-extrabold text-black shadow-lg transition hover:opacity-90"
    >
      Naceniť 3D tlač
    </a>
  );
}