/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { NavVariationProps } from '../types';
import { playHapticSound } from '../../../utils/audio';

export const SectorReticleNavigator: React.FC<NavVariationProps> = ({
  state,
  onChange,
  onReset,
  theme,
  sensitivity = 1.0,
  soundEnabled = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeGesture, setActiveGesture] = useState<'none' | 'sector' | 'center' | 'radius'>('none');
  const [activeSectorMetric, setActiveSectorMetric] = useState<'yaw' | 'pitch' | 'brush' | 'scale'>('yaw');
  const [sectorAngle, setSectorAngle] = useState<number>(145); // degrees
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Theme palettes
  const isSage = theme === 'sage';
  const isDark = theme === 'dark';

  const strokeColor = isSage ? '#232628' : isDark ? '#4b5563' : '#1f2937';
  const ringFill = isSage ? '#282a2b' : isDark ? '#1a1d24' : '#111827';
  const accentCoral = isSage ? '#d35f4c' : isDark ? '#38bdf8' : '#2563eb';
  const subRingFill = isSage ? '#9ba79a' : isDark ? '#262a34' : '#e5e7eb';
  const centerDiscFill = isSage ? '#859284' : isDark ? '#1f232b' : '#f3f4f6';
  const textColor = isSage ? '#232628' : isDark ? '#f3f4f6' : '#111827';

  // Calculate angle from center of widget
  const getAngleAndRadius = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { angle: 0, radius: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return { angle: deg, radius: dist };
  }, []);

  // Center Reticle Drag (Pan XY)
  const handleCenterPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveGesture('center');
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    if (soundEnabled) playHapticSound('pop', soundEnabled);
  };

  // Sector Arc Drag (Angle / Value scrub)
  const handleSectorPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveGesture('sector');
    const { angle } = getAngleAndRadius(e.clientX, e.clientY);
    setSectorAngle(angle);
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    if (soundEnabled) playHapticSound('click', soundEnabled);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeGesture === 'none') return;

    if (activeGesture === 'center') {
      const dx = (e.clientX - lastPointerRef.current.x) * sensitivity;
      const dy = (e.clientY - lastPointerRef.current.y) * sensitivity;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };

      onChange((prev) => ({
        ...prev,
        x: Math.round((prev.x + dx) * 10) / 10,
        y: Math.round((prev.y - dy) * 10) / 10,
      }));
    } else if (activeGesture === 'sector') {
      const { angle } = getAngleAndRadius(e.clientX, e.clientY);
      let deltaAngle = angle - sectorAngle;
      if (deltaAngle > 180) deltaAngle -= 360;
      if (deltaAngle < -180) deltaAngle += 360;

      setSectorAngle(angle);

      if (activeSectorMetric === 'yaw') {
        onChange((prev) => ({
          ...prev,
          yaw: Math.round(((prev.yaw + deltaAngle * sensitivity) % 360) * 10) / 10,
        }));
      } else if (activeSectorMetric === 'pitch') {
        onChange((prev) => ({
          ...prev,
          pitch: Math.max(-90, Math.min(90, Math.round((prev.pitch + deltaAngle * sensitivity) * 10) / 10)),
        }));
      } else if (activeSectorMetric === 'brush') {
        onChange((prev) => ({
          ...prev,
          brushSize: Math.max(0.5, Math.min(50, Math.round((prev.brushSize + deltaAngle * 0.1 * sensitivity) * 10) / 10)),
        }));
      } else if (activeSectorMetric === 'scale') {
        onChange((prev) => ({
          ...prev,
          scale: Math.max(0.1, Math.min(5.0, Math.round((prev.scale + deltaAngle * 0.005 * sensitivity) * 100) / 100)),
        }));
      }

      if (soundEnabled && Math.abs(deltaAngle) > 3) {
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

  // SVG Sector Arc Generator
  const sectorSpan = 38; // degrees width of active sector wedge
  const outerR = 150;
  const innerR = 85;

  const startRad = ((sectorAngle - sectorSpan / 2) * Math.PI) / 180;
  const endRad = ((sectorAngle + sectorSpan / 2) * Math.PI) / 180;

  const x1 = 175 + innerR * Math.cos(startRad);
  const y1 = 175 + innerR * Math.sin(startRad);
  const x2 = 175 + outerR * Math.cos(startRad);
  const y2 = 175 + outerR * Math.sin(startRad);
  const x3 = 175 + outerR * Math.cos(endRad);
  const y3 = 175 + outerR * Math.sin(endRad);
  const x4 = 175 + innerR * Math.cos(endRad);
  const y4 = 175 + innerR * Math.sin(endRad);

  const sectorPath = `M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 0 0 ${x1} ${y1} Z`;

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative flex flex-col items-center justify-center p-6 select-none touch-none"
    >
      {/* Precision Polar Reticle SVG */}
      <div className="relative w-[350px] h-[350px] flex items-center justify-center">
        <svg
          viewBox="0 0 350 350"
          className="w-full h-full overflow-visible"
          style={{ shapeRendering: 'geometricPrecision' }}
        >
          {/* Extended Axis Crosshairs with hairline line markers */}
          <line x1="-30" y1="175" x2="380" y2="175" stroke={strokeColor} strokeWidth="0.75" strokeDasharray="3 3" opacity="0.45" />
          <line x1="175" y1="-30" x2="175" y2="380" stroke={strokeColor} strokeWidth="0.75" strokeDasharray="3 3" opacity="0.45" />

          {/* Precision Diamond Axis Endpoints */}
          <polygon points="-25,175 -20,171 -15,175 -20,179" fill={strokeColor} />
          <polygon points="365,175 370,171 375,175 370,179" fill={strokeColor} />
          <polygon points="175,-25 171,-20 175,-15 179,-20" fill={strokeColor} />
          <polygon points="175,365 171,370 175,375 179,370" fill={strokeColor} />

          {/* Outer Guideline Circles */}
          <circle cx="175" cy="175" r="168" fill="none" stroke={strokeColor} strokeWidth="0.5" opacity="0.25" />
          <circle cx="175" cy="175" r="150" fill="none" stroke={strokeColor} strokeWidth="0.75" opacity="0.5" />

          {/* Primary Dark Annular Disc Ring */}
          <circle cx="175" cy="175" r="150" fill={ringFill} />
          <circle cx="175" cy="175" r="85" fill={subRingFill} />

          {/* Concentric Measurement Arc Guides */}
          <circle cx="175" cy="175" r="128" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.2" />
          <circle cx="175" cy="175" r="106" fill="none" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.2" />

          {/* Active Colored Sector Wedge (Draggable) */}
          <path
            d={sectorPath}
            fill={accentCoral}
            className="cursor-pointer hover:opacity-95 transition-opacity"
            onPointerDown={handleSectorPointerDown}
          />

          {/* Sector Target Indicator Handle & Pip */}
          <circle
            cx={175 + 150 * Math.cos((sectorAngle * Math.PI) / 180)}
            cy={175 + 150 * Math.sin((sectorAngle * Math.PI) / 180)}
            r="5"
            fill={ringFill}
            stroke="#ffffff"
            strokeWidth="2"
            className="cursor-pointer"
            onPointerDown={handleSectorPointerDown}
          />

          {/* Inner Secondary Sub-Ring */}
          <circle cx="175" cy="175" r="85" fill={subRingFill} />

          {/* Inner Radial Tick Marks */}
          {Array.from({ length: 36 }).map((_, i) => {
            const angle = (i * 10 * Math.PI) / 180;
            const rIn = i % 3 === 0 ? 73 : 78;
            const rOut = 83;
            return (
              <line
                key={i}
                x1={175 + rIn * Math.cos(angle)}
                y1={175 + rIn * Math.sin(angle)}
                x2={175 + rOut * Math.cos(angle)}
                y2={175 + rOut * Math.sin(angle)}
                stroke={strokeColor}
                strokeWidth={i % 3 === 0 ? '1' : '0.5'}
                opacity={i % 3 === 0 ? '0.7' : '0.35'}
              />
            );
          })}

          {/* Center Precision Disc (Draggable XY Pan) */}
          <circle
            cx="175"
            cy="175"
            r="60"
            fill={centerDiscFill}
            stroke={strokeColor}
            strokeWidth="1"
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={handleCenterPointerDown}
          />

          {/* Center Core Reticle Dot */}
          <circle
            cx={175 + Math.max(-28, Math.min(28, state.x * 0.5))}
            cy={175 - Math.max(-28, Math.min(28, state.y * 0.5))}
            r="6"
            fill={accentCoral}
            stroke="#ffffff"
            strokeWidth="1.5"
            pointerEvents="none"
          />
          <circle cx="175" cy="175" r="2.5" fill={strokeColor} opacity="0.4" pointerEvents="none" />

          {/* Arc Engraved Monospace Labels */}
          <text x="175" y="45" textAnchor="middle" fill="#ffffff" opacity="0.6" fontSize="8" fontFamily="monospace" letterSpacing="1">
            YAW / 360°
          </text>
          <text x="310" y="179" textAnchor="middle" fill="#ffffff" opacity="0.6" fontSize="8" fontFamily="monospace" letterSpacing="1">
            DEPTH
          </text>
          <text x="175" y="315" textAnchor="middle" fill="#ffffff" opacity="0.6" fontSize="8" fontFamily="monospace" letterSpacing="1">
            VERMOS
          </text>
          <text x="40" y="179" textAnchor="middle" fill="#ffffff" opacity="0.6" fontSize="8" fontFamily="monospace" letterSpacing="1">
            FORCE
          </text>
        </svg>

        {/* Center Pan Readout */}
        <div className="absolute font-mono text-[9px] pointer-events-none text-center opacity-60">
          <div>XY PAN</div>
          <div>{state.x.toFixed(0)}, {state.y.toFixed(0)}</div>
        </div>
      </div>

      {/* Sector Target Metric Switcher (Monochrome Text Pills) */}
      <div className="flex items-center gap-1 mt-6 border border-neutral-700/30 rounded p-1 font-mono text-[11px]">
        {(['yaw', 'pitch', 'brush', 'scale'] as const).map((metric) => (
          <button
            key={metric}
            onClick={() => {
              setActiveSectorMetric(metric);
              if (soundEnabled) playHapticSound('mode', soundEnabled);
            }}
            className={`px-3 py-1 rounded transition-colors cursor-pointer uppercase ${
              activeSectorMetric === metric
                ? isSage
                  ? 'bg-[#232628] text-[#c2cdc1] font-semibold'
                  : 'bg-neutral-800 text-white font-semibold'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            {metric}
          </button>
        ))}
        <button
          onClick={onReset}
          className="ml-2 px-2.5 py-1 text-[10px] border border-inherit rounded opacity-75 hover:opacity-100 uppercase"
        >
          Zero
        </button>
      </div>

      <div className="mt-2 font-mono text-[10px] tracking-wider opacity-60">
        SECTOR: {activeSectorMetric.toUpperCase()} [{sectorAngle.toFixed(1)}°] • CENTER: DRAG XY
      </div>
    </div>
  );
};
