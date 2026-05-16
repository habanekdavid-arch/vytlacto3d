"use client";

import Image from "next/image";

export default function FourFromFloatingButton() {
  return (
    <a
      href="https://www.4from.media/?gad_source=1&gad_campaignid=21391373681&gbraid=0AAAAADyxKkl3uOWw6VN6UM8ekC4FAegi_"
      target="_blank"
      rel="noreferrer"
      aria-label="4from media"
      className="fixed bottom-5 right-5 z-50 hidden rounded-2xl border border-neutral-200 bg-white/90 p-3 shadow-lg backdrop-blur transition hover:-translate-y-1 hover:shadow-xl md:block"
    >
      <Image
        src="/4from-media.png"
        alt="4from media"
        width={130}
        height={42}
        className="h-auto w-[130px]"
      />
    </a>
  );
}