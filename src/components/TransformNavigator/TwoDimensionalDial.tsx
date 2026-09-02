import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Move,
  ArrowUpDown,
  ArrowLeftRight,
  Maximize2,
  RotateCw,
} from 'lucide-react';
import {
  AccessibilityMode,
  TranslationEventPayload,
  RotationEventPayload,
  ScaleEventPayload,
} from '../../types';
import { applyElasticResistance, getAngle, normalizeAngleDeg } from '../../utils/mathUtils';
import { haptics } from '../../utils/haptics';

interface TwoDimensionalDialProps {
  isLocked: boolean;
  accessibilityMode: AccessibilityMode;
  onTranslate?: (data: TranslationEventPayload) => void;
  onRotate?: (data: RotationEventPayload) => void;
  onScale?: (data: ScaleEventPayload) => void;
  onInteractionStart?: (handleName: string) => void;
  onInteractionEnd?: (handleName: string) => void;
}

export const TwoDimensionalDial: React.FC<TwoDimensionalDialProps> = ({
  isLocked,
  accessibilityMode,
  onTranslate,
  onRotate,
  onScale,
  onInteractionStart,
  onInteractionEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Center stick drag state
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [isStickDragging, setIsStickDragging] = useState(false);
  const stickDragOriginRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const stickPrevRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const hitBoundaryRef = useRef(false);

  // Active handle tracking
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  // Rotation angle state for 2D rotate handle
  const [currentRotationAngle, setCurrentRotationAngle] = useState(0);
  const rotateStartAngleRef = useRef<number>(0);
  const rotatePrevAngleRef = useRef<number>(0);
  const initialRotationAngleRef = useRef<number>(0);
  const lastAngleDetentRef = useRef<number>(0);

  // Scale drag states
  const scaleDragOriginRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const scalePrevRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const lastScaleStepRef = useRef<number>(1);
  const [scaleDisplacements, setScaleDisplacements] = useState({
    top: { x: 0, y: 0 },
    left: { x: 0, y: 0 },
    topLeft: { x: 0, y: 0 },
  });

  const isFingerPen = accessibilityMode === 'finger-pen';
  const handleSize = isFingerPen ? 'w-10 h-10' : 'w-8 h-8';
  const centerStickSize = isFingerPen ? 'w-22 h-22' : 'w-18 h-18';

  // -------------------------------------------------------------
  // 1. Central Move Stick Drag Handlers (Elastic & Normalized Vector)
  // -------------------------------------------------------------
  // Hold the stick in a direction and the object keeps gliding that way.
  // Speed comes from how far the stick is pushed, so it behaves like the
  // spring-back visual has always implied.
  const MOVE_PX_PER_SEC = 700; // screen px/sec at full deflection
  const MOVE_DEADZONE = 0.08; // ignore a stick resting slightly off centre
  const MOVE_CURVE = 2; // fine control near centre, speed at the rim
  const MOVE_MAX_DT = 0.05; // clamp dt so a stalled frame cannot teleport

  const stickVelRef = useRef({ nx: 0, ny: 0 });
  const stickRafRef = useRef<number | null>(null);
  const stickLastTRef = useRef(0);

  const stopStickGlide = () => {
    if (stickRafRef.current !== null) {
      cancelAnimationFrame(stickRafRef.current);
      stickRafRef.current = null;
    }
    stickVelRef.current = { nx: 0, ny: 0 };
  };

  // Never leave a loop running if the component unmounts mid-hold
  useEffect(() => stopStickGlide, []);

  const stickTick = (t: number) => {
    const dt = Math.min(MOVE_MAX_DT, (t - stickLastTRef.current) / 1000);
    stickLastTRef.current = t;

    const { nx, ny } = stickVelRef.current;
    const mag = Math.hypot(nx, ny);

    if (mag > MOVE_DEADZONE) {
      // Curve the response, then convert to screen px for this frame
      const curved = Math.pow(mag, MOVE_CURVE) / mag;
      const px = MOVE_PX_PER_SEC * dt;

      onTranslate?.({
        x: nx,
        y: ny,
        z: 0,
        normalizedX: nx,
        normalizedY: ny,
        normalizedZ: 0,
        deltaX: nx * curved * px,
        // translateScreenSpace expects screen coords (Y down = positive),
        // while ny is up-positive - so negate here or vertical inverts
        deltaY: -ny * curved * px,
        deltaZ: 0,
        source: '2d-move-stick',
        timestamp: Date.now(),
      });
    }

    stickRafRef.current = requestAnimationFrame(stickTick);
  };

  const handleStickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) {
      haptics.trigger('lock');
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    stickDragOriginRef.current = { clientX: e.clientX, clientY: e.clientY };
    setIsStickDragging(true);
    hitBoundaryRef.current = false;
    setActiveHandle('move');
    haptics.trigger('light');
    onInteractionStart?.('move');

    stickVelRef.current = { nx: 0, ny: 0 };
    stickLastTRef.current = performance.now();
    stickRafRef.current = requestAnimationFrame(stickTick);
  };

  const handleStickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isStickDragging || !stickDragOriginRef.current) return;
    e.preventDefault();

    const rawDx = e.clientX - stickDragOriginRef.current.clientX;
    const rawDy = e.clientY - stickDragOriginRef.current.clientY;

    const rawDistance = Math.hypot(rawDx, rawDy);
    const maxBound = 48; // Boundary radius for pure travel
    const elasticDistance = applyElasticResistance(rawDistance, maxBound, 0.4);

    if (rawDistance > maxBound * 1.3 && !hitBoundaryRef.current) {
      hitBoundaryRef.current = true;
      haptics.trigger('boundary');
    } else if (rawDistance <= maxBound) {
      hitBoundaryRef.current = false;
    }

    const angle = Math.atan2(rawDy, rawDx);
    const clampedX = Math.cos(angle) * elasticDistance;
    const clampedY = Math.sin(angle) * elasticDistance;

    setStickPos({ x: clampedX, y: clampedY });

    // Record where the stick is. The rAF loop turns this into motion.
    stickVelRef.current = {
      nx: Math.max(-1, Math.min(1, clampedX / maxBound)),
      ny: Math.max(-1, Math.min(1, -clampedY / maxBound)), // screen up = positive
    };
  };

  const handleStickPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isStickDragging) return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    stopStickGlide();

    setIsStickDragging(false);
    stickDragOriginRef.current = null;
    stickPrevRef.current = null;
    hitBoundaryRef.current = false;
    setActiveHandle(null);
    haptics.trigger('snap');
    onInteractionEnd?.('move');

    // Elastic snap back to origin
    setStickPos({ x: 0, y: 0 });
  };

  // -------------------------------------------------------------
  // 2. 2D Rotate Handle (Orange right handle)
  // -------------------------------------------------------------
  const handleRotatePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked || !containerRef.current) {
      if (isLocked) haptics.trigger('lock');
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angleRad = getAngle(e.clientX - centerX, e.clientY - centerY);
    const angleDeg = normalizeAngleDeg((angleRad * 180) / Math.PI);

    rotateStartAngleRef.current = angleDeg;
    rotatePrevAngleRef.current = angleDeg;
    initialRotationAngleRef.current = currentRotationAngle;
    lastAngleDetentRef.current = currentRotationAngle;

    setActiveHandle('rotate-2d');
    haptics.trigger('medium');
    onInteractionStart?.('rotate-2d');
  };

  const handleRotatePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeHandle !== 'rotate-2d' || !containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const angleRad = getAngle(e.clientX - centerX, e.clientY - centerY);
    const currentAngleDeg = normalizeAngleDeg((angleRad * 180) / Math.PI);

    let totalDeltaAngle = currentAngleDeg - rotateStartAngleRef.current;
    if (totalDeltaAngle > 180) totalDeltaAngle -= 360;
    if (totalDeltaAngle < -180) totalDeltaAngle += 360;

    let stepDeltaAngle = currentAngleDeg - (rotatePrevAngleRef.current ?? currentAngleDeg);
    if (stepDeltaAngle > 180) stepDeltaAngle -= 360;
    if (stepDeltaAngle < -180) stepDeltaAngle += 360;
    rotatePrevAngleRef.current = currentAngleDeg;

    const newAngle = normalizeAngleDeg(initialRotationAngleRef.current + totalDeltaAngle);
    setCurrentRotationAngle(newAngle);

    // Haptic detent feedback every 15 degrees
    haptics.checkAngleDetent(newAngle, lastAngleDetentRef, 15);

    const payload: RotationEventPayload = {
      rx: 0,
      ry: 0,
      rz: Number(newAngle.toFixed(2)),
      deltaAngle: Number(stepDeltaAngle.toFixed(2)),
      axis: '2d-plane',
      source: '2d-rotate-handle',
      timestamp: Date.now(),
    };

    onRotate?.(payload);
  };

  const handleRotatePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeHandle !== 'rotate-2d') return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setActiveHandle(null);
    haptics.trigger('light');
    onInteractionEnd?.('rotate-2d');
  };

  // -------------------------------------------------------------
  // 3. Scale Handles: Top (Height), Left (Width), Top-Left (Uniform)
  // -------------------------------------------------------------
  const handleScalePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    handleType: 'scale-y' | 'scale-x' | 'scale-uniform'
  ) => {
    if (isLocked) {
      haptics.trigger('lock');
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    scaleDragOriginRef.current = { clientX: e.clientX, clientY: e.clientY };
    scalePrevRef.current = { clientX: e.clientX, clientY: e.clientY };
    lastScaleStepRef.current = 1;
    setActiveHandle(handleType);
    haptics.trigger('medium');
    onInteractionStart?.(handleType);
  };

  const handleScalePointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    handleType: 'scale-y' | 'scale-x' | 'scale-uniform'
  ) => {
    if (activeHandle !== handleType || !scaleDragOriginRef.current) return;
    e.preventDefault();

    const rawDx = e.clientX - scaleDragOriginRef.current.clientX;
    const rawDy = e.clientY - scaleDragOriginRef.current.clientY;

    const stepDx = e.clientX - (scalePrevRef.current ? scalePrevRef.current.clientX : e.clientX);
    const stepDy = e.clientY - (scalePrevRef.current ? scalePrevRef.current.clientY : e.clientY);
    scalePrevRef.current = { clientX: e.clientX, clientY: e.clientY };

    if (handleType === 'scale-y') {
      const clampedDy = Math.max(-40, Math.min(40, rawDy));
      setScaleDisplacements((prev) => ({ ...prev, top: { x: 0, y: clampedDy } }));

      // Dragging up (negative dy) scales UP (height > 1.0)
      const scaleDelta = -stepDy * 0.01;
      const totalDelta = -rawDy * 0.02;
      const sy = Math.max(0.1, Number((1 + totalDelta).toFixed(3)));

      const step = Math.round(sy * 4) / 4;
      if (Math.abs(step - lastScaleStepRef.current) >= 0.25) {
        lastScaleStepRef.current = step;
        haptics.trigger('detent', 50);
      }

      onScale?.({
        sx: 1,
        sy,
        sz: 1,
        uniform: sy,
        deltaScale: scaleDelta,
        handle: 'scale-y',
        source: '2d-scale-top',
        timestamp: Date.now(),
      });
    } else if (handleType === 'scale-x') {
      const clampedDx = Math.max(-40, Math.min(40, rawDx));
      setScaleDisplacements((prev) => ({ ...prev, left: { x: clampedDx, y: 0 } }));

      // Dragging left (negative dx) or right scales width
      const scaleDelta = -stepDx * 0.01;
      const totalDelta = -rawDx * 0.02;
      const sx = Math.max(0.1, Number((1 + totalDelta).toFixed(3)));

      const step = Math.round(sx * 4) / 4;
      if (Math.abs(step - lastScaleStepRef.current) >= 0.25) {
        lastScaleStepRef.current = step;
        haptics.trigger('detent', 50);
      }

      onScale?.({
        sx,
        sy: 1,
        sz: 1,
        uniform: sx,
        deltaScale: scaleDelta,
        handle: 'scale-x',
        source: '2d-scale-left',
        timestamp: Date.now(),
      });
    } else if (handleType === 'scale-uniform') {
      const clampedDist = Math.max(-30, Math.min(30, (rawDx - rawDy) / 1.414));
      setScaleDisplacements((prev) => ({
        ...prev,
        topLeft: { x: clampedDist, y: -clampedDist },
      }));

      const scaleDelta = (-stepDx - stepDy) * 0.008;
      const totalDelta = (-rawDx - rawDy) * 0.015;
      const uniform = Math.max(0.1, Number((1 + totalDelta).toFixed(3)));

      const step = Math.round(uniform * 4) / 4;
      if (Math.abs(step - lastScaleStepRef.current) >= 0.25) {
        lastScaleStepRef.current = step;
        haptics.trigger('detent', 50);
      }

      onScale?.({
        sx: uniform,
        sy: uniform,
        sz: 1,
        uniform,
        deltaScale: scaleDelta,
        handle: 'scale-uniform',
        source: '2d-scale-uniform',
        timestamp: Date.now(),
      });
    }
  };

  const handleScalePointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    handleType: 'scale-y' | 'scale-x' | 'scale-uniform'
  ) => {
    if (activeHandle !== handleType) return;
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setActiveHandle(null);
    haptics.trigger('light');
    scaleDragOriginRef.current = null;
    scalePrevRef.current = null;
    setScaleDisplacements({
      top: { x: 0, y: 0 },
      left: { x: 0, y: 0 },
      topLeft: { x: 0, y: 0 },
    });
    onInteractionEnd?.(handleType);
  };

  return (
    <div
      id="two-dimensional-dial-view"
      ref={containerRef}
      className="relative w-[230px] h-[230px] mx-auto flex items-center justify-center select-none"
    >
      {/* Background Radar Dial & Grid Guides with Chamfered Dish Depth Illusion */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 26 }}
        className="absolute inset-0 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 50% 38%, #1c1e26 0%, #121318 55%, #09090c 100%)',
          boxShadow:
            'inset 0 10px 24px rgba(0,0,0,0.92), inset 0 -4px 10px rgba(255,255,255,0.06), inset 0 0 35px rgba(0,0,0,0.95), 0 6px 18px rgba(0,0,0,0.65)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}
      >
        {/* Subtle Specular Top Arc Reflection for 3D Beveled Lip */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 75% 25% at 50% 3%, rgba(255,255,255,0.12), transparent 70%)',
          }}
        />

        {/* Outer Circular Reference Ring with Recessed Groove Shadow */}
        <div className="absolute w-[86%] h-[86%] rounded-full border border-dashed border-white/15 shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)]" />

        {/* Mid Circular Reference Ring with Rim Highlight */}
        <div className="absolute w-[62%] h-[62%] rounded-full border border-white/10 shadow-[0_1px_2px_rgba(255,255,255,0.04)]" />

        {/* Inner Boundary Dish Groove */}
        <div className="absolute w-[44%] h-[44%] rounded-full border border-dashed border-white/10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)]" />

        {/* Center Crosshair Lines */}
        <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-white/15 to-transparent" />

        {/* Diagonal Crosshair Guides for 2D View */}
        <div className="absolute w-full h-[1px] rotate-45 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="absolute w-full h-[1px] -rotate-45 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      </motion.div>

      {/* Elastic Tether Line while dragging central move stick */}
      {isStickDragging && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ overflow: 'visible' }}
        >
          <line
            x1="50%"
            y1="50%"
            x2={`calc(50% + ${stickPos.x}px)`}
            y2={`calc(50% + ${stickPos.y}px)`}
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="3 3"
            strokeOpacity="0.8"
          />
        </svg>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Central Move Stick: Circular Tactile Button with 4-Way Arrow */}
      {/* ------------------------------------------------------------- */}
      <motion.div
        id="handle-2d-move-stick"
        role="button"
        tabIndex={0}
        aria-label="2D Screen Move Joystick"
        style={{
          transform: `translate3d(${stickPos.x}px, ${stickPos.y}px, 0)`,
        }}
        onPointerDown={handleStickPointerDown}
        onPointerMove={handleStickPointerMove}
        onPointerUp={handleStickPointerUp}
        onPointerCancel={handleStickPointerUp}
        whileHover={{
          scale: 1.04,
          transition: { type: 'spring', stiffness: 400, damping: 20 },
        }}
        whileTap={{
          scale: 0.98,
          transition: { type: 'spring', stiffness: 500, damping: 20 },
        }}
        animate={{
          scale: isStickDragging ? 1.08 : 1,
          borderColor: isStickDragging ? '#34d399' : 'rgba(255, 255, 255, 0.2)',
          boxShadow: isStickDragging
            ? '0 0 28px rgba(16,185,129,0.45), inset 0 0 10px rgba(16,185,129,0.2)'
            : '0 10px 20px rgba(0,0,0,0.4)',
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className={`relative z-20 ${centerStickSize} rounded-full bg-gradient-to-b from-[#2a2a2e] to-[#1c1c1f] border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none`}
      >
        {/* Inner Tactile Ring */}
        <div className="w-[82%] h-[82%] rounded-full bg-[#18181a] border border-white/10 flex flex-col items-center justify-center text-zinc-300">
          <Move
            className={`w-4 h-4 transition-transform duration-150 ${
              isStickDragging ? 'text-emerald-400 scale-110' : 'text-zinc-200'
            }`}
          />
          <span className="text-[8.5px] font-bold tracking-wider mt-0.5 text-zinc-400">
            MOVE
          </span>
        </div>
      </motion.div>

      {/* ------------------------------------------------------------- */}
      {/* Top Scale Handle (Height / Scale Y: ↕) */}
      {/* ------------------------------------------------------------- */}
      <motion.div
        id="handle-2d-scale-y"
        role="button"
        tabIndex={0}
        aria-label="Stretch Height (Y-Axis)"
        title="Stretch Height (Y-Axis) - Drag up/down to stretch or squash"
        style={{
          top: '13%',
          left: '50%',
          transform: `translate(-50%, calc(-50% + ${scaleDisplacements.top.y}px))`,
        }}
        onPointerDown={(e) => handleScalePointerDown(e, 'scale-y')}
        onPointerMove={(e) => handleScalePointerMove(e, 'scale-y')}
        onPointerUp={(e) => handleScalePointerUp(e, 'scale-y')}
        onPointerCancel={(e) => handleScalePointerUp(e, 'scale-y')}
        whileHover={{
          scale: 1.12,
          transition: { type: 'spring', stiffness: 450, damping: 15 },
        }}
        whileTap={{
          scale: 0.92,
          transition: { type: 'spring', stiffness: 500, damping: 18 },
        }}
        animate={{
          scale: activeHandle === 'scale-y' ? 1.18 : 1,
        }}
        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
        className={`absolute z-30 ${handleSize} rounded-full border shadow-md flex items-center justify-center cursor-ns-resize touch-none select-none transition-colors duration-150 ${
          activeHandle === 'scale-y'
            ? 'bg-white text-zinc-950 border-white shadow-[0_0_16px_rgba(255,255,255,0.7)]'
            : 'bg-[#242428] text-zinc-200 border-white/25 hover:bg-zinc-700 hover:border-white/50'
        }`}
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
      </motion.div>

      {/* ------------------------------------------------------------- */}
      {/* Left Scale Handle (Width / Scale X: ↔) */}
      {/* ------------------------------------------------------------- */}
      <motion.div
        id="handle-2d-scale-x"
        role="button"
        tabIndex={0}
        aria-label="Stretch Width (X-Axis)"
        title="Stretch Width (X-Axis) - Drag left/right to stretch or squash"
        style={{
          top: '50%',
          left: '13%',
          transform: `translate(calc(-50% + ${scaleDisplacements.left.x}px), -50%)`,
        }}
        onPointerDown={(e) => handleScalePointerDown(e, 'scale-x')}
        onPointerMove={(e) => handleScalePointerMove(e, 'scale-x')}
        onPointerUp={(e) => handleScalePointerUp(e, 'scale-x')}
        onPointerCancel={(e) => handleScalePointerUp(e, 'scale-x')}
        whileHover={{
          scale: 1.12,
          transition: { type: 'spring', stiffness: 450, damping: 15 },
        }}
        whileTap={{
          scale: 0.92,
          transition: { type: 'spring', stiffness: 500, damping: 18 },
        }}
        animate={{
          scale: activeHandle === 'scale-x' ? 1.18 : 1,
        }}
        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
        className={`absolute z-30 ${handleSize} rounded-full border shadow-md flex items-center justify-center cursor-ew-resize touch-none select-none transition-colors duration-150 ${
          activeHandle === 'scale-x'
            ? 'bg-white text-zinc-950 border-white shadow-[0_0_16px_rgba(255,255,255,0.7)]'
            : 'bg-[#242428] text-zinc-200 border-white/25 hover:bg-zinc-700 hover:border-white/50'
        }`}
      >
        <ArrowLeftRight className="w-3.5 h-3.5" />
      </motion.div>

      {/* ------------------------------------------------------------- */}
      {/* Top-Left Scale Handle (Uniform / Free Scale: ⤢) */}
      {/* ------------------------------------------------------------- */}
      <motion.div
        id="handle-2d-scale-uniform"
        role="button"
        tabIndex={0}
        aria-label="Scale Uniform (All Dimensions)"
        title="Scale Uniform - Drag diagonally to scale proportionally"
        style={{
          top: '23%',
          left: '23%',
          transform: `translate(calc(-50% + ${scaleDisplacements.topLeft.x}px), calc(-50% + ${scaleDisplacements.topLeft.y}px))`,
        }}
        onPointerDown={(e) => handleScalePointerDown(e, 'scale-uniform')}
        onPointerMove={(e) => handleScalePointerMove(e, 'scale-uniform')}
        onPointerUp={(e) => handleScalePointerUp(e, 'scale-uniform')}
        onPointerCancel={(e) => handleScalePointerUp(e, 'scale-uniform')}
        whileHover={{
          scale: 1.12,
          transition: { type: 'spring', stiffness: 450, damping: 15 },
        }}
        whileTap={{
          scale: 0.92,
          transition: { type: 'spring', stiffness: 500, damping: 18 },
        }}
        animate={{
          scale: activeHandle === 'scale-uniform' ? 1.18 : 1,
        }}
        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
        className={`absolute z-30 ${handleSize} rounded-full border shadow-md flex items-center justify-center cursor-nwse-resize touch-none select-none transition-colors duration-150 ${
          activeHandle === 'scale-uniform'
            ? 'bg-white text-zinc-950 border-white shadow-[0_0_16px_rgba(255,255,255,0.7)]'
            : 'bg-[#242428] text-zinc-200 border-white/25 hover:bg-zinc-700 hover:border-white/50'
        }`}
      >
        <Maximize2 className="w-3 h-3" />
      </motion.div>

      {/* ------------------------------------------------------------- */}
      {/* Right Rotate Handle (Dedicated Monochrome Circular Handle: ↻) */}
      {/* ------------------------------------------------------------- */}
      <motion.div
        id="handle-2d-rotate-right"
        role="button"
        tabIndex={0}
        aria-label="2D In-Plane Rotate Handle"
        title="Rotate In-Plane (Screen Z)"
        style={{
          top: '50%',
          right: '5%',
          transform: 'translate(50%, -50%)',
        }}
        onPointerDown={handleRotatePointerDown}
        onPointerMove={handleRotatePointerMove}
        onPointerUp={handleRotatePointerUp}
        onPointerCancel={handleRotatePointerUp}
        whileHover={{
          scale: 1.12,
          transition: { type: 'spring', stiffness: 450, damping: 15 },
        }}
        whileTap={{
          scale: 0.92,
          transition: { type: 'spring', stiffness: 500, damping: 18 },
        }}
        animate={{
          scale: activeHandle === 'rotate-2d' ? 1.18 : 1,
          boxShadow:
            activeHandle === 'rotate-2d'
              ? '0 0 20px rgba(255,255,255,0.8), inset 0 0 8px rgba(255,255,255,0.4)'
              : '0 4px 10px rgba(0,0,0,0.3)',
        }}
        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
        className={`absolute z-30 ${handleSize} rounded-full bg-white border border-zinc-200 shadow-md flex items-center justify-center text-zinc-950 font-bold cursor-grab active:cursor-grabbing touch-none select-none`}
      >
        <RotateCw className="w-3.5 h-3.5 text-zinc-950 stroke-[2.5]" />
      </motion.div>
    </div>
  );
};
