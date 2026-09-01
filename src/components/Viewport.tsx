import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  BrushSettings,
  Layer,
  ModelMetadata,
  SymmetryMode,
  ToolType,
  LightingPreset,
  LiquifySettings,
  NumpadTarget,
} from '../types';
import { StudioEngine } from '../core/studioEngine';
import { StylusRadialMenu, RadialMenuPosition } from './StylusRadialMenu';
import {
  RotateCw,
  Maximize2,
  Compass,
  Eye,
  ShieldAlert,
  Cpu,
  Hand,
  Paintbrush,
  ZoomIn,
  ZoomOut,
  PenTool,
  Move,
  Sparkles,
  Touchpad,
  Box,
  Layers,
} from 'lucide-react';

interface ViewportProps {
  tool: ToolType;
  onSelectTool?: (tool: ToolType) => void;
  brushSettings: BrushSettings;
  onUpdateBrushSettings?: (settings: Partial<BrushSettings>) => void;
  activeLayer: Layer;
  layers: Layer[];
  symmetry: SymmetryMode;
  onSelectSymmetry?: (sym: SymmetryMode) => void;
  lightingPreset: LightingPreset;
  showWireframe: boolean;
  showGrid: boolean;
  onEngineReady: (engine: StudioEngine) => void;
  onColorPick?: (hex: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  cameraInteracting: boolean;
  setCameraInteracting: (val: boolean) => void;
  fingerPenMode?: boolean;
  onToggleFingerPenMode?: (enabled: boolean) => void;
  liquifySettings?: LiquifySettings;
  onOpenColorPanel?: () => void;
  onOpenNumpad?: (target: NumpadTarget) => void;
  disableContextMenu?: boolean;
  onToggleDisableContextMenu?: () => void;
  theme?: 'light' | 'dark';
  onStylusDetected?: (detected: boolean) => void;
}

export const Viewport: React.FC<ViewportProps> = ({
  tool,
  onSelectTool,
  brushSettings,
  onUpdateBrushSettings,
  activeLayer,
  layers,
  symmetry,
  onSelectSymmetry,
  lightingPreset,
  showWireframe,
  showGrid,
  onEngineReady,
  onColorPick,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  cameraInteracting,
  setCameraInteracting,
  fingerPenMode = true,
  onToggleFingerPenMode,
  liquifySettings,
  onOpenColorPanel,
  onOpenNumpad,
  disableContextMenu = false,
  onToggleDisableContextMenu,
  theme = 'dark',
  onStylusDetected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StudioEngine | null>(null);
  const [engineInstance, setEngineInstance] = useState<StudioEngine | null>(null);

  const [fps, setFps] = useState<number>(60);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [touchDist, setTouchDist] = useState<number | null>(null);
  const [isStylusDetected, setIsStylusDetected] = useState<boolean>(false);
  const [isPanMode, setIsPanMode] = useState<boolean>(false);

  // Radial context menu state anchored at stylus tip
  const [isRadialMenuOpen, setIsRadialMenuOpen] = useState<boolean>(false);
  const [radialMenuPos, setRadialMenuPos] = useState<RadialMenuPosition | null>(null);
  const lastStylusHoverPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 3-Finger Gesture Feedback Toast
  const [gestureToast, setGestureToast] = useState<{ title: string; subtitle?: string } | null>(null);
  const gestureToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastNormalizedPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPointerDown = useRef<boolean>(false);
  const activePointers = useRef<Map<number, { x: number; y: number; pointerType: string }>>(new Map());
  const strokeStartTime = useRef<number>(0);
  const rightClickDragDistance = useRef<number>(0);
  const isRightClickDown = useRef<boolean>(false);

  // 3-Finger Gesture Tracking
  const threeFingerStartY = useRef<number | null>(null);
  const threeFingerStartX = useRef<number | null>(null);
  const threeFingerStartTime = useRef<number>(0);
  const threeFingerInitialFov = useRef<number>(45);

  const showGestureToast = (title: string, subtitle?: string) => {
    setGestureToast({ title, subtitle });
    if (gestureToastTimerRef.current) {
      clearTimeout(gestureToastTimerRef.current);
    }
    gestureToastTimerRef.current = setTimeout(() => {
      setGestureToast(null);
    }, 1800);
  };

  const triggerHaptic = (ms: number = 15) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch (_) {}
  };

  // Initialize Three.js Studio Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new StudioEngine(containerRef.current);
    engineRef.current = engine;
    setEngineInstance(engine);

    engine.onFpsUpdate = (f) => setFps(f);
    engine.onMetadataUpdate = (m) => setMetadata(m);

    onEngineReady(engine);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          engine.resize(width, height);
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Sync Layers with engine
  useEffect(() => {
    engineRef.current?.syncLayers(layers);
  }, [layers]);

  // Sync Active Layer
  useEffect(() => {
    engineRef.current?.setActiveLayer(activeLayer.id);
  }, [activeLayer.id]);

  // Sync Lighting Preset
  useEffect(() => {
    engineRef.current?.setLightingPreset(lightingPreset);
  }, [lightingPreset]);

  // Sync Theme
  useEffect(() => {
    engineRef.current?.setTheme(theme);
  }, [theme]);

  // Sync Wireframe & Grid
  useEffect(() => {
    engineRef.current?.setWireframe(showWireframe);
  }, [showWireframe]);

  useEffect(() => {
    engineRef.current?.setGrid(showGrid);
  }, [showGrid]);

  // Convert client pointer coordinate to normalized device coordinates (-1 to 1)
  const getNormalizedCoords = (e: React.PointerEvent<HTMLDivElement> | PointerEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    return { x, y };
  };

  const getFovDescription = (fov: number): string => {
    if (fov <= 25) return 'Telephoto / Flat';
    if (fov <= 40) return 'Standard Portrait';
    if (fov <= 55) return 'Natural Perspective';
    if (fov <= 75) return 'Wide Angle';
    return 'Ultra-Wide Panoramic';
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      pointerType: e.pointerType,
    });

