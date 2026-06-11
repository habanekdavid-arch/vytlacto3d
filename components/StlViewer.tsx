"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Props = {
  fileKey: string;
  title?: string;
  colorId?: string;
  height?: number;
  scalePct?: number;
};

function getColor(colorId: string) {
  switch (colorId) {
    case "white":      return "#E8E8E8";
    case "gray":       return "#7A7A7A";
    case "red":        return "#DC2626";
    case "blue":       return "#2563EB";
    case "green":      return "#16A34A";
    case "yellow":     return "#EAB308";
    case "orange":     return "#F97316";
    case "purple":     return "#9333EA";
    case "pink":       return "#EC4899";
    case "transparent":return "#c8e6ff";
    case "black":
    default:           return "#1a1a1a";
  }
}

function isObjFile(fileKey: string) {
  return fileKey.toLowerCase().split("?")[0].endsWith(".obj");
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  });
}

export default function StlViewer({
  fileKey,
  title = "3D náhľad",
  colorId = "black",
  height = 380,
  scalePct = 100,
}: Props) {
  const mountRef       = useRef<HTMLDivElement | null>(null);
  const rendererRef    = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef       = useRef<THREE.Scene | null>(null);
  const cameraRef      = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef    = useRef<OrbitControls | null>(null);
  const modelRef       = useRef<THREE.Object3D | null>(null);
  const frameRef       = useRef<number | null>(null);
  const platformRef    = useRef<THREE.Mesh | null>(null);
  const ringRef        = useRef<THREE.Mesh | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const resolvedColor = useMemo(() => getColor(colorId), [colorId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !fileKey) return;

    setLoading(true);
    setError(null);

    // ── Scene ──────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const width = Math.max(mount.clientWidth, 320);

    // ── Camera ─────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 5000);
    camera.position.set(180, 140, 180);
    cameraRef.current = camera;

    // ── Renderer ───────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // ── Lighting — cinematic 3-point ───────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff5e0, 2.8);
    keyLight.position.set(200, 300, 150);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0003;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xa8c8ff, 0.9);
    fillLight.position.set(-200, 100, 100);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffae00, 1.4);
    rimLight.position.set(0, -80, -200);
    scene.add(rimLight);

    const hemi = new THREE.HemisphereLight(0x1a1a3e, 0x0a0a0a, 0.4);
    scene.add(hemi);

    // ── Platform ───────────────────────────────────────────
    const platformGeo = new THREE.CylinderGeometry(120, 120, 1.5, 80);
    const platformMat = new THREE.MeshPhysicalMaterial({
      color: "#1a1a1a",
      roughness: 0.1,
      metalness: 0.8,
      reflectivity: 1.0,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.75;
    platform.receiveShadow = true;
    scene.add(platform);
    platformRef.current = platform;

    const ringGeo = new THREE.TorusGeometry(122, 1.5, 8, 100);
    const ringMat = new THREE.MeshBasicMaterial({ color: "#FFAE00", transparent: true, opacity: 0.6 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0;
    scene.add(ring);
    ringRef.current = ring;

    // ── Controls ───────────────────────────────────────────
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
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controlsRef.current = controls;

    renderer.domElement.addEventListener("pointerdown", () => {
      if (controlsRef.current) controlsRef.current.autoRotate = false;
    }, { once: true });

    // ── Material ───────────────────────────────────────────
    const modelUrl = `/api/file?key=${encodeURIComponent(fileKey)}`;
    const material = new THREE.MeshPhysicalMaterial({
      color: resolvedColor,
      roughness: 0.72,
      metalness: 0.0,
      clearcoat: 0.08,
      clearcoatRoughness: 0.9,
      envMapIntensity: 0.4,
      side: THREE.FrontSide,
    });

    if (colorId === "transparent") {
      material.transparent = true;
      material.opacity = 0.55;
      material.roughness = 0.1;
      material.metalness = 0.0;
      material.clearcoat = 1.0;
      material.clearcoatRoughness = 0.05;
      material.color.set("#c8e6ff");
    }

    // ── prepareAndAddModel ─────────────────────────────────
    function prepareAndAddModel(model: THREE.Object3D, rotateStl = false) {
      try {
        if (rotateStl) model.rotation.x = -Math.PI / 2;

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

        // Škáluj platformu a ring podľa veľkosti modelu
        const s = maxDim / 80;
        if (platformRef.current) platformRef.current.scale.set(s, 1, s);
        if (ringRef.current) ringRef.current.scale.set(s, 1, s);

        setLoading(false);
      } catch (e) {
        console.error("MODEL PREPARE ERROR:", e);
        setError("Nepodarilo sa spracovať model.");
        setLoading(false);
      }
    }

    // ── Load ───────────────────────────────────────────────
    if (isObjFile(fileKey)) {
      new OBJLoader().load(
        modelUrl,
        (object) => prepareAndAddModel(object, false),
        undefined,
        () => { setError("Nepodarilo sa načítať OBJ."); setLoading(false); }
      );
    } else {
      new STLLoader().load(
        modelUrl,
        (geometry) => {
          try {
            geometry.computeVertexNormals();
            geometry.computeBoundingBox();
            if (!geometry.boundingBox) { setError("Nepodarilo sa spracovať STL."); setLoading(false); return; }
            prepareAndAddModel(new THREE.Mesh(geometry, material), true);
          } catch {
            setError("Nepodarilo sa spracovať STL.");
            setLoading(false);
          }
        },
        undefined,
        () => { setError("Nepodarilo sa načítať STL."); setLoading(false); }
      );
    }

    // ── Resize ─────────────────────────────────────────────
    const handleResize = () => {
      const m = mountRef.current;
      const r = rendererRef.current;
      const c = cameraRef.current;
      if (!m || !r || !c) return;
      const w = Math.max(m.clientWidth, 320);
      r.setSize(w, height);
      c.aspect = w / height;
      c.updateProjectionMatrix();
    };

    // ── Animate ────────────────────────────────────────────
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current && controlsRef.current) {
        controlsRef.current.update();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    handleResize();
    animate();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameRef.current) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
      if (controlsRef.current) { controlsRef.current.dispose(); controlsRef.current = null; }
      if (modelRef.current) {
        disposeObject(modelRef.current);
        sceneRef.current?.remove(modelRef.current);
        modelRef.current = null;
      }
      if (platformRef.current) {
        platformRef.current.geometry.dispose();
        (platformRef.current.material as THREE.Material).dispose();
        sceneRef.current?.remove(platformRef.current);
        platformRef.current = null;
      }
      if (ringRef.current) {
        ringRef.current.geometry.dispose();
        (ringRef.current.material as THREE.Material).dispose();
        sceneRef.current?.remove(ringRef.current);
        ringRef.current = null;
      }
      material.dispose();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        const canvas = rendererRef.current.domElement;
        canvas.parentNode?.removeChild(canvas);
        rendererRef.current = null;
      }
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [fileKey, height]);

  // ── scalePct effect ────────────────────────────────────
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

  // ── colorId effect ─────────────────────────────────────
  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material;
        const updateMat = (m: THREE.Material) => {
          if (m instanceof THREE.MeshPhysicalMaterial) {
            if (colorId === "transparent") {
              m.transparent = true;
              m.opacity = 0.55;
              m.roughness = 0.1;
              m.clearcoat = 1.0;
              m.clearcoatRoughness = 0.05;
              m.color.set("#c8e6ff");
            } else {
              m.transparent = false;
              m.opacity = 1.0;
              m.roughness = 0.72;
              m.clearcoat = 0.08;
              m.clearcoatRoughness = 0.9;
              m.color.set(resolvedColor);
            }
            m.needsUpdate = true;
          }
        };
        if (Array.isArray(mat)) mat.forEach(updateMat);
        else updateMat(mat);
      }
    });
  }, [resolvedColor, colorId]);

  // ── JSX ────────────────────────────────────────────────
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f0f0f] p-4 shadow-2xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-white/40">
            3D náhľad
          </div>
          <div className="text-xl font-extrabold text-white">{title}</div>
        </div>
        <div className="text-xs text-white/30">
          {loading ? "načítavam..." : "⟳ otáčanie  •  ⊕ zoom  •  ⇥ pohyb"}
        </div>
      </div>

      <div
        ref={mountRef}
        className="relative w-full overflow-hidden rounded-2xl"
        style={{
          height,
          background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)",
        }}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-[#FFAE00]/30 border-t-[#FFAE00] animate-spin" />
            <div className="text-sm font-semibold text-white/60">Načítavam model...</div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div className="text-sm text-red-400">{error}</div>
          </div>
        )}
      </div>

      {!loading && !error && (
        <div className="mt-3 text-xs text-white/25">
          Model sa dá otáčať, približovať a posúvať.
          {isObjFile(fileKey) ? " Pri OBJ odporúčame skontrolovať rozmery." : ""}
        </div>
      )}
    </div>
  );
}
