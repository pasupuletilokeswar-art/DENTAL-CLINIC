import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Target,
  Plus,
  Minus,
  Maximize2,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  ToothDefinition,
  CameraViewPreset,
  DentalFindingItem,
  getToothByFDI,
  getConditionColor,
} from '../types/dentalChart.types';
import { buildFullMouthScene } from '../3d/dentalGeometry';
import { MiniArchSelector } from './MiniArchSelector';

interface DentalModelViewerProps {
  selectedFDI: number;
  onSelectTooth: (fdi: number) => void;
  findings: DentalFindingItem[];
}

export const DentalModelViewer: React.FC<DentalModelViewerProps> = ({
  selectedFDI,
  onSelectTooth,
  findings,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const teethMapRef = useRef<Map<number, THREE.Mesh>>(new Map());
  const upperArchGroupRef = useRef<THREE.Group | null>(null);
  const lowerArchGroupRef = useRef<THREE.Group | null>(null);
  const highlightGroupRef = useRef<THREE.Group | null>(null);
  const selectedOutlineRef = useRef<THREE.Mesh | null>(null);
  const setJawOpeningRef = useRef<((angle: number) => void) | null>(null);

  const selectedFDIRef = useRef<number>(selectedFDI);
  selectedFDIRef.current = selectedFDI;

  const onSelectToothRef = useRef(onSelectTooth);
  onSelectToothRef.current = onSelectTooth;

  const [jawAngleDeg, setJawAngleDeg] = useState<number>(22);

  // Dynamic Callout DOM Refs
  const calloutSvgRef = useRef<SVGSVGElement | null>(null);
  const calloutPathRef = useRef<SVGPathElement | null>(null);
  const calloutRingRef = useRef<SVGCircleElement | null>(null);
  const calloutDotRef = useRef<SVGCircleElement | null>(null);
  const calloutBadgeRef = useRef<HTMLDivElement | null>(null);

  const [activeView, setActiveView] = useState<CameraViewPreset>('front');
  const [hoveredTooth, setHoveredTooth] = useState<ToothDefinition | null>(null);

  // Map of teeth that have clinical findings for colored visual indication
  const toothConditionColors = new Map<number, string>();
  findings.forEach((f) => {
    if (!toothConditionColors.has(f.toothNumber)) {
      toothConditionColors.set(f.toothNumber, getConditionColor(f.condition));
    }
  });

  // Camera presets
  const applyCameraView = useCallback((view: CameraViewPreset) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    setActiveView(view);

    // Arch visibility toggling matching reference design (separate upper / lower arch views)
    if (upperArchGroupRef.current && lowerArchGroupRef.current) {
      if (view === 'upper') {
        upperArchGroupRef.current.visible = true;
        lowerArchGroupRef.current.visible = false;
      } else if (view === 'lower') {
        upperArchGroupRef.current.visible = false;
        lowerArchGroupRef.current.visible = true;
      } else {
        upperArchGroupRef.current.visible = true;
        lowerArchGroupRef.current.visible = true;
      }
    }

    switch (view) {
      case 'front':
        camera.position.set(0, 0.0, 8.6);
        controls.target.set(0, 0, 0);
        break;
      case 'right':
        camera.position.set(7.6, 0.1, 1.8);
        controls.target.set(0, 0, 0);
        break;
      case 'left':
        camera.position.set(-7.6, 0.1, 1.8);
        controls.target.set(0, 0, 0);
        break;
      case 'upper':
        // Direct occlusal mirror view of the maxillary arch & palate
        camera.position.set(0, -3.2, 4.4);
        controls.target.set(0, 1.40, -0.12);
        break;
      case 'lower':
        // Direct occlusal mirror view of the mandibular arch & tongue
        camera.position.set(0, 3.2, 4.4);
        controls.target.set(0, -1.40, -0.12);
        break;
    }
    controls.update();
  }, []);

  // Center / Focus on selected tooth or arch
  const handleFocus = useCallback(() => {
    const mesh = teethMapRef.current.get(selectedFDI);
    if (mesh && controlsRef.current && cameraRef.current) {
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      controlsRef.current.target.copy(worldPos);

      // Smooth move closer
      const dir = cameraRef.current.position.clone().sub(worldPos).normalize();
      cameraRef.current.position.copy(worldPos.clone().add(dir.multiplyScalar(4.5)));
      controlsRef.current.update();
    }
  }, [selectedFDI]);

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const factor = direction === 'in' ? 0.85 : 1.18;
    const target = controlsRef.current.target;
    const offset = cameraRef.current.position.clone().sub(target).multiplyScalar(factor);

    if (offset.length() > 3.0 && offset.length() < 20.0) {
      cameraRef.current.position.copy(target.clone().add(offset));
      controlsRef.current.update();
    }
  }, []);

  const handleReset = useCallback(() => {
    applyCameraView('front');
  }, [applyCameraView]);

  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.error(err));
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
    }
  }, []);

  // Directional navigation: rotates dental model orientation smoothly using native OrbitControls AND updates FDI selection
  const handleRotateDirection = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    // Angle step: 0.35 rad (~20 degrees per click)
    const angleStep = 0.35;

    switch (direction) {
      case 'left':
        // Rotate dental model towards the left (camera orbits to the right)
        controls.rotateLeft(-angleStep);
        break;
      case 'right':
        // Rotate dental model towards the right (camera orbits to the left)
        controls.rotateLeft(angleStep);
        break;
      case 'up':
        // Rotate model towards upper view (camera moves upward)
        controls.rotateUp(angleStep);
        break;
      case 'down':
        // Rotate model towards lower view (camera moves downward)
        controls.rotateUp(-angleStep);
        break;
    }

    // Ensure both arches are visible
    if (upperArchGroupRef.current && lowerArchGroupRef.current) {
      upperArchGroupRef.current.visible = true;
      lowerArchGroupRef.current.visible = true;
    }

    controls.update();
  }, []);

  // Main Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 550;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#071923'); // Deep dark navy matching reference image

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.0, 8.6);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;
    container.replaceChildren(renderer.domElement);

    // 4. Lighting Rig (Studio Clinical Softbox Illumination)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.80);
    scene.add(ambientLight);

    // Main Key Light (Warm softbox from upper front-right)
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.9);
    keyLight.position.set(4, 6, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Secondary Fill Light (Soft neutral fill from left)
    const fillLight = new THREE.DirectionalLight(0xfff8f2, 1.1);
    fillLight.position.set(-6, -1, 5);
    scene.add(fillLight);

    // Top Overhead Light
    const topLight = new THREE.DirectionalLight(0xffffff, 0.85);
    topLight.position.set(0, 8, 0);
    scene.add(topLight);

    // Back Rim Light
    const backLight = new THREE.DirectionalLight(0xdbeafe, 0.45);
    backLight.position.set(0, 2, -6);
    scene.add(backLight);

    // Oral Cavity Internal Fill Light (illuminates vaulted palate & tongue)
    const mouthFillLight = new THREE.PointLight(0xfff3e8, 1.5, 14, 1.2);
    mouthFillLight.position.set(0, 0.1, 0.4);
    scene.add(mouthFillLight);

    // Palatal Upward Illuminator
    const palateLight = new THREE.DirectionalLight(0xfff0e4, 0.85);
    palateLight.position.set(0, -4, 2);
    scene.add(palateLight);

    // 5. Build Complete Full Mouth 3D Model
    const { rootGroup, teethMap, upperArchGroup, lowerArchGroup, setJawOpening } = buildFullMouthScene();
    teethMapRef.current = teethMap;
    upperArchGroupRef.current = upperArchGroup;
    lowerArchGroupRef.current = lowerArchGroup;
    setJawOpeningRef.current = setJawOpening;
    setJawOpening((jawAngleDeg * Math.PI) / 180);
    scene.add(rootGroup);
    (window as any).__DENTAL_MODEL__ = { rootGroup, teethMap, upperArchGroup, lowerArchGroup };
    (window as any).__THREE__ = THREE;

    // Dynamic Highlight Group for selected tooth cyan glow outline
    const highlightGroup = new THREE.Group();
    highlightGroup.name = 'highlight_group';
    scene.add(highlightGroup);
    highlightGroupRef.current = highlightGroup;

    // 6. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.0;
    controls.maxDistance = 18.0;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minPolarAngle = Math.PI * 0.15;
    controlsRef.current = controls;
    (window as any).__DENTAL_VIEWER__ = { controls, camera };

    // 7. Raycasting Setup
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getRaycastTooth = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = Array.from(teethMap.values());
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        return intersects[0].object as THREE.Mesh;
      }
      return null;
    };

    const handlePointerMove = (event: MouseEvent) => {
      const hit = getRaycastTooth(event);
      if (hit && hit.userData?.fdi) {
        container.style.cursor = 'pointer';
        setHoveredTooth(getToothByFDI(hit.userData.fdi) || null);
      } else {
        container.style.cursor = 'default';
        setHoveredTooth(null);
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      const hit = getRaycastTooth(event);
      if (hit && hit.userData?.fdi) {
        onSelectToothRef.current(hit.userData.fdi);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 8. Dynamic Selected Tooth Callout Anchor Calculation & Projection
    const tempAnchorVec = new THREE.Vector3();

    const updateToothCallout = () => {
      const svg = calloutSvgRef.current;
      const badge = calloutBadgeRef.current;
      const path = calloutPathRef.current;
      const dot = calloutDotRef.current;
      const ring = calloutRingRef.current;
      if (!svg || !badge || !container) return;

      const currentSelected = selectedFDIRef.current;
      const selectedMesh = teethMap.get(currentSelected);
      if (!selectedMesh) {
        svg.style.display = 'none';
        badge.style.display = 'none';
        return;
      }

      // Check arch visibility based on active view preset (upper / lower)
      const isUpper = selectedMesh.userData.arch === 'UPPER';
      const archGroup = isUpper ? upperArchGroupRef.current : lowerArchGroupRef.current;
      if (archGroup && !archGroup.visible) {
        svg.style.display = 'none';
        badge.style.display = 'none';
        return;
      }

      // 1. Dynamic 3D Anchor Calculation from the tooth's actual mesh geometry
      selectedMesh.updateWorldMatrix(true, false);
      if (!selectedMesh.geometry.boundingBox) {
        selectedMesh.geometry.computeBoundingBox();
      }
      const localCenter = selectedMesh.geometry.boundingBox.getCenter(tempAnchorVec);
      const worldAnchor = localCenter.applyMatrix4(selectedMesh.matrixWorld);

      // 2. Project anchor into screen coordinates using the active Three.js camera
      const screenPos = worldAnchor.project(camera);

      // Check if tooth is behind the camera or out of frustum
      if (screenPos.z > 1.0 || screenPos.z < -1.0) {
        svg.style.display = 'none';
        badge.style.display = 'none';
        return;
      }

      const containerW = container.clientWidth;
      const containerH = container.clientHeight;
      const toothScreenX = (screenPos.x * 0.5 + 0.5) * containerW;
      const toothScreenY = (-screenPos.y * 0.5 + 0.5) * containerH;

      // 3. Layout Badge Position with quadrant awareness and edge boundary handling
      const badgeW = 156;
      const badgeH = 46;
      const padX = 20;
      const padY = 56;

      let badgeX: number;
      let attachX: number;

      // If tooth is on the viewer's left side (quadrants 1 or 4 when facing front)
      const isLeftHalf = toothScreenX < containerW * 0.5;
      if (isLeftHalf) {
        // Check if placing badge to the left would collide with left edge OR bottom-left MiniArchSelector (x: 0..210, y: H-280..H)
        const inLowerLeftZone = toothScreenY > containerH - 280;
        const fitsOnLeft = toothScreenX - badgeW - 40 >= padX && !inLowerLeftZone;

        if (fitsOnLeft) {
          badgeX = toothScreenX - badgeW - 40;
          attachX = badgeX + badgeW;
        } else {
          // Place to the right (inward) of the tooth in the open center area
          badgeX = toothScreenX + 45;
          attachX = badgeX;
        }
      } else {
        // If tooth is on the viewer's right side (quadrants 2 or 3)
        if (toothScreenX + 40 + badgeW <= containerW - padX) {
          badgeX = toothScreenX + 40;
          attachX = badgeX;
        } else {
          // If too close to right edge, place badge to the left (inward)
          badgeX = toothScreenX - badgeW - 45;
          attachX = badgeX + badgeW;
        }
      }

      // Vertical offset: upper teeth angle slightly upward, lower teeth angle slightly downward
      let badgeY = isUpper ? toothScreenY - 34 : toothScreenY + 6;

      // Prevent collision with bottom-left Mini FDI arch selector (w: ~176px, h: ~210px)
      if (badgeX < 210 && badgeY > containerH - 260) {
        badgeY = Math.min(badgeY, containerH - 265 - badgeH);
      }

      // Clamp badge within container viewable bounds
      badgeX = Math.max(padX, Math.min(containerW - badgeW - padX, badgeX));
      badgeY = Math.max(padY, Math.min(containerH - badgeH - padY, badgeY));

      const attachY = badgeY + badgeH / 2;

      // 4. Construct SVG connecting line path with smooth shoulder to tooth anchor
      const isBadgeLeft = attachX <= toothScreenX;
      const shoulderLen = Math.min(24, Math.max(8, Math.abs(toothScreenX - attachX) * 0.35));
      const elbowX = isBadgeLeft ? attachX + shoulderLen : attachX - shoulderLen;
      const elbowY = attachY;

      const pathD = `M ${attachX.toFixed(1)} ${attachY.toFixed(1)} L ${elbowX.toFixed(1)} ${elbowY.toFixed(1)} L ${toothScreenX.toFixed(1)} ${toothScreenY.toFixed(1)}`;

      // 5. Update DOM coordinates directly for butter-smooth 60fps tracking
      svg.style.display = 'block';
      badge.style.display = 'block';
      badge.style.transform = `translate(${badgeX.toFixed(1)}px, ${badgeY.toFixed(1)}px)`;

      if (path) path.setAttribute('d', pathD);
      if (dot) {
        dot.setAttribute('cx', toothScreenX.toFixed(1));
        dot.setAttribute('cy', toothScreenY.toFixed(1));
      }
      if (ring) {
        ring.setAttribute('cx', toothScreenX.toFixed(1));
        ring.setAttribute('cy', toothScreenY.toFixed(1));
      }
    };

    // 9. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // Dynamic calculation and projection of selected tooth anchor
      updateToothCallout();

      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      container.replaceChildren();
    };
  }, []);

  // Update Tooth Materials (Selected highlight + Condition colors)
  useEffect(() => {
    // 1. Update Highlight Outline attached directly to the selected tooth
    if (selectedOutlineRef.current) {
      selectedOutlineRef.current.parent?.remove(selectedOutlineRef.current);
      selectedOutlineRef.current.geometry.dispose();
      selectedOutlineRef.current = null;
    }

    const selectedMesh = teethMapRef.current.get(selectedFDI);
    if (selectedMesh) {
      // Glowing cyan outline wireframe matching reference
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
        depthTest: true,
      });
      const outlineMesh = new THREE.Mesh(selectedMesh.geometry, wireMat);
      outlineMesh.scale.set(1.05, 1.05, 1.05);
      selectedMesh.add(outlineMesh);
      selectedOutlineRef.current = outlineMesh;
    }

    // 2. Update Teeth Enamel Materials
    teethMapRef.current.forEach((mesh, fdi) => {
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      if (!mat) return;

      const isSelected = fdi === selectedFDI;
      const conditionColor = toothConditionColors.get(fdi);

      if (isSelected) {
        // Enamel with radiant cyan subsurface glow
        mat.color.set('#d0f4ff');
        mat.emissive.set('#00b4d8');
        mat.emissiveIntensity = 0.45;
        mat.roughness = 0.12;
        mat.clearcoat = 0.95;
      } else if (conditionColor) {
        // Condition-coded color
        mat.color.set(conditionColor);
        mat.emissive.set(conditionColor);
        mat.emissiveIntensity = 0.25;
        mat.roughness = 0.22;
        mat.clearcoat = 0.5;
      } else {
        // Natural Ivory Enamel
        mat.color.set('#FCFAF7');
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0.0;
        mat.roughness = 0.16;
        mat.clearcoat = 0.85;
      }
      mat.needsUpdate = true;
    });
  }, [selectedFDI, toothConditionColors]);

  // Update Jaw Opening Angle dynamically around TMJ axis
  useEffect(() => {
    if (setJawOpeningRef.current) {
      setJawOpeningRef.current((jawAngleDeg * Math.PI) / 180);
    }
  }, [jawAngleDeg]);

  const selectedToothObj = getToothByFDI(selectedFDI);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full min-h-[500px] h-[520px] sm:h-[580px] lg:h-[650px] lg:max-h-[650px] bg-[#071923] rounded-3xl overflow-hidden border border-slate-800 shadow-xl select-none"
    >
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* 1. Dynamic Selected Tooth Callout Overlay & Connecting Pointer */}
      <svg
        ref={calloutSvgRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
        style={{ display: 'none' }}
      >
        <defs>
          <filter id="calloutCyanGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00e5ff" floodOpacity="0.85" />
          </filter>
        </defs>
        {/* Cyan connecting leader line */}
        <path
          ref={calloutPathRef}
          d=""
          fill="none"
          stroke="#00e5ff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#calloutCyanGlow)"
        />
        {/* Target Reticle Outer Pulse Ring */}
        <circle
          ref={calloutRingRef}
          cx="0"
          cy="0"
          r="6"
          fill="none"
          stroke="#00e5ff"
          strokeWidth="1.5"
          className="animate-pulse"
        />
        {/* Core Anchor Dot touching exact tooth mesh body */}
        <circle
          ref={calloutDotRef}
          cx="0"
          cy="0"
          r="2.5"
          fill="#ffffff"
          stroke="#00e5ff"
          strokeWidth="1.2"
        />
      </svg>

      {/* Floating Selected Tooth Badge */}
      <div
        ref={calloutBadgeRef}
        className="absolute z-20 pointer-events-none select-none transition-transform duration-75 ease-out"
        style={{ display: 'none', top: 0, left: 0 }}
      >
        <div className="relative bg-slate-950/85 backdrop-blur-md border border-cyan-500/60 rounded-xl px-3.5 py-2 shadow-2xl flex flex-col min-w-[140px]">
          <span className="text-xs font-black text-white tracking-wide">
            Tooth {selectedToothObj?.fdi}
          </span>
          <span className="text-[10px] font-medium text-cyan-300/90 whitespace-nowrap">
            {selectedToothObj?.name}
          </span>
        </div>
      </div>

      {/* Directional Navigation Controls around the Main 3D Viewer */}
      {/* UP Arrow: Top Position */}
      <button
        type="button"
        onClick={() => handleRotateDirection('up')}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 rounded-xl backdrop-blur-md shadow-2xl transition-all active:scale-95 cursor-pointer group"
        title="Rotate Model Up (Upper View)"
        aria-label="Rotate Model Up"
      >
        <ChevronUp className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-bold tracking-wider text-slate-400 group-hover:text-cyan-300 uppercase">Up</span>
      </button>

      {/* DOWN Arrow: Bottom Position */}
      <button
        type="button"
        onClick={() => handleRotateDirection('down')}
        className="absolute bottom-18 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 rounded-xl backdrop-blur-md shadow-2xl transition-all active:scale-95 cursor-pointer group"
        title="Rotate Model Down (Lower View)"
        aria-label="Rotate Model Down"
      >
        <span className="text-[10px] font-bold tracking-wider text-slate-400 group-hover:text-cyan-300 uppercase">Down</span>
        <ChevronDown className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
      </button>

      {/* LEFT Arrow: Left Side */}
      <button
        type="button"
        onClick={() => handleRotateDirection('left')}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 p-2 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 rounded-xl backdrop-blur-md shadow-2xl transition-all active:scale-95 cursor-pointer group"
        title="Rotate Model Left"
        aria-label="Rotate Model Left"
      >
        <ChevronLeft className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] font-bold tracking-wider text-slate-400 group-hover:text-cyan-300 uppercase">Left</span>
      </button>

      {/* RIGHT Arrow: Right Side */}
      <button
        type="button"
        onClick={() => handleRotateDirection('right')}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 p-2 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 rounded-xl backdrop-blur-md shadow-2xl transition-all active:scale-95 cursor-pointer group"
        title="Rotate Model Right"
        aria-label="Rotate Model Right"
      >
        <ChevronRight className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] font-bold tracking-wider text-slate-400 group-hover:text-cyan-300 uppercase">Right</span>
      </button>

      {/* Hover Tooltip if hovering another tooth */}
      {hoveredTooth && hoveredTooth.fdi !== selectedFDI && (
        <div className="absolute top-4 left-5 z-20 pointer-events-none bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-200">
          Tooth {hoveredTooth.fdi} — {hoveredTooth.name} (Click to inspect)
        </div>
      )}

      {/* 2. Mini Dental Arch Selector (Bottom Left) */}
      <MiniArchSelector
        selectedFDI={selectedFDI}
        onSelectTooth={onSelectTooth}
        toothConditionColors={toothConditionColors}
        onRotateDirection={handleRotateDirection}
      />

      {/* 3. Right Vertical Action Controls matching reference image */}
      <div className="absolute top-6 right-5 z-20 flex flex-col bg-slate-950/75 backdrop-blur-md border border-slate-800 rounded-2xl p-1 shadow-2xl gap-1">
        {/* Center / Focus */}
        <button
          type="button"
          onClick={handleFocus}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition cursor-pointer"
          title="Center / Focus on Selected Tooth"
        >
          <Target className="w-4 h-4" />
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={() => handleZoom('in')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition cursor-pointer"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={() => handleZoom('out')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition cursor-pointer"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Fullscreen */}
        <button
          type="button"
          onClick={handleFullscreen}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition cursor-pointer"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Reset Camera */}
        <button
          type="button"
          onClick={handleReset}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition cursor-pointer"
          title="Reset Camera Position"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* 4. Bottom View Selection Toolbar matching reference image */}
      <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-20 flex items-center bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-2xl gap-2">
        <div className="flex items-center gap-1">
          {(['front', 'right', 'left', 'upper', 'lower'] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => applyCameraView(view)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                activeView === view
                  ? 'bg-[#008f8c] text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-slate-800" />

        {/* Jaw Articulation Slider (TMJ rotation) */}
        <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-300">
          <span className="text-[11px] text-slate-400 whitespace-nowrap">Jaw:</span>
          <input
            type="range"
            min="0"
            max="35"
            step="1"
            value={jawAngleDeg}
            onChange={(e) => setJawAngleDeg(Number(e.target.value))}
            className="w-16 sm:w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#008f8c]"
            title={`Jaw opening angle: ${jawAngleDeg}°`}
          />
          <span className="text-[10px] text-cyan-400 font-mono w-6">{jawAngleDeg}°</span>
        </div>
      </div>
    </div>
  );
};
