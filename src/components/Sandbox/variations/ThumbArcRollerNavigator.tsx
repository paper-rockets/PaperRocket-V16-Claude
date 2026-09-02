/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { NavVariationProps } from '../types';
import { playHapticSound } from '../../../utils/audio';

export const ThumbArcRollerNavigator: React.FC<NavVariationProps> = ({
  state,
  onChange,
  onReset,
  theme,
  sensitivity = 1.0,
  soundEnabled = true,
}) => {
  const [activeMode, setActiveMode] = useState<'orbit' | 'pan' | 'brush' | 'depth'>('orbit');
  const [rollerOffset, setRollerOffset] = useState(0);
  const isDraggingRoller = useRef(false);
  const lastYRef = useRef(0);

  // Theme palettes
  const isSage = theme === 'sage';
  const isDark = theme === 'dark';

  const cardBg = isSage ? 'bg-[#232628] text-[#c2cdc1]' : isDark ? 'bg-[#181a20] text-[#f3f4f6]' : 'bg-[#111827] text-white';
  const accentColor = isSage ? '#d35f4c' : isDark ? '#38bdf8' : '#2563eb';
  const trackBg = isSage ? 'bg-[#181a1c]' : isDark ? 'bg-[#101216]' : 'bg-black/60';
  const borderCol = isSage ? 'border-[#363a3d]' : isDark ? 'border-neutral-700' : 'border-neutral-800';

  // Roller gesture
  const handleRollerPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingRoller.current = true;
    lastYRef.current = e.clientY;
    if (soundEnabled) playHapticSound('click', soundEnabled);
  };

  const handleRollerPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRoller.current) return;
    const dy = (e.clientY - lastYRef.current) * sensitivity;
    lastYRef.current = e.clientY;

    setRollerOffset((prev) => (prev + dy * 2) % 40);

    if (activeMode === 'orbit') {
      onChange((prev) => ({
        ...prev,
        yaw: Math.round(((prev.yaw + dy * 1.5) % 360) * 10) / 10,
      }));
    } else if (activeMode === 'pan') {
      onChange((prev) => ({
        ...prev,
        y: Math.round((prev.y - dy * 1.2) * 10) / 10,
      }));
    } else if (activeMode === 'brush') {
      onChange((prev) => ({
        ...prev,
        brushSize: Math.max(0.5, Math.min(50, Math.round((prev.brushSize - dy * 0.2) * 10) / 10)),
      }));
    } else if (activeMode === 'depth') {
      onChange((prev) => ({
        ...prev,
        z: Math.round((prev.z - dy * 1.5) * 10) / 10,
      }));
    }

    if (soundEnabled && Math.abs(dy) > 2) {
      playHapticSound('tick', soundEnabled);
    }
  };

  const handleRollerPointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    isDraggingRoller.current = false;
  };

  // Horizontal X-Rail Slider gesture
  const handleXSlide = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onChange((prev) => ({ ...prev, x: val }));
  };

  // Vertical Y-Rail Slider gesture
  const handleYSlide = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onChange((prev) => ({ ...prev, y: val }));
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-6 select-none touch-none">
      {/* Quarter-Arc Ergonomic Pod Container */}
      <div className={`relative w-[340px] h-[340px] rounded-3xl ${cardBg} p-5 border ${borderCol} shadow-2xl flex flex-col justify-between font-mono`}>
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-inherit/40 pb-2.5">
          <div className="text-[11px] font-semibold tracking-wider uppercase">Thumb-Arc Command Roller</div>
          <button
            onClick={onReset}
            className="px-2 py-0.5 text-[10px] border border-inherit/50 rounded uppercase hover:bg-white/10"
          >
            Reset
          </button>
        </div>

        {/* Center Interactive Layout: Roller + Orthogonal Rails */}
        <div className="relative flex-1 flex items-center justify-center my-3">
          {/* Main Cylindrical Rotary Roller */}
          <div
            onPointerDown={handleRollerPointerDown}
            onPointerMove={handleRollerPointerMove}
            onPointerUp={handleRollerPointerUp}
            onPointerCancel={handleRollerPointerUp}
            className={`relative w-28 h-48 rounded-xl ${trackBg} border border-inherit/60 overflow-hidden cursor-ns-resize shadow-inner flex flex-col justify-center items-center`}
          >
            {/* Roller Knurled Slats Animation */}
            <div className="absolute inset-0 flex flex-col justify-around pointer-events-none opacity-40">
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={i}
                  className="w-full h-1 border-t border-white/40"
                  style={{
                    transform: `translateY(${rollerOffset % 12}px)`,
                  }}
                />
              ))}
            </div>

            {/* Center Index Marker */}
            <div className="relative z-10 px-3 py-1.5 rounded bg-black/80 border border-white/20 text-center shadow-lg pointer-events-none">
              <div className="text-[9px] uppercase tracking-widest opacity-60">Scrub {activeMode}</div>
              <div className="text-sm font-bold" style={{ color: accentColor }}>
                {activeMode === 'orbit' && `${state.yaw.toFixed(0)}°`}
                {activeMode === 'pan' && `${state.y.toFixed(0)}mm`}
                {activeMode === 'brush' && `${state.brushSize.toFixed(1)}px`}
                {activeMode === 'depth' && `${state.z.toFixed(0)}mm`}
              </div>
            </div>

            {/* Direction Arrows indicator (Pure geometry) */}
            <div className="absolute top-2 w-0 h-0 border-x-4 border-x-transparent border-b-6 border-b-white/40" />
            <div className="absolute bottom-2 w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-white/40" />
          </div>

          {/* Orthogonal Dual Rails (X & Y) */}
          <div className="ml-6 flex flex-col justify-between h-48 py-2 w-28">
            {/* Y Pitch Slider */}
            <div>
              <div className="flex justify-between text-[9px] opacity-60 mb-1">
                <span>PITCH</span>
                <span>{state.pitch.toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min="-90"
                max="90"
                step="1"
                value={state.pitch}
                onChange={(e) => onChange((prev) => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                className="w-full accent-amber-500 h-1.5 rounded bg-neutral-800"
              />
            </div>

            {/* X Pan Slider */}
            <div>
              <div className="flex justify-between text-[9px] opacity-60 mb-1">
                <span>PAN X</span>
                <span>{state.x.toFixed(0)}mm</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={state.x}
                onChange={handleXSlide}
                className="w-full accent-emerald-500 h-1.5 rounded bg-neutral-800"
              />
            </div>

            {/* Scale Slider */}
            <div>
              <div className="flex justify-between text-[9px] opacity-60 mb-1">
                <span>SCALE</span>
                <span>{state.scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                value={state.scale}
                onChange={(e) => onChange((prev) => ({ ...prev, scale: parseFloat(e.target.value) }))}
                className="w-full accent-cyan-500 h-1.5 rounded bg-neutral-800"
              />
            </div>
          </div>
        </div>

        {/* Tactile Mode Switcher Footer */}
        <div className="grid grid-cols-4 gap-1 pt-2 border-t border-inherit/30 text-[10px]">
          {(['orbit', 'pan', 'brush', 'depth'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setActiveMode(m);
                if (soundEnabled) playHapticSound('mode', soundEnabled);
              }}
              className={`py-1.5 rounded uppercase font-semibold transition-colors cursor-pointer text-center ${
                activeMode === m
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'opacity-50 hover:opacity-80'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 font-mono text-[10px] tracking-wider opacity-60">
        DRAG VERTICAL ROLLER BARREL TO SCRUB CONTINUOUS VALUE
      </div>
    </div>
  );
};
