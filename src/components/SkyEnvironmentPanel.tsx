import React, { useState, useEffect } from 'react';
import { StudioEngine } from '../core/studioEngine';
import { EnvironmentPreset } from '../types/skybox';
import { DEFAULT_PRESETS } from '../constants/presets';
import { AtmospherePanel } from './skybox/AtmospherePanel';
import { GradientCurvePanel } from './skybox/GradientCurvePanel';
import { CloudsPanel } from './skybox/CloudsPanel';
import { SunGodRaysPanel } from './skybox/SunGodRaysPanel';
import { WeatherFogPanel } from './skybox/WeatherFogPanel';
import { timeOfDayToSunAngles } from '../engine/colorUtils';
import {
  Sun,
  Sparkles,
  Layers,
  Cloud,
  CloudSun,
  CloudRain,
  Play,
  Pause,
  RotateCcw,
  X,
  Check,
} from 'lucide-react';

interface SkyEnvironmentPanelProps {
  engine: StudioEngine | null;
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

type SubmenuTab = 'presets' | 'atmosphere' | 'gradient' | 'clouds' | 'sun' | 'weather';

export const SkyEnvironmentPanel: React.FC<SkyEnvironmentPanelProps> = ({
  engine,
  isOpen,
  onClose,
}) => {
  const [preset, setPreset] = useState<EnvironmentPreset>(DEFAULT_PRESETS[0]);
  const [activeTab, setActiveTab] = useState<SubmenuTab>('presets');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<1 | 5 | 15>(1);

  // Sync state from engine when opened
  useEffect(() => {
    if (engine && isOpen && engine.skyEngine) {
      const current = engine.skyEngine.getCurrentPreset();
      if (current) {
        setPreset(current);
      }
    }
  }, [engine, isOpen]);

  // Live Time of Day simulation loop
  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      setPreset((prev) => {
        const nextHour = (prev.timeOfDayHour + 0.05 * simSpeed) % 24;
        const { altitude, azimuth } = timeOfDayToSunAngles(nextHour);
        const updated: EnvironmentPreset = {
          ...prev,
          timeOfDayHour: nextHour,
          sunGodRays: {
            ...prev.sunGodRays,
            sunHeight: Math.round(altitude),
            sunAzimuth: Math.round(azimuth),
          },
        };
        if (engine && engine.skyEngine) {
          engine.skyEngine.updatePresetSettings(updated);
        }
        return updated;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, engine]);

  const handleSelectPreset = (p: EnvironmentPreset) => {
    setPreset(p);
    if (engine && engine.skyEngine) {
      engine.skyEngine.applyPreset(p);
    }
  };

  const handleTimeChange = (hour: number) => {
    const { altitude, azimuth } = timeOfDayToSunAngles(hour);
    const updated: EnvironmentPreset = {
      ...preset,
      timeOfDayHour: hour,
      sunGodRays: {
        ...preset.sunGodRays,
        sunHeight: Math.round(altitude),
        sunAzimuth: Math.round(azimuth),
      },
    };
    setPreset(updated);
    if (engine && engine.skyEngine) {
      engine.skyEngine.updatePresetSettings(updated);
    }
  };

  const handleUpdatePreset = (partial: Partial<EnvironmentPreset>) => {
    const updated: EnvironmentPreset = {
      ...preset,
      ...partial,
    };
    setPreset(updated);
    if (engine && engine.skyEngine) {
      engine.skyEngine.updatePresetSettings(updated);
    }
  };

  const formatTime = (h: number) => {
    const totalMinutes = Math.floor(h * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  if (!isOpen) return null;

  return (
    <aside
      id="skybox-studio-panel"
      className="fixed top-14 right-3.5 bottom-3.5 z-50 w-[340px] sm:w-[380px] bg-[#141519]/95 backdrop-blur-xl border border-[#2b2c32] rounded-2xl shadow-2xl flex flex-col overflow-hidden select-none text-[#e2e4ea] animate-in slide-in-from-right-4 fade-in duration-150"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-[#101114]">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-zinc-400" />
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              Skybox & Atmosphere Studio
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono">
              {preset.name}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 rounded-lg bg-white/5 hover:bg-white/10 transition"
          title="Close Skybox Studio"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-800 bg-[#121317] overflow-x-auto scrollbar-none text-[11px]">
        {(
          [
            ['presets', 'Presets', Sparkles],
            ['atmosphere', 'Atmosphere', Sun],
            ['gradient', 'Gradient', Layers],
            ['clouds', 'Clouds', Cloud],
            ['sun', 'Sun & Rays', CloudSun],
            ['weather', 'Fog', CloudRain],
          ] as const
        ).map(([tabKey, label, IconComponent]) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setActiveTab(tabKey)}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === tabKey
                ? 'bg-white text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
          >
            <IconComponent className="w-3 h-3 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
        {/* Time of Day Scrubbing bar */}
        <div className="bg-[#0e0f12] p-3.5 rounded-xl border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-zinc-400" />
              <span>Time of Day</span>
            </span>
            <span className="font-mono text-zinc-200 font-semibold text-[11px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              {formatTime(preset.timeOfDayHour)}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="24"
            step="0.1"
            value={preset.timeOfDayHour}
            onChange={(e) => handleTimeChange(parseFloat(e.target.value))}
            className="w-full accent-white h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
          />

          {/* Simulation Controls */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-3 py-1 rounded-lg font-medium text-[11px] transition flex items-center gap-1.5 ${
                isSimulating
                  ? 'bg-white text-zinc-950 font-bold'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isSimulating ? 'Pause Diurnal' : 'Play Diurnal'}</span>
            </button>

            <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[10px] font-mono">
              {([1, 5, 15] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setSimSpeed(spd)}
                  className={`px-2 py-0.5 rounded ${
                    simSpeed === spd
                      ? 'bg-white text-zinc-950 font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TAB 1: PRESETS GRID */}
        {activeTab === 'presets' && (
          <div className="space-y-2.5">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Environment Atmosphere Presets
            </div>
            <div className="grid grid-cols-1 gap-2">
              {DEFAULT_PRESETS.map((p) => {
                const isSelected = preset.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-white/10 border-white text-white shadow-lg'
                        : 'bg-[#0e0f12] border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                        <span>{p.name}</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {formatTime(p.timeOfDayHour)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-inner"
                        style={{ backgroundColor: p.gradient.zenithColor }}
                        title="Zenith"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-inner"
                        style={{ backgroundColor: p.gradient.midSkyColor }}
                        title="Mid Sky"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-inner"
                        style={{ backgroundColor: p.gradient.horizonColor }}
                        title="Horizon"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-inner ml-auto"
                        style={{ backgroundColor: p.atmosphere.sunLightColor }}
                        title="Sun"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ATMOSPHERE */}
        {activeTab === 'atmosphere' && (
          <AtmospherePanel
            atmosphere={preset.atmosphere}
            onChange={(updated) =>
              handleUpdatePreset({
                atmosphere: { ...preset.atmosphere, ...updated },
              })
            }
          />
        )}

        {/* TAB 3: GRADIENT CURVE */}
        {activeTab === 'gradient' && (
          <GradientCurvePanel
            gradient={preset.gradient}
            onChange={(updated) =>
              handleUpdatePreset({
                gradient: { ...preset.gradient, ...updated },
              })
            }
          />
        )}

        {/* TAB 4: CLOUDS */}
        {activeTab === 'clouds' && (
          <CloudsPanel
            clouds={preset.clouds}
            onChange={(updated) =>
              handleUpdatePreset({
                clouds: { ...preset.clouds, ...updated },
              })
            }
          />
        )}

        {/* TAB 5: SUN & GOD RAYS */}
        {activeTab === 'sun' && (
          <SunGodRaysPanel
            sunGodRays={preset.sunGodRays}
            onChange={(updated) =>
              handleUpdatePreset({
                sunGodRays: { ...preset.sunGodRays, ...updated },
              })
            }
          />
        )}

        {/* TAB 6: FOG & WEATHER */}
        {activeTab === 'weather' && (
          <WeatherFogPanel
            fog={preset.fog}
            rain={preset.rain}
            onFogChange={(updated) =>
              handleUpdatePreset({
                fog: { ...preset.fog, ...updated },
              })
            }
            onRainChange={(updated) =>
              handleUpdatePreset({
                rain: { ...preset.rain, ...updated },
              })
            }
          />
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-zinc-800 bg-[#101114] flex items-center justify-between">
        <button
          type="button"
          onClick={() => handleSelectPreset(DEFAULT_PRESETS[0])}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-300 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Clear Day</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-zinc-200 text-zinc-950 shadow transition"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Done</span>
        </button>
      </div>
    </aside>
  );
};
