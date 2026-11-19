import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ToothDefinition, ToothSurface } from '../types/dentalChart.types';
import { buildIsolatedToothModel } from '../3d/dentalGeometry';

interface ToothPreview3DProps {
  tooth: ToothDefinition;
  selectedSurface: ToothSurface;
  onSelectSurface: (surface: ToothSurface) => void;
}

const VIEW_PRESETS = [
  { key: 'labial', label: 'Front (Labial)', pos: [0, -0.15, 3.2] as const, target: [0, -0.15, 0] as const },
  { key: 'lingual', label: 'Back (Lingual)', pos: [0, -0.15, -3.2] as const, target: [0, -0.15, 0] as const },
  { key: 'mesial', label: 'Side (Mesial)', pos: [3.2, -0.15, 0] as const, target: [0, -0.15, 0] as const },
  { key: 'distal', label: 'Side (Distal)', pos: [-3.2, -0.15, 0] as const, target: [0, -0.15, 0] as const },
  { key: 'incisal', label: 'Top (Incisal)', pos: [0, 2.7, 0.05] as const, target: [0, 0.45, 0] as const },
  { key: 'full-root', label: 'Full Root (Side)', pos: [3.3, -0.22, 0.6] as const, target: [0, -0.22, 0] as const },
] as const;

