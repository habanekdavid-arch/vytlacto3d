"use client";

import { useEffect, useState } from "react";

/**
 * Ilustrácie prehliadky konfigurátora v štýle VytlačTo3D — vlastné SVG
 * (žltá #FFAE00, čierne obrysy, zaoblené tvary), plynulé animácie.
 * Žiadne emoji (na rôznych zariadeniach vyzerajú inak a auto by cúvalo).
 */

const Y = "#FFAE00";
const K = "#111111";

export const SCENES_CSS = `
.tl-scene { position: relative; height: 160px; border-radius: 20px; overflow: hidden; background: linear-gradient(160deg, #FFF8E8 0%, #FFFFFF 70%); border: 1px solid #F3E6C8; }
.tl-scene svg { display: block; width: 100%; height: 100%; }
.tl-fb { transform-box: fill-box; transform-origin: center; }

/* 1 — nahratie */
@keyframes tl-s1-file { 0% { transform: translateY(-78px) rotate(-10deg); opacity: 0 } 18% { opacity: 1 } 46% { transform: translateY(0) rotate(0) } 52% { transform: translateY(-5px) } 58%,80% { transform: translateY(0); opacity: 1 } 92%,100% { transform: translateY(6px) scale(.85); opacity: 0 } }
@keyframes tl-s1-ok { 0%,52% { transform: scale(0) } 62% { transform: scale(1.18) } 70%,84% { transform: scale(1) } 94%,100% { transform: scale(0) } }
@keyframes tl-s1-zone { 0%,40% { stroke-dashoffset: 0; fill: #FFFDF6 } 55%,80% { fill: #FFF1CC } 100% { stroke-dashoffset: -60; fill: #FFFDF6 } }
.tl-s1-file { animation: tl-s1-file 3.2s cubic-bezier(.22,1,.36,1) infinite; }
.tl-s1-ok { animation: tl-s1-ok 3.2s cubic-bezier(.34,1.56,.64,1) infinite; }
.tl-s1-zone { animation: tl-s1-zone 3.2s ease-in-out infinite; }

/* 2 — 3D náhľad */
@keyframes tl-s2-spin { from { transform: rotateX(-22deg) rotateY(0) } to { transform: rotateX(-22deg) rotateY(360deg) } }
@keyframes tl-s2-shadow { 0%,100% { transform: translateX(-50%) scaleX(1); opacity: .22 } 50% { transform: translateX(-50%) scaleX(.82); opacity: .14 } }
.tl-s2-stage { position: absolute; inset: 0 0 26px; display: flex; align-items: center; justify-content: center; perspective: 520px; }
.tl-s2-cube { position: relative; width: 64px; height: 64px; transform-style: preserve-3d; animation: tl-s2-spin 7s cubic-bezier(.45,.05,.55,.95) infinite; }
.tl-s2-cube div { position: absolute; inset: 0; border: 2.5px solid ${K}; border-radius: 8px; background: ${Y}; }
.tl-s2-cube div:nth-child(1) { transform: translateZ(32px) } .tl-s2-cube div:nth-child(2) { transform: rotateY(180deg) translateZ(32px) }
.tl-s2-cube div:nth-child(3) { transform: rotateY(90deg) translateZ(32px); background: #F29B00 } .tl-s2-cube div:nth-child(4) { transform: rotateY(-90deg) translateZ(32px); background: #F29B00 }
.tl-s2-cube div:nth-child(5) { transform: rotateX(90deg) translateZ(32px); background: #FFD36B } .tl-s2-cube div:nth-child(6) { transform: rotateX(-90deg) translateZ(32px); background: #E08E00 }
.tl-s2-shadow { position: absolute; left: 50%; bottom: 34px; width: 86px; height: 12px; border-radius: 50%; background: ${K}; filter: blur(4px); animation: tl-s2-shadow 3.5s ease-in-out infinite; }
.tl-s2-dims { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); display: flex; gap: 6px; }
.tl-s2-dims span { background: #fff; border: 1px solid #E5E5E5; border-radius: 999px; padding: 3px 9px; font-size: 11px; font-weight: 800; color: #404040; white-space: nowrap; }

/* 3 — nastavenia */
@keyframes tl-s3-pill { 0%,24% { transform: translateX(0) } 33%,57% { transform: translateX(100%) } 66%,90% { transform: translateX(200%) } 100% { transform: translateX(0) } }
@keyframes tl-s3-ring { 0%,20% { transform: translateX(0) } 25%,45% { transform: translateX(30px) } 50%,70% { transform: translateX(60px) } 75%,95% { transform: translateX(90px) } 100% { transform: translateX(0) } }
@keyframes tl-s3-fill { 0%,10% { width: 15% } 45%,60% { width: 62% } 95%,100% { width: 15% } }
.tl-s3 { position: absolute; inset: 0; padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.tl-s3-label { font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #8A8A8A; margin-bottom: 5px; }
.tl-s3-seg { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); background: #fff; border: 1px solid #E5E5E5; border-radius: 14px; padding: 3px; }
.tl-s3-seg i { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc((100% - 6px) / 3); border-radius: 11px; background: ${Y}; box-shadow: 0 4px 10px rgba(255,174,0,.35); animation: tl-s3-pill 6s cubic-bezier(.65,0,.35,1) infinite; }
.tl-s3-seg span { position: relative; text-align: center; font-size: 12px; font-weight: 900; padding: 6px 0; }
.tl-s3-row { display: flex; align-items: center; gap: 14px; }
.tl-s3-sw { position: relative; display: flex; gap: 10px; }
.tl-s3-sw b { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid rgba(0,0,0,.18); }
.tl-s3-sw u { position: absolute; left: -4px; top: -4px; width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid ${K}; animation: tl-s3-ring 8s cubic-bezier(.65,0,.35,1) infinite; }
.tl-s3-bar { flex: 1; height: 8px; border-radius: 99px; background: #EDEDED; overflow: hidden; }
.tl-s3-bar em { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #FFD36B, ${Y}); animation: tl-s3-fill 5s cubic-bezier(.65,0,.35,1) infinite; }

/* 4 — cena */
@keyframes tl-s4-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
.tl-s4 { position: absolute; inset: 14px 18px; background: #fff; border: 1px solid #ECECEC; border-radius: 18px; box-shadow: 0 8px 22px rgba(0,0,0,.06); padding: 12px 14px; display: flex; flex-direction: column; }
.tl-s4-row { display: flex; justify-content: space-between; font-size: 12px; color: #525252; animation: tl-s4-in .5s ease-out both; }
.tl-s4-row b { color: ${K}; }

/* 5 — doručenie */
@keyframes tl-s5-drive { 0% { transform: translateX(-130px); opacity: 1 } 62%,84% { transform: translateX(150px); opacity: 1 } 100% { transform: translateX(150px); opacity: 0 } }
@keyframes tl-s5-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-1.2px) } }
@keyframes tl-s5-wheel { to { transform: rotate(360deg) } }
@keyframes tl-s5-road { to { stroke-dashoffset: -36 } }
@keyframes tl-s5-done { 0%,60% { transform: scale(0) } 70% { transform: scale(1.15) } 76%,92% { transform: scale(1) } 100% { transform: scale(0) } }
@keyframes tl-s5-speed { 0%,100% { opacity: 0 } 20%,50% { opacity: .9 } }
.tl-s5-truck { animation: tl-s5-drive 4.2s cubic-bezier(.33,0,.2,1) infinite; }
.tl-s5-body { animation: tl-s5-bob .35s ease-in-out infinite; }
.tl-s5-wheel { transform-box: fill-box; transform-origin: center; animation: tl-s5-wheel .5s linear infinite; }
.tl-s5-road { animation: tl-s5-road .6s linear infinite; }
.tl-s5-done { transform-box: fill-box; transform-origin: center; animation: tl-s5-done 4.2s cubic-bezier(.34,1.56,.64,1) infinite; }
.tl-s5-speed { animation: tl-s5-speed 4.2s ease-in-out infinite; }
`;

