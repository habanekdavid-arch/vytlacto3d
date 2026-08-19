import FilamentTrail from "@/components/FilamentTrailLoader";

const sections = [
  { title: "Sekcia 1", align: "flex-start" as const },
  { title: "Sekcia 2", align: "flex-end" as const },
  { title: "Sekcia 3", align: "flex-start" as const },
  { title: "Sekcia 4", align: "flex-end" as const },
  { title: "Sekcia 5", align: "flex-start" as const },
  { title: "Sekcia 6", align: "flex-end" as const },
];

export default function FilamentDemoPage() {
  return (
    <div style={{ position: "relative", overflowX: "clip", background: "#111" }}>
      <FilamentTrail />

      {sections.map((s, i) => (
        <section
          key={i}
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: s.align,
            padding: "0 8%",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ position: "relative" }}>
            <span
              data-filament={i}
              style={{ position: "absolute", top: "50%", left: s.align === "flex-start" ? "-2rem" : "auto", right: s.align === "flex-end" ? "-2rem" : "auto" }}
            />
            <h2 style={{ color: "#fff", fontSize: "2.5rem", fontWeight: 800, margin: 0 }}>
              {s.title}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", marginTop: "0.75rem", maxWidth: 420 }}>
              Scrolluj a sleduj žltú krivku a žeravý bod na jej konci vľavo/vpravo od textu.
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}
