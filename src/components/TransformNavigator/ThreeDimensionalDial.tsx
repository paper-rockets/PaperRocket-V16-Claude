import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Orbit, Maximize2 } from 'lucide-react';
import {
  AccessibilityMode,
  TranslationEventPayload,
  RotationEventPayload,
  ScaleEventPayload,
} from '../../types';
import {
  computeTrackballRotation,
  getAngle,
  normalizeAngleDeg,
} from '../../utils/mathUtils';
import { haptics } from '../../utils/haptics';
import { OuterDegreeIndicatorRing } from './OuterDegreeIndicatorRing';

interface ThreeDimensionalDialProps {
  isLocked: boolean;
  accessibilityMode: AccessibilityMode;
  theme?: 'light' | 'dark';
  onTranslate?: (data: TranslationEventPayload) => void;
  onRotate?: (data: RotationEventPayload) => void;
  onScale?: (data: ScaleEventPayload) => void;
  onInteractionStart?: (handleName: string) => void;
  onInteractionEnd?: (handleName: string) => void;
}

export const ThreeDimensionalDial: React.FC<ThreeDimensionalDialProps> = ({
  isLocked,
  accessibilityMode,
  theme = 'dark',
  onTranslate,
  onRotate,
  onScale,
  onInteractionStart,
  onInteractionEnd,
}) => {
  const isLight = theme === 'light';
  const dialRef = useRef<HTMLDivElement>(null);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [hoveredArc, setHoveredArc] = useState<'x' | 'y' | 'z' | null>(null);

  // Trackball drag tracking
  const [trackballOffset, setTrackballOffset] = useState({ x: 0, y: 0 });
  const trackballOriginRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const trackballPrevRef = useRef<{ clientX: number; clientY: number } | null>(null);

  // Arc rotation angle tracking
  const [arcAngles, setArcAngles] = useState<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 0,
  });
  const arcAngleDetentRefs = {
    x: useRef(0),
    y: useRef(0),
    z: useRef(0),
  };
  const arcDragRef = useRef<{
    axis: 'x' | 'y' | 'z';
    startAngle: number;
    lastAngle: number;
  } | null>(null);

  // Hold-to-glide translation state
  const glideRef = useRef<{
    nodeId: string;
    axis: 'x' | 'y' | 'z';
    direction: 1 | -1;
    start: number;
    last: number;
  } | null>(null);
  const glideRafRef = useRef<number | null>(null);
  const glideDetentRef = useRef(0);
  const trackballDetentRef = useRef(0);

  const [nodeActiveState, setNodeActiveState] = useState<string | null>(null);

  const isFingerPen = accessibilityMode === 'finger-pen';
  const nodePadding = isFingerPen ? 'px-2 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-[9px]';
  const trackballSize = isFingerPen ? 'w-18 h-18' : 'w-15 h-15';

  // -------------------------------------------------------------
  // 1. Central Trackball Sphere Handlers (Freeform 3D Rotation)
  // -------------------------------------------------------------
  const handleTrackballPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) {
      haptics.trigger('lock');
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    trackballOriginRef.current = { clientX: e.clientX, clientY: e.clientY };
    trackballPrevRef.current = { clientX: e.clientX, clientY: e.clientY };

    setActiveHandle('trackball');
    haptics.trigger('medium');
    onInteractionStart?.('trackball');
  };

  const handleTrackballPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeHandle !== 'trackball' || !trackballPrevRef.current || !trackballOriginRef.current) return;
    e.preventDefault();

    const deltaX = e.clientX - trackballPrevRef.current.clientX;
    const deltaY = e.clientY - trackballPrevRef.current.clientY;
    trackballPrevRef.current = { clientX: e.clientX, clientY: e.clientY };

    const totalDx = e.clientX - trackballOriginRef.current.clientX;
    const totalDy = e.clientY - trackballOriginRef.current.clientY;

    // Small visual tilt offset for the trackball sphere (clamped to max 14px)
    const clampedOffsetX = Math.max(-14, Math.min(14, totalDx * 0.25));
    const clampedOffsetY = Math.max(-14, Math.min(14, totalDy * 0.25));
    setTrackballOffset({ x: clampedOffsetX, y: clampedOffsetY });

    const rotDelta = computeTrackballRotation(deltaX, deltaY, 0.35);

    // Tick per distance rolled, not per event, so it reads as detents not a buzz
    trackballDetentRef.current += Math.hypot(deltaX, deltaY);
    if (trackballDetentRef.current >= 26) {
      trackballDetentRef.current = 0;
      haptics.trigger('detent', 45);
    }

    const payload: RotationEventPayload = {
      rx: Number(rotDelta.deltaRx.toFixed(3)),
      ry: Number(rotDelta.deltaRy.toFixed(3)),
      rz: 0,
      deltaAngle: Math.hypot(rotDelta.deltaRx, rotDelta.deltaRy),
      axis: 'trackball',
      source: '3d-trackball-sphere',
      timestamp: Date.now(),
    };

    console.log('[TransformNavigator 3D] Trackball Freeform Rotation:', {
      deltaRx: rotDelta.deltaRx,
      deltaRy: rotDelta.deltaRy,
    });

    onRotate?.(payload);
  };

  const handleTrackballPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeHandle !== 'trackball') return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setActiveHandle(null);
    trackballOriginRef.current = null;
    trackballPrevRef.current = null;
    setTrackballOffset({ x: 0, y: 0 });
    haptics.trigger('snap');
    onInteractionEnd?.('trackball');
  };

  // -------------------------------------------------------------
  // 2. Translation Nodes (+Y, -Y, +X, -X, +Z, -Z)
  // -------------------------------------------------------------
  // Press and hold a direction node to glide continuously.
  // The ramp means a quick tap still yields a small, precise step.
  const NODE_UNITS_PER_SEC = 1.1; // world units per second at full glide
  const NODE_RAMP_SEC = 0.18; // ease-in time from step to full glide
  const NODE_MAX_DT = 0.05; // clamp dt so a stalled frame cannot teleport
  const NODE_DETENT_UNITS = 0.12; // haptic tick per this much travel

  const stopNodeGlide = () => {
    if (glideRafRef.current !== null) {
      cancelAnimationFrame(glideRafRef.current);
      glideRafRef.current = null;
    }
    glideRef.current = null;
    glideDetentRef.current = 0;
  };

  // Never leave a loop running if the component unmounts mid-hold
  useEffect(() => stopNodeGlide, []);

  const glideTick = (t: number) => {
    const g = glideRef.current;
    if (!g) return;

    const dt = Math.min(NODE_MAX_DT, (t - g.last) / 1000);
    g.last = t;

    // Time-based, so speed is identical on 60Hz and 120Hz screens
    const held = (t - g.start) / 1000;
    const ramp = Math.min(1, held / NODE_RAMP_SEC);
    const amount = g.direction * NODE_UNITS_PER_SEC * ramp * dt;

    emitTranslation(g.axis, amount, 0, g.nodeId);

    // Tick per distance travelled rather than per frame
    glideDetentRef.current += Math.abs(amount);
    if (glideDetentRef.current >= NODE_DETENT_UNITS) {
      glideDetentRef.current = 0;
      haptics.trigger('detent', 45);
    }

    glideRafRef.current = requestAnimationFrame(glideTick);
  };

  const handleNodePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    nodeId: string,
    axis: 'x' | 'y' | 'z',
    direction: 1 | -1
  ) => {
    if (isLocked) {
      haptics.trigger('lock');
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    setNodeActiveState(nodeId);
    setActiveHandle(nodeId);
    haptics.trigger('medium');
    onInteractionStart?.(nodeId);

    const now = performance.now();
    glideRef.current = { nodeId, axis, direction, start: now, last: now };
    glideDetentRef.current = 0;
    glideRafRef.current = requestAnimationFrame(glideTick);
  };

  const handleNodePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!nodeActiveState) return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    stopNodeGlide();

    const currentId = nodeActiveState;
    setNodeActiveState(null);
    setActiveHandle(null);
    haptics.trigger('light');
    onInteractionEnd?.(currentId);
  };

  // -------------------------------------------------------------
  // 2b. Uniform Resize Handle
  // Log-linear: drag up 110px = 2x, down 110px = 0.5x.
  // Derived from total displacement (not compounded per event) so the
  // result is identical whether dragged fast or slow, and dragging back
  // returns to exactly the starting size.
  // -------------------------------------------------------------
  const SIZE_LOG_PER_PX = Math.LN2 / 110;
  const SIZE_MIN = 0.1;
  const SIZE_MAX = 10;

  const scaleStartYRef = useRef<number | null>(null);
  const scaleAppliedRef = useRef(1);
  const scaleDetentRef = useRef(1);
  const [scaleOffsetY, setScaleOffsetY] = useState(0);

  const handleScalePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) {
      haptics.trigger('lock');
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    scaleStartYRef.current = e.clientY;
    scaleAppliedRef.current = 1;
    scaleDetentRef.current = 1;
    setActiveHandle('scale-uniform');
    haptics.trigger('medium');
    onInteractionStart?.('scale-uniform');
  };

  const handleScalePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeHandle !== 'scale-uniform' || scaleStartYRef.current === null) return;
    e.preventDefault();

    const totalDy = e.clientY - scaleStartYRef.current;
    setScaleOffsetY(Math.max(-34, Math.min(34, totalDy)));

    const desired = Math.min(
      SIZE_MAX,
      Math.max(SIZE_MIN, Math.exp(-totalDy * SIZE_LOG_PER_PX))
    );
    const factor = desired / scaleAppliedRef.current;
    scaleAppliedRef.current = desired;

    // Tick at each quarter-step of size rather than every frame
    if (Math.abs(desired - scaleDetentRef.current) >= 0.25) {
      scaleDetentRef.current = desired;
      haptics.trigger('detent', 45);
    }

    onScale?.({
      sx: desired,
      sy: desired,
      sz: desired,
      uniform: desired,
      deltaScale: factor - 1,
      handle: 'scale-uniform',
      source: '3d-scale-uniform',
      timestamp: Date.now(),
    });
  };

  const handleScalePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeHandle !== 'scale-uniform') return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    scaleStartYRef.current = null;
    setScaleOffsetY(0);
    setActiveHandle(null);
    haptics.trigger('light');
    onInteractionEnd?.('scale-uniform');
  };

  const emitTranslation = (
    axis: 'x' | 'y' | 'z',
    amount: number,
    rawDelta: number,
    sourceNode: string
  ) => {
    const payload: TranslationEventPayload = {
      x: axis === 'x' ? amount : 0,
      y: axis === 'y' ? amount : 0,
      z: axis === 'z' ? amount : 0,
      normalizedX: axis === 'x' ? Math.max(-1, Math.min(1, amount)) : 0,
      normalizedY: axis === 'y' ? Math.max(-1, Math.min(1, amount)) : 0,
      normalizedZ: axis === 'z' ? Math.max(-1, Math.min(1, amount)) : 0,
      deltaX: axis === 'x' ? rawDelta : 0,
      deltaY: axis === 'y' ? rawDelta : 0,
      deltaZ: axis === 'z' ? rawDelta : 0,
      source: `3d-node-${sourceNode}`,
      timestamp: Date.now(),
    };

    console.log(`[TransformNavigator 3D] Translation Node [${sourceNode}]:`, payload);
    onTranslate?.(payload);
  };

  // -------------------------------------------------------------
  // 3. Concentric Dashed Rotation Arcs (Rx, Ry, Rz)
  // -------------------------------------------------------------
  const handleArcPointerDown = (
    e: React.PointerEvent<SVGCircleElement | SVGPathElement>,
    axis: 'x' | 'y' | 'z'
  ) => {
    if (isLocked || !dialRef.current) {
      if (isLocked) haptics.trigger('lock');
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angleDeg = normalizeAngleDeg((getAngle(e.clientX - centerX, e.clientY - centerY) * 180) / Math.PI);
    arcDragRef.current = { axis, startAngle: angleDeg, lastAngle: angleDeg };
    arcAngleDetentRefs[axis].current = angleDeg;

    const handleId = `rot-arc-${axis}`;
    setActiveHandle(handleId);
    haptics.trigger('medium');
    onInteractionStart?.(handleId);
  };

  const handleArcPointerMove = (e: React.PointerEvent<SVGCircleElement | SVGPathElement>) => {
    if (!arcDragRef.current || !dialRef.current) return;
    e.preventDefault();

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const currentAngleDeg = normalizeAngleDeg(
      (getAngle(e.clientX - centerX, e.clientY - centerY) * 180) / Math.PI
    );

    let deltaAngle = currentAngleDeg - arcDragRef.current.lastAngle;
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;

    arcDragRef.current.lastAngle = currentAngleDeg;

    const axis = arcDragRef.current.axis;
    const updatedAngle = normalizeAngleDeg(arcAngles[axis] + deltaAngle);
    setArcAngles((prev) => ({
      ...prev,
      [axis]: updatedAngle,
    }));

    // Haptic detent feedback every 15 degrees
    haptics.checkAngleDetent(updatedAngle, arcAngleDetentRefs[axis], 15);

    const payload: RotationEventPayload = {
      rx: axis === 'x' ? Number(deltaAngle.toFixed(2)) : 0,
      ry: axis === 'y' ? Number(deltaAngle.toFixed(2)) : 0,
      rz: axis === 'z' ? Number(deltaAngle.toFixed(2)) : 0,
      deltaAngle: Number(deltaAngle.toFixed(2)),
      axis,
      source: `3d-arc-rot-${axis}`,
      timestamp: Date.now(),
    };

    console.log(`[TransformNavigator 3D] Arc Rotation [Axis ${axis.toUpperCase()}]:`, {
      deltaAngle: Number(deltaAngle.toFixed(2)),
    });

    onRotate?.(payload);
  };

  const handleArcPointerUp = (e: React.PointerEvent<SVGCircleElement | SVGPathElement>) => {
    if (!arcDragRef.current) return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const currentHandle = `rot-arc-${arcDragRef.current.axis}`;
    arcDragRef.current = null;
    setActiveHandle(null);
    haptics.trigger('light');
    onInteractionEnd?.(currentHandle);
  };

  // Helper for rendering motion translation node
  const renderTranslationNode = (
    id: string,
    label: string,
    axis: 'x' | 'y' | 'z',
    direction: 1 | -1,
    positionClasses: string,
    colorTheme: 'red' | 'emerald' | 'blue'
  ) => {
    const isActive = nodeActiveState === id;

    const colorConfig = {
      emerald: {
        activeBg: 'bg-emerald-500 text-zinc-950 border-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.85)]',
        inactiveBg: 'bg-[#202024] text-emerald-400 border-emerald-500/40 hover:bg-emerald-950/40 hover:border-emerald-400',
        ringColor: 'rgba(16, 185, 129, 0.4)',
      },
      red: {
        activeBg: 'bg-red-500 text-zinc-950 border-red-300 shadow-[0_0_18px_rgba(239,68,68,0.85)]',
        inactiveBg: 'bg-[#202024] text-red-400 border-red-500/40 hover:bg-red-950/40 hover:border-red-400',
        ringColor: 'rgba(239, 68, 68, 0.4)',
      },
      blue: {
        activeBg: 'bg-blue-500 text-zinc-950 border-blue-300 shadow-[0_0_18px_rgba(59,130,246,0.85)]',
        inactiveBg: 'bg-[#202024] text-blue-400 border-blue-500/40 hover:bg-blue-950/40 hover:border-blue-400',
        ringColor: 'rgba(59, 130, 246, 0.4)',
      },
    }[colorTheme];

    return (
      <div className={`absolute z-30 ${positionClasses}`}>
        {/* Animated Spring Active Pulse Halo */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0.8 }}
              animate={{ scale: 1.45, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow: `0 0 16px 4px ${colorConfig.ringColor}`,
              }}
            />
          )}
        </AnimatePresence>

        <motion.button
          id={`node-3d-${id}`}
          type="button"
          aria-label={`Translate ${label}`}
          onPointerDown={(e) => handleNodePointerDown(e, id, axis, direction)}
          onPointerUp={handleNodePointerUp}
          onPointerCancel={handleNodePointerUp}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: isActive ? 1.16 : 1,
            opacity: 1,
          }}
          whileHover={{
            scale: 1.1,
            transition: { type: 'spring', stiffness: 450, damping: 15 },
          }}
          whileTap={{
            scale: 0.92,
            transition: { type: 'spring', stiffness: 500, damping: 18 },
          }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          className={`${nodePadding} rounded-full font-bold font-mono tracking-tight border shadow-md flex items-center justify-center cursor-pointer touch-none select-none transition-colors duration-150 ${
            isActive ? colorConfig.activeBg : colorConfig.inactiveBg
          }`}
        >
          {label}
        </motion.button>
      </div>
    );
  };

  return (
    <div
      id="three-dimensional-dial-view"
      ref={dialRef}
      className="relative w-[230px] h-[230px] mx-auto flex items-center justify-center select-none"
    >
      {/* Background Circular Plate with Chamfered Dish Depth Illusion */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: isLight
            ? 'radial-gradient(circle at 50% 38%, #ffffff 0%, #f4f4f7 55%, #e4e4e9 100%)'
            : 'radial-gradient(circle at 50% 38%, #1c1e26 0%, #121318 55%, #09090c 100%)',
          boxShadow: isLight
            ? 'inset 0 6px 16px rgba(0,0,0,0.06), inset 0 -2px 6px rgba(255,255,255,0.9), inset 0 0 24px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.08)'
            : 'inset 0 10px 24px rgba(0,0,0,0.92), inset 0 -4px 10px rgba(255,255,255,0.06), inset 0 0 35px rgba(0,0,0,0.95), 0 6px 18px rgba(0,0,0,0.65)',
          border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.09)',
        }}
      >
        {/* Subtle Specular Top Arc Reflection for 3D Beveled Lip */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: isLight
              ? 'radial-gradient(ellipse 75% 25% at 50% 3%, rgba(255,255,255,0.8), transparent 70%)'
              : 'radial-gradient(ellipse 75% 25% at 50% 3%, rgba(255,255,255,0.12), transparent 70%)',
          }}
        />

        {/* Concentric Recessed Boundary Rings */}
        <div className={`absolute w-[86%] h-[86%] rounded-full border border-dashed ${isLight ? 'border-neutral-300 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]' : 'border-white/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]'}`} />
        <div className={`absolute w-[62%] h-[62%] rounded-full border ${isLight ? 'border-neutral-300/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : 'border-white/[0.07] shadow-[0_1px_2px_rgba(255,255,255,0.04)]'}`} />
        <div className={`absolute w-[44%] h-[44%] rounded-full border border-dashed ${isLight ? 'border-neutral-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)]' : 'border-white/[0.08] shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)]'}`} />

        {/* Global Reference Grid Crosshairs */}
        <div className={`absolute w-full h-[1px] ${isLight ? 'bg-gradient-to-r from-transparent via-neutral-300 to-transparent' : 'bg-gradient-to-r from-transparent via-white/10 to-transparent'}`} />
        <div className={`absolute h-full w-[1px] ${isLight ? 'bg-gradient-to-b from-transparent via-neutral-300 to-transparent' : 'bg-gradient-to-b from-transparent via-white/10 to-transparent'}`} />
        <div className={`absolute w-full h-[1px] rotate-45 ${isLight ? 'bg-gradient-to-r from-transparent via-neutral-200 to-transparent' : 'bg-gradient-to-r from-transparent via-white/5 to-transparent'}`} />
        <div className={`absolute w-full h-[1px] -rotate-45 ${isLight ? 'bg-gradient-to-r from-transparent via-neutral-200 to-transparent' : 'bg-gradient-to-r from-transparent via-white/5 to-transparent'}`} />
      </motion.div>

      {/* Fixed Outer Ring Degree Indicators (0, 45, 90, 135, 180, 225, 270, 315 degrees) */}
      <OuterDegreeIndicatorRing
        theme={theme}
        size={230}
      />

      {/* ------------------------------------------------------------- */}
      {/* Interactive Concentric Dashed Rotation Arcs (Rx, Ry, Rz) SVG  */}
      {/* Color Code: Red (#ef4444) for Rx, Green (#10b981) for Ry, Blue (#3b82f6) for Rz */}
      {/* ------------------------------------------------------------- */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-auto z-10 overflow-visible"
        viewBox="0 0 200 200"
      >
        <defs>
          <filter id="glow-rz" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-ry" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-rx" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Base Ring */}
        <circle
          cx="100"
          cy="100"
          r="86"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
        />

        {/* Outer Arc: Rz (Roll / Cobalt Blue #3b82f6) */}
        <motion.circle
          id="arc-rotation-rz"
          cx="100"
          cy="100"
          r="76"
          fill="none"
          stroke="#3b82f6"
          strokeDasharray="6 4"
          filter={activeHandle === 'rot-arc-z' || hoveredArc === 'z' ? 'url(#glow-rz)' : undefined}
          animate={{
            strokeWidth: activeHandle === 'rot-arc-z' ? 4 : hoveredArc === 'z' ? 3 : 2,
            strokeOpacity: activeHandle === 'rot-arc-z' ? 1 : hoveredArc === 'z' ? 0.85 : 0.45,
            strokeDashoffset: -arcAngles.z * 0.4,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="cursor-pointer"
          onPointerDown={(e) => handleArcPointerDown(e, 'z')}
          onPointerMove={handleArcPointerMove}
          onPointerUp={handleArcPointerUp}
          onPointerCancel={handleArcPointerUp}
          onMouseEnter={() => setHoveredArc('z')}
          onMouseLeave={() => setHoveredArc(null)}
        />

        {/* Middle Arc: Ry (Yaw / Emerald Green #10b981) */}
        <motion.circle
          id="arc-rotation-ry"
          cx="100"
          cy="100"
          r="62"
          fill="none"
          stroke="#10b981"
          strokeDasharray="5 4"
          filter={activeHandle === 'rot-arc-y' || hoveredArc === 'y' ? 'url(#glow-ry)' : undefined}
          animate={{
            strokeWidth: activeHandle === 'rot-arc-y' ? 4 : hoveredArc === 'y' ? 3 : 2,
            strokeOpacity: activeHandle === 'rot-arc-y' ? 1 : hoveredArc === 'y' ? 0.85 : 0.45,
            strokeDashoffset: -arcAngles.y * 0.35,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="cursor-pointer"
          onPointerDown={(e) => handleArcPointerDown(e, 'y')}
          onPointerMove={handleArcPointerMove}
          onPointerUp={handleArcPointerUp}
          onPointerCancel={handleArcPointerUp}
          onMouseEnter={() => setHoveredArc('y')}
          onMouseLeave={() => setHoveredArc(null)}
        />

        {/* Inner Arc: Rx (Pitch / Studio Red #ef4444) */}
        <motion.circle
          id="arc-rotation-rx"
          cx="100"
          cy="100"
          r="48"
          fill="none"
          stroke="#ef4444"
          strokeDasharray="4 3"
          filter={activeHandle === 'rot-arc-x' || hoveredArc === 'x' ? 'url(#glow-rx)' : undefined}
          animate={{
            strokeWidth: activeHandle === 'rot-arc-x' ? 4 : hoveredArc === 'x' ? 3 : 2,
            strokeOpacity: activeHandle === 'rot-arc-x' ? 1 : hoveredArc === 'x' ? 0.85 : 0.45,
            strokeDashoffset: -arcAngles.x * 0.3,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="cursor-pointer"
          onPointerDown={(e) => handleArcPointerDown(e, 'x')}
          onPointerMove={handleArcPointerMove}
          onPointerUp={handleArcPointerUp}
          onPointerCancel={handleArcPointerUp}
          onMouseEnter={() => setHoveredArc('x')}
          onMouseLeave={() => setHoveredArc(null)}
        />
      </svg>

      {/* ------------------------------------------------------------- */}
      {/* Central Trackball Sphere (Orbit Freeform Rotation)           */}
      {/* ------------------------------------------------------------- */}
      <motion.div
        id="handle-3d-trackball"
        role="button"
        tabIndex={0}
        aria-label="3D Freeform Trackball Orbit Sphere"
        title="Freeform Trackball 3D Rotation"
        style={{
          transform: `translate3d(${trackballOffset.x}px, ${trackballOffset.y}px, 0)`,
        }}
        onPointerDown={handleTrackballPointerDown}
        onPointerMove={handleTrackballPointerMove}
        onPointerUp={handleTrackballPointerUp}
        onPointerCancel={handleTrackballPointerUp}
        whileHover={{
          scale: 1.06,
          transition: { type: 'spring', stiffness: 400, damping: 20 },
        }}
        whileTap={{
          scale: 0.95,
          transition: { type: 'spring', stiffness: 500, damping: 20 },
        }}
        animate={{
          scale: activeHandle === 'trackball' ? 1.08 : 1,
          borderColor: activeHandle === 'trackball' ? '#ffffff' : 'rgba(255, 255, 255, 0.2)',
          boxShadow:
            activeHandle === 'trackball'
              ? '0 0 28px rgba(255,255,255,0.4), inset 0 0 12px rgba(255,255,255,0.3)'
              : '0 10px 25px rgba(0,0,0,0.5)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`relative z-20 ${trackballSize} rounded-full bg-[radial-gradient(circle_at_35%_35%,#323238_0%,#18181b_70%,#0e0e10_100%)] border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none`}
      >
        {/* Subtle Orbit / Compass Icon */}
        <motion.div
          animate={{
            rotate: activeHandle === 'trackball' ? 45 : 0,
            scale: activeHandle === 'trackball' ? 1.05 : 1,
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 22 }}
          className="w-[78%] h-[78%] rounded-full bg-[#151517] border border-white/10 flex items-center justify-center text-zinc-300"
        >
          <Orbit
            className={`w-4 h-4 transition-colors duration-200 ${
              activeHandle === 'trackball' ? 'text-white' : 'text-zinc-400'
            }`}
          />
        </motion.div>
      </motion.div>

      {/* ------------------------------------------------------------- */}
      {/* Uniform Pill Translation Nodes on Perimeter                   */}
      {/* Color Code: Studio Red (#ef4444) for X, Emerald Green (#10b981) for Y, Cobalt Blue (#3b82f6) for Z */}
      {/* ------------------------------------------------------------- */}

      {/* +Y Node (Top) -> Emerald Green */}
      {renderTranslationNode('trans-py', '+Y', 'y', 1, 'top-1 left-1/2 -translate-x-1/2', 'emerald')}

      {/* -Y Node (Bottom) -> Emerald Green */}
      {renderTranslationNode('trans-ny', '-Y', 'y', -1, 'bottom-1 left-1/2 -translate-x-1/2', 'emerald')}

      {/* -X Node (Left) -> Studio Red */}
      {renderTranslationNode('trans-nx', '-X', 'x', -1, 'top-1/2 left-1 -translate-y-1/2', 'red')}

      {/* +X Node (Right) -> Studio Red */}
      {renderTranslationNode('trans-px', '+X', 'x', 1, 'top-1/2 right-1 -translate-y-1/2', 'red')}

      {/* +Z Node (Top-Right) -> Cobalt Blue */}
      {renderTranslationNode('trans-pz', '+Z', 'z', 1, 'top-3 right-3', 'blue')}

      {/* -Z Node (Bottom-Left) -> Cobalt Blue */}
      {renderTranslationNode('trans-nz', '-Z', 'z', -1, 'bottom-3 left-3', 'blue')}

      {/* ------------------------------------------------------------- */}
      {/* Uniform Resize Handle (Top-Left) - drag up to grow, down to shrink */}
      {/* Mirrors the Flat Screen resize handle position so it reads as the same control */}
      {/* ------------------------------------------------------------- */}
      <motion.div
        id="handle-3d-scale-uniform"
        role="button"
        tabIndex={0}
        aria-label="Resize model"
        title="Resize - drag up to make bigger, down to make smaller"
        style={{
          top: '23%',
          left: '23%',
          transform: `translate(-50%, calc(-50% + ${scaleOffsetY}px))`,
        }}
        onPointerDown={handleScalePointerDown}
        onPointerMove={handleScalePointerMove}
        onPointerUp={handleScalePointerUp}
        onPointerCancel={handleScalePointerUp}
        whileHover={{ scale: 1.12, transition: { type: 'spring', stiffness: 450, damping: 15 } }}
        whileTap={{ scale: 0.92, transition: { type: 'spring', stiffness: 500, damping: 18 } }}
        animate={{ scale: activeHandle === 'scale-uniform' ? 1.18 : 1 }}
        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
        className={`absolute z-30 ${
          isFingerPen ? 'w-10 h-10' : 'w-8 h-8'
        } rounded-full border shadow-md flex items-center justify-center cursor-ns-resize touch-none select-none transition-colors duration-150 ${
          activeHandle === 'scale-uniform'
            ? 'bg-white text-zinc-950 border-white shadow-[0_0_16px_rgba(255,255,255,0.7)]'
            : 'bg-[#242428] text-zinc-200 border-white/25 hover:bg-zinc-700 hover:border-white/50'
        }`}
      >
        <Maximize2 className="w-3 h-3" />
      </motion.div>
    </div>
  );
};
