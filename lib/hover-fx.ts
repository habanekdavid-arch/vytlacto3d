/**
 * "Vektorové tvary vyletujúce z textu" — vanilla JS + Web Animations API.
 *
 * - [data-fx]: pri najazdení myšou výbuch 14–16 tvarov, pri pohybe myši
 *   každých ~80 ms 2 tvary priamo z kurzora. Ten istý prvok vybuchne
 *   najviac raz za 700 ms.
 * - [data-fx="hero"]: navyše malý výbuch (6–7 tvarov) každé ~4 s.
 * Všetky tvary žijú v jednom position: fixed overlayi.
 */

const COLORS = ["#6637ED", "#FF5A1F", "#2F6BFF", "#0E0E11"];
const DARK_BG_INK = "#F2F2F4";
const SHAPES = ["square", "circle", "square-outline", "circle-outline", "dash"] as const;
type Shape = (typeof SHAPES)[number];

const BURST_MIN = 14;
const BURST_MAX = 16;
const TRAIL_EVERY_MS = 80;
const TRAIL_COUNT = 2;
const ELEMENT_THROTTLE_MS = 700;
const HERO_EVERY_MS = 4000;
const MAX_LIVE_SHAPES = 180;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));
const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

function parseRgb(color: string): [number, number, number, number] | null {
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = "1"] = m[1].split(/[,\s/]+/).filter(Boolean);
  return [Number(r), Number(g), Number(b), Number(a)];
}

/** Je text na tmavom pozadí? Hľadá prvé nepriehľadné pozadie smerom nahor. */
function isOnDarkBackground(el: Element): boolean {
  if (el instanceof HTMLElement && el.dataset.fxTheme) return el.dataset.fxTheme === "dark";
  let node: Element | null = el;
  while (node) {
    const rgba = parseRgb(getComputedStyle(node).backgroundColor);
    if (rgba && rgba[3] > 0.5) {
      const [r, g, b] = rgba;
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.45;
    }
    node = node.parentElement;
  }
  return false;
}

/** Rozsah veľkosti tvarov podľa veľkosti písma — väčšie nadpisy, väčšie tvary. */
function sizeRange(el: Element): [number, number] {
  const fontSize = parseFloat(getComputedStyle(el).fontSize) || 16;
  const t = Math.min(1, Math.max(0, (fontSize - 14) / (56 - 14)));
  return [4 + 4 * t, 11 + 9 * t]; // 4–11 px pri bežnom texte … 8–20 px pri veľkom nadpise
}

export function startHoverFx(): () => void {
  if (typeof window === "undefined" || typeof Element.prototype.animate !== "function") return () => {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483000",
    overflow: "hidden",
    contain: "strict",
  });
  document.body.appendChild(overlay);

  let live = 0;
  const lastBurst = new WeakMap<Element, number>();
  const lastTrail = new WeakMap<Element, number>();

  function spawn(x: number, y: number, cx: number, cy: number, dark: boolean, [min, max]: [number, number]) {
    if (live >= MAX_LIVE_SHAPES) return;

    const shape: Shape = pick(SHAPES);
    const size = rand(min, max);
    let color = pick(COLORS);
    if (dark && color === "#0E0E11") color = DARK_BG_INK;

    const node = document.createElement("span");
    const s = node.style;
    s.position = "absolute";
    s.left = `${x}px`;
    s.top = `${y}px`;
    s.boxSizing = "border-box";
    s.willChange = "transform, opacity";
    if (shape === "dash") {
      s.width = `${size * 2.4}px`;
      s.height = "2px";
      s.borderRadius = "1px";
      s.background = color;
    } else {
      s.width = `${size}px`;
      s.height = `${size}px`;
      if (shape.startsWith("circle")) s.borderRadius = "50%";
      if (shape.endsWith("outline")) s.border = `1.5px solid ${color}`;
      else s.background = color;
    }
    s.marginLeft = `${-parseFloat(s.width) / 2}px`;
    s.marginTop = `${-parseFloat(s.height) / 2}px`;

    // Smer od stredu textu, ± 0.7 rad. Z presného stredu → náhodný smer.
    const dx0 = x - cx;
    const dy0 = y - cy;
    const base = Math.hypot(dx0, dy0) < 2 ? rand(0, Math.PI * 2) : Math.atan2(dy0, dx0);
    const angle = base + rand(-0.7, 0.7);
    const distance = rand(30, 170);
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance - rand(10, 28); // mierne nahor
    const rot = rand(-180, 180);

    overlay.appendChild(node);
    live++;
    const anim = node.animate(
      [
        { transform: "translate(0px, 0px) rotate(0deg) scale(0)", opacity: 0 },
        { transform: `translate(${dx * 0.2}px, ${dy * 0.2}px) rotate(${rot * 0.2}deg) scale(1)`, opacity: 1, offset: 0.2 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(0.4)`, opacity: 0 },
      ],
      { duration: rand(700, 1300), easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }
    );
    const done = () => {
      node.remove();
      live--;
    };
    anim.onfinish = done;
    anim.oncancel = done;
  }

  function burst(el: Element, count: number, at?: { x: number; y: number }) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > window.innerHeight) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dark = isOnDarkBackground(el);
    const sizes = sizeRange(el);
    for (let i = 0; i < count; i++) {
      const x = at ? at.x : rand(r.left, r.right);
      const y = at ? at.y : rand(r.top, r.bottom);
      spawn(x, y, cx, cy, dark, sizes);
    }
  }

  const fxTarget = (t: EventTarget | null) => (t instanceof Element ? t.closest("[data-fx]") : null);

  function onPointerOver(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    const el = fxTarget(e.target);
    if (!el || el.contains(e.relatedTarget as Node | null)) return; // pohyb medzi potomkami = nie nový vstup
    const now = performance.now();
    if (now - (lastBurst.get(el) ?? -Infinity) < ELEMENT_THROTTLE_MS) return;
    lastBurst.set(el, now);
    burst(el, randInt(BURST_MIN, BURST_MAX));
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    const el = fxTarget(e.target);
    if (!el) return;
    const now = performance.now();
    if (now - (lastTrail.get(el) ?? -Infinity) < TRAIL_EVERY_MS) return;
    lastTrail.set(el, now);
    burst(el, TRAIL_COUNT, { x: e.clientX, y: e.clientY });
  }

  const heroTimer = window.setInterval(() => {
    if (document.hidden) return;
    document.querySelectorAll('[data-fx="hero"]').forEach((el) => burst(el, randInt(6, 7)));
  }, HERO_EVERY_MS);

  document.addEventListener("pointerover", onPointerOver, { passive: true });
  document.addEventListener("pointermove", onPointerMove, { passive: true });

  return () => {
    document.removeEventListener("pointerover", onPointerOver);
    document.removeEventListener("pointermove", onPointerMove);
    window.clearInterval(heroTimer);
    overlay.remove();
  };
}