    if (e.pointerType === 'pen') {
      setIsStylusDetected(true);
      onStylusDetected?.(true);
      lastStylusHoverPos.current = { x: e.clientX, y: e.clientY };
    }

    const engine = engineRef.current;
    if (!engine) return;

    // Check S-Pen / Stylus Hardware Barrel / Side-Button Event (button 2 or buttons 2 or button 5)
    const isStylusSideButton =
      e.pointerType === 'pen' &&
      (e.button === 2 || e.buttons === 2 || e.button === 5 || e.buttons === 32);

    if (isStylusSideButton) {
      if (disableContextMenu) {
        return;
      }
      triggerHaptic(20);
      setRadialMenuPos({ x: e.clientX, y: e.clientY });
      setIsRadialMenuOpen(true);
      return;
    }

    if (e.button === 2) {
      isRightClickDown.current = true;
      rightClickDragDistance.current = 0;
    }

    // Strict Input Bifurcation:
    // When pointerType === 'pen': strictly drawing/liquify
    // When pointerType === 'touch': strictly camera navigation, unless fingerPenMode is true
    const isPen = e.pointerType === 'pen';
    const isTouch = e.pointerType === 'touch';

    // 3-Finger Gesture: track start coordinates for dynamic FOV / Projection shift
    if (activePointers.current.size === 3) {
      if (isPointerDown.current) {
        isPointerDown.current = false;
        engine.cancelStroke();
      }
      threeFingerStartY.current = e.clientY;
      threeFingerStartX.current = e.clientX;
      threeFingerStartTime.current = performance.now();
      threeFingerInitialFov.current = engine.getFov();
      setIsOrbiting(false);
      return;
    }

    // Strict Input Bifurcation with Smart Surface Raycasting:
    // Multi-touch gestures (2+ fingers) always orbit/pan & cancel any pending stroke
    if (activePointers.current.size >= 2) {
      if (isPointerDown.current) {
        isPointerDown.current = false;
        engine.cancelStroke();
      }
      setIsOrbiting(true);
      return;
    }

    const coords = getNormalizedCoords(e);

    // Smart 1-finger touch vs model hit detection:
    // If user touches 3D model with finger or pen, paint on model!
    // If user drags outside the model in empty background and fingerPenMode is off, orbit camera!
    let isCameraAction =
      e.button === 2 ||
      e.button === 1 ||
      e.altKey ||
      cameraInteracting ||
      isPanMode;

