import React, { useState } from 'react';
import { BentGuideConfig, NumpadTarget } from '../types';
import {
  Spline,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sliders,
  Check,
  X,
  Layers,
  Sparkles,
  RotateCw,
  Activity,
  Maximize2,
} from 'lucide-react';
import { StudioEngine } from '../core/studioEngine';

interface BentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: StudioEngine | null;
  onOpenNumpad: (target: NumpadTarget) => void;
  theme?: 'light' | 'dark';
}

export const BentGuideModal: React.FC<BentGuideModalProps> = ({
  isOpen,
  onClose,
  engine,
  onOpenNumpad,
  theme = 'dark',
}) => {
  if (!isOpen) return null;

  const [guideName, setGuideName] = useState<string>('Curved Ribbon Manifold');
  const [guideWidth, setGuideWidth] = useState<number>(0.35);
  const [guideOpacity, setGuideOpacity] = useState<number>(0.55);
  const [guidePreset, setGuidePreset] = useState<'wave' | 'arch' | 'spiral' | 'saddle'>('wave');
  const [profileCurve, setProfileCurve] = useState<'ribbon' | 'arc' | 'uchannel' | 'pipe'>('ribbon');
  const [tension, setTension] = useState<number>(0.5);
  const [divisions, setDivisions] = useState<number>(64);
  const [twist, setTwist] = useState<number>(0);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

  const [activeGuides, setActiveGuides] = useState<BentGuideConfig[]>(
    engine?.getBentGuides() || []
  );

  const handleCreatePresetGuide = () => {
    if (!engine) return;
    const guide = engine.createPresetBentGuide(guidePreset, guideWidth, guideOpacity);
    if (guide) {
      engine.updateBentGuideParameters(guide.id, {
        profileCurve,
        tension,
        divisions,
        twist,
      });
      setSelectedGuideId(guide.id);
    }
    setActiveGuides(engine.getBentGuides());
  };

  const handleRemoveGuide = (id: string) => {
    if (!engine) return;
    engine.removeBentGuide(id);
    if (selectedGuideId === id) setSelectedGuideId(null);
    setActiveGuides(engine.getBentGuides());
  };

  const handleToggleVisibility = (guide: BentGuideConfig) => {
    if (!engine) return;
    engine.toggleBentGuideVisibility(guide.id, !guide.visible);
    setActiveGuides(engine.getBentGuides());
  };

  const handleCreateFromActiveStroke = () => {
    if (!engine) return;
    const created = engine.createBentGuideFromSelectedStroke(guideWidth, guideOpacity);
    if (created) {
      engine.updateBentGuideParameters(created.id, {
        profileCurve,
        tension,
        divisions,
        twist,
      });
      setSelectedGuideId(created.id);
      setActiveGuides(engine.getBentGuides());
    }
  };

  const handleUpdateSelected = (updates: Partial<BentGuideConfig>) => {
    if (!engine || !selectedGuideId) return;
    engine.updateBentGuideParameters(selectedGuideId, updates);
    setActiveGuides(engine.getBentGuides());
  };

  return (
    <div
      id="mody-bent-guide-modal"
      className="fixed top-16 left-4 sm:left-24 z-30 w-84 sm:w-96 select-none shadow-2xl rounded-2xl border backdrop-blur-2xl p-4 space-y-3 font-sans animate-in fade-in slide-in-from-left-2 duration-150 bg-[#18191d]/98 border-[#2c2e36] text-neutral-200 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Spline className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
            Lofting & Bent Manifold Guides
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[11px] text-neutral-400 leading-relaxed">
        Generates swept developable 3D manifolds with Catmull-Rom resampling, profile curves, and dynamic tension. Conformal strokes snap directly onto these surfaces.
      </p>

      {/* Preset Geometry Selector */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
          Curvature Preset
        </span>
        <div className="grid grid-cols-4 gap-1">
          {(['wave', 'arch', 'spiral', 'saddle'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setGuidePreset(p)}
              className={`py-1 px-1.5 rounded-xl text-xs font-semibold uppercase border transition-all ${
                guidePreset === p
                  ? 'bg-cyan-600 border-cyan-500 text-white shadow-md'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Cross-Section Profile Selection */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
          Cross-Section Profile
        </span>
        <div className="grid grid-cols-4 gap-1">
          {(
            [
              { id: 'ribbon', label: 'Ribbon' },
              { id: 'arc', label: 'Arch' },
              { id: 'uchannel', label: 'U-Channel' },
              { id: 'pipe', label: 'Pipe' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setProfileCurve(item.id);
                handleUpdateSelected({ profileCurve: item.id });
              }}
              className={`py-1 px-1 rounded-xl text-[11px] font-semibold border transition-all ${
                profileCurve === item.id
                  ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="space-y-2.5 pt-1">
        {/* Catmull-Rom Tension Slider */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>Curve Tension (Catmull-Rom)</span>
            </span>
            <span className="font-mono text-xs text-cyan-300 font-bold">
              {tension.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={tension}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setTension(val);
              handleUpdateSelected({ tension: val });
            }}
            className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
            <span>0.0 (Loose / Spline)</span>
            <span>0.5 (Centripetal)</span>
            <span>1.0 (Taut / Linear)</span>
          </div>
        </div>

        {/* Resampling Divisions Slider */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium flex items-center gap-1">
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>Segment Divisions (Density)</span>
            </span>
            <span className="font-mono text-xs text-amber-300 font-bold">
              {divisions} segs
            </span>
          </div>
          <input
            type="range"
            min="16"
            max="256"
            step="8"
            value={divisions}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setDivisions(val);
              handleUpdateSelected({ divisions: val });
            }}
            className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Swept Twist Rotation Slider */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-purple-400" />
              <span>Swept Axial Twist</span>
            </span>
            <span className="font-mono text-xs text-purple-300 font-bold">
              {twist}°
            </span>
          </div>
          <input
            type="range"
            min="-360"
            max="360"
            step="15"
            value={twist}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setTwist(val);
              handleUpdateSelected({ twist: val });
            }}
            className="w-full accent-purple-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Width Slider */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-300 font-medium">Manifold Width</span>
            <button
              onClick={() =>
                onOpenNumpad({
                  id: 'guide_width',
                  title: 'Manifold Guide Width',
                  value: guideWidth,
                  min: 0.05,
                  max: 2.0,
                  step: 0.05,
                  unit: 'm',
                  onConfirm: (val) => {
                    setGuideWidth(val);
                    handleUpdateSelected({ width: val });
                  },
                })
              }
              className="font-mono text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-cyan-300 font-bold"
            >
              {(guideWidth * 100).toFixed(0)} cm
            </button>
          </div>
          <input
            type="range"
            min="0.05"
            max="1.5"
            step="0.05"
            value={guideWidth}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setGuideWidth(val);
              handleUpdateSelected({ width: val });
            }}
            className="w-full accent-cyan-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-1.5 pt-1">
        <button
          onClick={handleCreatePresetGuide}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Loft Manifold Guide</span>
        </button>

        <button
          onClick={handleCreateFromActiveStroke}
          className="w-full py-1.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Convert Last Drawn Curve to Guide</span>
        </button>
      </div>

      {/* Active Bent Guides List */}
      {activeGuides.length > 0 && (
        <div className="pt-2 border-t border-neutral-800 space-y-1.5">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Active Loft Guides ({activeGuides.length})
          </span>
          <div className="space-y-1">
            {activeGuides.map((g) => {
              const isSelected = selectedGuideId === g.id;
              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGuideId(g.id)}
                  className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/60 ring-1 ring-cyan-500/30'
                      : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Spline className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-semibold truncate text-neutral-200">{g.name}</span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      ({g.profileCurve || 'ribbon'})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVisibility(g);
                      }}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                      title="Toggle Visibility"
                    >
                      {g.visible ? (
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-neutral-500" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveGuide(g.id);
                      }}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-rose-400"
                      title="Delete Guide"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
