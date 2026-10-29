"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useT } from "@/lib/i18n/client";
import { splitIntoParts } from "@/lib/model-parts";
import {
  MULTICOLOR_COLORS,
  MULTICOLOR_FEE_EUR,
  MULTICOLOR_MAX_COLORS,
  MULTICOLOR_MAX_PARTS,
  distinctColors,
  isMulticolor,
} from "@/lib/multicolor";
import { COLOR_LABELS } from "@/lib/print-options";
import { addVat, formatEur } from "@/lib/vat";
import { getColor } from "@/lib/color-hex";

export { getColor };

type Props = {
  fileKey: string;
  title?: string;
  colorId?: string;
  height?: number;
  scalePct?: number;
  /**
   * Farby jednotlivých častí (poradie podľa lib/model-parts). Zadané farby
   * alebo `onPartColorsChange` zapnú delenie modelu na časti.
   */
  partColors?: string[];
  /** Zákazník farbí časti kýblikom; bez neho sa farby len zobrazia. */
  onPartColorsChange?: (colors: string[] | undefined) => void;
  /** Viacfarebná tlač je pre aktuálne nastavenie dostupná (PLA). */
  multicolorAllowed?: boolean;
  /** Prečo sa farbiť nedá — zobrazí sa v paneli kýblika. */
  multicolorBlockedReason?: string;
  /** Model sa rozdelil — objemy častí v cm³ (pri 100 %). */
  onPartsDetected?: (volumesCm3: number[]) => void;
  /** Zoznam častí a ich farieb pod náhľadom (pre výrobu); na webe pre zákazníkov netreba. */
  partLegend?: boolean;
};

// Farby, ktorými sa dá farbiť — rovnaké ako v konfigurátore.


function isObjFile(fileKey: string) {
  return fileKey.toLowerCase().split("?")[0].endsWith(".obj");
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();

      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((m) => m.dispose());
      } else {
        material?.dispose();
      }
    }
  });
}

