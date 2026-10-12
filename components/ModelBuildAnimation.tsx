"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useT } from "@/lib/i18n/client";

export type BuildPhase = "convert" | "upload" | "analyze";

// Väčší súbor sa v prehliadači neparsuje (zasekol by stránku) — ukáže sa
// všeobecný model. Rovnako pri SVG, kým sa na serveri neprevedie na STL.
const MAX_PREVIEW_MB = 25;
// Nad týmto počtom trojuholníkov by výpočet hrán zasekol animáciu.
const MAX_EDGE_TRIANGLES = 60_000;

const BRAND = 0xffae00;
// Rýchlosť tlače (podiel výšky za sekundu): bežne ~6 s na celý model,
// po dokončení nahrávania sa model dotlačí rýchlejšie.
const PRINT_SPEED = 0.17;
const FINISH_SPEED = 0.6;
// Ako dlho ostane „Hotovo“, než sa karta prepne na 3D náhľad (ms).
const DONE_HOLD_MS = 650;
const FADE_MS = 250;

/** Geometrie modelu klienta priamo zo súboru (ešte pred nahratím na server). */
async function readGeometries(file: File): Promise<THREE.BufferGeometry[] | null> {
  if (file.size > MAX_PREVIEW_MB * 1024 * 1024) return null;
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith(".obj")) {
    const group = new OBJLoader().parse(new TextDecoder().decode(buffer));
    const out: THREE.BufferGeometry[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) out.push(child.geometry);
    });
    return out.length ? out : null;
  }
  if (name.endsWith(".stl")) {
    const geometry = new STLLoader().parse(buffer);
    // STL je otočené osou Z nahor — rovnako ako v 3D náhľade.
    geometry.rotateX(-Math.PI / 2);
    return [geometry];
  }
  return null;
}

/** Všeobecný model (váza), keď sa súbor klienta nedá zobraziť. */
function fallbackGeometry(): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const y = (i / 24) * 60;
    const r = 14 + 7 * Math.sin((i / 24) * Math.PI * 1.4) + (i === 0 ? -2 : 0);
    pts.push(new THREE.Vector2(r, y));
  }
  return new THREE.LatheGeometry(pts, 48);
}

/**
 * Najvyššia výška tlače (0–1), kam smie animácia v danej fáze dôjsť.
 * Pri nahrávaní rastie aj s časom, keby prehliadač priebeh nehlásil.
 */
function ceilingFor(phase: BuildPhase, progress: number, done: boolean, phaseSeconds: number): number {
  if (done) return 1;
  if (phase === "convert") return 0.15;
  if (phase === "upload") {
    const byTime = 0.8 * (1 - Math.exp(-phaseSeconds / 4));
    return 0.15 + 0.5 * Math.max(Math.min(1, Math.max(0, progress)), byTime);
  }
  return 0.92;
}

/**
 * Animácia počas nahrávania modelu: model klienta sa „tlačí“ vrstvu po
 * vrstve — drôtený obrys, rastúci oranžový model so žiariacou čerstvou
 * vrstvou a tryska. Tlač ide vlastným plynulým tempom; priebeh nahrávania
 * a analýzy len určuje, kam najďalej smie dôjsť. Po dokončení (`done`)
 * sa model dotlačí, ukáže „Hotovo“ a zavolá sa `onFinished`.
 */
