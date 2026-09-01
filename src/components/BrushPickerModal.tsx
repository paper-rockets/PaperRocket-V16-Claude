import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Paintbrush,
  Pipette,
  Sparkles,
  Zap,
  Sliders,
  Check,
  Trash2,
  Plus,
  X,
  Layers,
  Flame,
  Palette,
  Spline,
  Shapes,
  Eye,
  Info,
  Activity,
  Bookmark,
} from 'lucide-react';
import {
  BrushSettings,
  BrushPreset,
  ToolType,
  StrokeProfile,
  MaterialType,
} from '../types';
import {
  DEFAULT_BRUSH_PRESETS,
  getCustomBrushPresets,
  saveCustomBrushPreset,
  deleteCustomBrushPreset,
  applyBrushPresetToSettings,
  createPresetFromCurrentSettings,
} from '../presets/brushPresets';

interface BrushPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  brushSettings: BrushSettings;
  setBrushSettings: React.Dispatch<React.SetStateAction<BrushSettings>>;
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  onOpenBrushSettings?: () => void;
  onOpenColorStudio?: () => void;
  theme?: 'light' | 'dark';
}

type CategoryFilter = 'all' | 'ink' | 'tubes' | 'pbr' | 'glow_fx' | 'decals' | 'custom';

export const BrushPickerModal: React.FC<BrushPickerModalProps> = ({
  isOpen,
  onClose,
  brushSettings,
  setBrushSettings,
  tool,
  setTool,
  onOpenBrushSettings,
  onOpenColorStudio,
  theme = 'dark',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customPresets, setCustomPresets] = useState<BrushPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [showSaveCustom, setShowSaveCustom] = useState<boolean>(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomPresets(getCustomBrushPresets());
    }
  }, [isOpen]);

  const allPresets = useMemo(() => {
    return [...customPresets, ...DEFAULT_BRUSH_PRESETS];
  }, [customPresets]);

  const filteredPresets = useMemo(() => {
    return allPresets.filter((preset) => {
      const matchesCategory =
        selectedCategory === 'all' || preset.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        preset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.profile.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allPresets, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: BrushPreset) => {
    setActivePresetId(preset.id);
    setBrushSettings((prev) => applyBrushPresetToSettings(preset, prev));
    setFeedbackToast(`Applied "${preset.name}"`);
    setTimeout(() => setFeedbackToast(null), 2000);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const newPreset = createPresetFromCurrentSettings(newPresetName.trim(), brushSettings);
    const updated = saveCustomBrushPreset(newPreset);
    setCustomPresets(updated);
    setActivePresetId(newPreset.id);
    setNewPresetName('');
    setShowSaveCustom(false);
    setFeedbackToast(`Saved custom preset "${newPreset.name}"`);
    setTimeout(() => setFeedbackToast(null), 2000);
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteCustomBrushPreset(id);
    setCustomPresets(updated);
    if (activePresetId === id) setActivePresetId(null);
  };

  const handleActivateBrushSampler = () => {
    setTool('brush_picker');
    setFeedbackToast('Brush DNA Sampler Active: Click any 3D stroke in scene');
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const categories: { id: CategoryFilter; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'all', label: 'All', icon: Paintbrush },
    { id: 'ink', label: 'Ink & Pen', icon: Spline },
    { id: 'tubes', label: '3D Tubes', icon: Layers },
    { id: 'pbr', label: 'PBR Metals', icon: Zap },
    { id: 'glow_fx', label: 'Glow & FX', icon: Flame },
    { id: 'decals', label: 'Decals', icon: Shapes },
    { id: 'custom', label: 'Custom', icon: Bookmark },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="mody-brush-picker-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-[#141519]/98 backdrop-blur-2xl border border-neutral-800 shadow-2xl select-none animate-in zoom-in-95 duration-150 overflow-hidden text-neutral-200 font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/80 bg-neutral-950/40">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Paintbrush className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">3D Brush Picker</h2>
            <p className="text-[11px] text-neutral-400">Profiles, Procedural Materials & Stroke DNA</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* DNA Sampler Quick Action Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-sky-950/40 via-neutral-900 to-indigo-950/40 border border-sky-500/30 shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${tool === 'brush_picker' ? 'bg-sky-500 text-black font-bold animate-pulse' : 'bg-sky-500/20 text-sky-300'}`}>
              <Pipette className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-white block">Stroke DNA Sampler</span>
              <span className="text-[11px] text-neutral-400 block">Click any stroke to clone its full brush style</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleActivateBrushSampler}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 ${
              tool === 'brush_picker'
                ? 'bg-sky-400 text-zinc-950 font-bold'
                : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
            }`}
          >
            <Pipette className="w-3 h-3" />
            {tool === 'brush_picker' ? 'Sampling Active' : 'Pick from Scene'}
          </button>
        </div>

        {/* Active Brush Live DNA Summary Card */}
        <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">Active Configuration</span>
            <span className="font-mono text-sky-400 text-[11px]">
              {(brushSettings.size * 100).toFixed(1)}mm • {(brushSettings.opacity * 100).toFixed(0)}%
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1 text-center">
            <div className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Profile</span>
              <span className="text-xs font-semibold text-white capitalize">{brushSettings.profile}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Finish</span>
              <span className="text-xs font-semibold text-white capitalize">
                {brushSettings.materialType === 'animated_fx' ? brushSettings.shaderEffect || 'Shader' : brushSettings.materialType}
              </span>
            </div>
            <div className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Smoothing</span>
              <span className="text-xs font-semibold text-white capitalize">{brushSettings.smoothingAlgorithm}</span>
            </div>
            <div className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <div
                className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: brushSettings.color }}
              />
            </div>
          </div>
        </div>

        {/* Category Filters Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-white text-zinc-950 font-bold shadow-sm'
                    : 'bg-neutral-900/60 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800/60'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search & Custom Preset Add Row */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search 3D brushes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
          />

          <button
            type="button"
            onClick={() => setShowSaveCustom(!showSaveCustom)}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs text-white flex items-center gap-1 font-medium transition-colors"
            title="Save Current Brush as Preset"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>

        {/* Save Custom Preset Form Popup */}
        {showSaveCustom && (
          <form onSubmit={handleSaveCustom} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 animate-in fade-in duration-100">
            <span className="text-xs font-semibold text-white block">Save Active Brush as Preset</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter preset name..."
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                autoFocus
                className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                disabled={!newPresetName.trim()}
                className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-xs transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowSaveCustom(false)}
                className="p-1.5 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Presets Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
          {filteredPresets.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`relative p-3 rounded-xl border text-left cursor-pointer transition-all group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sky-950/30 border-sky-500 shadow-md'
                    : 'bg-neutral-950/70 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                      {preset.name}
                    </span>
                    {preset.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustom(preset.id, e)}
                        className="p-1 text-neutral-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete custom preset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-neutral-400 line-clamp-2 mb-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                {/* Preset DNA Badges */}
                <div className="flex items-center justify-between pt-1 border-t border-neutral-900 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 capitalize">
                      {preset.profile}
                    </span>
                    {preset.materialType === 'animated_fx' ? (
                      <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/60 text-purple-300">
                        {preset.shaderEffect}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 capitalize">
                        {preset.materialType}
                      </span>
                    )}
                  </div>

                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-inner shrink-0"
                    style={{ backgroundColor: preset.color || '#38bdf8' }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {filteredPresets.length === 0 && (
          <div className="text-center py-8 text-xs text-neutral-500">
            No brush presets match your search query.
          </div>
        )}

        {/* Quick Sliders */}
        <div className="p-3 rounded-xl bg-neutral-950/40 border border-neutral-800/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300">Quick Brush Sliders</span>
            {onOpenBrushSettings && (
              <button
                type="button"
                onClick={onOpenBrushSettings}
                className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
              >
                <Sliders className="w-3 h-3" />
                Advanced Settings
              </button>
            )}
          </div>

          {/* Size Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-400">
              <span>Brush Size</span>
              <span className="font-mono text-zinc-300">{(brushSettings.size * 100).toFixed(1)}mm</span>
            </div>
            <input
              type="range"
              min="0.005"
              max="0.25"
              step="0.002"
              value={brushSettings.size}
              onChange={(e) =>
                setBrushSettings((prev) => ({ ...prev, size: parseFloat(e.target.value) }))
              }
              className="w-full accent-sky-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>

          {/* Opacity Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-400">
              <span>Stroke Opacity</span>
              <span className="font-mono text-zinc-300">{Math.round(brushSettings.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={brushSettings.opacity}
              onChange={(e) =>
                setBrushSettings((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))
              }
              className="w-full accent-sky-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
            />
          </div>
        </div>
      </div>

        {/* Footer Toast feedback */}
        {feedbackToast && (
          <div className="px-4 py-2 bg-sky-500/10 border-t border-sky-500/30 text-[11px] text-sky-300 text-center font-medium animate-in fade-in duration-100">
            {feedbackToast}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
