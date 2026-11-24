"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { WELCOME, findIntent, getIntent, type TlackoAction, type TlackoIntent } from "./tlacko-data";

/** Hlavná farba webu (tlačidlá #FFAE00 s čiernym textom). */
const BRAND = "#FFAE00";
const BRAND_TEXT = "#000000";

type Msg = { from: "bot" | "user"; text: string; actions?: TlackoAction[] };

type Gtag = (cmd: "event", name: string, params?: Record<string, string>) => void;
function track(name: string, params?: Record<string, string>) {
  const g = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof g === "function") g("event", name, params);
}

const botMsg = (i: TlackoIntent): Msg => ({ from: "bot", text: i.answer, actions: i.actions });

/**
 * Tlačko — offline chat asistent. Celá logika beží v prehliadači
 * (tlacko-data.ts), žiadne požiadavky na server ani AI.
 */
export default function Tlacko() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([botMsg(WELCOME)]);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    inputRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  function toggle() {
    setOpen((o) => {
      if (!o) track("tlacko_open");
      return !o;
    });
  }

  function send() {
    const text = input.trim();
    if (!text) return;
    const intent = findIntent(text);
    track("tlacko_question", { intent: intent.id });
    setMsgs((m) => [...m, { from: "user", text }, botMsg(intent)]);
    setInput("");
  }

  function onAction(a: TlackoAction) {
    track("tlacko_click", { label: a.label });
    if (a.kind === "intent") {
      setMsgs((m) => [...m, { from: "user", text: a.label }, botMsg(getIntent(a.intent))]);
      return;
    }
    setOpen(false);
    if (a.href.startsWith("/#")) {
      const id = a.href.slice(2);
      const el = typeof document !== "undefined" ? document.getElementById(id) : null;
      if (el && window.location.pathname === "/") {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", `#${id}`);
        return;
      }
    }
    router.push(a.href);
  }

  return (
    <>
      {open && (
        <div role="dialog" aria-label="Tlačko — chat asistent" style={styles.panel}>
          <div style={styles.header}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Tlačko</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Asistent VytlačTo3D</div>
            </div>
            <button type="button" aria-label="Zavrieť chat" onClick={() => setOpen(false)} style={styles.close}>
              ×
            </button>
          </div>

          <div ref={listRef} style={styles.list}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.from === "user" ? "flex-end" : "flex-start" }}>
                <div style={m.from === "user" ? styles.userBubble : styles.botBubble}>{m.text}</div>
                {m.from === "bot" && m.actions && i === msgs.length - 1 && (
                  <div style={styles.actions}>
                    {m.actions.map((a) => (
                      <button key={a.label} type="button" onClick={() => onAction(a)} style={a.kind === "link" ? styles.linkBtn : styles.chip}>
                        {a.label}
                        {a.kind === "link" ? " →" : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            style={styles.form}
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
              style={styles.input}
            />
            <button type="submit" aria-label="Odoslať" style={styles.send}>
              ➤
            </button>
          </form>
        </div>
      )}

      <button type="button" onClick={toggle} aria-label={open ? "Zavrieť chat" : "Otvoriť chat Tlačko"} aria-expanded={open} style={styles.fab}>
        {open ? "×" : "💬"}
      </button>
    </>
  );
}

// z-index 80: pod vyskakovacími oknami webu (89–105) aj pod cookie lištou CookieScript.
const styles: Record<string, CSSProperties> = {
  fab: {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 80,
    width: 56,
    height: 56,
    borderRadius: 999,
    border: "none",
    background: BRAND,
    color: BRAND_TEXT,
    fontSize: 26,
    lineHeight: 1,
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    cursor: "pointer",
  },
  panel: {
    position: "fixed",
    right: 16,
    bottom: 88,
    zIndex: 80,
    width: "min(370px, calc(100vw - 32px))",
    height: "min(540px, calc(100dvh - 120px))",
    display: "flex",
    flexDirection: "column",
    background: "#ffffff",
    color: "#171717",
    borderRadius: 20,
    border: "1px solid #e5e5e5",
    boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
    overflow: "hidden",
    fontSize: 14,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    background: BRAND,
    color: BRAND_TEXT,
  },
  close: { border: "none", background: "transparent", color: BRAND_TEXT, fontSize: 26, lineHeight: 1, cursor: "pointer", padding: 4 },
  list: { flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10, background: "#fafafa" },
  botBubble: {
    maxWidth: "88%",
    whiteSpace: "pre-line",
    background: "#ffffff",
    border: "1px solid #e5e5e5",
    borderRadius: "14px 14px 14px 4px",
    padding: "9px 12px",
    lineHeight: 1.45,
  },
  userBubble: {
    maxWidth: "80%",
    whiteSpace: "pre-line",
    background: "#171717",
    color: "#ffffff",
    borderRadius: "14px 14px 4px 14px",
    padding: "9px 12px",
    lineHeight: 1.45,
  },
  actions: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, maxWidth: "95%" },
  chip: { border: `1px solid ${BRAND}`, background: "#fff7e6", color: "#171717", borderRadius: 999, padding: "6px 11px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  linkBtn: { border: "none", background: BRAND, color: BRAND_TEXT, borderRadius: 999, padding: "6px 12px", fontSize: 13, fontWeight: 800, cursor: "pointer" },
  form: { display: "flex", gap: 8, padding: 10, borderTop: "1px solid #e5e5e5", background: "#ffffff" },
  input: { flex: 1, minWidth: 0, border: "1px solid #d4d4d4", borderRadius: 12, padding: "9px 11px", fontSize: 16, outline: "none", color: "#171717", background: "#ffffff" },
  send: { border: "none", borderRadius: 12, width: 42, background: BRAND, color: BRAND_TEXT, fontSize: 16, cursor: "pointer" },
};
