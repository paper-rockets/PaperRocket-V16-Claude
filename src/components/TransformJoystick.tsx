import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TransformJoystickMode,
  TransformTargetScope,
  PerfectViewInfo,
  AppTheme,
} from '../types';
import { StudioEngine } from '../core/studioEngine';
import {
  Lock,
  Unlock,
  Move,
  RotateCw,
  Scaling,
  Globe,
  Layers,
  Box,
  Spline,
  ChevronDown,
  Minimize2,
  Maximize2,
  Orbit,
  ArrowUp,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Check,
  Compass,
} from 'lucide-react';

interface TransformJoystickProps {
  engine: StudioEngine | null;
  perfectView: PerfectViewInfo;
  theme?: 'light' | 'dark' | AppTheme;
  onActiveTransformChange?: (active: boolean, actionLabel?: string, valueLabel?: string) => void;
}

export const TransformJoystick: React.FC<TransformJoystickProps> = ({
  engine,
  perfectView,
  theme = 'light',
  onActiveTransformChange,
}) => {
  const [mode, setMode] = useState<TransformJoystickMode>('3d');
  const [targetScope, setTargetScope] = useState<TransformTargetScope>('all');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const [showScopeMenu, setShowScopeMenu] = useState<boolean>(false);

  // Position & Rotation slider states (relative offsets for feedback)
  const [posX, setPosX] = useState<number>(0);
  const [posY, setPosY] = useState<number>(0);
  const [posZ, setPosZ] = useState<number>(0);
  const [rotX, setRotX] = useState<number>(0);
  const [rotY, setRotY] = useState<number>(0);
  const [rotZ, setRotZ] = useState<number>(0);

  // Section collapse states
  const [showPosition, setShowPosition] = useState<boolean>(true);
  const [showRotation, setShowRotation] = useState<boolean>(true);
  const [isScreenAnchored, setIsScreenAnchored] = useState<boolean>(false);

  // Interactive Drag Pad state
  const [isDraggingPad, setIsDraggingPad] = useState<boolean>(false);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const isLight = theme === 'light' || theme === 'sand';

  // Step translation helper
  const handleStepPosition = (axis: 'x' | 'y' | 'z', delta: number) => {
    if (!engine) return;
    engine.beginTransform(targetScope);
    engine.translateAxis3D(axis, delta, targetScope);
    engine.endTransform();

    if (axis === 'x') setPosX((prev) => +(prev + delta).toFixed(2));
    if (axis === 'y') setPosY((prev) => +(prev + delta).toFixed(2));
    if (axis === 'z') setPosZ((prev) => +(prev + delta).toFixed(2));

    onActiveTransformChange?.(true, `Move ${axis.toUpperCase()}`, `${delta > 0 ? '+' : ''}${delta.toFixed(2)}m`);
    setTimeout(() => onActiveTransformChange?.(false), 800);
  };

  // Step rotation helper
  const handleStepRotation = (axis: 'x' | 'y' | 'z', degrees: number) => {
    if (!engine) return;
    const rad = (degrees * Math.PI) / 180;
    engine.beginTransform(targetScope);
    engine.rotateAxis3D(axis, rad, targetScope, isLocked);
    engine.endTransform();

    if (axis === 'x') setRotX((prev) => (prev + degrees) % 360);
    if (axis === 'y') setRotY((prev) => (prev + degrees) % 360);
    if (axis === 'z') setRotZ((prev) => (prev + degrees) % 360);

    onActiveTransformChange?.(true, `Rotate ${axis.toUpperCase()}`, `${degrees > 0 ? '+' : ''}${degrees}°`);
    setTimeout(() => onActiveTransformChange?.(false), 800);
  };

  // Scale helper
  const handleScale = (factor: number) => {
    if (!engine) return;
    engine.beginTransform(targetScope);
    engine.scaleAxis3D(factor, targetScope);
    engine.endTransform();
    const percent = Math.round(factor * 100);
    onActiveTransformChange?.(true, 'Scale', `${percent}%`);
    setTimeout(() => onActiveTransformChange?.(false), 800);
  };

  // Reset helper
  const handleReset = () => {
    if (!engine) return;
    engine.resetModelOrSurface(targetScope);
    setPosX(0);
    setPosY(0);
    setPosZ(0);
    setRotX(0);
    setRotY(0);
    setRotZ(0);
    onActiveTransformChange?.(true, 'Reset Transform', 'Default (0,0,0)');
    setTimeout(() => onActiveTransformChange?.(false), 800);
  };

  // Snap to ground
  const handleSnapToFloor = () => {
    if (!engine) return;
    engine.snapModelToGround();
    setPosY(0);
    onActiveTransformChange?.(true, 'Floor Snapped', 'Base Y = 0.0');
    setTimeout(() => onActiveTransformChange?.(false), 800);
  };

  // Interactive pad pointer down
  const handlePadPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!engine) return;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    dragStartPos.current = { x: e.clientX, y: e.clientY };
    lastPointerPos.current = { x: e.clientX, y: e.clientY };
    setIsDraggingPad(true);
    engine.beginTransform(targetScope);
    onActiveTransformChange?.(true, mode === '2d' ? 'Interactive Screen Pan' : 'Interactive Trackball Rotate');
  };

  // Interactive pad pointer move
  const handlePadPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingPad || !engine) return;
    e.stopPropagation();
    e.preventDefault();

    const dx = e.clientX - lastPointerPos.current.x;
    const dy = e.clientY - lastPointerPos.current.y;
    lastPointerPos.current = { x: e.clientX, y: e.clientY };

    if (mode === '2d') {
      engine.translateScreenSpace(dx, dy, targetScope, isLocked);
      onActiveTransformChange?.(true, 'Planar Pan', `ΔX: ${Math.round(dx)}px, ΔY: ${Math.round(-dy)}px`);
    } else {
      engine.rotateTrackball(dx, dy, targetScope);
      onActiveTransformChange?.(true, 'Free Orbit Rotate', `X: ${Math.round(dx)}°, Y: ${Math.round(dy)}°`);
    }
  };

  // Interactive pad pointer up
  const handlePadPointerUp = () => {
    if (isDraggingPad && engine) {
      engine.endTransform();
      setIsDraggingPad(false);
      onActiveTransformChange?.(false);
    }
  };

  const getScopeLabel = (scope: TransformTargetScope) => {
    switch (scope) {
      case 'all':
        return 'All (Model & Strokes)';
      case 'model':
        return '3D Model Only';
      case 'strokes':
        return 'Strokes Only';
      case 'active_layer':
        return 'Active Layer';
    }
  };

  return (
    <div
      id="sketchbook-v9-transform-panel"
      className={`select-none transition-all duration-200 ${
        isMinimized ? 'w-60' : 'w-76 sm:w-80'
      }`}
    >
      <div
        className={`rounded-3xl border shadow-2xl backdrop-blur-xl p-3.5 flex flex-col gap-3 transition-colors ${
          isLight
            ? 'bg-white/95 border-neutral-200/90 text-neutral-800 shadow-neutral-300/40'
            : 'bg-slate-800/95 border-slate-700/80 text-slate-100 shadow-black/40'
        }`}
      >
        {/* 1. Header: Segmented 2D / 3D Toggle & Utility Buttons */}
        <div className="flex items-center justify-between gap-2 pb-1 border-b border-neutral-100 dark:border-slate-700/60">
          {/* Segmented View Switcher */}
          <div className="flex items-center p-0.5 rounded-full bg-neutral-100 dark:bg-slate-900/60 border border-neutral-200 dark:border-slate-700/80">
            <button
              id="transform-toggle-2d"
              onClick={() => setMode('2d')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                mode === '2d'
                  ? (isLight ? 'bg-white text-neutral-900 shadow-sm' : 'bg-blue-600 text-white shadow-sm')
                  : (isLight ? 'text-neutral-500 hover:text-neutral-800' : 'text-slate-400 hover:text-slate-200')
              }`}
            >
              2D View
            </button>
            <button
              id="transform-toggle-3d"
              onClick={() => setMode('3d')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                mode === '3d'
                  ? (isLight ? 'bg-white text-neutral-900 shadow-sm' : 'bg-blue-600 text-white shadow-sm')
                  : (isLight ? 'text-neutral-500 hover:text-neutral-800' : 'text-slate-400 hover:text-slate-200')
              }`}
            >
              3D Space
            </button>
          </div>

          {/* Utility Action Icons */}
          <div className="flex items-center gap-1 text-neutral-500 dark:text-slate-400">
            <button
              id="transform-btn-lock"
              title={isLocked ? 'Unlock Constraints' : 'Lock Constraints (Proportional / Orthogonal)'}
              onClick={() => setIsLocked(!isLocked)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isLocked
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  : 'border-transparent hover:bg-neutral-100 dark:hover:bg-slate-700'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            <button
              id="transform-btn-minimize"
              title={isMinimized ? 'Expand Panel' : 'Collapse Panel'}
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg border border-transparent hover:bg-neutral-100 dark:hover:bg-slate-700 transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 2. Target Selector Dropdown */}
        <div className="relative">
          <button
            id="transform-btn-target-scope"
            onClick={() => setShowScopeMenu(!showScopeMenu)}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              isLight
                ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800'
                : 'bg-slate-900/60 hover:bg-slate-900 border-slate-700 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider">Target:</span>
              <span className="font-semibold">{getScopeLabel(targetScope)}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {showScopeMenu && (
            <div
              className={`absolute top-full mt-1.5 left-0 right-0 py-1 rounded-2xl shadow-xl border z-30 text-xs animate-in fade-in duration-100 ${
                isLight ? 'bg-white border-neutral-200 text-neutral-800' : 'bg-slate-800 border-slate-700 text-slate-100'
              }`}
            >
              {(['all', 'model', 'strokes', 'active_layer'] as TransformTargetScope[]).map((scope) => (
                <button
                  key={scope}
                  onClick={() => {
                    setTargetScope(scope);
                    setShowScopeMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-1.5 text-left transition-colors ${
                    targetScope === scope
                      ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/40'
                      : (isLight ? 'hover:bg-neutral-100 text-neutral-700' : 'hover:bg-slate-700 text-slate-200')
                  }`}
                >
                  <span>{getScopeLabel(scope)}</span>
                  {targetScope === scope && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {!isMinimized && (
          <>
            {/* 3. Central Primary Action: Interactive Drag & Move Pad */}
            <div
              id="transform-interactive-drag-pad"
              onPointerDown={handlePadPointerDown}
              onPointerMove={handlePadPointerMove}
              onPointerUp={handlePadPointerUp}
              onPointerCancel={handlePadPointerUp}
              className={`h-20 rounded-2xl border flex flex-col items-center justify-center gap-1 cursor-grab active:cursor-grabbing transition-all ${
                isDraggingPad
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                  : isLight
                  ? 'bg-neutral-50 hover:bg-neutral-100/80 border-neutral-200 text-neutral-700'
                  : 'bg-slate-900/60 hover:bg-slate-900 border-slate-700 text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                {mode === '2d' ? <Move className="w-4 h-4" /> : <Orbit className="w-4 h-4" />}
                <span>{mode === '2d' ? 'Interactive Pan & Move' : 'Free Interactive Rotate'}</span>
              </div>
              <span className="text-[10px] text-neutral-400 dark:text-slate-400">
                {mode === '2d' ? 'Drag here to slide object in view' : 'Drag here to smoothly orbit & angle'}
              </span>
            </div>

            {/* 4. Position Controls (Stacked Linear Rows with Color Badges) */}
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setShowPosition(!showPosition)}
                className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200"
              >
                <span>Position (Move)</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPosition ? '' : '-rotate-90'}`} />
              </button>

              {showPosition && (
                <div className="flex flex-col gap-1.5">
                  {/* Row X: Move Left / Right */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 w-24">
                      <span className="w-4 h-4 rounded bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[10px] flex items-center justify-center">
                        X
                      </span>
                      <span className="text-[11px] font-medium">Left / Right</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStepPosition('x', -0.1)}
                        className="px-2 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="font-mono text-[11px] w-12 text-center text-neutral-700 dark:text-slate-200">
                        {posX >= 0 ? `+${posX.toFixed(2)}` : posX.toFixed(2)}m
                      </span>
                      <button
                        onClick={() => handleStepPosition('x', 0.1)}
                        className="px-2 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Row Y: Move Up / Down */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 w-24">
                      <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center">
                        Y
                      </span>
                      <span className="text-[11px] font-medium">Up / Down</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStepPosition('y', -0.1)}
                        className="px-2 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="font-mono text-[11px] w-12 text-center text-neutral-700 dark:text-slate-200">
                        {posY >= 0 ? `+${posY.toFixed(2)}` : posY.toFixed(2)}m
                      </span>
                      <button
                        onClick={() => handleStepPosition('y', 0.1)}
                        className="px-2 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Row Z: Move In / Out */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 w-24">
                      <span className="w-4 h-4 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center">
                        Z
                      </span>
                      <span className="text-[11px] font-medium">In / Out</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStepPosition('z', -0.1)}
                        className="px-2 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="font-mono text-[11px] w-12 text-center text-neutral-700 dark:text-slate-200">
                        {posZ >= 0 ? `+${posZ.toFixed(2)}` : posZ.toFixed(2)}m
                      </span>
                      <button
                        onClick={() => handleStepPosition('z', 0.1)}
                        className="px-2 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Rotation Controls (Stacked Linear Rows with Clear Labels) */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-neutral-100 dark:border-slate-700/60">
              <button
                onClick={() => setShowRotation(!showRotation)}
                className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 hover:text-neutral-800 dark:hover:text-slate-200"
              >
                <span>Rotation (Angles)</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showRotation ? '' : '-rotate-90'}`} />
              </button>

              {showRotation && (
                <div className="flex flex-col gap-1.5">
                  {/* Row Rotate X: Tilt Up / Down */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 w-28">
                      <span className="w-4 h-4 rounded bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-[10px] flex items-center justify-center">
                        X
                      </span>
                      <span className="text-[11px] font-medium">Tilt Up/Down</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStepRotation('x', -90)}
                        className="px-1.5 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-[10px] font-bold"
                      >
                        -90°
                      </button>
                      <button
                        onClick={() => handleStepRotation('x', -15)}
                        className="px-1.5 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-[10px] font-bold"
                      >
                        -15°
                      </button>
                      <button
                        onClick={() => handleStepRotation('x', 15)}
                        className="px-1.5 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-[10px] font-bold"
                      >
                        +15°
                      </button>
                      <button
                        onClick={() => handleStepRotation('x', 90)}
                        className="px-1.5 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-[10px] font-bold"
                      >
                        +90°
                      </button>
                    </div>
                  </div>

                  {/* Row Rotate Y: Turn Left / Right */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 w-28">
                      <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center">
                        Y
                      </span>
                      <span className="text-[11px] font-medium">Turn Left/Right</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStepRotation('y', -90)}
                        className="px-1.5 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-[10px] font-bold"
                      >
                        -90°
                      </button>
                      <button
                        onClick={() => handleStepRotation('y', -15)}
                        className="px-1.5 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-[10px] font-bold"
                      >
                        -15°
                      </button>
                      <button
                        onClick={() => handleStepRotation('y', 15)}
                        className="px-1.5 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-[10px] font-bold"
                      >
                        +15°
                      </button>
                      <button
                        onClick={() => handleStepRotation('y', 90)}
                        className="px-1.5 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-[10px] font-bold"
                      >
                        +90°
                      </button>
                    </div>
                  </div>

                  {/* Row Rotate Z: Roll Side / Tilt */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 w-28">
                      <span className="w-4 h-4 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center">
                        Z
                      </span>
                      <span className="text-[11px] font-medium">Roll Side / Tilt</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStepRotation('z', -90)}
                        className="px-1.5 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-[10px] font-bold"
                      >
                        -90°
                      </button>
                      <button
                        onClick={() => handleStepRotation('z', -15)}
                        className="px-1.5 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-[10px] font-bold"
                      >
                        -15°
                      </button>
                      <button
                        onClick={() => handleStepRotation('z', 15)}
                        className="px-1.5 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-[10px] font-bold"
                      >
                        +15°
                      </button>
                      <button
                        onClick={() => handleStepRotation('z', 90)}
                        className="px-1.5 py-0.5 rounded-lg border border-neutral-200 dark:border-slate-700 bg-neutral-100 dark:bg-slate-700 hover:bg-neutral-200 text-[10px] font-bold"
                      >
                        +90°
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Quick Alignment & Scale Tools */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-neutral-100 dark:border-slate-700/60 text-xs">
              <button
                onClick={() => handleScale(0.9)}
                className="py-1.5 px-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-900/60 hover:bg-neutral-100 text-[11px] font-semibold flex items-center justify-center gap-1"
              >
                <Scaling className="w-3 h-3" />
                <span>Size -10%</span>
              </button>
              <button
                onClick={() => handleScale(1.1)}
                className="py-1.5 px-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-900/60 hover:bg-neutral-100 text-[11px] font-semibold flex items-center justify-center gap-1"
              >
                <Scaling className="w-3 h-3" />
                <span>Size +10%</span>
              </button>
              <button
                onClick={handleSnapToFloor}
                className="py-1.5 px-2 rounded-xl border border-neutral-200 dark:border-slate-700 bg-neutral-50 dark:bg-slate-900/60 hover:bg-neutral-100 text-[11px] font-semibold flex items-center justify-center gap-1"
              >
                <ArrowUp className="w-3 h-3" />
                <span>On Floor</span>
              </button>
            </div>

            {/* 7. Bottom Anchor & Reset Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-slate-700/60 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-neutral-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isScreenAnchored}
                  onChange={(e) => setIsScreenAnchored(e.target.checked)}
                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span>Screen-Space Anchored</span>
              </label>

              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-[11px] font-bold text-neutral-500 dark:text-slate-400 hover:text-red-500 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
