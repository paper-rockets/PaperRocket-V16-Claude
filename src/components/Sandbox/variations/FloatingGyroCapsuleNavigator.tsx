/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { NavVariationProps } from '../types';
import { playHapticSound } from '../../../utils/audio';

export const FloatingGyroCapsuleNavigator: React.FC<NavVariationProps> = ({
  state,
  onChange,
  onReset,
  theme,
  sensitivity = 1.0,
  soundEnabled = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeVector, setActiveVector] = useState<{ x: number; y: number } | null>(null);
  const [capsuleMode, setCapsuleMode] = useState<'orbit' | 'pan' | 'brush'>('orbit');

  const isDraggingVector = useRef(false);
  const isDraggingGyro = useRef(false);
  const lastGyroPointer = useRef({ x: 0, y: 0 });
  const centerOrigin = useRef({ x: 0, y: 0 });
  const vectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const isSage = theme === 'sage';
  const isDark = theme === 'dark';

  const capsuleBg = isSage ? 'bg-[#232628] text-[#c2cdc1]' : isDark ? 'bg-[#181a20] text-[#f3f4f6]' : 'bg-[#111827] text-white';
  const borderCol = isSage ? 'border-[#363a3d]' : isDark ? 'border-neutral-700' : 'border-neutral-800';
  const accentColor = isSage ? '#d35f4c' : isDark ? '#38bdf8' : '#2563eb';

  // Dynamic continuous spring rate integration loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      if (isDraggingVector.current && (Math.abs(vectorRef.current.x) > 2 || Math.abs(vectorRef.current.y) > 2)) {
        const rateX = vectorRef.current.x * 0.05 * sensitivity;
        const rateY = vectorRef.current.y * 0.05 * sensitivity;

        if (capsuleMode === 'orbit') {
          onChange((prev) => ({
            ...prev,
            yaw: Math.round(((prev.yaw + rateX) % 360) * 10) / 10,
            pitch: Math.max(-90, Math.min(90, Math.round((prev.pitch - rateY) * 10) / 10)),
          }));
        } else if (capsuleMode === 'pan') {
          onChange((prev) => ({
            ...prev,
            x: Math.round((prev.x + rateX * 2) * 10) / 10,
            y: Math.round((prev.y - rateY * 2) * 10) / 10,
          }));
        } else if (capsuleMode === 'brush') {
          onChange((prev) => ({
            ...prev,
            brushSize: Math.max(0.5, Math.min(50, Math.round((prev.brushSize - rateY * 0.1) * 10) / 10)),
          }));
        }
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [capsuleMode, sensitivity, onChange]);

  // Spring Vector Joystick handlers
  const handleVectorDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingVector.current = true;
    centerOrigin.current = { x: e.clientX, y: e.clientY };
    setActiveVector({ x: 0, y: 0 });
    vectorRef.current = { x: 0, y: 0 };
    if (soundEnabled) playHapticSound('pop', soundEnabled);
  };

  const handleVectorMove = (e: React.PointerEvent) => {
    if (!isDraggingVector.current) return;
    const dx = Math.max(-60, Math.min(60, e.clientX - centerOrigin.current.x));
    const dy = Math.max(-60, Math.min(60, e.clientY - centerOrigin.current.y));
    setActiveVector({ x: dx, y: dy });
    vectorRef.current = { x: dx, y: dy };
  };

  const handleVectorUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    isDraggingVector.current = false;
    setActiveVector(null);
    vectorRef.current = { x: 0, y: 0 };
  };

  // Wireframe Gyroscope dragging
  const handleGyroDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingGyro.current = true;
    lastGyroPointer.current = { x: e.clientX, y: e.clientY };
    if (soundEnabled) playHapticSound('click', soundEnabled);
  };

  const handleGyroMove = (e: React.PointerEvent) => {
    if (!isDraggingGyro.current) return;
    const dx = (e.clientX - lastGyroPointer.current.x) * sensitivity;
    const dy = (e.clientY - lastGyroPointer.current.y) * sensitivity;
    lastGyroPointer.current = { x: e.clientX, y: e.clientY };

    onChange((prev) => ({
      ...prev,
      yaw: Math.round(((prev.yaw + dx * 1.5) % 360) * 10) / 10,
      pitch: Math.max(-90, Math.min(90, Math.round((prev.pitch - dy * 1.5) * 10) / 10)),
    }));

    if (soundEnabled && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      playHapticSound('tick', soundEnabled);
    }
  };

  const handleGyroUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    isDraggingGyro.current = false;
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-6 select-none touch-none">
      {/* Floating Capsule Pod */}
      <div className={`relative w-[340px] rounded-2xl ${capsuleBg} border ${borderCol} p-4 shadow-2xl font-mono flex flex-col gap-3.5`}>
        {/* Top Minimal Header & Mode Pill Bar */}
        <div className="flex items-center justify-between border-b border-inherit/30 pb-2">
          <div className="flex gap-1">
            {(['orbit', 'pan', 'brush'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setCapsuleMode(m);
                  if (soundEnabled) playHapticSound('mode', soundEnabled);
                }}
                className={`px-2 py-0.5 text-[10px] rounded uppercase font-semibold transition-colors ${
                  capsuleMode === m ? 'bg-white/20 text-white' : 'opacity-50 hover:opacity-80'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2 py-0.5 text-[9px] border border-inherit/40 rounded uppercase hover:bg-white/10"
            >
              {isExpanded ? 'Fold' : 'Gyro Cage'}
            </button>
            <button
              onClick={onReset}
              className="px-2 py-0.5 text-[9px] border border-inherit/40 rounded uppercase hover:bg-white/10"
            >
              Zero
            </button>
          </div>
        </div>

        {/* Dynamic Vector Joystick Field */}
        <div className="flex flex-col items-center">
          <div className="text-[10px] opacity-60 mb-2 uppercase">
            Spring Vector Pull: {capsuleMode}
          </div>

          {/* Elastic Touch Core */}
          <div
            onPointerDown={handleVectorDown}
            onPointerMove={handleVectorMove}
            onPointerUp={handleVectorUp}
            onPointerCancel={handleVectorUp}
            className="relative w-36 h-36 rounded-full bg-black/40 border border-inherit/40 flex items-center justify-center cursor-pointer shadow-inner"
          >
            {/* Range Rings */}
            <div className="absolute w-28 h-28 rounded-full border border-white/10 pointer-events-none" />
            <div className="absolute w-16 h-16 rounded-full border border-white/15 pointer-events-none" />

            {/* Elastic Guide Vector Ribbon */}
            {activeVector && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                <line
                  x1="72"
                  y1="72"
                  x2={72 + activeVector.x}
                  y2={72 + activeVector.y}
                  stroke={accentColor}
                  strokeWidth="2.5"
                  strokeDasharray="3 3"
                />
              </svg>
            )}

            {/* Spring Tension Puck */}
            <div
              className="w-10 h-10 rounded-full border-2 border-white/80 shadow-lg flex items-center justify-center pointer-events-none transition-transform duration-75"
              style={{
                backgroundColor: accentColor,
                transform: activeVector ? `translate(${activeVector.x}px, ${activeVector.y}px)` : 'none',
              }}
            >
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>
        </div>

        {/* Expanded Aerospace Wireframe Gyroscope Cage */}
        {isExpanded && (
          <div className="border-t border-inherit/30 pt-3 flex flex-col items-center">
            <div className="text-[10px] opacity-60 mb-2 uppercase">Aerospace Wireframe Gimbal</div>
            <div
              onPointerDown={handleGyroDown}
              onPointerMove={handleGyroMove}
              onPointerUp={handleGyroUp}
              onPointerCancel={handleGyroUp}
              className="relative w-32 h-32 rounded-full border border-inherit/50 flex items-center justify-center cursor-grab active:cursor-grabbing bg-black/50"
            >
              <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible pointer-events-none">
                {/* Equator Ring */}
                <ellipse
                  cx="60"
                  cy="60"
                  rx="50"
                  ry={Math.max(5, Math.abs(50 * Math.sin((state.pitch * Math.PI) / 180)))}
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="1.5"
                />
                {/* Prime Meridian Ring */}
                <ellipse
                  cx="60"
                  cy="60"
                  rx={Math.max(5, Math.abs(50 * Math.cos((state.yaw * Math.PI) / 180)))}
                  ry="50"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1"
                  opacity="0.6"
                />
                {/* Center Gimbal Pivot */}
                <circle cx="60" cy="60" r="4" fill={accentColor} />
              </svg>
            </div>
          </div>
        )}

        {/* Readout Footer */}
        <div className="flex justify-between text-[10px] opacity-75 border-t border-inherit/30 pt-2">
          <span>YAW: {state.yaw.toFixed(0)}°</span>
          <span>PITCH: {state.pitch.toFixed(0)}°</span>
          <span>BRUSH: {state.brushSize.toFixed(1)}px</span>
        </div>
      </div>

      <div className="mt-2 font-mono text-[10px] tracking-wider opacity-60">
        PULL PUCK TO ACCELERATE MOTION • RELEASE TO SNAP-RETURN
      </div>
    </div>
  );
};
