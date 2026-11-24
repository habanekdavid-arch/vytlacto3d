"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AFTER_UPLOAD, TARGETS, TARGET_MISSING, WELCOME, findIntent, getIntent, type TargetId, type TlackoAction, type TlackoIntent } from "./tlacko-data";
import TlackoMascot from "./TlackoMascot";
import TlackoTour from "./TlackoTour";
import { BRAND, TLACKO_CSS } from "./tlacko-styles";

const BRAND_TEXT = "#000000";
const TEASER_DELAY_MS = 3000;
const TEASER_SNOOZE_DAYS = 3;
const TEASER_KEY = "vytlacto3d:tlacko-teaser";
const UPLOAD_TIP_KEY = "vytlacto3d:tlacko-upload-tip";

type Msg = { from: "bot" | "user"; text: string; actions?: TlackoAction[] };

type Gtag = (cmd: "event", name: string, params?: Record<string, string>) => void;
function track(name: string, params?: Record<string, string>) {
  const g = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof g === "function") g("event", name, params);
}

const botMsg = (i: TlackoIntent): Msg => ({ from: "bot", text: i.answer, actions: i.actions });

function storage(kind: "local" | "session") {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function teaserAllowed(): boolean {
  if (storage("session")?.getItem(TEASER_KEY)) return false;
  const until = Number(storage("local")?.getItem(TEASER_KEY) || 0);
  return !until || Date.now() > until;
}

/** Zvýraznenie miesta na stránke: stmavenie okolia, žltý pulzujúci rámik a bublina. */
function Spotlight({ selector, label, onDone, onMissing }: { selector: string; label: string; onDone: () => void; onMissing: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    const el = document.querySelector(selector);
    if (!el) {
      onMissing();
      return;
    }
    // Vysoké miesto (napr. nahrávanie na mobile) od vrchu pod hlavičkou, inak na stred.
    const r0 = el.getBoundingClientRect();
    if (r0.height > window.innerHeight * 0.6) window.scrollTo({ top: window.scrollY + r0.top - 96, behavior: "smooth" });
    else el.scrollIntoView({ behavior: "smooth", block: "center" });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const id = window.setInterval(update, 80);
    const done = window.setTimeout(onDone, 7000);
    // Ktorékoľvek kliknutie (aj do zvýrazneného miesta) zvýraznenie zavrie.
    const onClick = () => window.setTimeout(onDone, 50);
    window.addEventListener("pointerdown", onClick);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(done);
      window.removeEventListener("pointerdown", onClick);
    };
  }, [selector, onDone, onMissing]);
  if (!rect) return null;
  const pad = 8;
  const top = rect.top - pad;
  const below = top < 90; // bublina pod miestom, ak je hore málo miesta
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const bubbleTop = below ? Math.min(rect.bottom + pad + 14, vh - 70) : Math.max(8, top - 62);
  return (
    <div className="tl-root" style={{ position: "fixed", inset: 0, zIndex: 95, pointerEvents: "none" }}>
      <div
        className="tl-spot"
        style={{
          position: "fixed",
          top,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: Math.max(40, Math.min(rect.bottom + pad, vh - 96) - top),
          borderRadius: 24,
          border: `3px solid ${BRAND}`,
          transition: "top .15s, left .15s, width .15s, height .15s",
        }}
      />
      <div
        className="tl-spot-label"
        style={{
          position: "fixed",
          top: bubbleTop,
          left: "50%",
          marginLeft: -150,
          width: 300,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#fff",
          color: "#171717",
          borderRadius: 16,
          padding: "8px 12px",
          fontSize: 14,
          fontWeight: 800,
          boxShadow: "0 10px 30px rgba(0,0,0,.3)",
        }}
      >
        <TlackoMascot size={34} mood="wow" />
        <span>{below ? label.replace("👇", "👆") : label.replace("👆", "👇")}</span>
      </div>
    </div>
  );
}

/**
 * Tlačko — offline chat asistent. Celá logika beží v prehliadači
 * (tlacko-data.ts), žiadne požiadavky na server ani AI.
 */
