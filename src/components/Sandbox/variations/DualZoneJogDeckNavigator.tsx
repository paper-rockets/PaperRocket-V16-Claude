/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { NavVariationProps } from '../types';
import { playHapticSound } from '../../../utils/audio';

export const DualZoneJogDeckNavigator: React.FC<NavVariationProps> = ({
  state,
  onChange,
  onReset,
  theme,
  sensitivity = 1.0,
  soundEnabled = true,
}) => {
  const [jogTarget, setJogTarget] = useState<'yaw' | 'brush' | 'scale' | 'z'>('yaw');
  const [jogAngle, setJogAngle] = useState(0);
  const [padPos, setPadPos] = useState({ x: 0, y: 0 });

  const isDraggingJog = useRef(false);
  const isDraggingPad = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const padVelocity = useRef({ vx: 0, vy: 0 });
  const jogRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<HTMLDivElement>(null);

  const isSage = theme === 'sage';
  const isDark = theme === 'dark';

  const deckBg = isSage ? 'bg-[#232628] text-[#c2cdc1]' : isDark ? 'bg-[#14161b] text-[#f3f4f6]' : 'bg-[#e5e7eb] text-[#111827]';
  const wellBg = isSage ? 'bg-[#181a1c]' : isDark ? 'bg-[#0b0c0f]' : 'bg-[#d1d5db]';
  const borderCol = isSage ? 'border-[#363a3d]' : isDark ? 'border-neutral-800' : 'border-neutral-400';
  const accentColor = isSage ? '#d35f4c' : isDark ? '#38bdf8' : '#2563eb';

  // Friction deceleration loop for touchpad
  useEffect(() => {
    let animId: number;
    const tick = () => {
      if (!isDraggingPad.current && (Math.abs(padVelocity.current.vx) > 0.1 || Math.abs(padVelocity.current.vy) > 0.1)) {
        padVelocity.current.vx *= 0.88;
        padVelocity.current.vy *= 0.88;

        onChange((prev) => ({
          ...prev,
          x: Math.round((prev.x + padVelocity.current.vx) * 10) / 10,
          y: Math.round((prev.y + padVelocity.current.vy) * 10) / 10,
        }));
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [onChange]);

  // Touchpad Gestures
  const handlePadDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingPad.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    padVelocity.current = { vx: 0, vy: 0 };
    if (soundEnabled) playHapticSound('pop', soundEnabled);
  };

  const handlePadMove = (e: React.PointerEvent) => {
    if (!isDraggingPad.current || !padRef.current) return;
    const dx = (e.clientX - lastPointer.current.x) * sensitivity;
    const dy = (e.clientY - lastPointer.current.y) * sensitivity;
    lastPointer.current = { x: e.clientX, y: e.clientY };

    padVelocity.current = { vx: dx, vy: -dy };

    setPadPos((prev) => ({
      x: Math.max(-45, Math.min(45, prev.x + dx)),
      y: Math.max(-45, Math.min(45, prev.y + dy)),
    }));

    onChange((prev) => ({
      ...prev,
      x: Math.round((prev.x + dx * 1.5) * 10) / 10,
      y: Math.round((prev.y - dy * 1.5) * 10) / 10,
    }));
  };

  const handlePadUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    isDraggingPad.current = false;
    setPadPos({ x: 0, y: 0 });
  };

  // Jog Wheel Gestures
  const handleJogDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDraggingJog.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    if (soundEnabled) playHapticSound('click', soundEnabled);
  };

  const handleJogMove = (e: React.PointerEvent) => {
    if (!isDraggingJog.current || !jogRef.current) return;
    const rect = jogRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const anglePrev = Math.atan2(lastPointer.current.y - cy, lastPointer.current.x - cx);
    const angleCurr = Math.atan2(e.clientY - cy, e.clientX - cx);
    lastPointer.current = { x: e.clientX, y: e.clientY };

    let delta = ((angleCurr - anglePrev) * 180) / Math.PI;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    setJogAngle((prev) => (prev + delta) % 360);

    if (jogTarget === 'yaw') {
      onChange((prev) => ({
        ...prev,
        yaw: Math.round(((prev.yaw + delta * sensitivity) % 360) * 10) / 10,
      }));
    } else if (jogTarget === 'brush') {
      onChange((prev) => ({
        ...prev,
        brushSize: Math.max(0.5, Math.min(50, Math.round((prev.brushSize + delta * 0.1 * sensitivity) * 10) / 10)),
      }));
    } else if (jogTarget === 'scale') {
      onChange((prev) => ({
        ...prev,
        scale: Math.max(0.1, Math.min(5.0, Math.round((prev.scale + delta * 0.005 * sensitivity) * 100) / 100)),
      }));
    } else if (jogTarget === 'z') {
      onChange((prev) => ({
        ...prev,
        z: Math.round((prev.z + delta * 0.5 * sensitivity) * 10) / 10,
      }));
    }

    if (soundEnabled && Math.abs(delta) > 3) {
      playHapticSound('tick', soundEnabled);
    }
  };

  const handleJogUp = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_) {}
    isDraggingJog.current = false;
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-6 select-none touch-none">
      <div className={`relative w-[370px] rounded-2xl ${deckBg} p-5 border ${borderCol} shadow-2xl font-mono flex flex-col gap-4`}>
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-inherit/30 pb-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase">Dual-Zone Precision Deck</span>
          <button
            onClick={onReset}
            className="px-2 py-0.5 text-[10px] border border-inherit/40 rounded uppercase hover:bg-white/10"
          >
            Zero
          </button>
        </div>

        {/* Dual Interaction Wells */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Zone: Inertial Touchpad */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] uppercase opacity-70 mb-1.5 font-semibold">2D Inertial Trackpad</div>
            <div
              ref={padRef}
              onPointerDown={handlePadDown}
              onPointerMove={handlePadMove}
              onPointerUp={handlePadUp}
              onPointerCancel={handlePadUp}
              className={`relative w-36 h-36 rounded-full ${wellBg} border border-inherit/40 flex items-center justify-center cursor-crosshair shadow-inner`}
            >
              {/* Hairline Grid Crosshairs */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
                <div className="w-full h-[1px] bg-white" />
                <div className="absolute h-full w-[1px] bg-white" />
              </div>

              {/* Inertial Tracking Puck */}
              <div
                className="w-7 h-7 rounded-full border-2 border-white/80 shadow-md transition-transform duration-75 flex items-center justify-center pointer-events-none"
                style={{
                  backgroundColor: accentColor,
                  transform: `translate(${padPos.x}px, ${padPos.y}px)`,
                }}
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
            <div className="mt-1.5 text-[9px] opacity-60">XY: {state.x.toFixed(0)}, {state.y.toFixed(0)}</div>
          </div>

          {/* Right Zone: Weighted Rotary Jog Wheel */}
          <div className="flex flex-col items-center">
            <div className="text-[10px] uppercase opacity-70 mb-1.5 font-semibold">Weighted Jog Wheel</div>
            <div
              ref={jogRef}
              onPointerDown={handleJogDown}
              onPointerMove={handleJogMove}
              onPointerUp={handleJogUp}
              onPointerCancel={handleJogUp}
              className={`relative w-36 h-36 rounded-full ${wellBg} border border-inherit/40 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-inner`}
            >
              {/* Rotating Jog Wheel Rim with Knurls */}
              <div
                className="absolute inset-1.5 rounded-full border border-inherit/60 shadow-md flex items-center justify-center transition-transform duration-75"
                style={{
                  transform: `rotate(${jogAngle}deg)`,
                  backgroundColor: isSage ? '#282a2b' : isDark ? '#1a1d24' : '#ffffff',
                }}
              >
                {/* Knurled radial teeth along outer edge */}
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-[2px] h-2 bg-white/30 top-1 origin-bottom"
                    style={{
                      transform: `rotate(${i * 15}deg)`,
                      transformOrigin: 'bottom center',
                      bottom: '50%',
                      height: '62px',
                    }}
                  />
                ))}

                {/* Finger Pit Detent */}
                <div className="absolute top-3 w-4 h-4 rounded-full bg-black/40 border border-white/40 shadow-inner" />
              </div>

              {/* Center Static Digital Value Readout */}
              <div className="relative z-10 w-16 h-16 rounded-full bg-black/80 border border-white/20 flex flex-col items-center justify-center text-center shadow-lg pointer-events-none">
                <span className="text-[8px] opacity-60 uppercase">{jogTarget}</span>
                <span className="text-[11px] font-bold" style={{ color: accentColor }}>
                  {jogTarget === 'yaw' && `${state.yaw.toFixed(0)}°`}
                  {jogTarget === 'brush' && `${state.brushSize.toFixed(1)}px`}
                  {jogTarget === 'scale' && `${state.scale.toFixed(2)}x`}
                  {jogTarget === 'z' && `${state.z.toFixed(0)}mm`}
                </span>
              </div>
            </div>
            <div className="mt-1.5 text-[9px] opacity-60">ANGULAR SCRUB</div>
          </div>
        </div>

        {/* Jog Target Metric Selectors */}
        <div className="grid grid-cols-4 gap-1 pt-2 border-t border-inherit/30 text-[10px]">
          {(['yaw', 'brush', 'scale', 'z'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setJogTarget(t);
                if (soundEnabled) playHapticSound('mode', soundEnabled);
              }}
              className={`py-1 rounded uppercase font-semibold transition-colors cursor-pointer text-center ${
                jogTarget === t
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'opacity-50 hover:opacity-80'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 font-mono text-[10px] tracking-wider opacity-60">
        LEFT: INERTIAL FLICK PAN • RIGHT: ROTATE JOG WHEEL TO SCRUB
      </div>
    </div>
  );
};
