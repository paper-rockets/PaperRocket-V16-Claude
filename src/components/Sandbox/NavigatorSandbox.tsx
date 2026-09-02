/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { SandboxNavState, SandboxTheme, TelemetryEvent } from './types';
import { PreviewScene } from './PreviewScene';
import { TelemetryPanel } from './TelemetryPanel';

import { SectorReticleNavigator } from './variations/SectorReticleNavigator';
import { ThumbArcRollerNavigator } from './variations/ThumbArcRollerNavigator';
import { IsometricCubeCompassNavigator } from './variations/IsometricCubeCompassNavigator';
import { DualZoneJogDeckNavigator } from './variations/DualZoneJogDeckNavigator';
import { RadialLensApertureNavigator } from './variations/RadialLensApertureNavigator';
import { FloatingGyroCapsuleNavigator } from './variations/FloatingGyroCapsuleNavigator';

interface NavigatorSandboxProps {
  onClose?: () => void;
}

export const NavigatorSandbox: React.FC<NavigatorSandboxProps> = ({ onClose }) => {
  const [activeVariation, setActiveVariation] = useState<number>(1);
  const [theme, setTheme] = useState<SandboxTheme>('sage');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [events, setEvents] = useState<TelemetryEvent[]>([]);

  // Core navigation state
  const [navState, setNavState] = useState<SandboxNavState>({
    x: 0,
    y: 0,
    z: 0,
    pitch: 15,
    yaw: -30,
    roll: 0,
    scale: 1.0,
    brushSize: 12.0,
    activeMode: '3d',
  });

  const handleStateChange = useCallback((updater: (prev: SandboxNavState) => SandboxNavState) => {
    setNavState((prev) => {
      const next = updater(prev);
      // Log delta event
      let action = 'Update';
      let val = '';
      if (next.yaw !== prev.yaw || next.pitch !== prev.pitch) {
        action = 'Rotate';
        val = `Y:${next.yaw.toFixed(0)}° P:${next.pitch.toFixed(0)}°`;
      } else if (next.x !== prev.x || next.y !== prev.y) {
        action = 'Pan';
        val = `X:${next.x.toFixed(0)} Y:${next.y.toFixed(0)}`;
      } else if (next.brushSize !== prev.brushSize) {
        action = 'Brush';
        val = `${next.brushSize.toFixed(1)}px`;
      } else if (next.z !== prev.z) {
        action = 'Depth';
        val = `${next.z.toFixed(0)}mm`;
      } else if (next.scale !== prev.scale) {
        action = 'Scale';
        val = `${next.scale.toFixed(2)}x`;
      }

      if (val) {
        const newEvent: TelemetryEvent = {
          id: Math.random().toString(36).substring(2, 9),
          source: `V${activeVariation}`,
          action,
          value: val,
          timestamp: new Date().toLocaleTimeString(),
        };
        setEvents((evs) => [newEvent, ...evs.slice(0, 50)]);
      }

      return next;
    });
  }, [activeVariation]);

  const handleReset = useCallback(() => {
    setNavState({
      x: 0,
      y: 0,
      z: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
      scale: 1.0,
      brushSize: 12.0,
      activeMode: '3d',
    });
    setEvents((evs) => [
      {
        id: Math.random().toString(36).substring(2, 9),
        source: 'System',
        action: 'Reset Coordinates',
        value: 'All Zeroed',
        timestamp: new Date().toLocaleTimeString(),
      },
      ...evs.slice(0, 50),
    ]);
  }, []);

  const variations = [
    { id: 1, name: 'Sector Reticle', desc: 'Technical polar instrument with crosshairs, sweep sector wedge, & fine distance rings.' },
    { id: 2, name: 'Thumb-Arc Roller', desc: 'Corner-docked ergonomic arc with cylindrical ribbed roller barrel & dual rails.' },
    { id: 3, name: 'Isometric Viewcube', desc: 'Axonometric 3D viewcube with orthographic snaps & sliding vernier caliper.' },
    { id: 4, name: 'Dual-Zone Deck', desc: 'Dieter Rams / Braun inspired deck: inertial touchpad + heavy weighted jog wheel.' },
    { id: 5, name: 'Lens Aperture', desc: 'Mechanical optical lens barrel with 6-blade iris diaphragm for physical brush sizing.' },
    { id: 6, name: 'Gyro Capsule', desc: 'Minimal floating pill with spring-rate vector joystick & aerospace wireframe cage.' },
  ];

  // Theme container styling
  const isSage = theme === 'sage';
  const isDark = theme === 'dark';

  const mainBg = isSage ? 'bg-[#c2cdc1] text-[#232628]' : isDark ? 'bg-[#0f1013] text-[#f3f4f6]' : 'bg-[#f8f9fa] text-[#111827]';
  const headerBg = isSage ? 'bg-[#b6c2b4] border-[#232628]/20' : isDark ? 'bg-[#15171d] border-neutral-800' : 'bg-white border-neutral-300';
  const buttonActive = isSage ? 'bg-[#232628] text-[#c2cdc1]' : isDark ? 'bg-sky-600 text-white' : 'bg-black text-white';

  return (
    <div className={`fixed inset-0 z-50 flex flex-col w-screen h-screen select-none font-sans ${mainBg}`}>
      {/* Top Navigation & Config Bar */}
      <header className={`flex items-center justify-between px-5 py-2.5 border-b ${headerBg} backdrop-blur-md`}>
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-mono text-xs font-bold tracking-wider uppercase">Navigator Sandbox</h1>
            <p className="text-[10px] opacity-60 font-mono">6 Non-Clone Spatial & Canvas Controllers</p>
          </div>

          {/* Variation Selector Tabs */}
          <div className="flex items-center gap-1 bg-black/10 dark:bg-white/5 p-1 rounded-lg">
            {variations.map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveVariation(v.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  activeVariation === v.id ? buttonActive : 'opacity-60 hover:opacity-100'
                }`}
              >
                {v.id}. {v.name}
              </button>
            ))}
          </div>
        </div>

        {/* Global Controls: Theme, Sound, Reset, Exit */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          {/* Theme Selector */}
          <div className="flex items-center border border-inherit/40 rounded overflow-hidden">
            {(['sage', 'dark', 'monochrome'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-2 py-0.5 text-[10px] uppercase transition-colors ${
                  theme === t ? buttonActive : 'opacity-60 hover:opacity-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="px-2 py-0.5 border border-inherit/40 rounded text-[10px] uppercase hover:bg-black/5"
          >
            Audio: {soundEnabled ? 'ON' : 'OFF'}
          </button>

          {/* Reset All */}
          <button
            onClick={handleReset}
            className="px-2.5 py-0.5 border border-inherit/40 rounded text-[10px] uppercase hover:bg-black/5"
          >
            Zero View
          </button>

          {/* Exit / Return */}
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 bg-neutral-800 text-white rounded text-[11px] font-semibold hover:bg-neutral-700 cursor-pointer"
            >
              Exit Sandbox
            </button>
          )}
        </div>
      </header>

      {/* Main Split Body: 3D Viewport + Controller Hub + Telemetry */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center 3D Interactive Viewport */}
        <div className="flex-1 relative flex flex-col">
          <PreviewScene navState={navState} theme={theme} className="flex-1" />

          {/* Concept Description Overlay Banner */}
          <div className={`absolute bottom-4 left-4 max-w-md p-3.5 rounded-xl border border-inherit/30 shadow-lg backdrop-blur-md ${headerBg} font-mono`}>
            <div className="flex items-center justify-between text-[11px] font-bold uppercase mb-1">
              <span>Concept {activeVariation}: {variations[activeVariation - 1].name}</span>
              <span className="text-[9px] opacity-50">PROTOTYPE</span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed font-sans">
              {variations[activeVariation - 1].desc}
            </p>
          </div>
        </div>

        {/* Floating Controller Test Well */}
        <div className="w-[420px] flex flex-col items-center justify-center border-l border-inherit/30 p-4 relative">
          <div className="w-full flex justify-center items-center">
            {activeVariation === 1 && (
              <SectorReticleNavigator
                state={navState}
                onChange={handleStateChange}
                onReset={handleReset}
                theme={theme}
                soundEnabled={soundEnabled}
              />
            )}
            {activeVariation === 2 && (
              <ThumbArcRollerNavigator
                state={navState}
                onChange={handleStateChange}
                onReset={handleReset}
                theme={theme}
                soundEnabled={soundEnabled}
              />
            )}
            {activeVariation === 3 && (
              <IsometricCubeCompassNavigator
                state={navState}
                onChange={handleStateChange}
                onReset={handleReset}
                theme={theme}
                soundEnabled={soundEnabled}
              />
            )}
            {activeVariation === 4 && (
              <DualZoneJogDeckNavigator
                state={navState}
                onChange={handleStateChange}
                onReset={handleReset}
                theme={theme}
                soundEnabled={soundEnabled}
              />
            )}
            {activeVariation === 5 && (
              <RadialLensApertureNavigator
                state={navState}
                onChange={handleStateChange}
                onReset={handleReset}
                theme={theme}
                soundEnabled={soundEnabled}
              />
            )}
            {activeVariation === 6 && (
              <FloatingGyroCapsuleNavigator
                state={navState}
                onChange={handleStateChange}
                onReset={handleReset}
                theme={theme}
                soundEnabled={soundEnabled}
              />
            )}
          </div>
        </div>

        {/* Right Telemetry Panel */}
        <div className="w-[280px]">
          <TelemetryPanel
            navState={navState}
            events={events}
            theme={theme}
            onClearEvents={() => setEvents([])}
          />
        </div>
      </div>
    </div>
  );
};
