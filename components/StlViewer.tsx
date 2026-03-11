"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Props = {
  fileKey: string;
  title?: string;
  colorId?: string;
  height?: number;
};

function getModelColor(colorId?: string) {
  switch (colorId) {
    case "white":
      return "#f5f5f5";
    case "gray":
      return "#9ca3af";
    case "red":
      return "#ef4444";
    case "blue":
      return "#3b82f6";
    case "green":
      return "#22c55e";
    case "purple":
      return "#8b5cf6";
    case "orange":
      return "#f97316";
    case "yellow":
      return "#FFAE00";
    case "black":
    default:
      return "#111111";
  }
}

function resolveModelUrl(fileKey: string) {
  if (!fileKey) return "";

  if (fileKey.startsWith("http://") || fileKey.startsWith("https://")) {
    return fileKey;
  }

  return `/api/file?key=${encodeURIComponent(fileKey)}`;
}

export default function StlViewer({
  fileKey,
  title = "3D náhľad",
  colorId = "black",
  height = 380,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const modelUrl = useMemo(() => resolveModelUrl(fileKey), [fileKey]);
  const modelColor = useMemo(() => getModelColor(colorId), [colorId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !modelUrl) return;

    setLoading(true);
    setError("");

    while (mount.firstChild) {
      mount.removeChild(mount.firstChild);
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f5f5f5");

    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / height,
      0.1,
      5000
    );
    camera.position.set(140, 110, 140);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 1.15);
    scene.add(ambient);

    const dir1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dir1.position.set(120, 180, 120);
    scene.add(dir1);

    const dir2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir2.position.set(-120, 100, -80);
    scene.add(dir2);

    const grid = new THREE.GridHelper(220, 12, 0xe5e7eb, 0xe5e7eb);
    grid.position.y = -35;
    scene.add(grid);

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(modelColor),
      metalness: 0.1,
      roughness: 0.65,
    });

    let mesh: THREE.Mesh | null = null;
    let disposed = false;

    const loader = new STLLoader();

    loader.load(
      modelUrl,
      (geometry) => {
        if (disposed) return;

        geometry.computeVertexNormals();
        geometry.center();

        const bbox = new THREE.Box3().setFromBufferAttribute(
          geometry.getAttribute("position") as THREE.BufferAttribute
        );
        const size = new THREE.Vector3();
        bbox.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const targetSize = 120;
        const scale = targetSize / maxDim;

        geometry.scale(scale, scale, scale);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();

        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);

        const sphere = geometry.boundingSphere;
        const radius = sphere?.radius ?? 50;
        const distance = radius * 3.2;

        camera.position.set(distance, distance * 0.75, distance);
        controls.target.set(0, 0, 0);
        controls.update();

        setLoading(false);
      },
      undefined,
      (err) => {
        console.error("STL LOAD ERROR:", err);
        if (disposed) return;
        setError("Nepodarilo sa načítať STL.");
        setLoading(false);
      }
    );

    let animationFrame = 0;

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount || !renderer) return;
      const width = mount.clientWidth || 300;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      controls.dispose();

      if (mesh) {
        mesh.geometry.dispose();
      }

      material.dispose();
      renderer.dispose();

      while (mount.firstChild) {
        mount.removeChild(mount.firstChild);
      }
    };
  }, [modelUrl, modelColor, height]);

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-neutral-500">3D náhľad</div>
          <div className="text-2xl font-extrabold text-neutral-900">{title}</div>
        </div>

        <div className="text-xs font-semibold text-neutral-500">
          {loading ? "načítavam..." : error ? "chyba" : "pripravené"}
        </div>
      </div>

      <div
        ref={mountRef}
        className="w-full overflow-hidden rounded-3xl border border-neutral-200 bg-[#f5f5f5]"
        style={{ height }}
      />

      {error ? (
        <div className="mt-4 text-sm text-red-600">{error}</div>
      ) : null}
    </div>
  );
}