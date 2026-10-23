"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { getColor } from "@/components/StlViewer";
import { splitIntoParts } from "@/lib/model-parts";
import { MULTICOLOR_MAX_PARTS, isMulticolor } from "@/lib/multicolor";
import { useT } from "@/lib/i18n/client";
import type { Product } from "@/content/produkty";

// Model sa pri každom prejdení myšou nesťahuje znova — geometria ostáva
// v pamäti pre celú stránku.
const geometryCache = new Map<string, Promise<THREE.BufferGeometry>>();

function loadGeometry(url: string) {
  let promise = geometryCache.get(url);
  if (!promise) {
    promise = new STLLoader().loadAsync(url).then((g) => {
      // STL je otočené osou Z nahor — rovnako ako v 3D náhľade.
      g.rotateX(-Math.PI / 2);
      g.computeVertexNormals();
      g.computeBoundingBox();
      const box = g.boundingBox!;
      const center = new THREE.Vector3();
      box.getCenter(center);
      g.translate(-center.x, -box.min.y, -center.z);
      g.computeBoundingBox();
      return g;
    });
    promise.catch(() => geometryCache.delete(url));
    geometryCache.set(url, promise);
  }
  return promise;
}

// Viacfarebný produkt: diely modelu (poradie ako v lib/model-parts).
const partsCache = new Map<string, Promise<THREE.BufferGeometry[] | null>>();

function loadParts(url: string) {
  let promise = partsCache.get(url);
  if (!promise) {
    promise = loadGeometry(url).then((g) => splitIntoParts(g, MULTICOLOR_MAX_PARTS)?.map((p) => p.geometry) ?? null);
    partsCache.set(url, promise);
  }
  return promise;
}

/** Otáčajúci sa 3D model cez celú plochu náhľadu (bez ovládania myšou). */
function SpinningModel({
  url,
  color,
  partColors,
  onReady,
}: {
  url: string;
  color: string;
  /** Farby dielov viacfarebného produktu (id farieb). */
  partColors?: string[];
  onReady: () => void;
}) {
  const partColorsKey = partColors?.join(",") ?? "";
  const mountRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let frame = 0;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // bez WebGL ostane obrázok
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const size = () => [Math.max(mount.clientWidth, 1), Math.max(mount.clientHeight, 1)] as const;
    renderer.setSize(...size());
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd1d5db, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(180, 260, 140);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-140, 130, 110);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(36, size()[0] / size()[1], 0.1, 10000);
    const material = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.55,
      metalness: 0.02,
      clearcoat: 0.16,
      clearcoatRoughness: 0.7,
      side: THREE.DoubleSide, // aj model s plochami otočenými dovnútra vyzerá plný
    });
    const turntable = new THREE.Group();
    scene.add(turntable);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let last = performance.now();
    const animate = (now: number) => {
      if (disposed) return;
      frame = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!reduceMotion) turntable.rotation.y += dt * 0.7;
      renderer.render(scene, camera);
    };

    const colors = partColorsKey ? partColorsKey.split(",") : [];
    const partMaterials: THREE.Material[] = [];
    Promise.all([loadGeometry(url), colors.length ? loadParts(url) : Promise.resolve(null)])
      .then(([geometry, parts]) => {
        if (disposed) return;
        const box = geometry.boundingBox!;
        const dims = new THREE.Vector3();
        box.getSize(dims);
        const maxDim = Math.max(dims.x, dims.y, dims.z) || 1;
        if (parts && parts.length >= 2) {
          parts.forEach((part, i) => {
            const m = material.clone();
            m.color.set(colors[i] ? getColor(colors[i]) : color);
            partMaterials.push(m);
            turntable.add(new THREE.Mesh(part, m));
          });
        } else {
          turntable.add(new THREE.Mesh(geometry, material));
        }
        const distance = maxDim * 1.95;
        camera.position.set(distance * 0.85, dims.y * 0.5 + distance * 0.5, distance * 0.95);
        camera.near = Math.max(0.1, maxDim / 200);
        camera.far = maxDim * 50;
        camera.lookAt(0, dims.y * 0.45, 0);
        camera.updateProjectionMatrix();
        mount.appendChild(renderer.domElement);
        last = performance.now();
        frame = requestAnimationFrame(animate);
        onReadyRef.current();
      })
      .catch(() => {
        // Model sa nepodarilo načítať — ostane obrázok.
      });

    const ro = new ResizeObserver(() => {
      const [w, h] = size();
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(mount);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      material.dispose();
      partMaterials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      // Geometriu nemažeme — je v cache pre ďalšie prejdenie myšou.
    };
  }, [url, color, partColorsKey]);

  return <div ref={mountRef} className="absolute inset-0" />;
}

