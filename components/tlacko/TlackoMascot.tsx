/** Tlačko — maskot: malá 3D tlačiareň s tvárou na displeji (žmurká). */
export default function TlackoMascot({ size = 40, mood = "happy" }: { size?: number; mood?: "happy" | "wow" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="tl-mascot">
      {/* anténa = tryska */}
      <line x1="32" y1="9" x2="32" y2="3.5" stroke="#111" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="3.5" r="3" fill="#FFAE00" stroke="#111" strokeWidth="2" className="tl-antenna" />
      {/* telo */}
      <rect x="6" y="10" width="52" height="44" rx="12" fill="#FFAE00" stroke="#111" strokeWidth="3" />
      <rect x="12" y="10" width="40" height="6" rx="3" fill="#111" />
      {/* displej s tvárou */}
      <rect x="14" y="20" width="36" height="22" rx="7" fill="#111" />
      <g className="tl-eyes">
        <ellipse cx="25" cy="29" rx="3.4" ry="4" fill="#FFAE00" />
        <ellipse cx="39" cy="29" rx="3.4" ry="4" fill="#FFAE00" />
        <circle cx="26.2" cy="27.6" r="1.1" fill="#fff" />
        <circle cx="40.2" cy="27.6" r="1.1" fill="#fff" />
      </g>
      {mood === "wow" ? (
        <ellipse cx="32" cy="37" rx="2.6" ry="2.2" fill="#FFAE00" />
      ) : (
        <path d="M27 35.5 q5 4.2 10 0" stroke="#FFAE00" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      )}
      {/* líca */}
      <circle cx="19.5" cy="35" r="2" fill="#ff7a59" opacity="0.7" />
      <circle cx="44.5" cy="35" r="2" fill="#ff7a59" opacity="0.7" />
      {/* podstavec a vytlačená kocka */}
      <rect x="12" y="46" width="40" height="4" rx="2" fill="#111" opacity="0.85" />
      <rect x="28" y="42.5" width="8" height="4" rx="1" fill="#fff" stroke="#111" strokeWidth="1.5" />
    </svg>
  );
}
