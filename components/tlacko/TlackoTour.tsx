"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import TlackoMascot from "./TlackoMascot";
import { BRAND } from "./tlacko-styles";

/**
 * Animovaná prehliadka konfigurátora — 5 krokov od nahratia po doručenie.
 * Ilustrácie sú čisté CSS/SVG (žiadne obrázky ani požiadavky).
 */

function PriceCounter() {
  const [v, setV] = useState(0);
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setV(Math.min(12.3, (12.3 * n) / 30));
      if (n >= 30) window.clearInterval(id);
    }, 35);
    return () => window.clearInterval(id);
  }, []);
  return <>{v.toFixed(2).replace(".", ",")} €</>;
}

function Layers() {
  const [k, setK] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setK((x) => (x + 1) % 9), 450);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="tl-layers">
      {Array.from({ length: k }, (_, i) => (
        <b key={i} style={{ width: `${100 - i * 6}%`, margin: "0 auto", background: i % 2 ? "#FFAE00" : "#111" }} />
      ))}
    </div>
  );
}

const STEPS: { title: string; text: string; scene: () => ReactNode }[] = [
  {
    title: "1. Nahrajte model",
    text: "Pretiahnite súbor STL, OBJ alebo 3MF do konfigurátora. Máte len logo? Stačí SVG, PNG alebo JPG — 3D model z neho vytvoríme.",
    scene: () => (
      <div className="tl-scene">
        <div className="tl-drop-zone" />
        <div className="tl-file">STL</div>
        <div className="tl-ok">✓</div>
      </div>
    ),
  },
  {
    title: "2. Pozrite si model v 3D",
    text: "Model sa hneď zobrazí v 3D — môžete ho otáčať zo všetkých strán, vidíte rozmery aj objem a môžete zmeniť veľkosť.",
    scene: () => (
      <div className="tl-scene">
        <div className="tl-cube-wrap">
          <div className="tl-cube">
            <div /><div /><div /><div /><div /><div />
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "3. Vyberte materiál, kvalitu a farbu",
    text: "Kliknutím zvolíte materiál (PLA, PETG, ABS, PA6-CF), kvalitu tlače, pevnosť výplne, farbu a počet kusov.",
    scene: () => (
      <div className="tl-scene" style={{ paddingTop: 22 }}>
        <div className="tl-chiprow">
          <span>PLA</span>
          <span>PETG</span>
          <span>ABS</span>
        </div>
        <div className="tl-swatches">
          <i style={{ background: "#111" }} />
          <i style={{ background: "#fff" }} />
          <i style={{ background: "#2563eb" }} />
          <i style={{ background: "#dc2626" }} />
        </div>
        <Layers />
      </div>
    ),
  },
  {
    title: "4. Cenu vidíte okamžite",
    text: "Pri každej zmene sa cena prepočíta hneď — bez čakania na ponuku. Pri viac kusoch dostanete množstevnú zľavu.",
    scene: () => (
      <div className="tl-scene" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#737373" }}>Cena s DPH</div>
        <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1 }}>
          <PriceCounter />
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, background: "#dcfce7", color: "#166534", borderRadius: 999, padding: "3px 9px" }}>
          od 20 ks −5 % · od 50 ks −10 % · od 100 ks −15 %
        </div>
      </div>
    ),
  },
  {
    title: "5. Objednajte a my vytlačíme",
    text: "Pridajte model do košíka, zvoľte dopravu (Packeta / Z-Box alebo kuriér) a zaplaťte kartou či prevodom. Vytlačíme a pošleme vám to.",
    scene: () => (
      <div className="tl-scene">
        <div style={{ position: "absolute", left: 14, top: 14, fontSize: 30 }}>🛒</div>
        <div style={{ position: "absolute", right: 14, top: 16, fontSize: 26 }}>🏠</div>
        <div className="tl-road" />
        <div className="tl-truck">🚚</div>
      </div>
    ),
  },
];

export default function TlackoTour({ onClose, onUpload, onAsk }: { onClose: () => void; onUpload: () => void; onAsk: () => void }) {
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;
  const step = STEPS[i];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((x) => Math.min(STEPS.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="tl-overlay" style={s.overlay} onClick={onClose}>
      <div role="dialog" aria-label="Ako funguje konfigurátor" className="tl-panel" style={s.card} onClick={(e) => e.stopPropagation()}>
        <div style={s.head}>
          <TlackoMascot size={38} mood={last ? "wow" : "happy"} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#737373" }}>Tlačko vám ukáže konfigurátor</div>
            <div style={{ fontSize: 17, fontWeight: 900 }}>{step.title}</div>
          </div>
          <button type="button" aria-label="Zavrieť prehliadku" onClick={onClose} style={s.x}>
            ×
          </button>
        </div>

        <div key={i} className="tl-msg">
          {step.scene()}
          <p style={{ margin: "12px 2px 0", lineHeight: 1.5, fontSize: 14, color: "#262626" }}>{step.text}</p>
        </div>

        <div style={s.dots}>
          {STEPS.map((_, k) => (
            <button
              key={k}
              type="button"
              aria-label={`Krok ${k + 1}`}
              onClick={() => setI(k)}
              style={{ ...s.dot, width: k === i ? 22 : 8, background: k <= i ? BRAND : "#e5e5e5" }}
            />
          ))}
        </div>

        <div style={s.nav}>
          {i > 0 ? (
            <button type="button" onClick={() => setI(i - 1)} style={s.ghost}>
              ← Späť
            </button>
          ) : (
            <button type="button" onClick={onAsk} style={s.ghost}>
              Mám otázku
            </button>
          )}
          {last ? (
            <button type="button" onClick={onUpload} style={s.primary}>
              Nahrať môj model ↑
            </button>
          ) : (
            <button type="button" onClick={() => setI(i + 1)} style={s.primary}>
              Ďalej →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, CSSProperties> = {
  overlay: { position: "fixed", inset: 0, zIndex: 95, background: "rgba(10,10,10,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "min(420px, 100%)", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", background: "#fff", color: "#171717", borderRadius: 24, padding: 18, boxShadow: "0 30px 80px rgba(0,0,0,.35)" },
  head: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  x: { border: "none", background: "#f5f5f5", borderRadius: 999, width: 34, height: 34, fontSize: 22, lineHeight: 1, cursor: "pointer", color: "#171717" },
  dots: { display: "flex", gap: 6, justifyContent: "center", margin: "16px 0 12px" },
  dot: { height: 8, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", transition: "all .25s" },
  nav: { display: "flex", justifyContent: "space-between", gap: 10 },
  ghost: { border: "1.5px solid #e5e5e5", background: "#fff", color: "#171717", borderRadius: 14, padding: "10px 14px", fontWeight: 800, fontSize: 14, cursor: "pointer" },
  primary: { border: "none", background: BRAND, color: "#000", borderRadius: 14, padding: "10px 18px", fontWeight: 900, fontSize: 14, cursor: "pointer", boxShadow: "0 6px 16px rgba(255,174,0,.4)" },
};