export default function Tlacko() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [teaser, setTeaser] = useState(false);
  /** Bublina po nahratí modelu (rada k nastaveniu). */
  const [uploadTip, setUploadTip] = useState(false);
  const [tour, setTour] = useState(false);
  const [spot, setSpot] = useState<TargetId | null>(null);
  const [pendingSpot, setPendingSpot] = useState<TargetId | null>(null);
  const [typing, setTyping] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([botMsg(WELCOME)]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Po 3 s sa Tlačko sám ozve (raz za návštevu; po zavretí krížikom 3 dni nie).
  // Ak je otvorené iné vyskakovacie okno webu, počká, kým zmizne.
  useEffect(() => {
    if (!teaserAllowed()) return;
    let t = 0;
    const tryShow = () => {
      if (document.querySelector("[data-site-popup]")) {
        t = window.setTimeout(tryShow, TEASER_DELAY_MS);
        return;
      }
      setTeaser(true);
      storage("session")?.setItem(TEASER_KEY, "1");
      track("tlacko_teaser");
    };
    t = window.setTimeout(tryShow, TEASER_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Po prvom nahratí modelu v návšteve poradí s nastavením a materiálom
  // (udalosť posiela konfigurátor — app/page.tsx finishBuild).
  useEffect(() => {
    let t = 0;
    const onAdded = () => {
      if (storage("session")?.getItem(UPLOAD_TIP_KEY)) return;
      storage("session")?.setItem(UPLOAD_TIP_KEY, "1");
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        setTeaser(false);
        setUploadTip(true);
        track("tlacko_upload_tip");
      }, 1800);
    };
    window.addEventListener("vytlacto3d:model-added", onAdded);
    return () => {
      window.removeEventListener("vytlacto3d:model-added", onAdded);
      window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    inputRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open, typing]);

  // Zvýraznenie po prechode na inú stránku.
  useEffect(() => {
    if (!pendingSpot || pathname !== TARGETS[pendingSpot].page) return;
    const t = window.setTimeout(() => {
      setSpot(pendingSpot);
      setPendingSpot(null);
    }, 700);
    return () => window.clearTimeout(t);
  }, [pathname, pendingSpot]);

  const endSpot = useCallback(() => setSpot(null), []);
  // Miesto na stránke chýba — Tlačko to povie v chate namiesto toho, aby sa nič nestalo.
  const spotMissing = useCallback(() => {
    setSpot(null);
    if (!spot) return;
    setOpen(true);
    setMsgs((m) => [...m, botMsg(TARGET_MISSING[spot])]);
  }, [spot]);

  function reply(intent: TlackoIntent, userText: string) {
    setMsgs((m) => [...m, { from: "user", text: userText }]);
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, botMsg(intent)]);
    }, 650);
  }

  function openChat() {
    setTeaser(false);
    setUploadTip(false);
    setOpen(true);
    track("tlacko_open");
  }

  function dismissTeaser() {
    setTeaser(false);
    storage("local")?.setItem(TEASER_KEY, String(Date.now() + TEASER_SNOOZE_DAYS * 864e5));
  }

  /** Otvorí chat rovno s danou odpoveďou (napr. rada po nahratí). */
  function openWith(intent: TlackoIntent, userText?: string) {
    openChat();
    if (userText) reply(intent, userText);
    else setMsgs((m) => [...m, botMsg(intent)]);
  }

  function startTour() {
    setTeaser(false);
    setUploadTip(false);
    setOpen(false);
    setTour(true);
    track("tlacko_tour");
  }

  function show(target: TargetId) {
    setOpen(false);
    setTour(false);
    if (pathname === TARGETS[target].page) setSpot(target);
    else {
      setPendingSpot(target);
      router.push(TARGETS[target].page);
    }
  }

  /** Zvýrazní nahrávanie a rovno otvorí výber súboru (musí byť v obsluhe kliknutia). */
  function upload() {
    const input = document.querySelector<HTMLInputElement>('[data-tlacko="upload"] input[type="file"]:not([accept*="pdf"])');
    show("upload");
    input?.click();
  }

  function send() {
    const text = input.trim();
    if (!text || typing) return;
    const intent = findIntent(text);
    track("tlacko_question", { intent: intent.id });
    setInput("");
    reply(intent, text);
  }

  function onAction(a: TlackoAction) {
    track("tlacko_click", { label: a.label });
    if (a.kind === "intent") return reply(getIntent(a.intent), a.label);
    if (a.kind === "tour") return startTour();
    if (a.kind === "show") return show(a.target);
    if (a.kind === "upload") return upload();
    setOpen(false);
    router.push(a.href);
  }

  const last = msgs.length - 1;

  return (
    <div className="tl-root">
      <style>{TLACKO_CSS}</style>

      {spot && <Spotlight selector={TARGETS[spot].selector} label={TARGETS[spot].label} onDone={endSpot} onMissing={spotMissing} />}

      {tour && (
        <TlackoTour
          onClose={() => setTour(false)}
          onAsk={() => {
            setTour(false);
            openChat();
          }}
          onUpload={upload}
        />
      )}

      {teaser && !open && (
        <div className="tl-teaser" role="dialog" aria-label="Tlačko sa pýta" style={st.teaser}>
          <button type="button" aria-label="Zavrieť" onClick={dismissTeaser} style={st.teaserX}>
            ×
          </button>
          <div style={{ fontWeight: 900, fontSize: 15 }}>Ahoj, som Tlačko! 👋</div>
          <div style={{ marginTop: 4, color: "#404040", lineHeight: 1.45 }}>Čo potrebujete vytlačiť? Za 30 sekúnd vám ukážem, ako funguje konfigurátor.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            <button type="button" className="tl-chip" onClick={startTour} style={st.linkBtn}>
              ▶ Ukáž mi to
            </button>
            <button type="button" className="tl-chip" onClick={openChat} style={st.chip}>
              Mám otázku
            </button>
          </div>
        </div>
      )}

      {uploadTip && !open && !tour && (
        <div className="tl-teaser" role="dialog" aria-label="Tlačko radí" style={st.teaser}>
          <button type="button" aria-label="Zavrieť" onClick={() => setUploadTip(false)} style={st.teaserX}>
            ×
          </button>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <TlackoMascot size={40} mood="wow" />
            <div style={{ fontWeight: 900, fontSize: 15, paddingRight: 14 }}>Super, model je nahratý! 🎉</div>
          </div>
          <div style={{ marginTop: 6, color: "#404040", lineHeight: 1.45 }}>
            Poradím vám, ako ho nastaviť a podľa čoho vybrať materiál, aby vydržal a nepreplatili ste.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            <button type="button" className="tl-chip" onClick={() => openWith(AFTER_UPLOAD)} style={st.linkBtn}>
              Ako to nastaviť?
            </button>
            <button type="button" className="tl-chip" onClick={() => openWith(getIntent("sprievodca"), "Aký materiál vybrať?")} style={st.chip}>
              Aký materiál?
            </button>
            <button
              type="button"
              className="tl-chip"
              onClick={() => {
                setUploadTip(false);
                show("settings");
              }}
              style={st.chip}
            >
              Ukáž kde
            </button>
          </div>
        </div>
      )}

      {open && (
        <div role="dialog" aria-label="Tlačko — chat asistent" className="tl-panel" style={st.panel}>
          <div style={st.header}>
            <div style={st.avatar}>
              <TlackoMascot size={36} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Tlačko</div>
              <div style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: 9, background: "#16a34a", display: "inline-block" }} />
                Váš sprievodca 3D tlačou
              </div>
            </div>
            <button type="button" aria-label="Zavrieť chat" onClick={() => setOpen(false)} style={st.close}>
              ×
            </button>
          </div>

          <div ref={listRef} style={st.list}>
            {msgs.map((m, i) => (
              <div key={i} className="tl-msg" style={{ display: "flex", gap: 7, alignItems: "flex-end", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                {m.from === "bot" && (
                  <div style={{ flex: "none", width: 28 }}>
                    <TlackoMascot size={28} />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: m.from === "user" ? "flex-end" : "flex-start", maxWidth: "86%" }}>
                  <div data-tl-bubble={m.from} style={m.from === "user" ? st.userBubble : st.botBubble}>
                    {m.text}
                  </div>
                  {m.from === "bot" && m.actions && i === last && !typing && (
                    <div style={st.actions}>
                      {m.actions.map((a) => (
                        <button key={a.label} type="button" className="tl-chip" onClick={() => onAction(a)} style={a.kind === "intent" ? st.chip : st.linkBtn}>
                          {a.label}
                          {a.kind === "link" || a.kind === "show" ? " →" : ""}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="tl-msg" style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
                <TlackoMascot size={28} />
                <div className="tl-typing" style={{ ...st.botBubble, padding: "11px 12px" }} aria-label="Tlačko píše">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <form
            style={st.form}
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Napíšte otázku…"
              aria-label="Vaša otázka"
              maxLength={300}
              style={st.input}
            />
            <button type="submit" aria-label="Odoslať" style={st.send}>
              ➤
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openChat())}
        aria-label={open ? "Zavrieť chat" : "Otvoriť chat Tlačko"}
        aria-expanded={open}
        className={["tl-fab", open ? "" : teaser || uploadTip ? "tl-fab-call" : "tl-fab-idle"].join(" ")}
        style={st.fab}
      >
        {open ? <span style={{ fontSize: 30, lineHeight: 1, fontWeight: 700 }}>×</span> : <TlackoMascot size={44} />}
        {!open && (teaser || uploadTip) && <span style={st.badge}>1</span>}
      </button>
    </div>
  );
}

// z-index 80: pod vyskakovacími oknami webu (89–105) aj pod cookie lištou CookieScript.
const st: Record<string, CSSProperties> = {
  fab: {
    position: "fixed",
    right: 18,
    bottom: 18,
    zIndex: 80,
    width: 62,
    height: 62,
    borderRadius: 999,
    border: "3px solid #fff",
    background: `radial-gradient(circle at 30% 25%, #FFD36B, ${BRAND} 60%, #F59E0B)`,
    color: BRAND_TEXT,
    boxShadow: "0 10px 28px rgba(0,0,0,0.25)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 999,
    background: "#ef4444",
    color: "#fff",
    fontSize: 12,
    fontWeight: 900,
    lineHeight: "20px",
    border: "2px solid #fff",
  },
  teaser: {
    position: "fixed",
    right: 18,
    bottom: 92,
    zIndex: 80,
    width: "min(290px, calc(100vw - 36px))",
    background: "#fff",
    color: "#171717",
    borderRadius: "20px 20px 6px 20px",
    padding: "14px 14px 12px",
    fontSize: 14,
    boxShadow: "0 18px 45px rgba(0,0,0,.22)",
    border: `2px solid ${BRAND}`,
  },
  teaserX: { position: "absolute", top: 6, right: 8, border: "none", background: "transparent", fontSize: 20, lineHeight: 1, cursor: "pointer", color: "#737373" },
  panel: {
    position: "fixed",
    right: 16,
    bottom: 92,
    zIndex: 80,
    width: "min(380px, calc(100vw - 32px))",
    height: "min(560px, calc(100dvh - 120px))",
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
    color: "#171717",
    borderRadius: 24,
    boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
    overflow: "hidden",
    fontSize: 14,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 12px 12px 14px",
    background: `linear-gradient(135deg, #FFD36B, ${BRAND} 55%, #F59E0B)`,
    color: BRAND_TEXT,
  },
  avatar: { width: 46, height: 46, borderRadius: 999, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,.15)" },
  close: { border: "none", background: "rgba(255,255,255,.55)", borderRadius: 999, width: 34, height: 34, color: BRAND_TEXT, fontSize: 24, lineHeight: 1, cursor: "pointer" },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: "radial-gradient(circle at 1px 1px, #ececec 1px, transparent 0) 0 0 / 16px 16px, #fafafa",
  },
  botBubble: {
    whiteSpace: "pre-line",
    background: "#ffffff",
    border: "1px solid #ececec",
    borderRadius: "16px 16px 16px 5px",
    padding: "9px 12px",
    lineHeight: 1.5,
    boxShadow: "0 2px 6px rgba(0,0,0,.04)",
  },
  userBubble: {
    whiteSpace: "pre-line",
    background: "#171717",
    color: "#ffffff",
    borderRadius: "16px 16px 5px 16px",
    padding: "9px 12px",
    lineHeight: 1.5,
  },
  actions: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { border: `1.5px solid ${BRAND}`, background: "#fff7e6", color: "#171717", borderRadius: 999, padding: "7px 12px", fontSize: 13, fontWeight: 800, cursor: "pointer" },
  linkBtn: { border: "none", background: BRAND, color: BRAND_TEXT, borderRadius: 999, padding: "7px 13px", fontSize: 13, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 10px rgba(255,174,0,.35)" },
  form: { display: "flex", gap: 8, padding: 10, borderTop: "1px solid #eee", background: "#ffffff" },
  input: { flex: 1, minWidth: 0, border: "1.5px solid #e5e5e5", borderRadius: 14, padding: "10px 12px", fontSize: 16, outline: "none", color: "#171717", background: "#fafafa" },
  send: { border: "none", borderRadius: 14, width: 46, background: BRAND, color: BRAND_TEXT, fontSize: 17, cursor: "pointer" },
};