export default function ModelBuildAnimation({
  file,
  phase,
  progress,
  done = false,
  onFinished,
}: {
  file: File | null;
  phase: BuildPhase;
  progress: number;
  done?: boolean;
  onFinished?: () => void;
}) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const shownRef = useRef(0);
  const stateRef = useRef({ phase, progress, done, onFinished, phaseStart: 0 });
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Po výbere súboru posunúť stránku tak, aby bola animácia celá vidieť.
  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  useEffect(() => {
    const prev = stateRef.current;
    const phaseStart = prev.phase !== phase || !prev.phaseStart ? performance.now() : prev.phaseStart;
    stateRef.current = { phase, progress, done, onFinished, phaseStart };
  }, [phase, progress, done, onFinished]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frame = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const disposables: { dispose: () => void }[] = [];

    // Percentá a pruh sa menia priamo v DOM-e (60× za sekundu bez re-renderu).
    const paint = (shown: number) => {
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown})`;
      if (pctRef.current) pctRef.current.textContent = `${Math.round(shown * 100)} %`;
    };

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.localClippingEnabled = true;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.inset = "0";
      renderer.domElement.style.opacity = "0";
      renderer.domElement.style.transition = "opacity 300ms ease";
      disposables.push(renderer);
    } catch {
      // Bez WebGL ostane točiaci sa indikátor; priebeh a dokončenie bežia ďalej.
      renderer = null;
    }

    const width = () => Math.max(mount.clientWidth, 260);
    const height = () => mount.clientHeight || 300;
    renderer?.setSize(width(), height());

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#F3F4F6");
    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd1d5db, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(180, 260, 140);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-140, 120, -100);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(36, width() / height(), 0.1, 10000);
    const turntable = new THREE.Group();
    scene.add(turntable);

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    // Plný model: všetko pod výškou h. Žiariaca vrstva: pás [h - band, h].
    const clipTop = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const clipBand = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let size = new THREE.Vector3(1, 1, 1);
    let maxDim = 1;
    let layer: THREE.Group | null = null;
    let hotMat: THREE.Material | null = null;
    let nozzle: THREE.Group | null = null;
    let built = false;
    let last = performance.now();
    let doneAt = 0;

    function build(geometries: THREE.BufferGeometry[]) {
      const box = new THREE.Box3();
      for (const g of geometries) {
        g.computeBoundingBox();
        if (g.boundingBox) box.union(g.boundingBox);
      }
      const center = new THREE.Vector3();
      box.getCenter(center);
      size = new THREE.Vector3();
      box.getSize(size);
      maxDim = Math.max(size.x, size.y, size.z) || 1;

      const solidMat = new THREE.MeshStandardMaterial({
        color: BRAND,
        roughness: 0.5,
        metalness: 0.02,
        side: THREE.DoubleSide,
        clippingPlanes: [clipTop],
      });
      const hot = new THREE.MeshStandardMaterial({
        color: 0xffe2a0,
        emissive: 0xffc94d,
        emissiveIntensity: 0.9,
        side: THREE.DoubleSide,
        clippingPlanes: [clipTop, clipBand],
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.5 });
      const ghostMat = new THREE.MeshBasicMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.12, depthWrite: false });
      hotMat = hot;
      disposables.push(solidMat, hot, edgeMat, ghostMat);

      const triangles = geometries.reduce(
        (n, g) => n + (g.index ? g.index.count : g.getAttribute("position").count) / 3,
        0
      );
      for (const g of geometries) {
        g.translate(-center.x, -box.min.y, -center.z);
        // Normály vždy prepočítať — niektoré exporty STL ich majú nulové (model by bol čierny).
        g.computeVertexNormals();
        disposables.push(g);
        turntable.add(new THREE.Mesh(g, solidMat), new THREE.Mesh(g, hot));
        if (triangles <= MAX_EDGE_TRIANGLES) {
          const edges = new THREE.EdgesGeometry(g, 25);
          disposables.push(edges);
          turntable.add(new THREE.LineSegments(edges, edgeMat));
        } else {
          turntable.add(new THREE.Mesh(g, ghostMat));
        }
      }

      // Tlačová podložka s mriežkou.
      const plateR = Math.max(size.x, size.z) * 0.85 + maxDim * 0.05;
      const plateH = maxDim * 0.025;
      const plateGeo = new THREE.CylinderGeometry(plateR, plateR, plateH, 64);
      plateGeo.translate(0, -plateH / 2 - maxDim * 0.002, 0);
      const plateMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.8 });
      const grid = new THREE.GridHelper(plateR * 1.4, 12, 0xd1d5db, 0xd1d5db);
      grid.position.y = -maxDim * 0.001;
      disposables.push(plateGeo, plateMat, grid.geometry, grid.material as THREE.Material);
      turntable.add(new THREE.Mesh(plateGeo, plateMat), grid);

      // Aktuálna vrstva: jemná oranžová rovina s obrysom.
      const span = Math.max(size.x, size.z) * 1.3;
      const planeGeo = new THREE.PlaneGeometry(span, span);
      planeGeo.rotateX(-Math.PI / 2);
      const planeMat = new THREE.MeshBasicMaterial({ color: BRAND, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
      const outlineGeo = new THREE.EdgesGeometry(planeGeo);
      const outlineMat = new THREE.LineBasicMaterial({ color: BRAND, transparent: true, opacity: 0.75 });
      disposables.push(planeGeo, planeMat, outlineGeo, outlineMat);
      layer = new THREE.Group();
      layer.add(new THREE.Mesh(planeGeo, planeMat), new THREE.LineSegments(outlineGeo, outlineMat));
      scene.add(layer);

      // Tryska: tmavé teleso s oranžovým hrotom.
      const r = maxDim * 0.035;
      const bodyGeo = new THREE.CylinderGeometry(r, r, r * 2.2, 20);
      bodyGeo.translate(0, r * 2.3, 0);
      const tipGeo = new THREE.ConeGeometry(r, r * 1.2, 20);
      tipGeo.rotateX(Math.PI);
      tipGeo.translate(0, r * 0.6, 0);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 });
      const tipMat = new THREE.MeshStandardMaterial({ color: BRAND, emissive: BRAND, emissiveIntensity: 0.4 });
      disposables.push(bodyGeo, tipGeo, bodyMat, tipMat);
      nozzle = new THREE.Group();
      nozzle.add(new THREE.Mesh(bodyGeo, bodyMat), new THREE.Mesh(tipGeo, tipMat));
      scene.add(nozzle);

      const distance = maxDim * 2.15;
      camera.position.set(distance * 0.85, size.y * 0.5 + distance * 0.55, distance * 0.95);
      camera.near = Math.max(0.1, maxDim / 200);
      camera.far = maxDim * 50;
      camera.lookAt(0, size.y * 0.4, 0);
      camera.updateProjectionMatrix();
      built = true;
    }

    function animate(now: number) {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = stateRef.current;

      // Plynulé tempo: k povolenému stropu ide stálou rýchlosťou a tesne
      // pred ním spomalí, takže sa nezastaví naprázdno ani neskáče.
      let shown = shownRef.current;
      const ceiling = ceilingFor(s.phase, s.progress, s.done, s.phaseStart ? (now - s.phaseStart) / 1000 : 0);
      const remaining = ceiling - shown;
      if (remaining > 0) {
        const ease = s.done ? 1 : Math.min(1, Math.max(0.08, remaining / 0.12));
        shown = Math.min(ceiling, shown + (s.done ? FINISH_SPEED : PRINT_SPEED) * ease * dt);
        shownRef.current = shown;
        paint(shown);
      }

      if (s.done && shown >= 1 && !doneAt) {
        doneAt = now;
        setFinished(true);
        timers.push(setTimeout(() => setLeaving(true), DONE_HOLD_MS));
        timers.push(setTimeout(() => stateRef.current.onFinished?.(), DONE_HOLD_MS + FADE_MS));
      }

      if (!renderer || !built) return;
      const h = size.y * shown;
      const band = Math.max(size.y * 0.035, maxDim * 0.01);
      clipTop.constant = h;
      clipBand.constant = -(h - band);
      if (layer) {
        layer.position.y = h;
        layer.visible = shown < 1;
      }
      if (hotMat) hotMat.visible = shown < 1;
      if (nozzle) {
        const tt = now / 1000;
        const lift = doneAt ? Math.min(1, (now - doneAt) / 400) * maxDim * 0.25 : 0;
        nozzle.position.set(
          Math.sin(tt * 3.1) * size.x * 0.38,
          h + lift,
          Math.sin(tt * 2.3 + 1) * size.z * 0.38
        );
      }
      if (!reduceMotion) turntable.rotation.y += dt * 0.4;
      renderer.render(scene, camera);
    }

    (async () => {
      let geometries: THREE.BufferGeometry[] | null = null;
      if (renderer) {
        try {
          geometries = file ? await readGeometries(file) : null;
        } catch {
          geometries = null;
        }
      }
      if (disposed) return;
      if (renderer) {
        try {
          build(geometries ?? [fallbackGeometry()]);
          // Plátno až s hotovým modelom — dovtedy je vidieť indikátor načítania.
          mount.appendChild(renderer.domElement);
          requestAnimationFrame(() => {
            if (renderer) renderer.domElement.style.opacity = "1";
          });
        } catch (e) {
          // Chyba 3D scény nesmie zastaviť priebeh — ostane indikátor a pruh.
          console.error("BUILD ANIMATION ERROR:", e);
          renderer = null;
        }
      }
      last = performance.now();
      frame = requestAnimationFrame(animate);
    })();

    const ro = new ResizeObserver(() => {
      if (!renderer) return;
      renderer.setSize(width(), height());
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      ro.disconnect();
      for (const d of disposables) d.dispose();
      renderer?.domElement.remove();
    };
  }, [file]);

  const steps = [
    { key: "upload", label: phase === "convert" ? t("Prevod SVG") : t("Nahrávanie") },
    { key: "analyze", label: t("Analýza a cena") },
    { key: "preview", label: t("3D náhľad") },
  ];
  const activeStep = finished ? 2 : done || phase === "analyze" ? 1 : 0;

  const label = finished
    ? t("Hotovo! Otváram 3D náhľad…")
    : phase === "convert"
    ? t("Prevádzam SVG na 3D model…")
    : phase === "upload"
    ? t("Nahrávam model…")
    : t("Analyzujem model a počítam cenu…");

  return (
    <div
      ref={rootRef}
      className={[
        "scroll-mb-6 scroll-mt-28 rounded-3xl border border-neutral-200 bg-white p-4 transition-all duration-300",
        leaving ? "translate-y-1 opacity-0" : "opacity-100",
      ].join(" ")}
      aria-live="polite"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-neutral-500">{t("3D náhľad")}</div>
          <div className="text-lg font-extrabold text-neutral-900">{t("Tlačíme váš model")}</div>
        </div>
        <span
          ref={pctRef}
          className={[
            "rounded-full px-3 py-1 text-xs font-bold tabular-nums transition-colors",
            finished ? "bg-emerald-100 text-emerald-700" : "bg-[#FFAE00]/15 text-neutral-800",
          ].join(" ")}
        >
          0 %
        </span>
      </div>

      <div ref={mountRef} className="relative h-[300px] w-full overflow-hidden rounded-2xl bg-neutral-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-[#FFAE00]" />
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-2 overflow-hidden rounded-full bg-neutral-100">
          <div
            ref={barRef}
            className={[
              "absolute inset-0 origin-left rounded-full",
              finished ? "bg-emerald-500" : "bg-[#FFAE00]",
            ].join(" ")}
            style={{ transform: "scaleX(0)" }}
          />
          {!finished && (
            <div className="v3d-shimmer absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 text-sm font-bold text-neutral-900">
          {finished ? (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 6.5l2.2 2.2 4.8-5" />
              </svg>
            </span>
          ) : (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FFAE00] opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FFAE00]" />
            </span>
          )}
          {label}
        </div>

        <ol className="mt-3 grid grid-cols-3 gap-2">
          {steps.map((step, i) => {
            const state = i < activeStep || finished ? "done" : i === activeStep ? "active" : "todo";
            return (
              <li
                key={step.key}
                className={[
                  "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors",
                  state === "done"
                    ? "bg-emerald-50 text-emerald-700"
                    : state === "active"
                    ? "bg-[#FFAE00]/15 text-neutral-900"
                    : "bg-neutral-50 text-neutral-400",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] font-bold",
                    state === "done"
                      ? "bg-emerald-500 text-white"
                      : state === "active"
                      ? "bg-[#FFAE00] text-black"
                      : "bg-neutral-200 text-neutral-500",
                  ].join(" ")}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span className="truncate">{step.label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <style>{`.v3d-shimmer{animation:v3d-shimmer 1.4s linear infinite}@keyframes v3d-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}@media (prefers-reduced-motion: reduce){.v3d-shimmer{animation:none;display:none}}`}</style>
    </div>
  );
}
