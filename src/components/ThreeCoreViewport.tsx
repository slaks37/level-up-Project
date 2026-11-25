import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box } from 'lucide-react';
import type { CoreShadingMode, Language } from '../types';
import { tr } from '../data/i18n';
import { playSFX } from '../engine/science';

interface ThreeCoreViewportProps {
  coreCharge: number;
  lang: Language;
  onExtractOverdrive: () => void;
}

export const ThreeCoreViewport: React.FC<ThreeCoreViewportProps> = ({
  coreCharge,
  lang,
  onExtractOverdrive,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chargeRef = useRef(coreCharge);
  const coreMeshRef = useRef<THREE.Mesh | null>(null);
  const wireMeshRef = useRef<THREE.Mesh | null>(null);
  const coreMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const [shading, setShading] = useState<CoreShadingMode>('hybrid');

  useEffect(() => {
    chargeRef.current = coreCharge;
    if (coreMatRef.current) {
      coreMatRef.current.color.setHex(coreCharge >= 4 ? 0xea580c : 0x0284c7);
      coreMatRef.current.emissive.setHex(coreCharge >= 4 ? 0x7c2d12 : 0x000000);
      coreMatRef.current.emissiveIntensity = coreCharge >= 4 ? 0.35 : 0;
    }
  }, [coreCharge]);

  useEffect(() => {
    if (!coreMeshRef.current || !wireMeshRef.current) return;
    coreMeshRef.current.visible = shading !== 'wire';
    wireMeshRef.current.visible = shading !== 'solid';
  }, [shading]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      return;
    }

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 210;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 4.2);
    camera.lookAt(0, 0, 0);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';
    container.insertBefore(renderer.domElement, container.firstChild);

    // Blender Grid Floor
    const grid = new THREE.GridHelper(8, 12, 0x94a3b8, 0xcbd5e1);
    grid.position.y = -1.2;
    scene.add(grid);

    // Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0x0284c7, 0.95);
    dirLight.position.set(3, 5, 4);
    scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0xea580c, 0.75);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    // Core Octahedron + Wireframe Cage + Orbital Ring
    const geom = new THREE.OctahedronGeometry(0.95, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: chargeRef.current >= 4 ? 0xea580c : 0x0284c7,
      roughness: 0.25,
      metalness: 0.35,
    });
    coreMatRef.current = mat;

    const coreMesh = new THREE.Mesh(geom, mat);
    coreMeshRef.current = coreMesh;
    scene.add(coreMesh);

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireMesh = new THREE.Mesh(geom, wireMat);
    wireMesh.scale.set(1.03, 1.03, 1.03);
    wireMeshRef.current = wireMesh;
    scene.add(wireMesh);

    const ringGeom = new THREE.TorusGeometry(1.45, 0.035, 12, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xea580c });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2.6;
    scene.add(ringMesh);

    // Pointer drag controls (works identically on mouse and mobile touch)
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const dom = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      dom.style.cursor = 'grabbing';
      try {
        dom.setPointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      coreMesh.rotation.y += dx * 0.011;
      coreMesh.rotation.x += dy * 0.011;
      wireMesh.rotation.copy(coreMesh.rotation);
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerUp = () => {
      isDragging = false;
      dom.style.cursor = 'grab';
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // ResizeObserver for smooth tab switching & responsive resizing
    const handleResize = () => {
      if (!container || !renderer) return;
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw <= 0 || nh <= 0) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!isDragging) {
        const speed = chargeRef.current >= 4 ? 0.025 : 0.008;
        coreMesh.rotation.y += speed;
        wireMesh.rotation.y += speed;
        ringMesh.rotation.z -= speed * 1.4;
      }
      renderer?.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      geom.dispose();
      mat.dispose();
      wireMat.dispose();
      ringGeom.dispose();
      ringMat.dispose();
      renderer?.dispose();
      if (dom.parentNode === container) {
        container.removeChild(dom);
      }
      coreMeshRef.current = null;
      wireMeshRef.current = null;
      coreMatRef.current = null;
    };
  }, []);

  const handleShadingChange = (mode: CoreShadingMode) => {
    setShading(mode);
    playSFX('click');
  };

  const isCharged = coreCharge >= 4;

  return (
    <div className="anime-panel overflow-hidden flex flex-col justify-between h-full">
      <div className="blender-bar px-3.5 py-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-orange-600" />
          3D VIEWPORT // AETHER CORE
        </span>
        <div className="flex items-center gap-1 font-mono text-[9px] font-bold">
          {(['hybrid', 'wire', 'solid'] as CoreShadingMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleShadingChange(mode)}
              className={`px-1.5 py-0.5 rounded uppercase transition ${
                shading === mode
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex-grow min-h-[210px] bg-slate-100 overflow-hidden"
      >
        <div className="absolute top-2 left-2.5 pointer-events-none font-mono text-[10px] text-slate-500 z-10">
          Persp • Drag to Orbit
        </div>

        <div className="absolute bottom-2 left-2.5 right-2.5 z-10 flex items-center justify-between gap-2 bg-white/92 backdrop-blur px-2.5 py-1.5 rounded border border-slate-300">
          <div className="text-[11px]">
            <span className="font-bold text-slate-700">{tr(lang, 'lblCoreEnergy')} </span>
            <span
              className={`font-mono font-bold ${isCharged ? 'text-orange-600' : 'text-sky-700'}`}
            >
              {coreCharge} / 4 Node
            </span>
          </div>
          <button
            type="button"
            onClick={onExtractOverdrive}
            className={`px-2.5 py-1 rounded font-hud font-bold text-[10px] uppercase tracking-wider transition btn-anime ${
              isCharged
                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-xs animate-pulse'
                : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
            }`}
          >
            {tr(lang, 'btnExtractCore')}
          </button>
        </div>
      </div>
    </div>
  );
};
