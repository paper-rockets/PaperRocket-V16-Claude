import React, { useState } from 'react';
import { StudioEngine } from '../core/studioEngine';
import { NumpadTarget } from '../types';
import {
  Scissors,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';

interface CurveDecimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: StudioEngine | null;
  onOpenNumpad: (target: NumpadTarget) => void;
  theme?: 'light' | 'dark';
}

export const CurveDecimateModal: React.FC<CurveDecimateModalProps> = ({
  isOpen,
  onClose,
  engine,
  onOpenNumpad,
  theme = 'dark',
}) => {
  if (!isOpen) return null;

  const [tolerance, setTolerance] = useState<number>(0.006);
  const [scope, setScope] = useState<'layer' | 'all'>('layer');
  const [lastStats, setLastStats] = useState<{ before: number; after: number } | null>(null);

  const handleApplyDecimation = () => {
    if (!engine) return;
    const stats = engine.decimateCurves(tolerance, scope);
    if (stats) {
      setLastStats(stats);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none p-4">
      <div
        className={`w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-150 ${
          isDark
            ? 'bg-[#18191d]/98 border-[#2d2f38] text-neutral-200'
            : 'bg-white border-neutral-200 text-neutral-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold tracking-wide">Lighten & Optimize Curves</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-neutral-400 leading-relaxed">
            Applies Ramer-Douglas-Peucker (RDP) 3D decimation to simplify dense stroke vertices while
            re-computing smooth Bishop rotation-minimizing frames.
          </p>

          {/* Scope Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScope('layer')}
              className={`flex-1 py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                scope === 'layer'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
            >
              Active Layer Only
            </button>
            <button
              onClick={() => setScope('all')}
              className={`flex-1 py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                scope === 'all'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
            >
              All Project Curves
            </button>
          </div>

          {/* Tolerance Slider with Numpad */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-neutral-300 font-medium">RDP 3D Tolerance (ε)</span>
              <button
                onClick={() =>
                  onOpenNumpad({
                    id: 'rdp_tol',
                    title: 'RDP Tolerance Epsilon',
                    value: tolerance,
                    min: 0.001,
                    max: 0.05,
                    step: 0.001,
                    unit: 'm',
                    onConfirm: (val) => setTolerance(val),
                  })
                }
                className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-300 font-bold"
              >
                {(tolerance * 1000).toFixed(1)} mm
              </button>
            </div>
            <input
              type="range"
              min="0.001"
              max="0.03"
              step="0.001"
              value={tolerance}
              onChange={(e) => setTolerance(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 h-1.5 bg-neutral-700 rounded-lg cursor-pointer"
            />
          </div>

          {/* Stats Feedback Badge */}
          {lastStats && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold">Decimation Complete</span>
                <div className="text-[11px] text-emerald-400 font-mono">
                  {lastStats.before} pts → {lastStats.after} pts
                </div>
              </div>
              <div className="text-lg font-bold font-mono">
                -{Math.round(((lastStats.before - lastStats.after) / Math.max(1, lastStats.before)) * 100)}%
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold"
            >
              Close
            </button>
            <button
              onClick={handleApplyDecimation}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg"
            >
              <Scissors className="w-4 h-4" />
              <span>Lighten Curves</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
