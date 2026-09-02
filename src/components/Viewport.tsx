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
  const strokeStartTime = useRef<number>(0);
  const rightClickDragDistance = useRef<number>(0);
  const isRightClickDown = useRef<boolean>(false);

  // 1. Hardware-Isolated Stylus State & Contact Protection
  const penActiveRef = useRef<boolean>(false);
  const penInProximityRef = useRef<boolean>(false);
  const activePenIdRef = useRef<number | null>(null);
  const isPenDrawingRef = useRef<boolean>(false);
  const lastPenEventTimeRef = useRef<number>(0);
  const [isStylusLockEnabled, setIsStylusLockEnabled] = useState<boolean>(true);

  // 2. Hardware-Isolated Touch Pointer Map (Strictly segregated from stylus)
  const touchPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const lastTouchMidpointRef = useRef<{ x: number; y: number } | null>(null);

  // 3-Finger Gesture Tracking (Touch channel only)
  const threeFingerStartY = useRef<number | null>(null);
  const threeFingerStartX = useRef<number | null>(null);
  const threeFingerStartTime = useRef<number>(0);
  const threeFingerInitialFov = useRef<number>(45);

  const showGestureToast = (title: string, subtitle?: string) => {
    if (gestureToastTimerRef.current) {
      clearTimeout(gestureToastTimerRef.current);
    }
    setGestureToast({ title, subtitle });
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

  // Global Delete / Backspace key listener to delete selected 3D strokes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const engine = engineRef.current;
        if (engine && engine.getSelectedStrokeId()) {
          e.preventDefault();
          engine.deleteSelectedStroke();
          triggerHaptic(30);
          showGestureToast('Curve Deleted', 'Selected 3D stroke removed');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    const engine = engineRef.current;
    if (!engine) return;

    // =========================================================================
    // 1. HARDWARE BRANCH: STYLUS / PEN (STRICTLY DRAWING / MANIPULATION)
    // =========================================================================
    if (e.pointerType === 'pen') {
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch (_) {}

      lastPenEventTimeRef.current = Date.now();
      penActiveRef.current = true;
      penInProximityRef.current = true;
      activePenIdRef.current = e.pointerId;
      touchPointersRef.current.clear(); // Drop any concurrent touch/palm touches
      setIsOrbiting(false); // Hard guarantee: stylus never triggers orbit

      setIsStylusDetected(true);
      onStylusDetected?.(true);
      lastStylusHoverPos.current = { x: e.clientX, y: e.clientY };

      // S-Pen / Stylus Hardware Barrel / Side-Button Event (button 2 or buttons 2 or button 5 or buttons 32)
      const isStylusSideButton =
        e.button === 2 || e.buttons === 2 || e.button === 5 || e.buttons === 32;

      if (isStylusSideButton) {
        if (!disableContextMenu) {
          triggerHaptic(20);
          setRadialMenuPos({ x: e.clientX, y: e.clientY });
          setIsRadialMenuOpen(true);
        }
        return;
      }

      const coords = getNormalizedCoords(e);
      isPenDrawingRef.current = true;
      isPointerDown.current = true;
      strokeStartTime.current = performance.now();
      lastNormalizedPos.current = coords;
      lastPointerPos.current = { x: e.clientX, y: e.clientY };

      // Pointer Selection Tool (Stroke Raycast & Selection)
      if (tool === 'pointer' || tool === 'select') {
        const hitStrokeId = engine.raycastStroke(coords.x, coords.y);
        if (hitStrokeId) {
          engine.selectStroke(hitStrokeId);
          triggerHaptic(20);
          showGestureToast('Curve Selected', `ID: ${hitStrokeId.slice(0, 8)}... (Press Del to remove)`);
        } else {
          engine.selectStroke(null);
        }
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
        engine.startLiquifySession();
        return;
      }

      // Standard Painting action
      const pressure = e.pressure > 0 ? e.pressure : 1.0;
      engine.startStroke(coords.x, coords.y, brushSettings, tool, activeLayer, pressure, symmetry);
      return;
    }

    // =========================================================================
    // 2. HARDWARE BRANCH: TOUCH (CAMERA NAVIGATION OR FINGER DRAWING)
    // =========================================================================
    if (e.pointerType === 'touch') {
      const now = Date.now();
      const isPenNear =
        penActiveRef.current ||
        penInProximityRef.current ||
        activePenIdRef.current !== null ||
        (now - lastPenEventTimeRef.current < 500);

      // Hardware Palm Rejection: If pen is active, in proximity, or recently used, drop touch
      if (isPenNear) {
        return;
      }

      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch (_) {}

      touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const touchCount = touchPointersRef.current.size;

      // 3-Finger Gesture: track start coordinates for dynamic FOV / Projection shift
      if (touchCount === 3) {
        threeFingerStartY.current = e.clientY;
        threeFingerStartX.current = e.clientX;
        threeFingerStartTime.current = performance.now();
        threeFingerInitialFov.current = engine.getFov();
        setIsOrbiting(false);
        return;
      }

      // 2-Finger Multi-Touch: Pinch Zoom & Pan
      if (touchCount === 2) {
        if (isPointerDown.current) {
          isPointerDown.current = false;
          engine.cancelStroke();
        }
        const pts = Array.from(touchPointersRef.current.values()) as Array<{ x: number; y: number }>;
        initialPinchDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        lastTouchMidpointRef.current = {
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2,
        };
        setIsOrbiting(false);
        return;
      }

      // 1-Finger Touch: Finger Drawing (if fingerPenMode is ON) or Camera Orbit
      if (touchCount === 1) {
        const coords = getNormalizedCoords(e);
        if (fingerPenMode) {
          isPointerDown.current = true;
          strokeStartTime.current = performance.now();
          lastNormalizedPos.current = coords;
          lastPointerPos.current = { x: e.clientX, y: e.clientY };
          engine.startStroke(coords.x, coords.y, brushSettings, tool, activeLayer, 1.0, symmetry);
          setIsOrbiting(false);
        } else {
          setIsOrbiting(true);
          lastPointerPos.current = { x: e.clientX, y: e.clientY };
        }
      }
      return;
    }

    // =========================================================================
    // 3. HARDWARE BRANCH: MOUSE (DESKTOP WORKFLOW)
    // =========================================================================
    if (e.pointerType === 'mouse') {
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch (_) {}

      if (e.button === 2) {
        isRightClickDown.current = true;
        rightClickDragDistance.current = 0;
      }

      const coords = getNormalizedCoords(e);
      const isCameraAction =
        e.button === 2 ||
        e.button === 1 ||
        e.altKey ||
        cameraInteracting ||
        isPanMode;

      if (isCameraAction) {
        setIsOrbiting(true);
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
        return;
      }

      isPointerDown.current = true;
      strokeStartTime.current = performance.now();
      lastNormalizedPos.current = coords;
      lastPointerPos.current = { x: e.clientX, y: e.clientY };

      if (tool === 'pointer' || tool === 'select') {
        const hitStrokeId = engine.raycastStroke(coords.x, coords.y);
        if (hitStrokeId) {
          engine.selectStroke(hitStrokeId);
          triggerHaptic(20);
          showGestureToast('Curve Selected', `ID: ${hitStrokeId.slice(0, 8)}...`);
        } else {
          engine.selectStroke(null);
        }
        return;
      }

      if (tool === 'brush_picker') {
        const dna = engine.sampleHolisticDNA(coords.x, coords.y, e.clientX, e.clientY);
        if (dna && onUpdateBrushSettings) {
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
          onColorPick?.(dna.colorHex);
        }
        return;
      }

      if (tool === 'liquify') {
        engine.startLiquifySession();
        return;
      }

      engine.startStroke(coords.x, coords.y, brushSettings, tool, activeLayer, 1.0, symmetry);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const engine = engineRef.current;
    if (!engine) return;

    // -----------------------------------------------------------------------
    // BRANCH 1: STYLUS / PEN MOVE (STRICT DRAWING, NO CAMERA INTERFERENCE)
    // -----------------------------------------------------------------------
    if (e.pointerType === 'pen') {
      lastPenEventTimeRef.current = Date.now();
      penActiveRef.current = true;
      penInProximityRef.current = true;
      setIsOrbiting(false); // Hard lock: Stylus can never orbit
      lastStylusHoverPos.current = { x: e.clientX, y: e.clientY };

      const coords = getNormalizedCoords(e);

      if (isPenDrawingRef.current && isPointerDown.current) {
        // Coalesced Hardware Sampling for Sub-Pixel Precision
        const coalescedEvents: Array<{ cx: number; cy: number; pressure: number }> = [];
        const native = e.nativeEvent as any;
        if (native && typeof native.getCoalescedEvents === 'function' && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const cEvents = native.getCoalescedEvents();
          if (cEvents && cEvents.length > 0) {
            for (let i = 0; i < cEvents.length; i++) {
              const ev = cEvents[i];
              coalescedEvents.push({
                cx: ((ev.clientX - rect.left) / rect.width) * 2 - 1,
                cy: -(((ev.clientY - rect.top) / rect.height) * 2 - 1),
                pressure: ev.pressure > 0 ? ev.pressure : e.pressure > 0 ? e.pressure : 1.0,
              });
            }
          }
        }

        if (tool === 'liquify') {
          const deltaScreenX = coords.x - lastNormalizedPos.current.x;
          const deltaScreenY = coords.y - lastNormalizedPos.current.y;
          if (liquifySettings && (Math.abs(deltaScreenX) > 0.0001 || Math.abs(deltaScreenY) > 0.0001)) {
            engine.applyLiquifyAtScreen(coords.x, coords.y, deltaScreenX, deltaScreenY, liquifySettings);
          }
        } else if (coalescedEvents.length > 0) {
          for (const ev of coalescedEvents) {
            engine.addStrokePoint(ev.cx, ev.cy, brushSettings, tool, ev.pressure, symmetry);
          }
        } else {
          const pressure = e.pressure > 0 ? e.pressure : 1.0;
          engine.addStrokePoint(coords.x, coords.y, brushSettings, tool, pressure, symmetry);
        }

        lastNormalizedPos.current = coords;
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
      } else {
        // Stylus Hover Decal Tracking
        engine.updateCursor(coords.x, coords.y, brushSettings.size, brushSettings, tool);
      }
      return;
    }

    // -----------------------------------------------------------------------
    // BRANCH 2: TOUCH MOVE (CAMERA OR FINGER DRAW)
    // -----------------------------------------------------------------------
    if (e.pointerType === 'touch') {
      const now = Date.now();
      if (
        penActiveRef.current ||
        penInProximityRef.current ||
        activePenIdRef.current !== null ||
        (now - lastPenEventTimeRef.current < 500)
      ) {
        return;
      }

      const p = touchPointersRef.current.get(e.pointerId);
      if (p) {
        p.x = e.clientX;
        p.y = e.clientY;
      }

      const touchCount = touchPointersRef.current.size;

      // 3-Finger Gesture: Dynamic Vertical Swipe for Camera FOV
      if (touchCount === 3 && threeFingerStartY.current !== null) {
        const deltaY = e.clientY - threeFingerStartY.current;
        const newFov = Math.round(
          Math.max(15, Math.min(95, threeFingerInitialFov.current + deltaY * 0.22))
        );
        engine.setFov(newFov);
        showGestureToast(`Camera FOV: ${newFov}°`, getFovDescription(newFov));
        return;
      }

      // 2-Finger Multi-Touch: Pinch-Zoom & Pan
      if (touchCount === 2) {
        const pts = Array.from(touchPointersRef.current.values()) as Array<{ x: number; y: number }>;
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };

        if (initialPinchDistRef.current !== null) {
          const deltaDist = initialPinchDistRef.current - dist;
          engine.zoom(deltaDist * 1.8);
        }
        initialPinchDistRef.current = dist;

        if (lastTouchMidpointRef.current) {
          const deltaX = mid.x - lastTouchMidpointRef.current.x;
          const deltaY = mid.y - lastTouchMidpointRef.current.y;
          engine.pan(deltaX * 1.2, deltaY * 1.2);
        }
        lastTouchMidpointRef.current = mid;
        return;
      }

      // 1-Finger Drawing or Camera Orbit
      if (touchCount === 1) {
        const coords = getNormalizedCoords(e);
        if (fingerPenMode && isPointerDown.current) {
          engine.addStrokePoint(coords.x, coords.y, brushSettings, tool, 1.0, symmetry);
          lastNormalizedPos.current = coords;
          lastPointerPos.current = { x: e.clientX, y: e.clientY };
        } else if (isOrbiting) {
          const deltaX = e.clientX - lastPointerPos.current.x;
          const deltaY = e.clientY - lastPointerPos.current.y;
          if (isPanMode || cameraInteracting) {
            engine.pan(deltaX * 1.2, deltaY * 1.2);
          } else {
            engine.orbit(deltaX * 1.2, deltaY * 1.2);
          }
          lastPointerPos.current = { x: e.clientX, y: e.clientY };
        }
      }
      return;
    }

    // -----------------------------------------------------------------------
    // BRANCH 3: MOUSE MOVE
    // -----------------------------------------------------------------------
    if (e.pointerType === 'mouse') {
      const coords = getNormalizedCoords(e);
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

      if (isPointerDown.current) {
        if (tool === 'liquify') {
          const deltaScreenX = coords.x - lastNormalizedPos.current.x;
          const deltaScreenY = coords.y - lastNormalizedPos.current.y;
          if (liquifySettings && (Math.abs(deltaScreenX) > 0.0001 || Math.abs(deltaScreenY) > 0.0001)) {
            engine.applyLiquifyAtScreen(coords.x, coords.y, deltaScreenX, deltaScreenY, liquifySettings);
          }
        } else {
          engine.addStrokePoint(coords.x, coords.y, brushSettings, tool, 1.0, symmetry);
        }
        lastNormalizedPos.current = coords;
        lastPointerPos.current = { x: e.clientX, y: e.clientY };
      } else {
        engine.updateCursor(coords.x, coords.y, brushSettings.size, brushSettings, tool);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}

    const engine = engineRef.current;

    // -----------------------------------------------------------------------
    // BRANCH 1: STYLUS / PEN UP
    // -----------------------------------------------------------------------
    if (e.pointerType === 'pen') {
      lastPenEventTimeRef.current = Date.now();
      if (isPenDrawingRef.current) {
        isPenDrawingRef.current = false;
        isPointerDown.current = false;
        if (tool !== 'liquify') {
          engine?.endStroke(brushSettings, tool, activeLayer.id, symmetry);
        }
      }
      activePenIdRef.current = null;
      penActiveRef.current = false;
      setIsOrbiting(false);
      return;
    }

    // -----------------------------------------------------------------------
    // BRANCH 2: TOUCH UP
    // -----------------------------------------------------------------------
    if (e.pointerType === 'touch') {
      const endedTouch = touchPointersRef.current.get(e.pointerId);

      // Check 3-finger quick tap / horizontal swipe for Perspective <-> Orthographic toggle
      if (touchPointersRef.current.size === 3 && endedTouch && threeFingerStartX.current !== null && engine) {
        const dt = performance.now() - threeFingerStartTime.current;
        const dx = endedTouch.x - threeFingerStartX.current;
        const dy = threeFingerStartY.current !== null ? endedTouch.y - threeFingerStartY.current : 0;

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

      touchPointersRef.current.delete(e.pointerId);

      if (touchPointersRef.current.size === 0) {
        setIsOrbiting(false);
        if (fingerPenMode && isPointerDown.current) {
          isPointerDown.current = false;
          if (tool !== 'liquify') {
            engine?.endStroke(brushSettings, tool, activeLayer.id, symmetry);
          }
        }
        initialPinchDistRef.current = null;
        lastTouchMidpointRef.current = null;
        threeFingerStartY.current = null;
        threeFingerStartX.current = null;
      } else if (touchPointersRef.current.size === 1) {
        const remaining = Array.from(touchPointersRef.current.values())[0] as { x: number; y: number } | undefined;
        if (remaining) {
          lastPointerPos.current = { x: remaining.x, y: remaining.y };
        }
        initialPinchDistRef.current = null;
      }
      return;
    }

    // -----------------------------------------------------------------------
    // BRANCH 3: MOUSE UP
    // -----------------------------------------------------------------------
    if (e.pointerType === 'mouse') {
      setIsOrbiting(false);
      if (e.button === 2) {
        isRightClickDown.current = false;
      }
      if (isPointerDown.current) {
        isPointerDown.current = false;
        if (tool !== 'liquify') {
          engine?.endStroke(brushSettings, tool, activeLayer.id, symmetry);
        }
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
      onPointerEnter={(e) => {
        if (e.pointerType === 'pen') {
          penInProximityRef.current = true;
          penActiveRef.current = true;
          setIsStylusDetected(true);
          onStylusDetected?.(true);
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'pen') {
          penInProximityRef.current = false;
          if (!isPenDrawingRef.current) {
            penActiveRef.current = false;
          }
        }
      }}
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
