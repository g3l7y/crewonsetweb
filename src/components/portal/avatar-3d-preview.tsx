import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { websiteCosmeticModelKey } from "@/lib/playfab/game-appearance";

const loader = new FBXLoader();
const modelCache = new Map<string, Promise<THREE.Group>>();

function loadModel(key: string): Promise<THREE.Group> {
  let pending = modelCache.get(key);
  if (!pending) {
    pending = loader.loadAsync(`/avatar-models/${key}.fbx`);
    modelCache.set(key, pending);
    pending.catch(() => modelCache.delete(key));
  }
  return pending;
}

type Avatar3DPreviewProps = {
  loadout: Record<string, string>;
  displayName: string;
  portrait?: boolean;
  className?: string;
};

/** Renders the same catalog FBX parts that Unity's customization catalog composes. */
export function Avatar3DPreview({ loadout, displayName, portrait = false, className }: Avatar3DPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("Loading 3D avatar…");
  const selection = Object.entries(loadout)
    .filter(([, id]) => typeof id === "string")
    .map(([, id]) => id)
    .sort()
    .join("|");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let frame = 0;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setMessage("3D preview needs WebGL enabled");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-label", `${displayName}'s 3D avatar; drag to rotate`);
    renderer.domElement.className = "h-full w-full touch-none cursor-grab active:cursor-grabbing";
    host.replaceChildren(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfff5df, 0x5a493d, 2.1));
    const keyLight = new THREE.DirectionalLight(0xfff6e7, 2.7);
    keyLight.position.set(-3, 5, 6);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffc45b, 0.8);
    fillLight.position.set(4, 2, -3);
    scene.add(fillLight);

    const avatar = new THREE.Group();
    scene.add(avatar);
    let dragging = false;
    let lastPointerX = 0;
    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      lastPointerX = event.clientX;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      avatar.rotation.y += (event.clientX - lastPointerX) * 0.009;
      lastPointerX = event.clientX;
      renderer.render(scene, camera);
    };
    const onPointerUp = () => {
      dragging = false;
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);

    const resize = () => {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const itemKeys = selection
      .split("|")
      .filter(Boolean)
      .map((id) => websiteCosmeticModelKey(id))
      .filter((key): key is string => Boolean(key));
    const bodyKey =
      itemKeys.find((key) => key === "body_boy" || key === "body_girl") ?? "body_girl";
    const modelKeys = [bodyKey, ...itemKeys.filter((key) => key !== bodyKey)];

    void Promise.all(modelKeys.map(async (key) => ({ key, model: await loadModel(key) })))
      .then((models) => {
        if (disposed) return;
        for (const { model } of models) {
          const part = clone(model);
          part.traverse((object) => {
            const mesh = object as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const material of materials) {
              material.side = THREE.DoubleSide;
              if ("roughness" in material) material.roughness = 0.82;
              material.needsUpdate = true;
            }
          });
          avatar.add(part);
        }
        const bounds = new THREE.Box3().setFromObject(avatar);
        if (!bounds.isEmpty()) {
          const center = bounds.getCenter(new THREE.Vector3());
          const size = bounds.getSize(new THREE.Vector3());
          const height = Math.max(size.y, 0.5);
          // Catalog parts share a common authored origin; center only the camera, not the parts.
          camera.position.set(center.x, center.y + height * (portrait ? 0.25 : 0.03), center.z + height * (portrait ? 1.65 : 2.1));
          camera.lookAt(center.x, center.y + height * (portrait ? 0.12 : 0), center.z);
          camera.near = Math.max(0.01, height / 100);
          camera.far = Math.max(100, height * 10);
          camera.updateProjectionMatrix();
        }
        resize();
        setMessage("Drag the avatar to rotate");
        const render = () => {
          if (disposed) return;
          renderer.render(scene, camera);
          frame = window.requestAnimationFrame(render);
        };
        render();
      })
      .catch((error: unknown) => {
        if (!disposed)
          setMessage(
            error instanceof Error ? "3D avatar could not be loaded" : "3D avatar unavailable",
          );
        console.error("Could not load Crew On Set avatar model", error);
      });

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      renderer.dispose();
      host.replaceChildren();
    };
  }, [selection, displayName, portrait]);

  return (
    <div className={className ?? (portrait
      ? "relative size-full overflow-hidden bg-transparent"
      : "relative h-64 w-full overflow-hidden rounded-xl border border-[#121826]/15 bg-[radial-gradient(ellipse_at_50%_32%,#fff8e6_0%,#ddd1b8_100%)] sm:h-72")}>
      <div ref={hostRef} className="absolute inset-0" />
      {!portrait && <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[#121826]/75 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white">{message}</span>}
    </div>
  );
}
