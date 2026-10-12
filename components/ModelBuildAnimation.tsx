"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useT } from "@/lib/i18n/client";

export type BuildPhase = "convert" | "upload" | "analyze";

// Väčší súbor sa v prehliadači neparsuje (zasekol by stránku) — ukáže sa
// všeobecný model. Rovnako pri SVG, ktoré sa na 3D mení až na serveri.
const MAX_PREVIEW_MB = 30;
// Nad týmto počtom trojuholníkov by drôtený model bol nečitateľný a pomalý.
const MAX_EDGE_TRIANGLES = 300_000;

const BRAND = 0xffae00;

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

/** Cieľová výška tlače (0–1) podľa fázy — analýza na serveri nemá priebeh, preto sa blíži k 97 % postupne. */
function targetFor(phase: BuildPhase, progress: number, phaseSeconds: number): number {
  if (phase === "convert") return 0.12 * (1 - Math.exp(-phaseSeconds / 2));
  if (phase === "upload") return 0.12 + 0.6 * Math.min(1, Math.max(0, progress));
  return 0.72 + 0.25 * (1 - Math.exp(-phaseSeconds / 2.5));
}

/**
 * Animácia počas nahrávania modelu: model klienta sa „tlačí“ vrstvu po
 * vrstve — drôtený obrys, pod ním rastúci plný model a oranžová vrstva
 * s tryskou na aktuálnej výške. Rýchlosť sleduje priebeh nahrávania.
 */