/**
 * Karta produktu: vizualizácia (obrázok), po prejdení myšou nad kartou
 * plynulo prejde do otáčajúceho sa 3D modelu. Na dotykových zariadeniach
 * 3D zapína tlačidlo „3D“.
 */
export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const t = useT();
  const [active, setActive] = useState(false); // chce sa ukázať 3D
  const [mounted, setMounted] = useState(false); // 3D scéna existuje
  const [ready, setReady] = useState(false); // model je vykreslený
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const href = `/produkty/${product.slug}`;
  const name = t(product.name);

  function show() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setActive(true);
    setMounted(true);
  }

  function hide() {
    setActive(false);
    // Scénu zrušíme až po doznení prechodu — šetrí to WebGL kontexty.
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setMounted(false);
      setReady(false);
    }, 400);
  }

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  // Dotyk vyvolá aj mouseenter — tam 3D ovláda len tlačidlo.
  const canHover = () => window.matchMedia("(hover: hover)").matches;
  const showModel = active && ready;

  return (
    <article
      onMouseEnter={() => canHover() && show()}
      onMouseLeave={() => canHover() && hide()}
      className="group flex flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FFAE00]/10"
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        <Image
          src={product.image}
          alt={name}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
          className={[
            "object-cover transition duration-500",
            showModel ? "scale-105 opacity-0" : "opacity-100",
          ].join(" ")}
        />

        {mounted && (
          <div
            className={[
              "absolute inset-0 bg-neutral-100 transition-opacity duration-300",
              showModel ? "opacity-100" : "opacity-0",
            ].join(" ")}
            aria-hidden
          >
            <SpinningModel
              url={product.file}
              color={getColor(product.defaults?.color ?? "gray")}
              partColors={product.defaults?.partColors}
              onReady={() => setReady(true)}
            />
          </div>
        )}

        {active && !ready && (
          <div className="pointer-events-none absolute bottom-3 right-3 h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-[#FFAE00]" />
        )}

        {/* Celá plocha je odkaz na detail; 3D vrstva pod ním neprekáža kliknutiu. */}
        <Link href={href} className="absolute inset-0 z-10" aria-label={name} />

        <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col items-start gap-1">
          <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-neutral-900 shadow-sm">
            {t(product.category)}
          </span>
          {isMulticolor(product.defaults?.partColors) && <MulticolorBadge label={t("Viacfarebný")} />}
        </div>

        <button
          type="button"
          onClick={() => (active ? hide() : show())}
          aria-pressed={active}
          aria-label={active ? t("Zobraziť obrázok") : t("Zobraziť 3D model")}
          className={[
            "absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow-sm transition",
            active ? "bg-[#FFAE00] text-black" : "bg-white/90 text-neutral-900 hover:bg-white",
          ].join(" ")}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
            <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
            <path d="M3 7l9 5 9-5M12 12v10" />
          </svg>
          3D
        </button>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-extrabold text-neutral-900">
          <Link href={href} className="hover:underline">
            {name}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-neutral-600">{t(product.subtitle)}</p>
        <p className="mt-3 text-xs font-semibold text-neutral-500">
          {product.dimsMm.join(" × ")} mm · {t("veľkosť si upravíte")}
        </p>
        <div className="mt-auto pt-5">
          <Link
            href={`/?produkt=${product.slug}#kalkulator`}
            className="flex w-full items-center justify-center rounded-2xl bg-[#FFAE00] px-4 py-3 text-sm font-bold text-black shadow-sm transition hover:bg-[#e09d00]"
          >
            {t("Prispôsobiť a objednať")}
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Štítok viacfarebného produktu — farebné bodky dúhy. */
export function MulticolorBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
      <span className="flex -space-x-1" aria-hidden>
        {["#F97316", "#16A34A", "#9333EA", "#2563EB"].map((c) => (
          <span key={c} className="h-2.5 w-2.5 rounded-full ring-1 ring-black/40" style={{ background: c }} />
        ))}
      </span>
      {label}
    </span>
  );
}
