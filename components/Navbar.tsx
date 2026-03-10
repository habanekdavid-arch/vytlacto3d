"use client";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white font-extrabold">
            3D
          </div>
          <div className="leading-tight">
            <div className="text-sm font-extrabold text-neutral-900">VytlačTo3D</div>
            <div className="text-xs text-neutral-500">Online konfigurátor 3D tlače</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden items-center gap-6 text-sm font-semibold text-neutral-700 md:flex">
          <a href="#kalkulator" className="hover:text-black">
            Kalkulátor
          </a>
          <a href="#cennik" className="hover:text-black">
            Cenník
          </a>
          <a href="#faq" className="hover:text-black">
            FAQ
          </a>
        </nav>

        {/* CTA */}
        <a
          href="#kalkulator"
          className="rounded-2xl bg-[#FFAE00] px-4 py-2 text-sm font-extrabold text-black shadow-sm hover:opacity-90"
        >
          Naceniť 3D tlač
        </a>
      </div>
    </header>
  );
}