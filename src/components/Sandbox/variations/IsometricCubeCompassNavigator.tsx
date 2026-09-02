/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { NavVariationProps } from '../types';
import { playHapticSound } from '../../../utils/audio';

export const IsometricCubeCompassNavigator: React.FC<NavVariationProps> = ({
  state,
  onChange,
  onReset,
  theme,
  sensitivity = 1.0,
  soundEnabled = true,
}) => {
  const [isDraggingCube, setIsDraggingCube] = useState(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const isSage = theme === 'sage';
  const isDark = theme === 'dark';

  const cardBg = isSage ? 'bg-[#232628] text-[#c2cdc1]' : isDark ? 'bg-[#16181e] text-[#f3f4f6]' : 'bg-white text-[#111827] border border-neutral-300';
  const borderCol = isSage ? 'border-[#363a3d]' : isDark ? 'border-neutral-800' : 'border-neutral-300';
  const accentColor = isSage ? '#d35f4c' : isDark ? '#38bdf8' : '#2563eb';

  // Dragging Cube rotates in 3D
  const handleCubePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingCube(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
    if (soundEnabled) playHapticSound('click', soundEnabled);
  };

  const handleCubePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingCube) return;
    const dx = (e.clientX - lastPointer.current.x) * sensitivity;
    const dy = (e.clientY - lastPointer.current.y) * sensitivity;
    lastPointer.current = { x: e.clientX, y: e.clientY };

    onChange((prev) => ({
      ...prev,
      yaw: Math.round(((prev.yaw + dx * 1.5) % 360) * 10) / 10,
      pitch: Math.max(-90, Math.min(90, Math.round((prev.pitch - dy * 1.5) * 10) / 10)),
    }));

    if (soundEnabled && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      playHapticSound('tick', soundEnabled);
    }
  };

  const handleCubePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    setIsDraggingCube(false);
  };

  // Preset snaps
  const snapView = (yaw: number, pitch: number) => {
    onChange((prev) => ({ ...prev, yaw, pitch, roll: 0 }));
    if (soundEnabled) playHapticSound('snap', soundEnabled);
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-6 select-none touch-none">
      <div className={`relative w-[340px] rounded-2xl ${cardBg} p-5 border ${borderCol} shadow-2xl font-mono flex flex-col gap-4`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-inherit/30 pb-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase">Isometric Coordinate Cube</span>
          <button
            onClick={onReset}
            className="px-2 py-0.5 text-[10px] border border-inherit/40 rounded uppercase hover:bg-white/10"
          >
            Zero
          </button>
        </div>

        {/* 3D Isometric Viewport Cube Representation */}
        <div
          onPointerDown={handleCubePointerDown}
          onPointerMove={handleCubePointerMove}
          onPointerUp={handleCubePointerUp}
          onPointerCancel={handleCubePointerUp}
          className="relative h-44 flex items-center justify-center cursor-grab active:cursor-grabbing perspective-800"
          style={{ perspective: '800px' }}
        >
          {/* 3D CSS Cube container with current Pitch & Yaw */}
          <div
            className="relative w-24 h-24 transition-transform duration-75"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(${-state.pitch}deg) rotateY(${state.yaw}deg)`,
            }}
          >
            {/* Front Face */}
            <div
              onClick={() => snapView(0, 0)}
              className="absolute inset-0 border border-white/60 bg-neutral-900/80 flex items-center justify-center text-[10px] font-bold tracking-widest text-white hover:bg-white/20"
              style={{ transform: 'translateZ(48px)' }}
            >
              FRONT
            </div>
            {/* Back Face */}
            <div
              onClick={() => snapView(180, 0)}
              className="absolute inset-0 border border-white/60 bg-neutral-900/80 flex items-center justify-center text-[10px] font-bold tracking-widest text-white hover:bg-white/20"
              style={{ transform: 'rotateY(180deg) translateZ(48px)' }}
            >
              BACK
            </div>
            {/* Right Face */}
            <div
              onClick={() => snapView(90, 0)}
              className="absolute inset-0 border border-white/60 bg-neutral-900/80 flex items-center justify-center text-[10px] font-bold tracking-widest text-white hover:bg-white/20"
              style={{ transform: 'rotateY(90deg) translateZ(48px)' }}
            >
              RIGHT
            </div>
            {/* Left Face */}
            <div
              onClick={() => snapView(-90, 0)}
              className="absolute inset-0 border border-white/60 bg-neutral-900/80 flex items-center justify-center text-[10px] font-bold tracking-widest text-white hover:bg-white/20"
              style={{ transform: 'rotateY(-90deg) translateZ(48px)' }}
            >
              LEFT
            </div>
            {/* Top Face */}
            <div
              onClick={() => snapView(0, 90)}
              className="absolute inset-0 border border-white/60 bg-neutral-900/80 flex items-center justify-center text-[10px] font-bold tracking-widest text-white hover:bg-white/20"
              style={{ transform: 'rotateX(90deg) translateZ(48px)' }}
            >
              TOP
            </div>
            {/* Bottom Face */}
            <div
              onClick={() => snapView(0, -90)}
              className="absolute inset-0 border border-white/60 bg-neutral-900/80 flex items-center justify-center text-[10px] font-bold tracking-widest text-white hover:bg-white/20"
              style={{ transform: 'rotateX(-90deg) translateZ(48px)' }}
            >
              BOTTOM
            </div>
          </div>

          {/* Quick Ortho Snap Bar */}
          <div className="absolute bottom-1 flex gap-1 text-[9px]">
            <button
              onClick={() => snapView(45, 35)}
              className="px-1.5 py-0.5 border border-inherit/40 rounded bg-black/40 hover:bg-white/20"
            >
              ISO
            </button>
            <button
              onClick={() => snapView(0, 0)}
              className="px-1.5 py-0.5 border border-inherit/40 rounded bg-black/40 hover:bg-white/20"
            >
              FRONT
            </button>
            <button
              onClick={() => snapView(0, 90)}
              className="px-1.5 py-0.5 border border-inherit/40 rounded bg-black/40 hover:bg-white/20"
            >
              TOP
            </button>
          </div>
        </div>

        {/* Vernier Caliper Scale for Brush Size / Precision */}
        <div className="border-t border-inherit/30 pt-3">
          <div className="flex items-center justify-between text-[10px] opacity-75 mb-1">
            <span>VERNIER CALIPER SCALE (BRUSH)</span>
            <span className="font-bold" style={{ color: accentColor }}>{state.brushSize.toFixed(1)} px</span>
          </div>

          {/* Mechanical Caliper Ticks Scale */}
          <div className="relative w-full h-9 bg-black/30 border border-inherit/40 rounded overflow-hidden flex items-center">
            {/* Tick marks */}
            <div className="absolute inset-0 flex justify-between px-2 items-end pb-1 pointer-events-none opacity-40">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-[1px] bg-white ${i % 5 === 0 ? 'h-4' : 'h-2'}`}
                />
              ))}
            </div>

            {/* Slider Input Handle */}
            <input
              type="range"
              min="0.5"
              max="50"
              step="0.5"
              value={state.brushSize}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChange((prev) => ({ ...prev, brushSize: val }));
                if (soundEnabled) playHapticSound('tick', soundEnabled);
              }}
              className="w-full h-full opacity-0 cursor-ew-resize z-10"
            />

            {/* Visual Caliper Jaw Indicator */}
            <div
              className="absolute top-0 bottom-0 w-3 border-x-2 border-amber-400 bg-amber-400/20 pointer-events-none transition-all"
              style={{
                left: `calc(${((state.brushSize - 0.5) / 49.5) * 90}% + 4px)`,
              }}
            />
          </div>
        </div>

        {/* XY Planar Pan Stepper */}
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="flex flex-col">
            <span className="opacity-60 mb-1">PAN X</span>
            <input
              type="range"
              min="-100"
              max="100"
              value={state.x}
              onChange={(e) => onChange((prev) => ({ ...prev, x: parseFloat(e.target.value) }))}
              className="accent-emerald-500"
            />
          </div>
          <div className="flex flex-col">
            <span className="opacity-60 mb-1">PAN Y</span>
            <input
              type="range"
              min="-100"
              max="100"
              value={state.y}
              onChange={(e) => onChange((prev) => ({ ...prev, y: parseFloat(e.target.value) }))}
              className="accent-sky-500"
            />
          </div>
        </div>
      </div>

      <div className="mt-2 font-mono text-[10px] tracking-wider opacity-60">
        DRAG CUBE TO FREE-TUMBLE • TAP FACES TO SNAP ORTHOGRAPHIC
      </div>
    </div>
  );
};
