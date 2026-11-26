import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Language } from '../types';
import { createAvatarMesh } from '../engine/avatarMesh';
import { decodeAvatarImage } from '../services/avatarPhoto';

interface AvatarStageProps {
  photo: Blob;
  solid: boolean;
  lang: Language;
}

export function AvatarStage({ photo, solid, lang }: AvatarStageProps) {
  const root = useRef<HTMLDivElement>(null);
  const selectedSolid = useRef(solid);
  const updateMaterial = useRef<((solid: boolean) => void) | undefined>(undefined);
  const [fallback, setFallback] = useState(false);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    const container = root.current;
    if (!container) return;

    let cancelled = false;
    let dispose: (() => void) | undefined;
    setFallback(false);

    void decodeAvatarImage(photo).then((image) => {
      if (cancelled) return;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      try {
        const avatar = createAvatarMesh(image);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xeaf0f6);
        const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 55);
        camera.position.set(0, 1.45, 4.22);
        const canvas = renderer.domElement;
        const controls = new OrbitControls(camera, canvas);
        controls.target.set(0, 1.23, 0);
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.minPolarAngle = Math.PI * 0.26;
        controls.maxPolarAngle = Math.PI * 0.54;

        const grid = new THREE.GridHelper(7, 24, 0x9eb2c7, 0xc8d5e3);
        grid.position.y = -0.018;
        const ambient = new THREE.HemisphereLight(0xffffff, 0x819bb2, 2.1);
        const key = new THREE.DirectionalLight(0xffffff, 1.4);
        key.position.set(3, 5, 4);
        const fill = new THREE.DirectionalLight(0xdbedff, 1.1);
        fill.position.set(-3, 2, -4);
        scene.add(avatar.mesh, grid, ambient, key, fill);

        const render = () => renderer.render(scene, camera);
        const resize = () => {
          if (!container.clientWidth || !container.clientHeight) return;
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight, false);
          render();
        };
        const rotate = (event: KeyboardEvent) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          camera.position.sub(controls.target)
            .applyAxisAngle(camera.up, event.key === 'ArrowLeft' ? -0.2 : 0.2)
            .add(controls.target);
          controls.update();
        };
        const observer = new ResizeObserver(resize);
        observer.observe(container);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        canvas.className = 'block h-full w-full cursor-grab touch-none active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-sky-600';
        canvas.tabIndex = 0;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Avatar 3D');
        canvas.addEventListener('keydown', rotate);
        controls.addEventListener('change', render);
        dispose = () => {
          observer.disconnect();
          canvas.removeEventListener('keydown', rotate);
          controls.removeEventListener('change', render);
          controls.dispose();
          avatar.dispose();
          grid.geometry.dispose();
          grid.material.dispose();
          renderer.dispose();
          canvas.remove();
          updateMaterial.current = undefined;
        };

        container.appendChild(canvas);
        avatar.setSolid(selectedSolid.current);
        controls.update();
        resize();
        updateMaterial.current = (enabled) => {
          avatar.setSolid(enabled);
          render();
        };
      } catch (error) {
        if (dispose) dispose();
        else renderer.dispose();
        dispose = undefined;
        throw error;
      }
    }).catch(() => {
      if (!cancelled) setFallback(true);
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [photo]);

  useEffect(() => {
    selectedSolid.current = solid;
    updateMaterial.current?.(solid);
  }, [solid]);

  return (
    <div className="absolute inset-0">
      <div ref={root} className="absolute inset-0" />
      {fallback && preview && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
          <img src={preview} className="min-h-0 max-h-[86%] object-contain" alt="Avatar" />
          <p role="status" className="text-center text-xs text-slate-600">
            {lang === 'id' ? 'Tampilan 3D tidak tersedia di browser ini.' : 'The 3D view is unavailable in this browser.'}
          </p>
        </div>
      )}
    </div>
  );
}
