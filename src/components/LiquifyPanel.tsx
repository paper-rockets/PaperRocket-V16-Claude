import React from 'react';
import { LiquifyMode, LiquifySettings, NumpadTarget } from '../types';
import {
  Hand,
  Move,
  Shrink,
  Expand,
  Wind,
  Check,
  RotateCcw,
  Eye,
  Sliders,
  X,
  Sparkles,
} from 'lucide-react';

interface LiquifyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LiquifySettings;
  setSettings: React.Dispatch<React.SetStateAction<LiquifySettings>>;
  isCompareActive: boolean;
  onToggleCompare: (active: boolean) => void;
  onApply: () => void;
  onCancel: () => void;
  onOpenNumpad: (target: NumpadTarget) => void;
  theme?: 'light' | 'dark';
}

export const LiquifyPanel: React.FC<LiquifyPanelProps> = ({
  isOpen,
  onClose,
  settings,
  setSettings,
  isCompareActive,
  onToggleCompare,
  onApply,
  onCancel,
  onOpenNumpad,
  theme = 'dark',
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const modes: { id: LiquifyMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'push',
      label: 'Push',
      icon: <Move className="w-4 h-4" />,
      desc: 'Displaces vertices along screen drag vector in 3D camera plane',
    },
    {
      id: 'pinch',
      label: 'Pinch',
      icon: <Shrink className="w-4 h-4" />,
      desc: 'Attracts vertices toward brush epicenter with radial falloff',
    },
    {
      id: 'inflate',
      label: 'Inflate',
      icon: <Expand className="w-4 h-4" />,
      desc: 'Repels vertices outward from brush epicenter',
    },
    {
      id: 'comb',
      label: 'Comb',
      icon: <Wind className="w-4 h-4" />,
      desc: 'Smooths and aligns curve tangents along stroke drag direction',
    },
  ];

  return (
    <div
      className={`fixed top-16 right-4 sm:right-6 z-30 w-72 select-none shadow-2xl rounded-2xl border backdrop-blur-2xl p-3.5 space-y-3 font-sans animate-in fade-in slide-in-from-right-2 duration-150 ${
        isDark
          ? 'bg-[#18191d]/95 border-[#2c2e36] text-neutral-200'
          : 'bg-white/95 border-neutral-200 text-neutral-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider">3D Volumetric Liquify</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-1.5">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setSettings((prev) => ({ ...prev, mode: m.id }))}
            className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all ${
              settings.mode === m.id
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                : isDark
                ? 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                : 'bg-neutral-100 border-neutral-200 text-neutral-700'
            }`}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Mode description */}
      <div className="text-[11px] text-neutral-400 px-1 italic">
        {modes.find((m) => m.id === settings.mode)?.desc}
      </div>

      {/* Parameter Sliders with Numpad bindings */}
      <div className="space-y-2.5 pt-1">
        {/* Brush Radius (Size) */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-neutral-400 font-medium">Brush Radius</span>
            <button
              onClick={() =>
                onOpenNumpad({
                  id: 'liquify_radius',
                  title: 'Liquify Brush Radius',
                  value: settings.brushRadius,
                  min: 0.02,
                  max: 1.5,
                  step: 0.02,
                  unit: 'm',
                  onConfirm: (val) => setSettings((prev) => ({ ...prev, brushRadius: val })),
                })
              }
              className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-indigo-300 font-bold"
            >
              {(settings.brushRadius * 100).toFixed(0)} cm
            </button>
          </div>
          <input
            type="range"
            min="0.02"
            max="1.2"
            step="0.02"
            value={settings.brushRadius}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, brushRadius: parseFloat(e.target.value) }))
            }
            className="w-full accent-indigo-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
          />
        </div>

        {/* Strength */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-neutral-400 font-medium">Influence Strength</span>
            <button
              onClick={() =>
                onOpenNumpad({
                  id: 'liquify_strength',
                  title: 'Influence Strength',
                  value: settings.influenceStrength,
                  min: 0.05,
                  max: 2.0,
                  step: 0.05,
                  unit: 'x',
                  onConfirm: (val) => setSettings((prev) => ({ ...prev, influenceStrength: val })),
                })
              }
              className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-indigo-300 font-bold"
            >
              {(settings.influenceStrength * 100).toFixed(0)}%
            </button>
          </div>
          <input
            type="range"
            min="0.05"
            max="2.0"
            step="0.05"
            value={settings.influenceStrength}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, influenceStrength: parseFloat(e.target.value) }))
            }
            className="w-full accent-indigo-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Non-Destructive Compare & Apply Controls */}
      <div className="pt-2 border-t border-neutral-800 space-y-2">
        {/* Hold to Compare A/B Toggle */}
        <button
          onPointerDown={() => onToggleCompare(true)}
          onPointerUp={() => onToggleCompare(false)}
          onPointerLeave={() => onToggleCompare(false)}
          className={`w-full py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            isCompareActive
              ? 'bg-amber-500 border-amber-400 text-black shadow-lg font-bold'
              : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
          }`}
          title="Hold to view Original Base State vs Live Deformed Mesh"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{isCompareActive ? 'Showing Original (A)' : 'Hold to Compare A/B'}</span>
        </button>

        {/* Commit / Discard Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCancel}
            className="py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard</span>
          </button>
          <button
            onClick={onApply}
            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
