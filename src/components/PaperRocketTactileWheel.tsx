/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react';
import {
  MoreHorizontal,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  ChevronRight,
  Move,
  Rotate3d,
  Disc,
  Compass,
  Check,
  Layers,
  Cpu,
  ZoomIn,
  Sliders,
  SlidersHorizontal,
  X,
  Minus,
  RotateCw,
} from 'lucide-react';
import { SpatialMode, SubWheelMode, SpatialState, BrushSettings, Layer, LoadedModelInfo, TransformTargetScope, AccessibilityMode } from '../types';
import { StudioEngine } from '../core/studioEngine';
import { playHapticSound } from '../utils/audio';
import { haptics } from '../utils/haptics';
import { ThreeTrackball } from './ThreeTrackball';
import { NavigatorHeader } from './TransformNavigator/NavigatorHeader';
import { OuterDegreeIndicatorRing } from './TransformNavigator/OuterDegreeIndicatorRing';

export interface PaperRocketTactileWheelProps {
  engine?: StudioEngine | null;
  cameraSpherical?: { radius: number; theta: number; phi: number };
  brushSettings?: BrushSettings;
  onUpdateBrushSettings?: (updater: (prev: BrushSettings) => BrushSettings) => void;
  mode?: SpatialMode;
  onModeChange?: (mode: SpatialMode) => void;
  spatialState?: SpatialState;
  onUpdateSpatial?: (updater: (prev: SpatialState) => SpatialState) => void;
  onReset?: () => void;
  onClose?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  uiScale?: number;
  className?: string;
  isLocked?: boolean;
  onLockChange?: (locked: boolean) => void;
  activeTargetName?: string;
  layers?: Layer[];
  activeLayerId?: string;
  onSelectLayer?: (layerId: string) => void;
  models?: LoadedModelInfo[];
  activeModelId?: string | null;
  onSelectModel?: (modelId: string | null) => void;
  targetScope?: TransformTargetScope;
  onSelectTargetScope?: (scope: TransformTargetScope) => void;
  accessibilityMode?: AccessibilityMode;
  onAccessibilityModeChange?: (mode: AccessibilityMode) => void;
  onCopy?: () => void;
  onPaste?: () => void;
  clipboardCount?: number;
  sensitivity?: number;
  onSensitivityChange?: (s: number) => void;
  theme?: 'light' | 'dark';
}