export function UploadScene() {
  return (
    <div className="tl-scene">
      <svg viewBox="0 0 320 160" aria-hidden="true">
        <rect className="tl-s1-zone" x="70" y="62" width="180" height="78" rx="20" fill="#FFFDF6" stroke={Y} strokeWidth="3" strokeDasharray="10 8" />
        <circle cx="160" cy="118" r="11" fill={Y} />
        <path d="M160 123v-10m-4.5 4.5L160 113l4.5 4.5" stroke={K} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <g className="tl-s1-file tl-fb">
          <path d="M141 40h26l12 12v42a5 5 0 0 1-5 5h-33a5 5 0 0 1-5-5V45a5 5 0 0 1 5-5z" fill="#fff" stroke={K} strokeWidth="2.8" strokeLinejoin="round" />
          <path d="M167 40v8a4 4 0 0 0 4 4h8" fill={Y} stroke={K} strokeWidth="2.8" strokeLinejoin="round" />
          <rect x="143" y="70" width="30" height="15" rx="5" fill={K} />
          <text x="158" y="81.5" textAnchor="middle" fontSize="10.5" fontWeight="900" fill={Y}>STL</text>
        </g>
        <g className="tl-s1-ok tl-fb">
          <circle cx="196" cy="70" r="13" fill="#16A34A" stroke="#fff" strokeWidth="3" />
          <path d="M190 70.5l4 4 8-8.5" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

export function ModelScene() {
  return (
    <div className="tl-scene">
      <div className="tl-s2-stage">
        <div className="tl-s2-cube">
          <div />
          <div />
          <div />
          <div />
          <div />
          <div />
        </div>
      </div>
      <div className="tl-s2-shadow" />
      <div className="tl-s2-dims">
        <span>42 × 41 × 15 mm</span>
        <span>5,7 cm³</span>
      </div>
    </div>
  );
}

export function SettingsScene() {
  return (
    <div className="tl-scene">
      <div className="tl-s3">
        <div>
          <div className="tl-s3-label">Materiál</div>
          <div className="tl-s3-seg">
            <i />
            <span>PLA</span>
            <span>PETG</span>
            <span>ABS</span>
          </div>
        </div>
        <div className="tl-s3-row">
          <div>
            <div className="tl-s3-label">Farba</div>
            <div className="tl-s3-sw">
              <b style={{ background: K }} />
              <b style={{ background: "#fff" }} />
              <b style={{ background: "#2563EB" }} />
              <b style={{ background: "#DC2626" }} />
              <u />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="tl-s3-label">Výplň</div>
            <div className="tl-s3-bar">
              <em />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Plynulé „načítanie“ ceny (easeOutCubic). */
function PriceCounter({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100);
      setV(to * (1 - (1 - t) ** 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v.toFixed(2).replace(".", ",")} €</>;
}

export function PriceScene() {
  return (
    <div className="tl-scene">
      <div className="tl-s4">
        <div className="tl-s4-row" style={{ animationDelay: ".1s" }}>
          <span>Materiál</span>
          <b>ABS · Štandard</b>
        </div>
        <div className="tl-s4-row" style={{ animationDelay: ".3s", marginTop: 3 }}>
          <span>Počet kusov</span>
          <b>1 ks</b>
        </div>
        <div style={{ height: 1, background: "#EFEFEF", margin: "8px 0 6px" }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#737373", paddingBottom: 6 }}>Cena s DPH</span>
          <span style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>
            <PriceCounter to={12.3} />
          </span>
        </div>
        <div className="tl-s4-row" style={{ animationDelay: ".9s", marginTop: "auto", justifyContent: "flex-start" }}>
          <span style={{ background: "#DCFCE7", color: "#166534", borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 800 }}>
            od 20 ks −5 % · od 50 ks −10 % · od 100 ks −15 %
          </span>
        </div>
      </div>
    </div>
  );
}

/** Dodávka VytlačTo3D smerujúca doprava (kabína vpredu vpravo). */
function Truck() {
  return (
    <g className="tl-s5-truck">
      <g className="tl-s5-speed">
        <path d="M-6 104h-22M-2 114h-16M-8 94h-12" stroke={K} strokeWidth="2.5" strokeLinecap="round" opacity=".5" />
      </g>
      <g className="tl-s5-body">
        {/* nákladný priestor */}
        <rect x="0" y="74" width="74" height="44" rx="8" fill={Y} stroke={K} strokeWidth="3" />
        <text x="37" y="101" textAnchor="middle" fontSize="13" fontWeight="900" fill={K}>3D</text>
        {/* kabína vpravo */}
        <path d="M74 86h20c3 0 5.5 1.4 7 3.8l8.5 13.4c.9 1.4 1.5 3 1.5 4.7V112a6 6 0 0 1-6 6H74z" fill="#fff" stroke={K} strokeWidth="3" strokeLinejoin="round" />
        <path d="M81 92h12c1.6 0 3 .8 3.8 2.1l5.2 8.4H81z" fill="#BFE3FF" stroke={K} strokeWidth="2.4" strokeLinejoin="round" />
        <rect x="104" y="108" width="7" height="4" rx="2" fill={Y} />
      </g>
      {/* kolesá */}
      <g className="tl-s5-wheel">
        <circle cx="20" cy="120" r="10" fill={K} />
        <circle cx="20" cy="120" r="4" fill="#fff" />
        <rect x="19" y="111.5" width="2" height="5" rx="1" fill="#fff" />
      </g>
      <g className="tl-s5-wheel">
        <circle cx="92" cy="120" r="10" fill={K} />
        <circle cx="92" cy="120" r="4" fill="#fff" />
        <rect x="91" y="111.5" width="2" height="5" rx="1" fill="#fff" />
      </g>
    </g>
  );
}

export function DeliveryScene() {
  return (
    <div className="tl-scene">
      <svg viewBox="0 0 320 160" aria-hidden="true">
        {/* domček */}
        <g>
          <path d="M262 92l26-22 26 22" fill="none" stroke={K} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M268 88v42h40V88" fill="#fff" stroke={K} strokeWidth="3" strokeLinejoin="round" />
          <rect x="281" y="106" width="14" height="24" rx="3" fill={Y} stroke={K} strokeWidth="2.5" />
        </g>
        {/* cesta */}
        <line x1="0" y1="131" x2="320" y2="131" stroke={K} strokeWidth="3" />
        <line className="tl-s5-road" x1="0" y1="143" x2="320" y2="143" stroke="#D4D4D4" strokeWidth="3" strokeDasharray="18 18" />
        <Truck />
        {/* doručené */}
        <g className="tl-s5-done">
          <rect x="196" y="22" width="104" height="30" rx="15" fill="#16A34A" />
          <path d="M209 37l4 4 8-8.5" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="258" y="41.5" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">Doručené</text>
        </g>
      </svg>
    </div>
  );
}