    if (!isCameraAction && isTouch && !fingerPenMode) {
      const hit = engine.raycastModel(coords.x, coords.y, brushSettings);
      if (!hit || !hit.hit) {
        isCameraAction = true;
      }
    }

    if (isCameraAction) {
      setIsOrbiting(true);
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Brush DNA Picker tool (Clones complete 3D stroke DNA)
    if (tool === 'brush_picker') {
      const dna = engine.sampleHolisticDNA(coords.x, coords.y, e.clientX, e.clientY);
      if (dna) {
        if (onUpdateBrushSettings) {
          onUpdateBrushSettings({
            color: dna.colorHex,
            size: dna.size,
            opacity: dna.opacity,
            roughness: dna.roughness,
            metalness: dna.metalness,
            emissiveIntensity: dna.emissiveIntensity,
            materialType: dna.materialType,
            profile: dna.profile,
            patternType: dna.patternType,
            patternScale: dna.patternScale,
            patternIntensity: dna.patternIntensity,
            shaderEffect: dna.shaderEffect,
          });
        }
        if (onColorPick) {
          onColorPick(dna.colorHex);
        }
        triggerHaptic(30);
        showGestureToast(
          'Brush DNA Injected',
          `${dna.profile.toUpperCase()} • ${dna.materialType.toUpperCase()}`
        );
      }
      return;
    }

    // Paint & Finish Eyedropper tool
    if (tool === 'paint_picker' || tool === 'eyedropper') {
      const sampledColor = engine.sampleColorAtScreen(coords.x, coords.y, e.clientX, e.clientY);
      if (sampledColor) {
        if (onColorPick) {
          onColorPick(sampledColor);
        }
        // Check if a 3D model mesh with material was hit to sample PBR finish
        const modelHit = engine.raycastModel(coords.x, coords.y);
        if (modelHit && modelHit.hit && modelHit.mesh && onUpdateBrushSettings) {
          const m = modelHit.mesh.material as any;
          if (m) {
            onUpdateBrushSettings({
              color: sampledColor,
              roughness: typeof m.roughness === 'number' ? m.roughness : brushSettings.roughness,
              metalness: typeof m.metalness === 'number' ? m.metalness : brushSettings.metalness,
            });
          }
        } else if (onUpdateBrushSettings) {
          onUpdateBrushSettings({ color: sampledColor });
        }
        triggerHaptic(25);
        showGestureToast('Paint Sampled', sampledColor.toUpperCase());
      }
      return;
    }

    // Liquify Tool
    if (tool === 'liquify') {
      isPointerDown.current = true;
      lastNormalizedPos.current = coords;
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
      engine.startLiquifySession();
      return;
    }

    // Standard Painting action
    isPointerDown.current = true;
    strokeStartTime.current = performance.now();
    lastNormalizedPos.current = coords;
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
    const pressure = e.pressure > 0 ? e.pressure : 1.0;

    engine.startStroke(coords.x, coords.y, brushSettings, tool, activeLayer, pressure, symmetry);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const engine = engineRef.current;
    if (!engine) return;

    const coords = getNormalizedCoords(e);
    activePointers.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      pointerType: e.pointerType,
    });

    if (e.pointerType === 'pen') {
      setIsStylusDetected(true);
      onStylusDetected?.(true);
      lastStylusHoverPos.current = { x: e.clientX, y: e.clientY };
    }

    // 3-Finger Gesture: Dynamic Vertical Swipe for Camera FOV
    if (activePointers.current.size === 3 && threeFingerStartY.current !== null) {
      const deltaY = e.clientY - threeFingerStartY.current;
      const newFov = Math.round(
        Math.max(15, Math.min(95, threeFingerInitialFov.current + deltaY * 0.22))
      );
      engine.setFov(newFov);
      showGestureToast(`Camera FOV: ${newFov}°`, getFovDescription(newFov));
      return;
    }

    // Handle 2-finger multi-touch gestures (pinch-zoom, pan, and rotation)
    if (activePointers.current.size >= 2) {
      if (isPointerDown.current) {
        isPointerDown.current = false;
        engine.cancelStroke();
      }

      const pts: { x: number; y: number; pointerType: string }[] = Array.from(
        activePointers.current.values()
      );
      const p1 = pts[0];
      const p2 = pts[1];
      if (!p1 || !p2) return;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);

      if (touchDist !== null) {
        const deltaDist = touchDist - dist;
        engine.zoom(deltaDist * 1.8);
      }
      setTouchDist(dist);

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      if (lastPointerPos.current) {
        const deltaX = midX - lastPointerPos.current.x;
        const deltaY = midY - lastPointerPos.current.y;
        engine.pan(deltaX * 1.2, deltaY * 1.2);
      }
      lastPointerPos.current = { x: midX, y: midY };
      return;
    }

    // Camera orbit / pan
    if (isOrbiting) {
      const deltaX = e.clientX - lastPointerPos.current.x;
      const deltaY = e.clientY - lastPointerPos.current.y;

      if (isRightClickDown.current) {
        rightClickDragDistance.current += Math.hypot(deltaX, deltaY);
      }

      if (e.buttons === 4 || e.shiftKey || isPanMode) {
        engine.pan(deltaX * 1.2, deltaY * 1.2);
      } else {
        engine.orbit(deltaX * 1.2, deltaY * 1.2);
      }

      lastPointerPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Liquify drag deformation
    if (tool === 'liquify' && isPointerDown.current) {
      const deltaScreenX = coords.x - lastNormalizedPos.current.x;
      const deltaScreenY = coords.y - lastNormalizedPos.current.y;

      if (liquifySettings && (Math.abs(deltaScreenX) > 0.0001 || Math.abs(deltaScreenY) > 0.0001)) {
        engine.applyLiquifyAtScreen(coords.x, coords.y, deltaScreenX, deltaScreenY, liquifySettings);
      }

      lastNormalizedPos.current = coords;
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Painting stroke
    if (isPointerDown.current) {
      // Process coalesced hardware events for high-rate stylus / high-speed touch sweeps
      const coalescedEvents: Array<{ clientX: number; clientY: number; pressure: number }> = [];
      const native = e.nativeEvent as any;
      if (native && typeof native.getCoalescedEvents === 'function') {
        const cEvents = native.getCoalescedEvents();
        if (cEvents && cEvents.length > 0) {
          for (let i = 0; i < cEvents.length; i++) {
            const ev = cEvents[i];
            coalescedEvents.push({
              clientX: ev.clientX,
              clientY: ev.clientY,
              pressure: ev.pressure > 0 ? ev.pressure : e.pressure > 0 ? e.pressure : 1.0,
            });
          }
        }
      }

      if (coalescedEvents.length > 0 && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        for (const ev of coalescedEvents) {
          const cx = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
          const cy = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
          engine.addStrokePoint(cx, cy, brushSettings, tool, ev.pressure, symmetry);
        }
      } else {
        const pressure = e.pressure > 0 ? e.pressure : 1.0;
        engine.addStrokePoint(coords.x, coords.y, brushSettings, tool, pressure, symmetry);
      }

      lastNormalizedPos.current = coords;
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
    } else {
      // Update 3D cursor decal when hovering
      engine.updateCursor(coords.x, coords.y, brushSettings.size, brushSettings, tool);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    const engine = engineRef.current;

    // Check 3-finger quick tap / horizontal swipe for Perspective <-> Orthographic toggle
    if (activePointers.current.size === 3 && threeFingerStartX.current !== null && engine) {
      const dt = performance.now() - threeFingerStartTime.current;
      const dx = e.clientX - threeFingerStartX.current;
      const dy = threeFingerStartY.current !== null ? e.clientY - threeFingerStartY.current : 0;

      const isQuickTap = dt < 350 && Math.hypot(dx, dy) < 25;
      const isHorizSwipe = Math.abs(dx) > 60 && Math.abs(dy) < 40;

      if (isQuickTap || isHorizSwipe) {
        triggerHaptic(25);
        const newMode = engine.toggleProjectionMode();
        showGestureToast(
          newMode === 'orthographic' ? 'Orthographic Projection' : 'Perspective Projection',
          newMode === 'orthographic' ? 'Parallel Isometric Rays' : 'Standard Focal Perspective'
        );
      }
    }

    activePointers.current.delete(e.pointerId);

    if (activePointers.current.size < 2) {
      setTouchDist(null);
    }

    if (activePointers.current.size < 3) {
      threeFingerStartY.current = null;
      threeFingerStartX.current = null;
    }

    if (activePointers.current.size === 0) {
      setIsOrbiting(false);
    }

    if (e.button === 2) {
      isRightClickDown.current = false;
    }

    if (!engine) return;

    if (isPointerDown.current) {
      isPointerDown.current = false;
      if (tool === 'liquify') {
        // Liquify session stays active for non-destructive compare / commit
      } else {
        engine.endStroke(brushSettings, tool, activeLayer.id, symmetry);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    engineRef.current?.zoom(e.deltaY * 0.8);
  };

  const handleContextMenu = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent) => {
    e.preventDefault();
    const wasDragging = rightClickDragDistance.current > 5;
    rightClickDragDistance.current = 0;
    if (disableContextMenu || wasDragging) {
      // Suppress radial menu when disabled via menu toggle or when user was orbiting
      return;
    }
    triggerHaptic(18);
    setRadialMenuPos({ x: e.clientX, y: e.clientY });
    setIsRadialMenuOpen(true);
  };

  const handleZoomIn = () => {
    triggerHaptic(8);
    engineRef.current?.zoom(-120);
  };

  const handleZoomOut = () => {
    triggerHaptic(8);
    engineRef.current?.zoom(120);
  };

  const handleResetView = () => {
    triggerHaptic(12);
    engineRef.current?.resetCamera();
    showGestureToast('Camera Reset', 'Default 3D Perspective');
  };

  const handleToggleProjection = () => {
    triggerHaptic(15);
    const newMode = engineRef.current?.toggleProjectionMode();
    if (newMode) {
      showGestureToast(
        newMode === 'orthographic' ? 'Orthographic Projection' : 'Perspective Projection',
        newMode === 'orthographic' ? 'Parallel Isometric Rays' : 'Standard Focal Perspective'
      );
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
      className="relative w-full h-full touch-none select-none cursor-crosshair overflow-hidden"
    >
      {/* 3-Finger Gesture Floating Live Toast / HUD Indicator */}
      {gestureToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-2 rounded-2xl bg-neutral-900/90 border border-neutral-700 text-white shadow-2xl backdrop-blur-md flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-indigo-400 tracking-wide">
              {gestureToast.title}
            </span>
            {gestureToast.subtitle && (
              <span className="text-[10px] text-neutral-400">{gestureToast.subtitle}</span>
            )}
          </div>
        </div>
      )}

      {/* Floating Viewport Navigation Control Pod */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col items-center gap-1.5 bg-neutral-900/90 border border-neutral-800 p-1.5 rounded-2xl shadow-xl backdrop-blur-md pointer-events-auto">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 rounded-xl hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
          title="Reset Camera View"
        >
          <Compass className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsPanMode(!isPanMode)}
          className={`p-2 rounded-xl border transition-all ${
            isPanMode
              ? 'bg-indigo-600 border-indigo-500 text-white'
              : 'border-transparent text-neutral-400 hover:bg-neutral-800 hover:text-white'
          }`}
          title="Pan Mode Toggle"
        >
          <Move className="w-4 h-4" />
        </button>
      </div>

      {/* S-Pen Hardware Radial Context Menu (At Stylus Tip) */}
      <StylusRadialMenu
        isOpen={isRadialMenuOpen}
        position={radialMenuPos}
        onClose={() => setIsRadialMenuOpen(false)}
        tool={tool}
        onSelectTool={(newTool) => {
          if (onSelectTool) onSelectTool(newTool);
        }}
        brushSettings={brushSettings}
        onUpdateBrushSettings={(newSettings) => {
          if (onUpdateBrushSettings) onUpdateBrushSettings(newSettings);
        }}
        symmetry={symmetry}
        onSelectSymmetry={(newSym) => {
          if (onSelectSymmetry) onSelectSymmetry(newSym);
        }}
        onUndo={() => {
          if (onUndo) onUndo();
        }}
        onRedo={() => {
          if (onRedo) onRedo();
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        onResetView={handleResetView}
        onRecalculateNormals={() => engineRef.current?.recalculateMeshNormals()}
        onOpenColorPanel={onOpenColorPanel}
        onOpenNumpad={onOpenNumpad}
        theme={theme}
      />
    </div>
  );
};