export const PaperRocketTactileWheel: React.FC<PaperRocketTactileWheelProps> = ({
  engine,
  brushSettings,
  onUpdateBrushSettings,
  mode: controlledMode,
  onModeChange: controlledOnModeChange,
  spatialState: controlledSpatialState,
  onUpdateSpatial: controlledOnUpdateSpatial,
  onReset,
  onClose,
  soundEnabled: controlledSoundEnabled,
  onToggleSound: controlledToggleSound,
  uiScale = 1.0,
  className = '',
  isLocked: controlledLocked,
  onLockChange,
  activeTargetName = 'Main Curves',
  layers = [],
  activeLayerId,
  onSelectLayer,
  models = [],
  activeModelId,
  onSelectModel,
  targetScope = 'active_layer',
  onSelectTargetScope,
  accessibilityMode: controlledAccessibilityMode,
  onAccessibilityModeChange,
  onCopy,
  onPaste,
  clipboardCount = 0,
  sensitivity = 0.5,
  onSensitivityChange,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  // Mode state with internal fallback
  const [internalMode, setInternalMode] = useState<SpatialMode>('3d');
  const mode = controlledMode !== undefined ? controlledMode : internalMode;

  const onModeChange = useCallback(
    (newMode: SpatialMode) => {
      setInternalMode(newMode);
      controlledOnModeChange?.(newMode);
    },
    [controlledOnModeChange]
  );

  // Spatial state with internal fallback
  const [internalSpatialState, setInternalSpatialState] = useState<SpatialState>({
    x: 0,
    y: 0,
    z: 0,
    pitch: 18,
    yaw: -24,
    roll: 0,
    scale: 1.0,
    brushSize: brushSettings?.size ? Math.max(1, Math.min(50, Math.round(brushSettings.size * 200))) : 18,
  });

  const spatialState = controlledSpatialState !== undefined ? controlledSpatialState : internalSpatialState;

  const onUpdateSpatial = useCallback(
    (updater: (prev: SpatialState) => SpatialState) => {
      if (controlledOnUpdateSpatial) {
        controlledOnUpdateSpatial(updater);
      } else {
        setInternalSpatialState(updater);
      }
    },
    [controlledOnUpdateSpatial]
  );

  // Sound state
  const [internalSoundEnabled, setInternalSoundEnabled] = useState<boolean>(true);
  const soundEnabled = controlledSoundEnabled !== undefined ? controlledSoundEnabled : internalSoundEnabled;
  const onToggleSound = useCallback(() => {
    if (controlledToggleSound) {
      controlledToggleSound();
    } else {
      setInternalSoundEnabled((prev) => !prev);
    }
  }, [controlledToggleSound]);
  // Lock State
  const [internalLocked, setInternalLocked] = useState(false);
  const isLocked = controlledLocked !== undefined ? controlledLocked : internalLocked;
  const handleLockToggle = useCallback(() => {
    const nextLocked = !isLocked;
    setInternalLocked(nextLocked);
    onLockChange?.(nextLocked);
  }, [isLocked, onLockChange]);

  // Accessibility State
  const [internalAccessibilityMode, setInternalAccessibilityMode] =
    useState<AccessibilityMode>('standard');
  const accessibilityMode =
    controlledAccessibilityMode !== undefined
      ? controlledAccessibilityMode
      : internalAccessibilityMode;
  const handleAccessibilityToggle = useCallback(() => {
    const nextMode: AccessibilityMode =
      accessibilityMode === 'standard' ? 'finger-pen' : 'standard';
    setInternalAccessibilityMode(nextMode);
    onAccessibilityModeChange?.(nextMode);
  }, [accessibilityMode, onAccessibilityModeChange]);

  // Position state with auto-clamping and localStorage persistence
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const defaultWidth = 370;
    const defaultHeight = 256;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const defaultX = Math.max(12, screenW - defaultWidth - 20);
    const defaultY = Math.max(12, screenH - defaultHeight - 24);
    
    try {
      const saved = localStorage.getItem('mody_tactile_wheel_coords');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const maxX = Math.max(10, screenW - defaultWidth);
          const maxY = Math.max(10, screenH - defaultHeight);
          return {
            x: Math.max(10, Math.min(maxX, parsed.x)),
            y: Math.max(10, Math.min(maxY, parsed.y)),
          };
        }
      }
    } catch (_) {}
    return { x: defaultX, y: defaultY };
  });

  const isDraggingCardRef = useRef<boolean>(false);

  const handleCardDragStart = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isDragGrip =
      target.id === 'navigator-drag-grip-handle' ||
      target.closest('#navigator-drag-grip-handle') ||
      target.closest('[aria-label="Drag to move navigator"]') ||
      target.closest('[title="Drag to move navigator"]') ||
      target.closest('#transform-navigator-header');

    if (
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.getAttribute('role') === 'button' ||
      target.closest('[role="button"]') ||
      target.tagName === 'INPUT' ||
      target.closest('input') ||
      target.id?.startsWith('handle-') ||
      target.closest('[id^="handle-"]') ||
      target.closest('#three-trackball-canvas') ||
      target.closest('#paper-rocket-trackball-sphere') ||
      target.closest('#paper-rocket-joystick-core') ||
      target.closest('#paper-rocket-center-white-puck') ||
      target.closest('[id^="petal-"]') ||
      target.closest('#paper-rocket-rotation-ring') ||
      target.closest('#paper-rocket-rotation-handle') ||
      target.closest('#paper-rocket-rotation-axis-selector') ||
      target.closest('#navigator-target-dropdown-panel') ||
      target.closest('[role="listbox"]')
    ) {
      return;
    }

    if (!isDragGrip) {
      return;
    }

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initPosX = position ? position.x : 0;
    const initPosY = position ? position.y : 0;

    isDraggingCardRef.current = true;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingCardRef.current) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      const maxX = Math.max(0, window.innerWidth - 80);
      const maxY = Math.max(0, window.innerHeight - 60);
      const newX = Math.min(maxX, Math.max(0, initPosX + dx));
      const newY = Math.min(maxY, Math.max(0, initPosY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      if (isDraggingCardRef.current) {
        isDraggingCardRef.current = false;
        setPosition((curr) => {
          if (curr) {
            try {
              localStorage.setItem('mody_tactile_wheel_coords', JSON.stringify(curr));
            } catch (_) {}
          }
          return curr;
        });
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Rotation Ring state & handlers with 45-degree quadrant slowdown
  const [isRotateRingDragging, setIsRotateRingDragging] = useState(false);
  const [rotateRingAngle, setRotateRingAngle] = useState(0);
  const [rotationAxis, setRotationAxis] = useState<'x' | 'y' | 'z'>('y');
  const [snappedMilestone, setSnappedMilestone] = useState<number | null>(null);
  const rotateRingLastAngleRef = useRef(0);
  const rotateRingDetentRef = useRef(0);
  const rotateRingLastSnapRef = useRef<number | null>(null);
  const rotateRingCenterRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });

  const handleRotateRingPointerDown = (e: React.PointerEvent<HTMLDivElement | SVGSVGElement>) => {
    if (isLocked) {
      haptics.trigger('lock');
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    rotateRingCenterRef.current = {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
    };

    const dx = e.clientX - rotateRingCenterRef.current.cx;
    const dy = e.clientY - rotateRingCenterRef.current.cy;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;

    rotateRingLastAngleRef.current = angle;
    rotateRingDetentRef.current = angle;
    rotateRingLastSnapRef.current = null;
    setIsRotateRingDragging(true);
    haptics.trigger('medium');
    playHapticSound('click', soundEnabled);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const curDx = moveEvent.clientX - rotateRingCenterRef.current.cx;
      const curDy = moveEvent.clientY - rotateRingCenterRef.current.cy;
      let rawAngle = (Math.atan2(curDy, curDx) * 180) / Math.PI + 90;
      if (rawAngle < 0) rawAngle += 360;

      let rawDelta = rawAngle - rotateRingLastAngleRef.current;
      if (rawDelta > 180) rawDelta -= 360;
      if (rawDelta < -180) rawDelta += 360;

      rotateRingLastAngleRef.current = rawAngle;

      // 45-degree quadrant slowdown & magnetic snapping calculation
      const normAngle = ((rawAngle % 360) + 360) % 360;
      const nearest45 = Math.round(normAngle / 45) * 45;
      let distTo45 = normAngle - nearest45;
      if (distTo45 > 180) distTo45 -= 360;
      if (distTo45 < -180) distTo45 += 360;

      const absDist = Math.abs(distTo45);
      const slowdownZone = 6.0; // 6-degree slowdown zone around each 45° & 90° quadrant mark
      const lockZone = 1.8;     // 1.8-degree magnetic snap threshold

      let effectiveD = rawDelta;
      let currentMilestone: number | null = null;

      if (absDist < slowdownZone) {
        // Apply smooth magnetic resistance & slowdown curve inside 45° quadrant
        const damping = Math.max(0.18, Math.pow(absDist / slowdownZone, 1.4));
        effectiveD = rawDelta * damping;

        if (absDist < lockZone) {
          const milestoneDeg = (nearest45 % 360 + 360) % 360;
          currentMilestone = milestoneDeg;

          if (rotateRingLastSnapRef.current !== milestoneDeg) {
            rotateRingLastSnapRef.current = milestoneDeg;
            haptics.trigger('snap');
            playHapticSound('snap', soundEnabled);
          }
        }
      } else {
        if (rotateRingLastSnapRef.current !== null && Math.abs(normAngle - rotateRingLastSnapRef.current) > slowdownZone) {
          rotateRingLastSnapRef.current = null;
        }
      }

      setSnappedMilestone(currentMilestone);
      setRotateRingAngle((prev) => (prev + effectiveD) % 360);

      const sens = (sensitivity || 0.5) * 2.0;
      const effectiveDelta = effectiveD * sens;

      // Haptic detent feedback every 15 degrees
      haptics.checkAngleDetent(rawAngle, rotateRingDetentRef, 15);

      if (engine) {
        engine.rotateWorldAxis(rotationAxis, (effectiveDelta * Math.PI) / 180, targetScope, isLocked);
      }

      onUpdateSpatial((prev) => {
        if (rotationAxis === 'x') {
          return { ...prev, pitch: Math.max(-85, Math.min(85, prev.pitch + effectiveDelta)) };
        } else if (rotationAxis === 'y') {
          return { ...prev, yaw: (prev.yaw + effectiveDelta) % 360 };
        } else {
          return { ...prev, roll: (prev.roll + effectiveDelta) % 360 };
        }
      });
    };

    const handlePointerUp = () => {
      setIsRotateRingDragging(false);
      setSnappedMilestone(null);
      rotateRingLastSnapRef.current = null;
      haptics.trigger('light');
      playHapticSound('pop', soundEnabled);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Auto-clamp on window resize to ensure widget is always on screen
  useEffect(() => {
    const handleWindowResize = () => {
      setPosition((curr) => {
        if (!curr) return null;
        const maxX = Math.max(10, window.innerWidth - 280);
        const maxY = Math.max(10, window.innerHeight - 340);
        const clampedX = Math.min(maxX, Math.max(10, curr.x));
        const clampedY = Math.min(maxY, Math.max(10, curr.y));
        if (clampedX !== curr.x || clampedY !== curr.y) {
          return { x: clampedX, y: clampedY };
        }
        return curr;
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Widget states
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [subMode, setSubMode] = useState<SubWheelMode>('joystick');
  const [dialMode, setDialMode] = useState<'brush_size' | 'zoom' | 'rotate'>('brush_size');
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showHiddenPhysicsPanel, setShowHiddenPhysicsPanel] = useState<boolean>(false);
  const [isBiggerUI, setIsBiggerUI] = useState<boolean>(false);
  const [activeAxis, setActiveAxis] = useState<'x' | 'y' | 'z' | 'all'>('all');
  const [dragValueLabel, setDragValueLabel] = useState<string | null>(null);
  const [pinchFeedback, setPinchFeedback] = useState<string | null>(null);
  const [hasWebGPU, setHasWebGPU] = useState<boolean>(false);

  // Resizable scale factor with persistence (default to 0.85 for a compact footprint)
  const [scaleFactor, setScaleFactor] = useState<number>(() => {
    try {
      const s = localStorage.getItem('mody_tactile_scale');
      if (s) {
        const parsed = parseFloat(s);
        if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 1.5) return parsed;
      }
    } catch (_) {}
    return 0.85;
  });

  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef<{ startX: number; startY: number; startScale: number }>({
    startX: 0,
    startY: 0,
    startScale: 0.85,
  });

  const handleResizeStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScale: scaleFactor,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isResizingRef.current) return;
      const dx = moveEvent.clientX - resizeStartRef.current.startX;
      const dy = moveEvent.clientY - resizeStartRef.current.startY;
      const deltaScale = (dx + dy) / 360;
      const newScale = Math.min(1.35, Math.max(0.55, resizeStartRef.current.startScale + deltaScale));
      const roundedScale = Math.round(newScale * 100) / 100;
      setScaleFactor(roundedScale);
    };

    const handlePointerUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        setScaleFactor((curr) => {
          try {
            localStorage.setItem('mody_tactile_scale', curr.toString());
          } catch (_) {}
          return curr;
        });
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleScaleCycle = () => {
    const scales = [0.6, 0.75, 0.85, 1.0, 1.15];
    const currentIdx = scales.findIndex((s) => Math.abs(s - scaleFactor) < 0.05);
    const nextIdx = currentIdx === -1 ? 2 : (currentIdx + 1) % scales.length;
    const next = scales[nextIdx];
    setScaleFactor(next);
    try {
      localStorage.setItem('mody_tactile_scale', next.toString());
    } catch (_) {}
  };

  // User-configurable Physics Settings (Adjustable via Hidden Panel on Long-Press)
  const [physicsSettings, setPhysicsSettings] = useState({
    rubberBandStiffness: 420,
    rubberBandDamping: 24,
    friction: 0.91,
    vibrationStrength: 0.65,
    clampBounds: true,
  });

  // Long-press detection for hidden settings panel
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const startLongPressDetection = (e: React.PointerEvent) => {
    // Only detect on background / rim, not buttons
    longPressStartPos.current = { x: e.clientX, y: e.clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      playHapticSound('snap', soundEnabled);
      setShowHiddenPhysicsPanel(true);
      setShowMenu(false);
      longPressTimerRef.current = null;
    }, 650);
  };

  const cancelLongPressDetection = (e?: React.PointerEvent) => {
    if (e && longPressStartPos.current) {
      const dist = Math.hypot(e.clientX - longPressStartPos.current.x, e.clientY - longPressStartPos.current.y);
      if (dist > 8 && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    } else if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Velocity-based visual vibration state (simulates mechanical haptic resistance via CSS transforms)
  const [vibration, setVibration] = useState<{ x: number; y: number; rot: number }>({ x: 0, y: 0, rot: 0 });
  const activeVelocityRef = useRef<number>(0);
  const vibrationAnimFrame = useRef<number | null>(null);

  // Detect WebGPU capability once on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      const navGpu = (navigator as unknown as { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu;
      navGpu?.requestAdapter?.().then((adapter) => {
        if (adapter) setHasWebGPU(true);
      }).catch(() => {});
    }
  }, []);

  // Continuous animation loop for velocity-based visual resistance vibration
  useEffect(() => {
    const updateVibration = () => {
      const v = activeVelocityRef.current;
      const strength = physicsSettings.vibrationStrength;
      if (v > 0.15 && strength > 0.05) {
        const jitter = Math.min(2.0, Math.pow(v, 0.72) * 0.12 * strength);
        const t = performance.now() * 0.08;
        setVibration({
          x: Math.sin(t * 3.1) * jitter,
          y: Math.cos(t * 2.7) * jitter,
          rot: Math.sin(t * 1.9) * (jitter * 0.35),
        });
      } else {
        setVibration({ x: 0, y: 0, rot: 0 });
      }
      vibrationAnimFrame.current = requestAnimationFrame(updateVibration);
    };
    vibrationAnimFrame.current = requestAnimationFrame(updateVibration);
    return () => {
      if (vibrationAnimFrame.current) cancelAnimationFrame(vibrationAnimFrame.current);
    };
  }, [physicsSettings.vibrationStrength]);

  // Center joystick drag physics & friction settling
  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const joystickOriginRef = useRef<{ cx: number; cy: number; radius: number }>({ cx: 0, cy: 0, radius: 1 });
  const [isDraggingJoystick, setIsDraggingJoystick] = useState(false);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, {
    stiffness: physicsSettings.rubberBandStiffness,
    damping: physicsSettings.rubberBandDamping,
  });
  const springY = useSpring(rawY, {
    stiffness: physicsSettings.rubberBandStiffness,
    damping: physicsSettings.rubberBandDamping,
  });
  const joystickLastPos = useRef({ x: 0, y: 0, time: 0 });
  const joystickVelocity = useRef({ x: 0, y: 0 });
  const joystickFrictionRef = useRef<number | null>(null);
  const lastTickDistRef = useRef<number>(0);

  // Helper to safely clamp spatial state within bounds
  const clampSpatial = useCallback((state: SpatialState): SpatialState => {
    if (!physicsSettings.clampBounds) return state;
    return {
      ...state,
      x: Math.max(-240, Math.min(240, state.x)),
      y: Math.max(-180, Math.min(180, state.y)),
      z: Math.max(-150, Math.min(150, state.z)),
    };
  }, [physicsSettings.clampBounds]);

  // Trackball sphere state
  const [isRollingBall, setIsRollingBall] = useState(false);

  // Radial dial state & momentum friction
  const dialRef = useRef<HTMLDivElement>(null);
  const dialCenterRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });
  const [isDialDragging, setIsDialDragging] = useState(false);
  const dialLastAngle = useRef<number>(0);
  const dialLastTime = useRef<number>(0);
  const dialVelocity = useRef<number>(0);
  const dialFrictionRef = useRef<number | null>(null);
  const lastTickValue = useRef<number>(spatialState.brushSize);

  // Multi-touch Pinch-to-Zoom gesture tracking
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(spatialState.scale);

  // Dynamic footer label
  const getFooterLabel = () => {
    if (pinchFeedback) return pinchFeedback;
    if (isDraggingJoystick && dragValueLabel) return dragValueLabel;
    if (isRollingBall) return `Turning 3D • Yaw: ${Math.round(spatialState.yaw)}° Pitch: ${Math.round(spatialState.pitch)}°`;
    if (isDialDragging) return `Dial Size • ${spatialState.brushSize} / 50`;

    if (mode === 'tactile_ball') {
      return hasWebGPU ? 'Rotate (WebGPU) • Roll the ball' : 'Rotate • Roll the ball to turn';
    }
    if (subMode === 'dial') {
      return 'Wheel Dial • Slide circle to change size';
    }
    return 'Move • Drag center puck to pan, petals for X/Y/Z';
  };

  // Joystick pointer handlers with normalized, pixel-independent coordinate math
  const handleJoystickDown = (e: React.PointerEvent, axis: 'x' | 'y' | 'z' | 'all' = 'all') => {
    e.preventDefault();
    e.stopPropagation();

    if (joystickFrictionRef.current) {
      cancelAnimationFrame(joystickFrictionRef.current);
      joystickFrictionRef.current = null;
    }

    setIsDraggingJoystick(true);
    setActiveAxis(axis);
    joystickLastPos.current = { x: e.clientX, y: e.clientY, time: performance.now() };
    joystickVelocity.current = { x: 0, y: 0 };
    playHapticSound('squish', soundEnabled);

    engine?.beginTransform(targetScope);

    // Set pointer capture directly on the container element
    if (joystickContainerRef.current) {
      try {
        joystickContainerRef.current.setPointerCapture(e.pointerId);
      } catch {}

      const rect = joystickContainerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const radius = Math.max(1, rect.width / 2);
      joystickOriginRef.current = { cx, cy, radius };

      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      // Normalized radius: [0, 1] unit disk
      const normDist = Math.min(1.0, dist / (radius * 0.82));

      let normU = Math.cos(angle) * normDist;
      let normV = Math.sin(angle) * normDist;

      if (axis === 'y' || axis === 'z') normU = 0;
      if (axis === 'x') normV = 0;

      // Visual spring offset (Extended travel reach into 230px circle)
      const maxVisualTravel = isBiggerUI ? 84 : 68;
      rawX.set(normU * maxVisualTravel);
      rawY.set(normV * maxVisualTravel);
      lastTickDistRef.current = normDist;
    }
  };

  const handleJoystickMove = (e: React.PointerEvent) => {
    if (!isDraggingJoystick || !joystickContainerRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const { cx, cy, radius } = joystickOriginRef.current;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    // Compute unit-disk normalized coordinate [0, 1] regardless of screen resolution or UI size
    const normDist = Math.min(1.0, dist / (radius * 0.82));

    // Distance-threshold tick clicks during drag (every ~10mm / 0.2 normDist)
    const currentDistStep = Math.floor(normDist / 0.2);
    const lastDistStep = Math.floor(lastTickDistRef.current / 0.2);
    if (currentDistStep !== lastDistStep && normDist > 0.05) {
      playHapticSound('tick', soundEnabled);
      lastTickDistRef.current = normDist;
    }

    // Dynamic Haptic Click on unit threshold edge
    if (normDist >= 0.95 && lastTickDistRef.current < 0.95) {
      playHapticSound('click', soundEnabled);
      lastTickDistRef.current = normDist;
    }

    let normU = Math.cos(angle) * normDist;
    let normV = Math.sin(angle) * normDist;

    if (activeAxis === 'x') normV = 0;
    if (activeAxis === 'y' || activeAxis === 'z') normU = 0;

    // Visual puck displacement (Extended travel)
    const maxVisualTravel = isBiggerUI ? 84 : 68;
    rawX.set(normU * maxVisualTravel);
    rawY.set(normV * maxVisualTravel);

    // Normalized frame velocity tracking (normalized displacement per ms)
    const now = performance.now();
    const dt = Math.max(1, now - joystickLastPos.current.time);
    const stepDx = e.clientX - joystickLastPos.current.x;
    const stepDy = e.clientY - joystickLastPos.current.y;
    const moveDx = stepDx / radius;
    const moveDy = stepDy / radius;

    const currentVx = (moveDx / dt) * 16.67;
    const currentVy = (moveDy / dt) * 16.67;
    const newVx = joystickVelocity.current.x * 0.35 + currentVx * 0.65;
    const newVy = joystickVelocity.current.y * 0.35 + currentVy * 0.65;
    joystickVelocity.current = { x: newVx, y: newVy };
    joystickLastPos.current = { x: e.clientX, y: e.clientY, time: now };

    const currentSpeed = Math.min(2.0, Math.hypot(newVx, newVy) * 10);
    activeVelocityRef.current = currentSpeed;

    // Continuous, pixel-independent rate delta calculation
    // Snappy linear response curve with minimal deadzone for instant movement initiation
    const deadzone = 0.015;
    const effectiveMag = Math.max(0, (normDist - deadzone) / (1 - deadzone));
    const responseMag = effectiveMag;

    const dirU = normDist > 0 ? (normU / normDist) * responseMag : 0;
    const dirV = normDist > 0 ? (normV / normDist) * responseMag : 0;

    const sens = (sensitivity || 0.5) * 4.0;
    // Highly responsive translation vector (combines direct mouse delta + directional displacement)
    const transX = (stepDx * 0.85 + dirU * 6.0) * sens;
    const transY = (stepDy * 0.85 + dirV * 6.0) * sens;

    if (activeAxis === 'z') {
      const deltaZ = (-stepDy * 0.45 - dirV * 4.0) * sens;
      onUpdateSpatial((prev) => clampSpatial({ ...prev, z: prev.z + deltaZ }));
      if (engine) {
        engine.translateAxis3D('z', deltaZ * 0.04, targetScope);
      }
    } else if (activeAxis === 'x') {
      const deltaX = (stepDx * 0.45 + dirU * 4.0) * sens;
      onUpdateSpatial((prev) => clampSpatial({ ...prev, x: prev.x + deltaX }));
      if (engine) {
        engine.translateAxis3D('x', deltaX * 0.04, targetScope);
      }
    } else if (activeAxis === 'y') {
      const deltaY = (-stepDy * 0.45 - dirV * 4.0) * sens;
      onUpdateSpatial((prev) => clampSpatial({ ...prev, y: prev.y + deltaY }));
      if (engine) {
        engine.translateAxis3D('y', deltaY * 0.04, targetScope);
      }
    } else {
      onUpdateSpatial((prev) => clampSpatial({ ...prev, x: prev.x + transX, y: prev.y - transY }));
      if (engine) {
        engine.translateScreenSpace(transX, transY, targetScope, isLocked);
      }
    }
  };

  const handleJoystickUp = (e: React.PointerEvent) => {
    if (isDraggingJoystick) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingJoystick(false);
      setActiveAxis('all');
      setDragValueLabel(null);
      lastTickDistRef.current = 0;
      playHapticSound('snap', soundEnabled);
      engine?.endTransform();

      if (joystickContainerRef.current) {
        try {
          joystickContainerRef.current.releasePointerCapture(e.pointerId);
        } catch {}
      }

      // Elastic rubber-band snapback for the physical puck
      rawX.set(0);
      rawY.set(0);

      // Normalized friction-based momentum coasting
      let vx = joystickVelocity.current.x * 2.8;
      let vy = joystickVelocity.current.y * 2.8;
      const friction = physicsSettings.friction;

      const stepJoystickFriction = () => {
        const speed = Math.hypot(vx, vy);
        if (speed < 0.05) {
          joystickFrictionRef.current = null;
          activeVelocityRef.current = 0;
          return;
        }

        vx *= friction;
        vy *= friction;
        activeVelocityRef.current = Math.min(2.0, speed);

        onUpdateSpatial((prev) =>
          clampSpatial({
            ...prev,
            x: prev.x + vx * 1.5,
            y: prev.y - vy * 1.5,
          })
        );

        if (engine) {
          engine.translateScreenSpace(vx * 1.2, -vy * 1.2, targetScope, isLocked);
        }

        joystickFrictionRef.current = requestAnimationFrame(stepJoystickFriction);
      };

      if (Math.hypot(vx, vy) > 0.15) {
        joystickFrictionRef.current = requestAnimationFrame(stepJoystickFriction);
      } else {
        activeVelocityRef.current = 0;
      }
    }
  };

  // Radial dial handlers with normalized angular coordinate math
  const handleDialPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dialFrictionRef.current) {
      cancelAnimationFrame(dialFrictionRef.current);
      dialFrictionRef.current = null;
    }
    setIsDialDragging(true);
    dialLastTime.current = performance.now();
    dialVelocity.current = 0;

    if (dialRef.current) {
      try {
        dialRef.current.setPointerCapture(e.pointerId);
      } catch {}
      const rect = dialRef.current.getBoundingClientRect();
      dialCenterRef.current = {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
      };
      const dx = e.clientX - dialCenterRef.current.cx;
      const dy = e.clientY - dialCenterRef.current.cy;
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (angle < 0) angle += 360;
      dialLastAngle.current = angle;
    }
  };

  const handleDialPointer = (e: React.PointerEvent) => {
    if (!isDialDragging) return;
    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - dialCenterRef.current.cx;
    const dy = e.clientY - dialCenterRef.current.cy;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;

    const now = performance.now();
    const dt = Math.max(1, now - dialLastTime.current);
    const dAngle = angle - dialLastAngle.current;
    
    // Normalize angular jump crossing 0/360 boundary
    let normalizedDelta = dAngle;
    if (normalizedDelta > 180) normalizedDelta -= 360;
    if (normalizedDelta < -180) normalizedDelta += 360;

    const currentVAngle = (normalizedDelta / dt) * 16.67;
    dialVelocity.current = dialVelocity.current * 0.3 + currentVAngle * 0.7;
    dialLastAngle.current = angle;
    dialLastTime.current = now;

    activeVelocityRef.current = Math.min(2.0, Math.abs(currentVAngle) * 0.1);

    // Map 0..360 to 1..50
    const val = Math.max(1, Math.min(50, Math.round((angle / 360) * 50)));

    if (val !== lastTickValue.current) {
      playHapticSound('tick', soundEnabled);
      lastTickValue.current = val;
    }

    onUpdateSpatial((prev) => ({ ...prev, brushSize: val }));

    if (dialMode === 'brush_size') {
      if (onUpdateBrushSettings) {
        const calculatedSize = 0.01 + ((val - 1) / 49) * 0.24;
        onUpdateBrushSettings((prev) => ({ ...prev, size: calculatedSize }));
      }
    } else if (dialMode === 'zoom') {
      if (engine) {
        const factor = normalizedDelta > 0 ? 1.02 : 0.98;
        engine.scaleAxis3D(factor, targetScope);
      }
    } else if (dialMode === 'rotate') {
      if (engine) {
        engine.rotateScreenSpace((normalizedDelta * Math.PI) / 180, targetScope);
      }
      onUpdateSpatial((prev) => ({ ...prev, roll: (prev.roll + normalizedDelta) % 360 }));
    }
  };

  const handleDialPointerUp = (e: React.PointerEvent) => {
    if (!isDialDragging) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDialDragging(false);
    if (dialRef.current) {
      try {
        dialRef.current.releasePointerCapture(e.pointerId);
      } catch {}
    }

    // Friction momentum loop for dial scrubber
    let vAngle = dialVelocity.current;
    const friction = 0.89;

    const stepDialFriction = () => {
      if (Math.abs(vAngle) < 0.2) {
        dialFrictionRef.current = null;
        activeVelocityRef.current = 0;
        return;
      }

      vAngle *= friction;
      activeVelocityRef.current = Math.min(2.0, Math.abs(vAngle) * 0.1);

      onUpdateSpatial((prev) => {
        const step = vAngle > 0 ? 1 : -1;
        const nextVal = Math.max(1, Math.min(50, prev.brushSize + (Math.abs(vAngle) > 2 ? step : 0)));
        if (nextVal !== prev.brushSize) {
          playHapticSound('tick', soundEnabled);
          if (dialMode === 'brush_size' && onUpdateBrushSettings) {
            const calculatedSize = 0.01 + ((nextVal - 1) / 49) * 0.24;
            onUpdateBrushSettings((b) => ({ ...b, size: calculatedSize }));
          }
        }
        return { ...prev, brushSize: nextVal };
      });

      dialFrictionRef.current = requestAnimationFrame(stepDialFriction);
    };

    if (Math.abs(vAngle) > 1.2) {
      dialFrictionRef.current = requestAnimationFrame(stepDialFriction);
    } else {
      activeVelocityRef.current = 0;
    }
  };

  // Multi-touch Pinch-to-Zoom Gesture Handlers (Mobile & Touchscreen support)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      initialPinchDistanceRef.current = dist;
      initialPinchScaleRef.current = spatialState.scale;
      playHapticSound('pop', soundEnabled);
      setPinchFeedback(`Pinch Scale: ${spatialState.scale.toFixed(2)}x`);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistanceRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = currentDist / initialPinchDistanceRef.current;
      const newScale = Math.max(0.4, Math.min(2.8, initialPinchScaleRef.current * ratio));

      onUpdateSpatial((prev) => ({ ...prev, scale: newScale }));
      setPinchFeedback(`Pinch Scale: ${newScale.toFixed(2)}x`);
      activeVelocityRef.current = Math.abs(ratio - 1) * 10;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDistanceRef.current = null;
      setTimeout(() => setPinchFeedback(null), 1200);
      activeVelocityRef.current = 0;
    }
  };

  const wheelSizeClass = isBiggerUI ? 'w-[250px] h-[250px]' : 'w-[230px] h-[230px]';

  // If collapsed to mini button (Frame 00:00)
  if (!isOpen) {
    return (
      <motion.button
        id="paper-rocket-mini-trigger"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onClick={() => {
          playHapticSound('pop', soundEnabled);
          setIsOpen(true);
        }}
        className={`fixed z-40 px-3.5 py-2 rounded-2xl ${
          isLight
            ? 'bg-white/95 border-neutral-200 text-neutral-900 shadow-[0_12px_32px_rgba(0,0,0,0.12)]'
            : 'bg-[#14151a]/95 border-white/[0.12] text-white shadow-[0_12px_32px_rgba(0,0,0,0.6)]'
        } backdrop-blur-2xl border flex items-center gap-2 cursor-pointer group select-none`}
        title="Restore Tactile Wheel"
      >
        <Disc className="w-4 h-4 text-sky-500" />
        <span className={`text-xs font-semibold ${isLight ? 'text-neutral-800' : 'text-neutral-200'}`}>Tactile Wheel</span>
        <div className="flex items-center gap-0.5 ml-1">
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 group-hover:bg-sky-500 transition-colors" />
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 group-hover:bg-sky-500 transition-colors" />
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 group-hover:bg-sky-500 transition-colors" />
        </div>
      </motion.button>
    );
  }

  return (
    <aside
      id="paper-rocket-wheel-root"
      role="region"
      aria-label="Tactile Spatial Controller Widget"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `scale(${(uiScale || 1.0) * scaleFactor})`,
        transformOrigin: 'top left',
      }}
      className={`fixed z-40 rounded-[26px] ${
        isLight
          ? 'bg-white/95 border-neutral-200/90 text-neutral-800 shadow-[0_20px_45px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.06)]'
          : 'bg-[#14151a]/95 border-white/[0.08] text-white shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)]'
      } backdrop-blur-2xl border overflow-visible flex flex-row items-center touch-none select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          const delta = -Math.sign(e.deltaY) * 0.05;
          const next = Math.min(1.4, Math.max(0.55, Math.round((scaleFactor + delta) * 100) / 100));
          setScaleFactor(next);
          try {
            localStorage.setItem('mody_tactile_scale', next.toString());
          } catch (_) {}
        }
      }}
    >
      {/* Left: Main Paper Rocket-Inspired Tactile Circular Disc Body */}
      <div id="paper-rocket-wheel-body" className="overflow-hidden flex items-center justify-center p-2 relative shrink-0">
        <motion.div
          id="paper-rocket-circular-wheel"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onPointerDown={(e) => {
            startLongPressDetection(e);
          }}
          onPointerMove={(e) => {
            cancelLongPressDetection(e);
          }}
          onPointerUp={() => {
            cancelLongPressDetection();
          }}
          onPointerCancel={() => {
            cancelLongPressDetection();
          }}
          className={`relative ${wheelSizeClass} rounded-full ${
            isLight
              ? 'bg-[#f4f4f7] border-neutral-300 shadow-[0_25px_60px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.8)]'
              : 'bg-[#18181b]/95 border-neutral-800 shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)]'
          } backdrop-blur-2xl border flex items-center justify-center touch-none overflow-hidden transition-all duration-200`}
        >
        {/* Inner Surface with Velocity-Based CSS Vibration */}
        <div
          id="paper-rocket-wheel-surface"
          style={{
            transform: `translate3d(${vibration.x}px, ${vibration.y}px, 0) rotate(${vibration.rot}deg)`,
          }}
          className="absolute inset-0 rounded-full flex items-center justify-center pointer-events-none"
        >
        </div>

        {/* ---------------------------------------------------- */}
        {/* CENTER INTERACTIVE CORE                                */}
        {/* ---------------------------------------------------- */}

        {/* 1. JOYSTICK MODE (Move: Pan & 3D Axes) with Concentric Rotation Ring */}
        {mode !== 'tactile_ball' && (
          <>
            {/* Fixed Outer Ring Degree Indicators (0, 45, 90, 135, 180, 225, 270, 315 degrees) */}
            <OuterDegreeIndicatorRing
              theme={theme}
              size={isBiggerUI ? 214 : 196}
              highlightAngle={snappedMilestone}
            />

            {/* Interactive Outer Rotation Ring */}
            <div
              id="paper-rocket-rotation-ring"
              onPointerDown={handleRotateRingPointerDown}
              className={`absolute ${
                isBiggerUI ? 'w-[214px] h-[214px]' : 'w-[196px] h-[196px]'
              } rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-10 select-none touch-none`}
              title={`Drag ring around center to rotate model (${rotationAxis.toUpperCase()}-Axis: ${rotationAxis === 'y' ? 'Turntable / Yaw' : rotationAxis === 'x' ? 'Pitch / Tilt' : 'Roll / Screen'})`}
              aria-label={`Rotation ring - drag to rotate model around ${rotationAxis.toUpperCase()}-axis`}
            >
              {/* Radial tick marks around rotation ring */}
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center transition-transform duration-75 pointer-events-none"
                style={{ transform: `rotate(${rotateRingAngle}deg)` }}
              >
                {Array.from({ length: 24 }).map((_, i) => {
                  const deg = (i / 24) * 360;
                  const isCardinal = deg % 90 === 0;
                  const is45 = deg % 45 === 0;
                  const tickOffset = isBiggerUI ? 96 : 88;
                  const isNearAngle = Math.abs(((rotateRingAngle - deg + 180) % 360) - 180) < 4;
                  const isMilestoneSnapped = snappedMilestone === deg;

                  return (
                    <div
                      key={i}
                      className={`absolute rounded-full transition-all duration-75 ${
                        isCardinal
                          ? isMilestoneSnapped
                            ? 'w-1 h-4 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] z-30'
                            : isNearAngle || isRotateRingDragging
                            ? 'w-1 h-3.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] z-20'
                            : 'w-1 h-3 bg-white/70 shadow-[0_0_4px_rgba(255,255,255,0.3)]'
                          : is45
                          ? isMilestoneSnapped
                            ? 'w-0.5 h-3.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] z-30'
                            : isNearAngle || isRotateRingDragging
                            ? 'w-0.5 h-3 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] z-20'
                            : 'w-0.5 h-2.5 bg-white/50'
                          : isRotateRingDragging
                          ? 'w-0.5 h-1.5 bg-white/40'
                          : 'w-0.5 h-1.5 bg-white/15'
                      }`}
                      style={{
                        transform: `rotate(${deg}deg) translateY(-${tickOffset}px)`,
                      }}
                    />
                  );
                })}

                {/* Dedicated Rotation Handle Grip Pip with Rotate Icon & Snap Highlight */}
                <div
                  id="paper-rocket-rotation-handle"
                  className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
                    isBiggerUI ? 'w-6 h-6' : 'w-5 h-5'
                  } rounded-full border shadow-md flex items-center justify-center transition-all ${
                    snappedMilestone !== null
                      ? 'bg-emerald-400 text-zinc-950 border-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.9)] scale-115'
                      : isRotateRingDragging
                      ? 'bg-white text-zinc-950 border-white shadow-[0_0_14px_rgba(255,255,255,0.8)] scale-110'
                      : 'bg-[#27272a] text-zinc-300 border-white/20 hover:bg-[#3f3f46] hover:text-white hover:scale-105'
                  }`}
                  title={`${rotationAxis.toUpperCase()}-Axis Rotation Handle - Drag around dial to rotate model`}
                >
                  <RotateCw className={`${isBiggerUI ? 'w-3 h-3' : 'w-2.5 h-2.5'} stroke-[2.5]`} />
                </div>
              </div>

              {/* Recessed Ring Track Border */}
              <div
                className={`absolute inset-0 rounded-full border border-dashed transition-colors pointer-events-none ${
                  isRotateRingDragging
                    ? 'border-white/40 shadow-[inset_0_0_12px_rgba(255,255,255,0.15)]'
                    : 'border-white/10'
                }`}
              />
            </div>

            <div
              ref={joystickContainerRef}
              id="paper-rocket-joystick-core"
              onPointerDown={(e) => handleJoystickDown(e, 'all')}
              onPointerMove={handleJoystickMove}
              onPointerUp={handleJoystickUp}
              onPointerCancel={handleJoystickUp}
              className={`relative ${
                isBiggerUI ? 'w-40 h-40' : 'w-28 h-28'
              } rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-20`}
            >
            {/* 4 Directional Symmetrical Grey Petals */}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${
                isDraggingJoystick ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
              }`}
            >
              {/* Top Petal (Elevation +Y) */}
              <button
                id="petal-top-y"
                onPointerDown={(e) => handleJoystickDown(e, 'y')}
                className={`absolute ${
                  isBiggerUI ? '-top-1.5 w-6 h-10' : '-top-1 w-5 h-8'
                } rounded-full bg-[#27272a] hover:bg-[#3f3f46] border border-white/10 hover:border-white/20 transition-all shadow-md cursor-pointer`}
                title="Move +Y (Elevation)"
              />

              {/* Bottom Petal (Depth Z) */}
              <button
                id="petal-bottom-z"
                onPointerDown={(e) => handleJoystickDown(e, 'z')}
                className={`absolute ${
                  isBiggerUI ? '-bottom-1.5 w-6 h-10' : '-bottom-1 w-5 h-8'
                } rounded-full bg-[#27272a] hover:bg-[#3f3f46] border border-white/10 hover:border-white/20 transition-all shadow-md cursor-pointer`}
                title="Move Z (Depth)"
              />

              {/* Left Petal (Lateral -X) */}
              <button
                id="petal-left-x"
                onPointerDown={(e) => handleJoystickDown(e, 'x')}
                className={`absolute ${
                  isBiggerUI ? '-left-1.5 w-10 h-6' : '-left-1 w-8 h-5'
                } rounded-full bg-[#27272a] hover:bg-[#3f3f46] border border-white/10 hover:border-white/20 transition-all shadow-md cursor-pointer`}
                title="Move -X (Lateral)"
              />

              {/* Right Petal (Lateral +X) */}
              <button
                id="petal-right-x"
                onPointerDown={(e) => handleJoystickDown(e, 'x')}
                className={`absolute ${
                  isBiggerUI ? '-right-1.5 w-10 h-6' : '-right-1 w-8 h-5'
                } rounded-full bg-[#27272a] hover:bg-[#3f3f46] border border-white/10 hover:border-white/20 transition-all shadow-md cursor-pointer`}
                title="Move +X (Lateral)"
              />
            </div>

            {/* Sleek Monochrome Center Puck with Dark Metallic Gradient & Concentric Rings */}
            <motion.div
              id="paper-rocket-center-white-puck"
              style={{
                x: springX,
                y: springY,
              }}
              animate={{
                scale: isDraggingJoystick ? 1.08 : 1,
                boxShadow: isDraggingJoystick
                  ? '0 0 25px rgba(255, 255, 255, 0.25), 0 12px 28px rgba(0,0,0,0.8)'
                  : '0 8px 20px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.5)',
              }}
              className={`relative z-20 ${
                isBiggerUI ? 'w-16 h-16 min-w-[48px] min-h-[48px]' : 'w-12 h-12 min-w-[40px] min-h-[40px]'
              } rounded-full bg-gradient-to-b from-[#3f3f46] via-[#27272a] to-[#18181b] border border-white/20 text-white font-bold flex items-center justify-center shadow-2xl cursor-grab active:cursor-grabbing select-none`}
            >
              {/* Concentric Tactile Depression Rings */}
              <div className="w-[72%] h-[72%] rounded-full bg-[#18181b] border border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center">
                <div className="w-[50%] h-[50%] rounded-full bg-[#27272a] border border-white/10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 shadow-sm" />
                </div>
              </div>
            </motion.div>
          </div>
          </>
        )}

        {/* 2. TACTILE BALL MODE: Pure 3D Dark Graphite Trackball */}
        {mode === 'tactile_ball' && (
          <div
            id="paper-rocket-trackball-sphere"
            className={`relative ${
              isBiggerUI ? 'w-[214px] h-[214px]' : 'w-[196px] h-[196px]'
            } rounded-full bg-[#121214] border border-neutral-800 shadow-[inset_0_4px_24px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.06)] flex items-center justify-center overflow-hidden z-20`}
          >
            <ThreeTrackball
              yaw={spatialState.yaw}
              pitch={spatialState.pitch}
              soundEnabled={soundEnabled}
              size={isBiggerUI ? 214 : 196}
              onDragStateChange={setIsRollingBall}
              onVelocityChange={(v) => {
                activeVelocityRef.current = v;
              }}
              onRotate={(deltaYaw, deltaPitch) => {
                const sens = (sensitivity || 0.5) * 1.5;
                onUpdateSpatial((prev) => ({
                  ...prev,
                  yaw: (prev.yaw + deltaYaw) % 360,
                  pitch: Math.max(-85, Math.min(85, prev.pitch + deltaPitch)),
                }));

                if (engine) {
                  if (targetScope === 'active_layer' || targetScope === 'model' || targetScope === 'strokes') {
                    engine.rotateTrackball(deltaYaw * sens, -deltaPitch * sens, targetScope);
                  } else {
                    engine.orbitCamera(-deltaYaw * 0.005 * sens, -deltaPitch * 0.005 * sens);
                  }
                }
              }}
            />
          </div>
        )}
      </motion.div>
      </div>

      {/* Right Vertical Bar: NavigatorHeader (Tabs, Target Selector, Action Icons) */}
      <NavigatorHeader
        mode={mode}
        onModeChange={(m) => onModeChange(m as SpatialMode)}
        tabs={[
          { id: '3d', label: 'Move' },
          { id: 'tactile_ball', label: 'Rotate' },
        ]}
        theme={theme}
        isLocked={isLocked}
        onLockToggle={handleLockToggle}
        onReset={() => {
          setRotateRingAngle(0);
          onUpdateSpatial(() => ({
            x: 0,
            y: 0,
            z: 0,
            roll: 0,
            pitch: 18,
            yaw: -24,
            scale: 1.0,
          }));
          onReset?.();
        }}
        isCollapsed={false}
        onCollapseToggle={() => {}}
        onClose={onClose}
        onMinimize={() => {
          playHapticSound('pop', soundEnabled);
          setIsOpen(false);
          setShowMenu(false);
          setShowHiddenPhysicsPanel(false);
        }}
        targetName={activeTargetName}
        layers={layers}
        activeLayerId={activeLayerId}
        onSelectLayer={onSelectLayer}
        models={models}
        activeModelId={activeModelId}
        onSelectModel={onSelectModel}
        targetScope={targetScope}
        onSelectTargetScope={onSelectTargetScope}
        accessibilityMode={accessibilityMode}
        onAccessibilityModeToggle={handleAccessibilityToggle}
        onHeaderDragStart={handleCardDragStart}
        rotationAxis={rotationAxis}
        onRotationAxisChange={setRotationAxis}
        onCopy={onCopy}
        onPaste={onPaste}
        clipboardCount={clipboardCount}
        scaleFactor={scaleFactor}
        onScaleCycle={handleScaleCycle}
        sensitivity={sensitivity}
        onSensitivityChange={(s) => {
          onSensitivityChange?.(s);
          if (engine) engine.setNavigatorSensitivity(s);
        }}
      />

      {/* Paper Rocket Quick Settings Popover anchored at Bottom */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            id="paper-rocket-settings-popover"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            className="absolute bottom-11 inset-x-2 z-50 p-3.5 rounded-2xl bg-[#1c1c1f]/98 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-neutral-200 flex flex-col gap-2.5 backdrop-blur-2xl max-h-[calc(100%-60px)] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-bold text-white">Wheel Options</span>
              <button
                onClick={() => setShowMenu(false)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Done
              </button>
            </div>

            {/* GPU Acceleration status */}
            <div className="flex items-center justify-between py-0.5">
              <span className="text-[11px] font-medium text-neutral-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                Graphics Engine
              </span>
              <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full ${
                hasWebGPU ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {hasWebGPU ? 'WebGPU' : 'WebGL2'}
              </span>
            </div>

            {/* Independent Wheel Scale Controls */}
            <div className="flex flex-col gap-1.5 py-1 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-neutral-300">Widget Scale</span>
                <span className="text-[10px] font-mono font-bold text-sky-400">
                  {Math.round(scaleFactor * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    playHapticSound('click', soundEnabled);
                    const next = Math.max(0.55, Math.round((scaleFactor - 0.1) * 100) / 100);
                    setScaleFactor(next);
                    try { localStorage.setItem('mody_tactile_scale', next.toString()); } catch (_) {}
                  }}
                  className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-center transition-colors"
                  title="Decrease Widget Scale (-10%)"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playHapticSound('click', soundEnabled);
                    handleScaleCycle();
                  }}
                  className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-mono text-center transition-colors"
                  title="Cycle Widget Scale Preset"
                >
                  Preset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playHapticSound('click', soundEnabled);
                    const next = Math.min(1.4, Math.round((scaleFactor + 0.1) * 100) / 100);
                    setScaleFactor(next);
                    try { localStorage.setItem('mody_tactile_scale', next.toString()); } catch (_) {}
                  }}
                  className="flex-1 py-1 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-bold text-center transition-colors"
                  title="Increase Widget Scale (+10%)"
                >
                  +
                </button>
              </div>
            </div>

            {/* Sound Feedback Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium">Haptic Audio Feedback</span>
              <button
                id="toggle-sound-btn"
                onClick={() => {
                  onToggleSound();
                  playHapticSound('pop', !soundEnabled);
                }}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                  soundEnabled ? 'bg-blue-500' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    soundEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Hidden Physics Engine shortcut */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">Physics Config</span>
              <button
                id="open-hidden-physics-btn"
                onClick={() => {
                  playHapticSound('snap', soundEnabled);
                  setShowHiddenPhysicsPanel(true);
                  setShowMenu(false);
                }}
                className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                <span>Tune Physics</span>
                <Sliders className="w-3 h-3" />
              </button>
            </div>

            {/* Reset All Position & Rotation */}
            <button
              id="menu-reset-all-btn"
              onClick={() => {
                playHapticSound('snap', soundEnabled);
                onReset();
                setShowMenu(false);
              }}
              className="w-full py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all mt-0.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Everything</span>
            </button>

            {/* Minimize Widget */}
            <button
              id="menu-minimize-btn"
              onClick={() => {
                playHapticSound('click', soundEnabled);
                setIsOpen(false);
                setShowMenu(false);
              }}
              className="w-full py-1 text-center text-[10.5px] text-neutral-400 hover:text-neutral-200"
            >
              Minimize to Dot
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/* HIDDEN SETTINGS PANEL (Accessible via Long-Press on Tactile Wheel) */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {showHiddenPhysicsPanel && (
          <motion.div
            id="paper-rocket-hidden-physics-panel"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="absolute inset-0 z-50 rounded-[24px] bg-[#14151a]/98 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-neutral-200 flex flex-col p-4 overflow-y-auto select-none gap-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Tactile Physics & Dynamics</h4>
                  <p className="text-[9.5px] text-neutral-400">Response tuning & spring config</p>
                </div>
              </div>
              <button
                id="close-physics-panel-btn"
                onClick={() => {
                  playHapticSound('click', soundEnabled);
                  setShowHiddenPhysicsPanel(false);
                }}
                className="w-6 h-6 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center text-xs transition-colors"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Scrollable sliders body */}
            <div className="flex flex-col gap-3 flex-1">
              {/* Slider 1: Rubber-band Spring Tension (Stiffness) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-300">Rubber-Band Spring Tension</span>
                  <span className="font-mono text-sky-400 text-[11px] font-bold">
                    {physicsSettings.rubberBandStiffness}
                  </span>
                </div>
                <input
                  id="rubber-band-stiffness-slider"
                  type="range"
                  min="180"
                  max="650"
                  step="10"
                  value={physicsSettings.rubberBandStiffness}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPhysicsSettings((prev) => ({ ...prev, rubberBandStiffness: val }));
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <div className="flex justify-between text-[9px] text-neutral-500">
                  <span>Loose (180)</span>
                  <span>Default (420)</span>
                  <span>Ultra-Taut (650)</span>
                </div>
              </div>

              {/* Slider 2: Rubber-band Damping */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-300">Spring Damping (Oscillation)</span>
                  <span className="font-mono text-sky-400 text-[11px] font-bold">
                    {physicsSettings.rubberBandDamping}
                  </span>
                </div>
                <input
                  id="rubber-band-damping-slider"
                  type="range"
                  min="12"
                  max="40"
                  step="1"
                  value={physicsSettings.rubberBandDamping}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPhysicsSettings((prev) => ({ ...prev, rubberBandDamping: val }));
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <div className="flex justify-between text-[9px] text-neutral-500">
                  <span>Bouncy (12)</span>
                  <span>Balanced (24)</span>
                  <span>Overdamped (40)</span>
                </div>
              </div>

              {/* Slider 3: Friction Settle Physics */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-300">Momentum Friction Drift</span>
                  <span className="font-mono text-sky-400 text-[11px] font-bold">
                    {physicsSettings.friction.toFixed(2)}
                  </span>
                </div>
                <input
                  id="friction-physics-slider"
                  type="range"
                  min="0.75"
                  max="0.98"
                  step="0.01"
                  value={physicsSettings.friction}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPhysicsSettings((prev) => ({ ...prev, friction: val }));
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <div className="flex justify-between text-[9px] text-neutral-500">
                  <span>Quick Stop (0.75)</span>
                  <span>Natural (0.91)</span>
                  <span>Long Glide (0.98)</span>
                </div>
              </div>

              {/* Slider 4: Haptic Vibration Resistance */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-300">Tactile Resistance Vibration</span>
                  <span className="font-mono text-sky-400 text-[11px] font-bold">
                    {Math.round(physicsSettings.vibrationStrength * 100)}%
                  </span>
                </div>
                <input
                  id="vibration-strength-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={physicsSettings.vibrationStrength}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPhysicsSettings((prev) => ({ ...prev, vibrationStrength: val }));
                  }}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-neutral-800/80 flex flex-col gap-2">
                {/* Anti-Glitch Coordinate Clamping Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-300">Canvas Bounds Guard</span>
                  <button
                    id="toggle-bounds-guard-btn"
                    onClick={() => {
                      playHapticSound('click', soundEnabled);
                      setPhysicsSettings((prev) => ({
                        ...prev,
                        clampBounds: !prev.clampBounds,
                      }));
                    }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                      physicsSettings.clampBounds ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        physicsSettings.clampBounds ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer action buttons */}
            <div className="pt-2 flex items-center gap-2 shrink-0 border-t border-neutral-800/60">
              <button
                id="reset-physics-defaults-btn"
                onClick={() => {
                  playHapticSound('snap', soundEnabled);
                  setPhysicsSettings({
                    rubberBandStiffness: 420,
                    rubberBandDamping: 24,
                    friction: 0.91,
                    vibrationStrength: 0.65,
                    clampBounds: true,
                  });
                }}
                className="flex-1 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300 hover:text-white transition-all"
              >
                Defaults
              </button>
              <button
                id="apply-physics-btn"
                onClick={() => {
                  playHapticSound('pop', soundEnabled);
                  setShowHiddenPhysicsPanel(false);
                }}
                className="flex-1 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-bold text-neutral-950 shadow-md transition-all"
              >
                Apply & Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Scale Percentage Badge while Resizing */}
      {isResizing && (
        <div className="absolute top-2 right-12 z-50 px-2 py-0.5 rounded-full bg-sky-500 text-black font-mono font-bold text-[10px] shadow-lg pointer-events-none animate-in fade-in duration-100">
          {Math.round(scaleFactor * 100)}%
        </div>
      )}

      {/* Invisible Corner Drag Resize Hit Zone - ZERO VISIBLE DOTS */}
      <div
        id="paper-rocket-corner-resize-hit-zone"
        onPointerDown={handleResizeStart}
        className="absolute -bottom-1 -right-1 w-6 h-6 cursor-nwse-resize z-40 select-none touch-none"
        title="Drag corner to scale tool"
        aria-label="Drag corner to scale tool"
      />
    </aside>
  );
};