export const ToothPreview3D: React.FC<ToothPreview3DProps> = ({
  tooth,
  selectedSurface,
  onSelectSurface,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const surfaceMeshesRef = useRef<Map<ToothSurface, THREE.Object3D>>(new Map());
  const [activeAngle, setActiveAngle] = useState<string>('labial');

  const updateHighlights = useCallback((surfaceToHighlight: ToothSurface) => {
    // 1. Check for single continuous tooth geometry highlight handler
    let handled = false;
    surfaceMeshesRef.current.forEach((obj) => {
      const customFn = (obj as unknown as { userData?: { updateSurfaceHighlight?: (s: ToothSurface) => void } })
        .userData?.updateSurfaceHighlight;
      if (customFn && !handled) {
        customFn(surfaceToHighlight);
        handled = true;
      }
    });
    if (handled) return;

    // 2. Standard multi-mesh highlight handler
    surfaceMeshesRef.current.forEach((obj, surface) => {
      const isCurrent = surface === surfaceToHighlight;
      obj.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        if (!mat) return;

        if (isCurrent) {
          mat.color.set('#38bdf8');
          mat.emissive.set('#0284c7');
          mat.emissiveIntensity = 0.32;
          mat.roughness = 0.12;
          mat.clearcoat = 0.95;
          mat.clearcoatRoughness = 0.06;
        } else {
          if (surface === 'Root') {
            mat.color.set('#D2BC92');
            mat.emissive.set('#000000');
            mat.emissiveIntensity = 0.0;
            mat.roughness = 0.36;
            mat.clearcoat = 0.20;
            mat.clearcoatRoughness = 0.22;
          } else {
            mat.color.set('#FAF8F3');
            mat.emissive.set('#000000');
            mat.emissiveIntensity = 0.0;
            mat.roughness = 0.14;
            mat.clearcoat = 0.96;
            mat.clearcoatRoughness = 0.05;
          }
        }
        mat.needsUpdate = true;
      });
    });
  }, []);

  const setViewAngle = useCallback((key: string) => {
    const preset = VIEW_PRESETS.find((p) => p.key === key);
    if (!preset || !cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(preset.pos[0], preset.pos[1], preset.pos[2]);
    controlsRef.current.target.set(preset.target[0], preset.target[1], preset.target[2]);
    controlsRef.current.update();
    setActiveAngle(key);
  }, []);

  // Directional navigation: rotates individual tooth model preview smoothly using native OrbitControls
  const handleRotateDirection = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const angleStep = 0.38;

    switch (direction) {
      case 'left':
        // Orbit camera to right -> tooth appears to rotate left
        controls.rotateLeft(-angleStep);
        break;
      case 'right':
        // Orbit camera to left -> tooth appears to rotate right
        controls.rotateLeft(angleStep);
        break;
      case 'up':
        // Orbit camera upward -> tooth appears to tilt upward (viewing top/incisal)
        controls.rotateUp(angleStep);
        break;
      case 'down':
        // Orbit camera downward -> tooth appears to tilt downward (viewing root)
        controls.rotateUp(-angleStep);
        break;
    }
    controls.update();
  }, []);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 240;
    const height = container.clientHeight || 240;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, -0.15, 3.2);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.replaceChildren(renderer.domElement);

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(0xfff8f2, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 1.2);
    topLight.position.set(0, 5, 1);
    scene.add(topLight);

    const fillLight = new THREE.DirectionalLight(0xfff8f2, 0.9);
    fillLight.position.set(-3, -1, -2);
    scene.add(fillLight);

    // 5. Build Isolated Tooth Geometry
    const { group, surfaceMeshes } = buildIsolatedToothModel(tooth);
    surfaceMeshesRef.current = surfaceMeshes;
    scene.add(group);

    // Apply immediate highlight to current selected surface
    updateHighlights(selectedSurface);

    // 6. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 1.8;
    controls.maxDistance = 5.5;
    controls.target.set(0, -0.15, 0);
    controls.update();
    controlsRef.current = controls;

    // 7. Raycasting for direct 3D surface clicking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(surfaceMeshes.values());
      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const mesh = hit.object as THREE.Mesh;
        const customGetSurf = (mesh as unknown as { userData?: { getSurfaceAtHit?: (pt: THREE.Vector3, n: THREE.Vector3) => ToothSurface } })
          .userData?.getSurfaceAtHit;

        if (customGetSurf && hit.point && hit.face) {
          const surf = customGetSurf(hit.point, hit.face.normal);
          onSelectSurface(surf);
        } else if (mesh.userData?.surface) {
          onSelectSurface(mesh.userData.surface as ToothSurface);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 8. Global Hooks for Programmatic Automated View Testing
    (window as unknown as { __setToothPreviewAngle?: (key: string) => void }).__setToothPreviewAngle = (key: string) => {
      setViewAngle(key);
    };
    (window as unknown as { __rotateToothPreview?: (dir: 'left' | 'right' | 'up' | 'down') => void }).__rotateToothPreview = (dir) => {
      handleRotateDirection(dir);
    };

    // 9. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 10. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      delete (window as unknown as { __setToothPreviewAngle?: unknown }).__setToothPreviewAngle;
      delete (window as unknown as { __rotateToothPreview?: unknown }).__rotateToothPreview;
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      container.replaceChildren();
    };
  }, [tooth, onSelectSurface, selectedSurface, updateHighlights, setViewAngle, handleRotateDirection]);

  useEffect(() => {
    updateHighlights(selectedSurface);
  }, [selectedSurface, updateHighlights]);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Header: FDI Identification Badge & Interaction Hint */}
      <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#008f8c] shadow-xs" />
          FDI {tooth.fdi} • 3D Anatomy
        </span>
        <span className="text-[9px] font-medium text-slate-400 normal-case">
          Drag to Orbit • Click Surface
        </span>
      </div>

      {/* 3D Viewport Card */}
      <div className="relative w-full h-[230px] bg-gradient-to-b from-slate-50 to-slate-100/90 rounded-2xl border border-slate-200/90 shadow-inner flex items-center justify-center overflow-hidden group">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Directional Controls: Transparent Black Arrow Symbols */}
        {/* UP Arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRotateDirection('up');
          }}
          className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center text-black hover:text-cyan-600 active:scale-90 text-2xl font-black leading-none transition-transform cursor-pointer select-none bg-transparent border-0 p-1"
          title="Rotate Tooth Up"
          aria-label="FDI Preview UP"
        >
          ↑
        </button>

        {/* DOWN Arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRotateDirection('down');
          }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center text-black hover:text-cyan-600 active:scale-90 text-2xl font-black leading-none transition-transform cursor-pointer select-none bg-transparent border-0 p-1"
          title="Rotate Tooth Down"
          aria-label="FDI Preview DOWN"
        >
          ↓
        </button>

        {/* LEFT Arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRotateDirection('left');
          }}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center text-black hover:text-cyan-600 active:scale-90 text-2xl font-black leading-none transition-transform cursor-pointer select-none bg-transparent border-0 p-1"
          title="Rotate Tooth Left"
          aria-label="FDI Preview LEFT"
        >
          ←
        </button>

        {/* RIGHT Arrow */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRotateDirection('right');
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center text-black hover:text-cyan-600 active:scale-90 text-2xl font-black leading-none transition-transform cursor-pointer select-none bg-transparent border-0 p-1"
          title="Rotate Tooth Right"
          aria-label="FDI Preview RIGHT"
        >
          →
        </button>
      </div>

      {/* Preset View Switcher Bar */}
      <div className="flex items-center gap-1 overflow-x-auto py-1 px-1 bg-slate-100/90 rounded-xl border border-slate-200 text-[10px]">
        {VIEW_PRESETS.map((vp) => (
          <button
            key={vp.key}
            type="button"
            onClick={() => setViewAngle(vp.key)}
            className={`px-2 py-1 rounded-lg font-semibold transition cursor-pointer shrink-0 ${
              activeAngle === vp.key
                ? 'bg-[#008f8c] text-white shadow-xs'
                : 'text-slate-600 hover:bg-white hover:text-slate-900'
            }`}
          >
            {vp.label}
          </button>
        ))}
      </div>
    </div>
  );
};
