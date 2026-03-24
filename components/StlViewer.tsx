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
  scalePct?: number;
};

function getColor(colorId: string) {
  switch (colorId) {
    case "white":
      return "#E5E7EB";
    case "gray":
      return "#9CA3AF";
    case "red":
      return "#DC2626";
    case "blue":
      return "#2563EB";
    case "green":
      return "#16A34A";
    case "yellow":
      return "#EAB308";
    case "orange":
      return "#F97316";
    case "purple":
      return "#9333EA";
    case "pink":
      return "#EC4899";
    case "transparent":
      return "#D1D5DB";
    case "black":
    default:
      return "#111111";
  }
}

export default function StlViewer({
  fileKey,
  title = "3D náhľad",
  colorId = "black",
  height = 380,
  scalePct = 100,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const frameRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedColor = useMemo(() => getColor(colorId), [colorId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !fileKey) return;

    setLoading(true);
    setError(null);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#F5F5F5");
    sceneRef.current = scene;

    const width = Math.max(mount.clientWidth, 320);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(140, 110, 140);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    mount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight1.position.set(120, 160, 120);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight2.position.set(-120, 80, -60);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.45);
    dirLight3.position.set(0, -80, 80);
    scene.add(dirLight3);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.9;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.8;
    controls.screenSpacePanning = true;
    controls.minDistance = 10;
    controls.maxDistance = 2000;
    controlsRef.current = controls;

    const loader = new STLLoader();

    loader.load(
      `/api/file?key=${encodeURIComponent(fileKey)}`,
      (geometry) => {
        geometry.computeVertexNormals();
        geometry.center();

        const material = new THREE.MeshStandardMaterial({
          color: resolvedColor,
          metalness: 0.08,
          roughness: 0.72,
        });

        const mesh = new THREE.Mesh(geometry, material);
        const scale = scalePct / 100;
        mesh.scale.set(scale, scale, scale);

        scene.add(mesh);
        meshRef.current = mesh;

        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();

        box.getSize(size);
        box.getCenter(center);

        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const fitDistance = maxDim * 1.8;

        camera.position.set(fitDistance, fitDistance * 0.9, fitDistance);
        camera.near = Math.max(0.1, maxDim / 100);
        camera.far = Math.max(5000, maxDim * 20);
        camera.updateProjectionMatrix();

        controls.target.copy(center);
        controls.minDistance = Math.max(5, maxDim * 0.35);
        controls.maxDistance = Math.max(1000, maxDim * 8);
        controls.update();

        setLoading(false);
      },
      undefined,
      () => {
        setError("Nepodarilo sa načítať STL.");
        setLoading(false);
      }
    );

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
      window.removeEventListener("resize", handleResize);

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
        controlsRef.current = null;
      }

      if (meshRef.current) {
        meshRef.current.geometry.dispose();

        const material = meshRef.current.material;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else {
          material.dispose();
        }

        if (sceneRef.current) {
          sceneRef.current.remove(meshRef.current);
        }

        meshRef.current = null;
      }

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
    const mesh = meshRef.current;
    if (!mesh) return;

    const scale = scalePct / 100;
    mesh.scale.set(scale, scale, scale);

    const box = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    box.getCenter(center);

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [scalePct]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial) {
          m.color.set(resolvedColor);
          m.needsUpdate = true;
        }
      });
    } else if (material instanceof THREE.MeshStandardMaterial) {
      material.color.set(resolvedColor);
      material.needsUpdate = true;
    }
  }, [resolvedColor]);

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-neutral-500">3D náhľad</div>
          <div className="text-xl font-extrabold text-neutral-900">{title}</div>
        </div>

        <div className="text-xs text-neutral-500">
          {loading ? "načítavam..." : "otáčanie / zoom"}
        </div>
      </div>

      <div
        ref={mountRef}
        className="relative w-full overflow-hidden rounded-2xl bg-neutral-100"
        style={{ height }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-neutral-500">Načítavam model...</div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <div className="text-sm text-red-500">{error}</div>
          </div>
        )}
      </div>

      {!loading && !error && (
        <div className="mt-4 text-sm text-neutral-500">
          Model sa dá otáčať, približovať a odďaľovať.
        </div>
      )}
    </div>
  );
}