export default function StlViewer({
  fileKey,
  title = "3D náhľad",
  colorId = "black",
  height = 380,
  scalePct = 100,
  partColors,
  onPartColorsChange,
  multicolorAllowed = true,
  multicolorBlockedReason,
  onPartsDetected,
  partLegend = true,
}: Props) {
  const t = useT();
  const mountRef = useRef<HTMLDivElement | null>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const frameRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedColor = useMemo(() => getColor(colorId), [colorId]);

  // Viacfarebná tlač: časti modelu, kýblik a vybraná farba štetca.
  const splitEnabled = !!onPartColorsChange || !!partColors;
  const partMeshesRef = useRef<THREE.Mesh[]>([]);
  const [partCount, setPartCount] = useState(0);
  const [paintOpen, setPaintOpen] = useState(false);
  // Štetec začína inou farbou, než má model, aby prvý klik bolo hneď vidieť.
  const [brush, setBrush] = useState(colorId === "orange" ? "black" : "orange");
  const [hovered, setHovered] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const canPaint = !!onPartColorsChange && partCount >= 2 && multicolorAllowed;
  const paintActive = paintOpen && canPaint;
  // Len zobrazenie (administrácia): čísla častí a ich farby pod náhľadom.
  const [partVolumes, setPartVolumes] = useState<number[]>([]);
  const showLegend = partLegend && !onPartColorsChange && isMulticolor(partColors) && partCount >= 2;
  const hoverEnabled = paintActive || showLegend;
  const paintActiveRef = useRef(false);
  paintActiveRef.current = paintActive;
  const hoverEnabledRef = useRef(false);
  hoverEnabledRef.current = hoverEnabled;
  const splitEnabledRef = useRef(splitEnabled);
  splitEnabledRef.current = splitEnabled;
  const onPartsDetectedRef = useRef(onPartsDetected);
  onPartsDetectedRef.current = onPartsDetected;

  // Ťuknutie na číslo časti v zozname: časť na chvíľu zvýrazníme v náhľade.
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashPart = (index: number) => {
    setHovered(index);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setHovered(null), 1200);
  };
  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  // Klik na časť — vždy s aktuálnymi farbami a štetcom.
  const paintPartRef = useRef<(index: number) => void>(() => {});
  paintPartRef.current = (index: number) => {
    if (!onPartColorsChange || partCount < 2) return;
    const next = Array.from({ length: partCount }, (_, i) => partColors?.[i] || colorId);
    if (next[index] === brush) return;
    next[index] = brush;
    if (distinctColors(next).length > MULTICOLOR_MAX_COLORS) {
      setNotice(t("Na jednom modeli môžu byť najviac {n} farby.", { n: MULTICOLOR_MAX_COLORS }));
      return;
    }
    setNotice(null);
    onPartColorsChange(next);
  };

  function applyColors() {
    const parts = partMeshesRef.current;
    if (parts.length > 0) {
      parts.forEach((mesh, i) => {
        const m = mesh.material as THREE.MeshPhysicalMaterial;
        const id = partColors?.[i];
        m.color.set(id ? getColor(id) : resolvedColor);
        m.emissive.set(hoverEnabled && hovered === i ? 0x3a3a3a : 0x000000);
      });
      return;
    }
    modelRef.current?.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material;
        (Array.isArray(material) ? material : [material]).forEach((m) => {
          if (m instanceof THREE.MeshPhysicalMaterial) m.color.set(resolvedColor);
        });
      }
    });
  }
  const applyColorsRef = useRef(applyColors);
  applyColorsRef.current = applyColors;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !fileKey) return;

    setLoading(true);
    setError(null);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#F3F4F6");
    sceneRef.current = scene;

    const width = Math.max(mount.clientWidth, 320);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 5000);
    camera.position.set(180, 140, 180);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd1d5db, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(180, 260, 140);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 3000;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.65);
    fillLight.position.set(-140, 130, 110);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.45);
    rimLight.position.set(0, 120, -180);
    scene.add(rimLight);

    const floorGeo = new THREE.CircleGeometry(1400, 80);
    const floorMat = new THREE.ShadowMaterial({
      color: 0x000000,
      opacity: 0.12,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 0.95;
    controls.panSpeed = 0.8;
    controls.screenSpacePanning = true;
    controls.minDistance = 10;
    controls.maxDistance = 3000;
    controls.maxPolarAngle = Math.PI / 2.02;
    controlsRef.current = controls;

    // Cesta na webe (hotové produkty v public/) sa načíta priamo.
    const modelUrl = fileKey.startsWith("/")
      ? fileKey
      : `/api/file?key=${encodeURIComponent(fileKey)}`;
    const material = new THREE.MeshPhysicalMaterial({
      color: resolvedColor,
      roughness: 0.58,
      metalness: 0.02,
      clearcoat: 0.16,
      clearcoatRoughness: 0.7,
      // Obe strany: model s plochami otočenými dovnútra (časté pri exportoch)
      // by inak vyzeral dutý — chýbali by plochy natočené k nám.
      side: THREE.DoubleSide,
    });

    let disposed = false;
    let splitTimer: number | undefined;

    function prepareAndAddModel(model: THREE.Object3D, rotateStl = false) {
      try {
        if (rotateStl) {
          model.rotation.x = -Math.PI / 2;
        }

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
            child.castShadow = true;
            child.receiveShadow = false;

            if (child.geometry) {
              child.geometry.computeVertexNormals();
              child.geometry.computeBoundingBox();
            }
          }
        });

        const preBox = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        preBox.getCenter(center);

        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= preBox.min.y;

        const scale = scalePct / 100;
        model.scale.set(scale, scale, scale);

        scene.add(model);
        modelRef.current = model;

        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const distance = maxDim * 1.9;

        camera.position.set(distance * 0.95, distance * 0.72, distance * 1.05);
        camera.near = Math.max(0.1, maxDim / 100);
        camera.far = Math.max(5000, maxDim * 30);
        camera.updateProjectionMatrix();

        controls.target.set(0, size.y * 0.28, 0);
        controls.minDistance = Math.max(8, maxDim * 0.45);
        controls.maxDistance = Math.max(1200, maxDim * 10);
        controls.update();

        setLoading(false);
      } catch (e) {
        console.error("MODEL PREPARE ERROR:", e);
        setError("Nepodarilo sa spracovať model.");
        setLoading(false);
      }
    }

    if (isObjFile(fileKey)) {
      const objLoader = new OBJLoader();

      objLoader.load(
        modelUrl,
        (object) => {
          prepareAndAddModel(object, false);
        },
        undefined,
        () => {
          setError("Nepodarilo sa načítať OBJ.");
          setLoading(false);
        }
      );
    } else {
      const stlLoader = new STLLoader();

      stlLoader.load(
        modelUrl,
        (geometry) => {
          try {
            geometry.computeVertexNormals();
            geometry.computeBoundingBox();

            if (!geometry.boundingBox) {
              setError("Nepodarilo sa spracovať STL.");
              setLoading(false);
              return;
            }

            const mesh = new THREE.Mesh(geometry, material);
            // Skupina — po rozdelení na časti v nej jeden mesh nahradia časti
            // a natočenie, posun aj mierka ostanú.
            const group = new THREE.Group();
            group.add(mesh);
            prepareAndAddModel(group, true);
            if (splitEnabledRef.current) {
              // Až po zobrazení modelu, aby delenie nezdržalo náhľad.
              splitTimer = window.setTimeout(() => {
                if (disposed) return;
                const parts = splitIntoParts(geometry, MULTICOLOR_MAX_PARTS);
                if (!parts || parts.length < 2) {
                  parts?.forEach((p) => p.geometry.dispose());
                  setPartCount(parts?.length ?? 0);
                  return;
                }
                group.remove(mesh);
                geometry.dispose();
                partMeshesRef.current = parts.map((p, i) => {
                  const m = new THREE.Mesh(p.geometry, material.clone());
                  m.castShadow = true;
                  m.userData.partIndex = i;
                  group.add(m);
                  return m;
                });
                setPartCount(parts.length);
                setPartVolumes(parts.map((p) => p.volumeCm3));
                onPartsDetectedRef.current?.(parts.map((p) => p.volumeCm3));
                applyColorsRef.current();
              }, 30);
            }
          } catch {
            setError("Nepodarilo sa spracovať STL.");
            setLoading(false);
          }
        },
        undefined,
        () => {
          setError("Nepodarilo sa načítať STL.");
          setLoading(false);
        }
      );
    }

    // Farbenie: krátky klik/ťuk na časť ju zafarbí; ťahanie otáča model.
    const canvas = renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down: { x: number; y: number } | null = null;
    let hoverQueued = false;
    const pickPart = (ev: PointerEvent): number | null => {
      const parts = partMeshesRef.current;
      if (parts.length === 0) return null;
      const rect = canvas.getBoundingClientRect();
      ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(parts, false)[0];
      return hit ? (hit.object.userData.partIndex as number) : null;
    };
    const onPointerDown = (ev: PointerEvent) => {
      down = { x: ev.clientX, y: ev.clientY };
    };
    const onPointerUp = (ev: PointerEvent) => {
      if (!down || !paintActiveRef.current) return;
      const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
      down = null;
      if (moved > 6) return;
      const index = pickPart(ev);
      if (index !== null) paintPartRef.current(index);
    };
    const onPointerMove = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || ev.buttons || !hoverEnabledRef.current || hoverQueued) return;
      hoverQueued = true;
      requestAnimationFrame(() => {
        hoverQueued = false;
        if (disposed) return;
        const index = pickPart(ev);
        setHovered(index);
        canvas.style.cursor = index !== null ? "pointer" : "";
      });
    };
    const onPointerLeave = () => {
      setHovered(null);
      canvas.style.cursor = "";
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);

    const handleResize = () => {
      const currentMount = mountRef.current;
      const currentRenderer = rendererRef.current;
      const currentCamera = cameraRef.current;

      if (!currentMount || !currentRenderer || !currentCamera) return;

      const nextWidth = Math.max(currentMount.clientWidth, 320);
      currentRenderer.setSize(nextWidth, height);
      currentCamera.aspect = nextWidth / height;
      currentCamera.updateProjectionMatrix();
    };

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      if (
        rendererRef.current &&
        sceneRef.current &&
        cameraRef.current &&
        controlsRef.current
      ) {
        controlsRef.current.update();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    handleResize();
    animate();
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      window.clearTimeout(splitTimer);
      partMeshesRef.current = [];
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", handleResize);

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      if (modelRef.current) {
        disposeObject(modelRef.current);

        if (sceneRef.current) {
          sceneRef.current.remove(modelRef.current);
        }

        modelRef.current = null;
      }

      material.dispose();

      if (rendererRef.current) {
        rendererRef.current.dispose();

        const canvas = rendererRef.current.domElement;
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }

        rendererRef.current = null;
      }

      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [fileKey, height]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;

    const scale = scalePct / 100;
    model.scale.set(scale, scale, scale);

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    if (controlsRef.current) {
      controlsRef.current.target.set(0, size.y * 0.28, 0);
      controlsRef.current.update();
    }
  }, [scalePct]);

  useEffect(() => {
    applyColors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedColor, partColors, hovered, hoverEnabled]);

  useEffect(() => {
    if (!paintActive) setNotice(null);
    if (!hoverEnabled) setHovered(null);
  }, [paintActive, hoverEnabled]);

  const usedColors = distinctColors(partColors);

  const paintPanel = (
    <>
    <div className="text-sm font-extrabold text-neutral-900">{t("Viacfarebná tlač")}</div>
    {canPaint ? (
      <>
        <p className="mt-1 leading-relaxed">
          {t("Vyberte farbu a kliknite na časť modelu alebo na jej číslo nižšie.")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 sm:gap-1.5">
          {MULTICOLOR_COLORS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setBrush(id)}
              aria-label={t(COLOR_LABELS[id] ?? id)}
              title={t(COLOR_LABELS[id] ?? id)}
              className={[
                "h-9 w-9 rounded-lg border transition sm:h-7 sm:w-7",
                id === "white" ? "border-neutral-300" : "border-black/10",
                brush === id ? "outline outline-2 outline-offset-1 outline-[#7C3AED]" : "",
              ].join(" ")}
              style={{ background: getColor(id) }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span>
            {t("Použité farby")}: {Math.max(usedColors.length, 1)}/{MULTICOLOR_MAX_COLORS}
          </span>
          <span className="font-bold text-neutral-900">
            +{formatEur(addVat(MULTICOLOR_FEE_EUR))}
          </span>
        </div>
        <div className="mt-3 font-semibold text-neutral-900">{t("Časti modelu ({n})", { n: partCount })}</div>
        <div className="mt-1.5 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto sm:max-h-32">
          {Array.from({ length: partCount }, (_, i) => {
            const id = partColors?.[i] || colorId;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  paintPartRef.current(i);
                  flashPart(i);
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                aria-label={t("Časť {n}", { n: i + 1 })}
                className={[
                  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border bg-white px-2 font-bold text-neutral-800 transition sm:min-h-7",
                  hovered === i ? "border-[#FFAE00] ring-2 ring-[#FFAE00]/40" : "border-neutral-200",
                ].join(" ")}
              >
                <span
                  className={["h-3.5 w-3.5 rounded-full", id === "white" ? "border border-neutral-300" : ""].join(" ")}
                  style={{ background: getColor(id) }}
                />
                {i + 1}
              </button>
            );
          })}
        </div>
        {notice && <div className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 font-semibold text-red-600">{notice}</div>}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => {
              onPartColorsChange?.(undefined);
              setNotice(null);
            }}
            disabled={!partColors}
            className="flex-1 rounded-lg border border-neutral-200 bg-white px-2 py-2 font-bold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40 sm:py-1.5"
          >
            {t("Jedna farba")}
          </button>
          <button
            type="button"
            onClick={() => setPaintOpen(false)}
            className="flex-1 rounded-lg bg-black px-2 py-2 font-bold text-white transition hover:bg-neutral-800 sm:py-1.5"
          >
            {t("Hotovo")}
          </button>
        </div>
      </>
    ) : (
      <p className="mt-1 leading-relaxed">
        {multicolorBlockedReason ?? t("Viacfarebnú tlač robíme len z PLA.")}
      </p>
    )}
    </>
  );

  return (
    <div className="rounded-3xl bg-white sm:border sm:border-neutral-200 sm:p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-neutral-500">{t("3D náhľad")}</div>
          <div className="text-xl font-extrabold text-neutral-900">{t(title)}</div>
        </div>

        <div className="text-xs text-neutral-500">
          {loading ? t("načítavam...") : t("otáčanie / zoom")}
        </div>
      </div>

      <div
        ref={mountRef}
        className="relative w-full overflow-hidden rounded-2xl bg-neutral-100"
        style={{ height }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-neutral-500">{t("Načítavam model...")}</div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div className="text-sm text-red-500">{t(error)}</div>
          </div>
        )}

        {hoverEnabled && hovered !== null && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg bg-black/75 px-2 py-1 text-xs font-bold text-white">
            {t("Časť {n}", { n: hovered + 1 })}
            {partColors?.[hovered] ? ` · ${t(COLOR_LABELS[partColors[hovered]] ?? partColors[hovered])}` : ""}
          </div>
        )}

        {onPartColorsChange && partCount >= 2 && !loading && !error && (
          <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() => setPaintOpen((o) => !o)}
              aria-pressed={paintOpen}
              title={t("Viacfarebná tlač")}
              className={[
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold shadow-md transition",
                paintOpen ? "bg-black text-white" : "bg-white text-neutral-900 hover:bg-[#FFAE00]",
              ].join(" ")}
            >
              <BucketIcon />
              {t("Viac farieb")}
            </button>

            {paintOpen && (
              <div className="hidden w-60 rounded-2xl bg-white/95 p-3 text-xs text-neutral-600 shadow-lg backdrop-blur sm:block">
                {paintPanel}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Na mobile by panel cez náhľad zakryl celý model — ukážeme ho pod ním. */}
      {paintOpen && onPartColorsChange && partCount >= 2 && !loading && !error && (
        <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 sm:hidden">
          {paintPanel}
        </div>
      )}

      {showLegend && (
        <div className="mt-4 rounded-2xl bg-neutral-50 p-3 text-xs text-neutral-700">
          <div className="mb-2 font-extrabold text-neutral-900">
            {t("Viacfarebná tlač")} — {t("časti od najväčšej")}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: partCount }, (_, i) => {
              const id = partColors?.[i] || colorId;
              return (
                <span
                  key={i}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-1 font-semibold",
                    hovered === i ? "ring-2 ring-[#FFAE00]" : "",
                  ].join(" ")}
                >
                  <span
                    className={["h-3 w-3 rounded-full", id === "white" ? "border border-neutral-300" : ""].join(" ")}
                    style={{ background: getColor(id) }}
                  />
                  {i + 1}. {t(COLOR_LABELS[id] ?? id)}
                  {partVolumes[i] !== undefined && (
                    <span className="text-neutral-400">{partVolumes[i].toFixed(1).replace(".", ",")} cm³</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="mt-4 text-sm text-neutral-500">
          {t("Model sa dá otáčať, približovať a odďaľovať.")}
          {isObjFile(fileKey)
            ? " " + t("Pri OBJ súboroch odporúčame skontrolovať rozmery modelu.")
            : ""}
        </div>
      )}
    </div>
  );
}

function BucketIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" />
      <path d="m5 2 5 5" />
      <path d="M2 13h15" />
      <path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z" />
    </svg>
  );
}
