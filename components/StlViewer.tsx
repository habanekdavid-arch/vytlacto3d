"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const COLOR_TO_HEX: Record<string, string> = {
  black: "#111827",
  white: "#F9FAFB",
  gray: "#9CA3AF",
  red: "#EF4444",
  blue: "#3B82F6",
  green: "#22C55E",
  purple: "#8B5CF6",
  orange: "#F97316",
  yellow: "#FFAE00",
};

function normalizeColor(input?: string) {
  if (!input) return "#111827";
  if (input.startsWith("#")) return input;
  return COLOR_TO_HEX[input] ?? "#111827";
}

export default function StlViewer({
  fileKey,
  colorId = "black",
  title = "3D náhľad",
  height = 420,
}: {
  fileKey: string;
  colorId?: string;
  title?: string;
  height?: number;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const [status, setStatus] = useState("Načítavam 3D náhľad…");

  const resolvedColor = useMemo(() => normalizeColor(colorId), [colorId]);

  // menenie farby bez reloadu STL
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.color = new THREE.Color(resolvedColor);
      materialRef.current.needsUpdate = true;
    }
  }, [resolvedColor]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !fileKey) return;

    host.innerHTML = "";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#F3F4F6");

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000);
    camera.position.set(0, 50, 180);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;

    const ambient = new THREE.AmbientLight(0xffffff, 0.72);
    scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dir1.position.set(220, 260, 200);
    dir1.castShadow = true;
    dir1.shadow.mapSize.set(2048, 2048);
    scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0xffffff, 0.35);
    dir2.position.set(-220, 120, -180);
    scene.add(dir2);

    const floorGeo = new THREE.PlaneGeometry(2000, 2000);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    let mesh: THREE.Mesh | null = null;

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const loader = new STLLoader();

    const applyFrontView = (maxDim: number) => {
      const dist = maxDim * 1.9;
      camera.position.set(0, dist * 0.2, dist * 1.1);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
    };

    (async () => {
      try {
        setStatus("Načítavam STL…");

        const res = await fetch(`/api/file?key=${encodeURIComponent(fileKey)}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Nepodarilo sa načítať STL.");
        }

        const buf = await res.arrayBuffer();
        const geo = loader.parse(buf);

        geo.computeVertexNormals();
        geo.computeBoundingBox();

        const box = geo.boundingBox!;
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        geo.translate(-center.x, -center.y, -center.z);

        // STL býva často Z-up
        geo.rotateX(-Math.PI / 2);

        const maxDim = Math.max(size.x, size.y, size.z);

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(resolvedColor),
          roughness: 0.35,
          metalness: 0.08,
        });

        materialRef.current = mat;

        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        scene.add(mesh);

        applyFrontView(maxDim);
        setStatus("");
      } catch (e: any) {
        console.error(e);
        setStatus(e?.message || "Chyba pri načítaní 3D náhľadu.");
      }
    })();

    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();

      if (mesh) {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        scene.remove(mesh);
      }

      materialRef.current = null;
      floorGeo.dispose();
      floorMat.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [fileKey, resolvedColor]);

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-neutral-500">3D náhľad</div>
          <div className="mt-1 text-lg font-bold text-neutral-900">{title}</div>
        </div>
        <div className="text-xs text-neutral-500">{status ? "načítavam…" : "hotovo"}</div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
        <div ref={hostRef} className="w-full" style={{ height }} />
      </div>

      {status ? (
        <div className="mt-3 text-sm text-neutral-600">{status}</div>
      ) : (
        <div className="mt-3 text-xs text-neutral-500">
          Tip: ľavé tlačidlo = otáčať, koliesko = zoom, pravé = posúvať.
        </div>
      )}
    </div>
  );
}