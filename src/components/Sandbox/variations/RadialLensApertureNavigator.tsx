/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { NavVariationProps } from '../types';
import { playHapticSound } from '../../../utils/audio';

export const RadialLensApertureNavigator: React.FC<NavVariationProps> = ({
  state,
  onChange,
  onReset,
  theme,
  sensitivity = 1.0,
  soundEnabled = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeGesture, setActiveGesture] = useState<'none' | 'outer' | 'iris'>('none');
  const lastPointer = useRef({ x: 0, y: 0 });
  const startRadius = useRef(0);

  const isSage = theme === 'sage';
  const isDark = theme === 'dark';

  const barrelBg = isSage ? '#232628' : isDark ? '#14161b' : '#1f2937';
  const bladeColor = isSage ? '#353a3d' : isDark ? '#282c35' : '#374151';
  const accentColor = isSage ? '#d35f4c' : isDark ? '#38bdf8' : '#2563eb';
  const textColor = isSage ? '#c2cdc1' : isDark ? '#f3f4f6' : '#ffffff';

  // Outer Orbit gesture
  const handleOuterDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveGesture('outer');
    lastPointer.current = { x: e.clientX, y: e.clientY };
    if (soundEnabled) playHapticSound('click', soundEnabled);
  };

  // Center Iris gesture (expands / shrinks brush size)
  const handleIrisDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveGesture('iris');
    lastPointer.current = { x: e.clientX, y: e.clientY };
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      startRadius.current = Math.hypot(e.clientX - cx, e.clientY - cy);
    }
    if (soundEnabled) playHapticSound('pop', soundEnabled);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeGesture === 'none') return;

    if (activeGesture === 'outer' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const prevAngle = Math.atan2(lastPointer.current.y - cy, lastPointer.current.x - cx);
      const currAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
      lastPointer.current = { x: e.clientX, y: e.clientY };

      let delta = ((currAngle - prevAngle) * 180) / Math.PI;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      onChange((prev) => ({
        ...prev,
        yaw: Math.round(((prev.yaw + delta * sensitivity) % 360) * 10) / 10,
      }));

      if (soundEnabled && Math.abs(delta) > 3) {
        playHapticSound('tick', soundEnabled);
      }
    } else if (activeGesture === 'iris' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const currentRadius = Math.hypot(e.clientX - cx, e.clientY - cy);
      const deltaR = (currentRadius - startRadius.current) * sensitivity;
      startRadius.current = currentRadius;

      onChange((prev) => ({
        ...prev,
        brushSize: Math.max(0.5, Math.min(50, Math.round((prev.brushSize + deltaR * 0.3) * 10) / 10)),
      }));

      if (soundEnabled && Math.abs(deltaR) > 2) {
        playHapticSound('tick', soundEnabled);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    setActiveGesture('none');
  };

  // Generate 6 mechanical aperture blades
  // Iris aperture normalized between 8px and 55px
  const irisRadius = Math.max(10, Math.min(55, (state.brushSize / 50) * 45 + 10));
  const bladeCount = 6;
  const blades = Array.from({ length: bladeCount }).map((_, i) => {
    const angle = (i * (360 / bladeCount) * Math.PI) / 180;
    const rOuter = 82;
    const rInner = irisRadius;

    // Geometric polygonal blade shape
    const p1x = 160 + rOuter * Math.cos(angle);
    const p1y = 160 + rOuter * Math.sin(angle);
    const p2x = 160 + rOuter * Math.cos(angle + (Math.PI / 3));
    const p2y = 160 + rOuter * Math.sin(angle + (Math.PI / 3));
    const p3x = 160 + rInner * Math.cos(angle + (Math.PI / 4));
    const p3y = 160 + rInner * Math.sin(angle + (Math.PI / 4));

    return `M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y} Z`;
  });

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative flex flex-col items-center justify-center p-6 select-none touch-none"
    >
      {/* Optical Lens Barrel SVG Container */}
      <div className="relative w-[340px] h-[340px] flex items-center justify-center">
        <svg viewBox="0 0 320 320" className="w-full h-full overflow-visible">
          {/* Outer Metal Barrel Chasis */}
          <circle cx="160" cy="160" r="150" fill={barrelBg} stroke="#444" strokeWidth="2" />

          {/* Outer Grip Teeth (Heavy knurled rim for orbit) */}
          <g
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={handleOuterDown}
          >
            <circle cx="160" cy="160" r="148" fill="none" stroke="transparent" strokeWidth="24" />
            {Array.from({ length: 48 }).map((_, i) => {
              const ang = (i * 7.5 * Math.PI) / 180;
              return (
                <line
                  key={i}
                  x1={160 + 138 * Math.cos(ang)}
                  y1={160 + 138 * Math.sin(ang)}
                  x2={160 + 148 * Math.cos(ang)}
                  y2={160 + 148 * Math.sin(ang)}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  opacity={i % 4 === 0 ? '0.8' : '0.3'}
                />
              );
            })}
          </g>

          {/* Middle Focal Distance Scale Ring */}
          <circle cx="160" cy="160" r="115" fill="none" stroke="#ffffff" strokeWidth="0.75" opacity="0.25" />
          <circle cx="160" cy="160" r="95" fill="none" stroke="#ffffff" strokeWidth="0.75" opacity="0.25" />

          {/* Calibrated Focal Text on Ring */}
          <text x="160" y="55" textAnchor="middle" fill={textColor} opacity="0.7" fontSize="8" fontFamily="monospace">
            ORBIT ROTATION {state.yaw.toFixed(0)}°
          </text>
          <text x="160" y="275" textAnchor="middle" fill={textColor} opacity="0.7" fontSize="8" fontFamily="monospace">
            ZOOM DEPTH {state.z.toFixed(0)}mm
          </text>

          {/* Iris Aperture Chamber Outer Well */}
          <circle cx="160" cy="160" r="85" fill="#0c0d10" stroke="#222" strokeWidth="1" />

          {/* 6 Overlapping Mechanical Aperture Blades */}
          <g className="cursor-ew-resize" onPointerDown={handleIrisDown}>
            {blades.map((d, idx) => (
              <path
                key={idx}
                d={d}
                fill={bladeColor}
                stroke="#111827"
                strokeWidth="1"
                opacity="0.95"
              />
            ))}

            {/* Aperture Core Opening (Transparent / Colored Brush Core) */}
            <circle
              cx="160"
              cy="160"
              r={irisRadius}
              fill={accentColor}
              fillOpacity="0.15"
              stroke={accentColor}
              strokeWidth="2"
            />
          </g>

          {/* Center Aperture Readout */}
          <circle cx="160" cy="160" r="24" fill="#000000" fillOpacity="0.75" pointerEvents="none" />
          <text x="160" y="157" textAnchor="middle" fill="#ffffff" fontSize="8" fontFamily="monospace" opacity="0.6" pointerEvents="none">
            IRIS f/
          </text>
          <text x="160" y="169" textAnchor="middle" fill={accentColor} fontSize="11" fontFamily="monospace" fontWeight="bold" pointerEvents="none">
            {state.brushSize.toFixed(1)}
          </text>
        </svg>
      </div>

      {/* Action Strip */}
      <div className="flex items-center gap-4 mt-4 font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className="opacity-60 text-[10px]">DEPTH Z:</span>
          <input
            type="range"
            min="-100"
            max="100"
            value={state.z}
            onChange={(e) => onChange((prev) => ({ ...prev, z: parseFloat(e.target.value) }))}
            className="w-24 accent-amber-500"
          />
        </div>
        <button
          onClick={onReset}
          className="px-3 py-1 border border-neutral-700/50 rounded uppercase hover:bg-white/10"
        >
          Reset Lens
        </button>
      </div>

      <div className="mt-2 font-mono text-[10px] tracking-wider opacity-60">
        OUTER RING: ROTATE FOR 360° ORBIT • CENTER IRIS: DRAG TO EXPAND APERTURE
      </div>
    </div>
  );
};
