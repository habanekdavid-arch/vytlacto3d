/**
 * Ambientné škvrny: plynulá paralaxa podľa myši + pomalé vlnenie.
 * Vanilla JS, requestAnimationFrame. Hýbe deťmi kontajnera s [data-blob].
 */

const LERP = 0.08;

export function startAmbientBlobs(container: HTMLElement): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};

  const blobs = Array.from(container.querySelectorAll<HTMLElement>("[data-blob]"));
  if (blobs.length === 0) return () => {};

  // Cieľ a aktuálna (dobiehajúca) pozícia myši, normalizované na -0.5 … 0.5.
  let tx = 0;
  let ty = 0;
  let nx = 0;
  let ny = 0;
  let visible = true;
  let raf = 0;

  const onMove = (e: PointerEvent) => {
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
  };

  const frame = (t: number) => {
    raf = 0;
    nx += (tx - nx) * LERP;
    ny += (ty - ny) * LERP;
    blobs.forEach((blob, i) => {
      const k = (i + 1) * 22; // vzdialenejšie škvrny sa hýbu viac
      const x = nx * k + Math.sin(t / 3000 + i) * 20;
      const y = ny * k + Math.cos(t / 3500 + i) * 20;
      blob.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    });
    schedule();
  };

  // Mimo obrazovky alebo na skrytej karte sa nepočíta nič.
  const schedule = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  });
  io.observe(container);

  const onVisibility = () => schedule();
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  schedule();

  return () => {
    if (raf) cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/**
 * Zrno cez celú stránku: textúra 160×160 z náhodnej šedej, vygenerovaná raz
 * do canvasu, opakovaná ako pozadie. Každých ~120 ms sa posunie, aby "žila".
 */
export function startGrain(): () => void {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const img = ctx.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "9990",
    opacity: "0.07",
    mixBlendMode: "multiply",
    backgroundImage: `url(${canvas.toDataURL("image/png")})`,
    backgroundRepeat: "repeat",
  });
  document.body.appendChild(layer);

  let timer = 0;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    timer = window.setInterval(() => {
      if (document.hidden) return;
      layer.style.backgroundPosition = `${Math.floor(Math.random() * 160)}px ${Math.floor(Math.random() * 160)}px`;
    }, 120);
  }

  return () => {
    window.clearInterval(timer);
    layer.remove();
  };
}