export default function ModelBuildAnimation({
  file,
  phase,
  progress,
}: {
  file: File | null;
  phase: BuildPhase;
  progress: number;
}) {
  const t = useT();
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ phase, progress, phaseStart: -1 });
  const [shownPct, setShownPct] = useState(0);

  useEffect(() => {
    const s = stateRef.current;
    if (s.phase !== phase || s.phaseStart < 0) s.phaseStart = performance.now();
    s.phase = phase;
    s.progress = progress;
  }, [phase, progress]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frame = 0;
    const disposables: { dispose: () => void }[] = [];

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      // Bez WebGL ostane viditeľný len točiaci sa indikátor pod plátnom.
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const width = () => Math.max(mount.clientWidth, 280);
    const height = () => mount.clientHeight || 300;
    renderer.setSize(width(), height());
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    disposables.push(renderer);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#F3F4F6");
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd1d5db, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(180, 260, 140);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-140, 120, -100);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(38, width() / height(), 0.1, 10000);
    const turntable = new THREE.Group();
    scene.add(turntable);

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    let bounds = { minY: 0, maxY: 1, size: new THREE.Vector3(1, 1, 1) };
    let layer: THREE.Group | null = null;
    let nozzle: THREE.Group | null = null;
    let shown = 0;
    let last = performance.now();
    let lastPct = -1;

    function build(geometries: THREE.BufferGeometry[]) {
      if (disposed) return;
      // Spoločný stred a postavenie na podložku.
      const box = new THREE.Box3();
      for (const g of geometries) {
        g.computeBoundingBox();
        if (g.boundingBox) box.union(g.boundingBox);
      }
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      bounds = { minY: 0, maxY: size.y || 1, size };

      const solidMat = new THREE.MeshStandardMaterial({
        color: BRAND,
        roughness: 0.55,
        metalness: 0.02,
        side: THREE.DoubleSide,
        clippingPlanes: [clip],
      });
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.55 });
      const ghostMat = new THREE.MeshBasicMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.12, depthWrite: false });
      disposables.push(solidMat, edgeMat, ghostMat);

      const triangles = geometries.reduce((n, g) => n + (g.index ? g.index.count : g.getAttribute("position").count) / 3, 0);
      for (const g of geometries) {
        g.translate(-center.x, -box.min.y, -center.z);
        g.computeVertexNormals();
        disposables.push(g);
        turntable.add(new THREE.Mesh(g, solidMat));
        if (triangles <= MAX_EDGE_TRIANGLES) {
          const edges = new THREE.EdgesGeometry(g, 25);
          disposables.push(edges);
          turntable.add(new THREE.LineSegments(edges, edgeMat));
        } else {
          turntable.add(new THREE.Mesh(g, ghostMat));
        }
      }

      // Aktuálna vrstva: priesvitná oranžová rovina s obrysom.
      const span = Math.max(size.x, size.z) * 1.25;
      const planeGeo = new THREE.PlaneGeometry(span, span);
      planeGeo.rotateX(-Math.PI / 2);
      const planeMat = new THREE.MeshBasicMaterial({ color: BRAND, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
      const outlineGeo = new THREE.EdgesGeometry(planeGeo);
      const outlineMat = new THREE.LineBasicMaterial({ color: BRAND, transparent: true, opacity: 0.9 });
      disposables.push(planeGeo, planeMat, outlineGeo, outlineMat);
      layer = new THREE.Group();
      layer.add(new THREE.Mesh(planeGeo, planeMat), new THREE.LineSegments(outlineGeo, outlineMat));
      scene.add(layer);

      // Tryska: tmavé teleso s oranžovým hrotom.
      const r = maxDim * 0.035;
      const bodyGeo = new THREE.CylinderGeometry(r, r, r * 2.2, 20);
      bodyGeo.translate(0, r * 2.2, 0);
      const tipGeo = new THREE.ConeGeometry(r, r * 1.2, 20);
      tipGeo.rotateX(Math.PI);
      tipGeo.translate(0, r * 0.6, 0);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 });
      const tipMat = new THREE.MeshStandardMaterial({ color: BRAND, emissive: BRAND, emissiveIntensity: 0.35 });
      disposables.push(bodyGeo, tipGeo, bodyMat, tipMat);
      nozzle = new THREE.Group();
      nozzle.add(new THREE.Mesh(bodyGeo, bodyMat), new THREE.Mesh(tipGeo, tipMat));
      scene.add(nozzle);

      const distance = maxDim * 2.1;
      camera.position.set(distance * 0.85, size.y * 0.55 + distance * 0.55, distance * 0.95);
      camera.near = Math.max(0.1, maxDim / 200);
      camera.far = maxDim * 50;
      camera.lookAt(0, size.y * 0.42, 0);
      camera.updateProjectionMatrix();
    }

    function animate(now: number) {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      const target = targetFor(s.phase, s.progress, (now - s.phaseStart) / 1000);
      shown += (target - shown) * Math.min(1, dt * 2.5);

      const h = bounds.minY + (bounds.maxY - bounds.minY) * shown;
      clip.constant = h;
      if (layer) layer.position.y = h;
      if (nozzle) {
        const tt = now / 1000;
        nozzle.position.set(
          Math.sin(tt * 2.3) * bounds.size.x * 0.4,
          h,
          Math.cos(tt * 1.7) * bounds.size.z * 0.4
        );
      }
      if (!reduceMotion) turntable.rotation.y += dt * 0.35;

      const pct = Math.round(shown * 100);
      if (pct !== lastPct) {
        lastPct = pct;
        setShownPct(pct);
      }
      renderer.render(scene, camera);
    }

    (async () => {
      let geometries: THREE.BufferGeometry[] | null = null;
      try {
        geometries = file ? await readGeometries(file) : null;
      } catch {
        geometries = null;
      }
      build(geometries ?? [fallbackGeometry()]);
      if (disposed) return;
      // Plátno až s hotovým modelom — dovtedy je vidieť indikátor načítania.
      mount.appendChild(renderer.domElement);
      frame = requestAnimationFrame(animate);
    })();

    const ro = new ResizeObserver(() => {
      renderer.setSize(width(), height());
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      for (const d of disposables) d.dispose();
      renderer.domElement.remove();
    };
  }, [file]);

  const label =
    phase === "convert"
      ? t("Prevádzam SVG na 3D model…")
      : phase === "upload"
      ? t("Nahrávam model… {n} %", { n: Math.round(Math.min(1, Math.max(0, progress)) * 100) })
      : t("Analyzujem model a počítam cenu…");

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-neutral-500">{t("3D náhľad")}</div>
          <div className="text-lg font-extrabold text-neutral-900">{t("Tlačíme váš model")}</div>
        </div>
        <div className="rounded-full bg-[#FFAE00]/15 px-3 py-1 text-xs font-bold text-neutral-800">{shownPct} %</div>
      </div>

      <div ref={mountRef} className="relative h-[300px] w-full overflow-hidden rounded-2xl bg-neutral-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-[#FFAE00]" />
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full rounded-full bg-[#FFAE00] transition-[width] duration-300" style={{ width: `${shownPct}%` }} />
        </div>
        <div className="mt-2 text-sm font-bold text-neutral-900">{label}</div>
        <div className="text-xs text-neutral-500">
          {t("Počkajte chvíľu, pripravujeme 3D náhľad a výpočet parametrov.")}
        </div>
      </div>
    </div>
  );
}
