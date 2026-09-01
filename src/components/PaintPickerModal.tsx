import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Palette,
  Pipette,
  Zap,
  Flame,
  Layers,
  Sparkles,
  Sliders,
  Check,
  Copy,
  X,
  Shuffle,
  Eye,
  Sun,
  Shield,
  RefreshCw,
  Scissors,
} from 'lucide-react';
import {
  BrushSettings,
  ToolType,
  MaterialType,
} from '../types';
import {
  CURATED_PAINT_PALETTES,
  PAINT_FINISH_PRESETS,
  getRecentPaintColors,
  addRecentPaintColor,
  applyPaintPresetToSettings,
} from '../presets/paintPresets';
import { normalizeHexColor } from '../core/materialCache';
import {
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  hexToOKLCH,
  oklchToHex,
  generateHarmonies,
} from '../core/colorMath';

interface PaintPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  brushSettings: BrushSettings;
  setBrushSettings: React.Dispatch<React.SetStateAction<BrushSettings>>;
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  onOpenColorStudio?: () => void;
  theme?: 'light' | 'dark';
}

type TabType = 'wheel' | 'finishes' | 'palettes' | 'oklab';

export const PaintPickerModal: React.FC<PaintPickerModalProps> = ({
  isOpen,
  onClose,
  brushSettings,
  setBrushSettings,
  tool,
  setTool,
  onOpenColorStudio,
  theme = 'dark',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('wheel');
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('cyberpunk');
  const [copiedHex, setCopiedHex] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const nativeColorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRecentColors(getRecentPaintColors());
    }
  }, [isOpen]);

  // Color Space States
  const currentHex = brushSettings.color || '#38bdf8';
  const rgb = useMemo(() => hexToRgb(currentHex), [currentHex]);
  const hsv = useMemo(() => rgbToHsv(rgb.r, rgb.g, rgb.b), [rgb]);
  const oklch = useMemo(() => hexToOKLCH(currentHex), [currentHex]);
  const harmonies = useMemo(() => generateHarmonies(currentHex), [currentHex]);

  if (!isOpen) return null;

  const handleSelectColor = (hex: string) => {
    const valid = normalizeHexColor(hex, '#38bdf8');
    setBrushSettings((prev) => ({ ...prev, color: valid }));
    const updated = addRecentPaintColor(valid);
    setRecentColors(updated);
  };

  const handleCopyHex = () => {
    navigator.clipboard.writeText(currentHex);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 1500);
  };

  const handleActivatePaintSampler = () => {
    setTool('paint_picker');
    setFeedbackToast('Paint Eyedropper Active: Click any surface to sample paint & finish');
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const handleHsvChange = (h: number, s: number, v: number) => {
    const { r, g, b } = hsvToRgb(h, s, v);
    const hex = rgbToHex(r, g, b);
    handleSelectColor(hex);
  };

  const handleOklchChange = (L: number, C: number, hRad: number) => {
    const hex = oklchToHex({ L, C, h: hRad });
    handleSelectColor(hex);
  };

  const activePalette = CURATED_PAINT_PALETTES.find((p) => p.id === selectedPaletteId) || CURATED_PAINT_PALETTES[0];

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="mody-paint-picker-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-[#141519]/98 backdrop-blur-2xl border border-neutral-800 shadow-2xl select-none animate-in zoom-in-95 duration-150 overflow-hidden text-neutral-200 font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/80 bg-neutral-950/40">
          <div className="flex items-center gap-2.5">
            <div
              className="w-5 h-5 rounded-md border border-white/30 shadow-inner"
              style={{ backgroundColor: currentHex }}
            />
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">3D Paint & Material Picker</h2>
              <p className="text-[11px] text-neutral-400">PBR Finishes, OKLab Pigments & Surface Sampler</p>
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

        {/* Quick Material Pipeline Switcher */}
        <div className="px-4 pt-3 pb-1 border-b border-neutral-800/60 bg-neutral-950/30">
          <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Palette className="w-3 h-3 text-neutral-300" />
            <span>Material Shader Mode</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: 'shadeless' as MaterialType, label: 'Flat Paint', icon: Palette },
              { id: 'shaded' as MaterialType, label: 'PBR Lit', icon: Zap },
              { id: 'glow' as MaterialType, label: 'Glow', icon: Flame },
              { id: 'cutout' as MaterialType, label: 'Cutout', icon: Scissors },
            ].map((mat) => {
              const Icon = mat.icon;
              const isSelected = (brushSettings.materialType || 'shaded') === mat.id;
              return (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => setBrushSettings((prev) => ({ ...prev, materialType: mat.id }))}
                  className={`py-1.5 px-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-white text-zinc-950 font-bold border-white shadow-sm'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{mat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Paint Eyedropper Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-950/40 via-neutral-900 to-sky-950/40 border border-purple-500/30 shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${tool === 'paint_picker' || tool === 'eyedropper' ? 'bg-purple-500 text-black font-bold animate-pulse' : 'bg-purple-500/20 text-purple-300'}`}>
                <Pipette className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Paint & Finish Eyedropper</span>
                <span className="text-[11px] text-neutral-400 block">Sample exact color, roughness, and material</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleActivatePaintSampler}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 ${
                tool === 'paint_picker' || tool === 'eyedropper'
                  ? 'bg-purple-400 text-zinc-950 font-bold'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
              }`}
            >
              <Pipette className="w-3 h-3" />
              {tool === 'paint_picker' || tool === 'eyedropper' ? 'Sampling Active' : 'Sample from Scene'}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-950 border border-neutral-800/80">
            <button
            type="button"
            onClick={() => setActiveTab('wheel')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'wheel' ? 'bg-neutral-800 text-white shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Palette className="w-3 h-3" />
            Color Gamut
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('finishes')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'finishes' ? 'bg-neutral-800 text-white shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3" />
            PBR Finishes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('palettes')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'palettes' ? 'bg-neutral-800 text-white shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            Palettes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('oklab')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'oklab' ? 'bg-neutral-800 text-white shadow-sm font-semibold' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            OKLab / LCh
          </button>
        </div>

        {/* TAB 1: COLOR GAMUT & SPECTRUM */}
        {activeTab === 'wheel' && (
          <div className="space-y-4">
            {/* Color preview bar & Hex readout */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div
                className="w-10 h-10 rounded-xl border border-white/20 shadow-md shrink-0 cursor-pointer relative group"
                style={{ backgroundColor: currentHex }}
                onClick={() => nativeColorInputRef.current?.click()}
                title="Click for Native Color Picker"
              >
                <input
                  ref={nativeColorInputRef}
                  type="color"
                  value={currentHex}
                  onChange={(e) => handleSelectColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-sm font-semibold text-white tracking-wider uppercase">
                    {currentHex}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHex}
                    className="p-1 text-neutral-400 hover:text-white transition-colors"
                    title="Copy Hex"
                  >
                    {copiedHex ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                  <span>RGB({rgb.r}, {rgb.g}, {rgb.b})</span>
                  <span>•</span>
                  <span>OKLCh({Math.round(oklch.L * 100)}%, {(oklch.C * 100).toFixed(1)}, {Math.round((oklch.h * 180) / Math.PI)}°)</span>
                </div>
              </div>
            </div>

            {/* Hue Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Hue</span>
                <span className="font-mono text-zinc-300">{Math.round(hsv.h * 360)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.005"
                value={hsv.h}
                onChange={(e) => handleHsvChange(parseFloat(e.target.value), hsv.s, hsv.v)}
                className="w-full cursor-pointer h-3 rounded-lg appearance-none"
                style={{
                  background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                }}
              />
            </div>

            {/* Saturation Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Saturation (Chroma)</span>
                <span className="font-mono text-zinc-300">{Math.round(hsv.s * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={hsv.s}
                onChange={(e) => handleHsvChange(hsv.h, parseFloat(e.target.value), hsv.v)}
                className="w-full cursor-pointer h-2.5 rounded-lg appearance-none"
                style={{
                  background: `linear-gradient(to right, #888888, ${currentHex})`,
                }}
              />
            </div>

            {/* Value / Brightness Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Brightness (Value)</span>
                <span className="font-mono text-zinc-300">{Math.round(hsv.v * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="1"
                step="0.01"
                value={hsv.v}
                onChange={(e) => handleHsvChange(hsv.h, hsv.s, parseFloat(e.target.value))}
                className="w-full cursor-pointer h-2.5 rounded-lg appearance-none"
                style={{
                  background: `linear-gradient(to right, #000000, ${currentHex})`,
                }}
              />
            </div>

            {/* Harmonious Palette Suggestions */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <span className="text-[11px] font-semibold text-neutral-400 block">OKLab Color Harmonies</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {harmonies.analogous.map((hex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectColor(hex)}
                    className="w-7 h-7 rounded-lg border border-white/20 hover:scale-110 transition-transform shrink-0"
                    style={{ backgroundColor: hex }}
                    title={`Harmonious Analogous ${hex}`}
                  />
                ))}
                {harmonies.complementary.map((hex, idx) => (
                  <button
                    key={`comp-${idx}`}
                    type="button"
                    onClick={() => handleSelectColor(hex)}
                    className="w-7 h-7 rounded-lg border border-white/20 hover:scale-110 transition-transform shrink-0"
                    style={{ backgroundColor: hex }}
                    title={`Harmonious Complementary ${hex}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PBR FINISHES & SHADERS */}
        {activeTab === 'finishes' && (
          <div className="space-y-4">
            {/* Finish Cards Grid */}
            <div className="grid grid-cols-2 gap-2">
              {PAINT_FINISH_PRESETS.map((finish) => {
                const isActive =
                  brushSettings.materialType === finish.materialType &&
                  (finish.materialType !== 'animated_fx' || brushSettings.shaderEffect === finish.shaderEffect);
                return (
                  <button
                    key={finish.id}
                    type="button"
                    onClick={() => {
                      setBrushSettings((prev) => applyPaintPresetToSettings(finish, prev));
                      setFeedbackToast(`Applied finish: ${finish.name}`);
                      setTimeout(() => setFeedbackToast(null), 2000);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-purple-950/40 border-purple-500 shadow-sm'
                        : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-white">{finish.name}</span>
                      <span className="text-[10px] text-neutral-400">{finish.category}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                      <span>R: {(finish.roughness * 100).toFixed(0)}%</span>
                      <span>•</span>
                      <span>M: {(finish.metalness * 100).toFixed(0)}%</span>
                      {finish.emissiveIntensity > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-bold">Glow</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* PBR Surface Sliders */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <span className="text-xs font-semibold text-neutral-300 block">Fine-Tune PBR Material Finish</span>

              {/* Roughness */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Surface Roughness (Gloss vs Matte)</span>
                  <span className="font-mono text-zinc-300">{Math.round(brushSettings.roughness * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={brushSettings.roughness}
                  onChange={(e) =>
                    setBrushSettings((prev) => ({ ...prev, roughness: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-purple-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                />
              </div>

              {/* Metalness */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Metalness (Dielectric vs Metallic)</span>
                  <span className="font-mono text-zinc-300">{Math.round(brushSettings.metalness * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={brushSettings.metalness}
                  onChange={(e) =>
                    setBrushSettings((prev) => ({ ...prev, metalness: parseFloat(e.target.value) }))
                  }
                  className="w-full accent-purple-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                />
              </div>

              {/* Emissive Intensity */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Emissive Glow Strength</span>
                  <span className="font-mono text-zinc-300">{(brushSettings.emissiveIntensity || 0).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="0.1"
                  value={brushSettings.emissiveIntensity || 0}
                  onChange={(e) =>
                    setBrushSettings((prev) => ({
                      ...prev,
                      emissiveIntensity: parseFloat(e.target.value),
                      materialType: parseFloat(e.target.value) > 0 ? 'glow' : prev.materialType,
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CURATED PALETTES & SWATCHES */}
        {activeTab === 'palettes' && (
          <div className="space-y-4">
            {/* Palette Select Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {CURATED_PAINT_PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => setSelectedPaletteId(pal.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    selectedPaletteId === pal.id
                      ? 'bg-white text-zinc-950 font-bold shadow-sm'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {pal.name}
                </button>
              ))}
            </div>

            {/* Active Palette Swatches */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <span className="text-xs font-semibold text-neutral-300 block">{activePalette.name} Colors</span>
              <div className="grid grid-cols-4 gap-2">
                {activePalette.colors.map((hex, idx) => {
                  const isSelected = currentHex.toLowerCase() === hex.toLowerCase();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectColor(hex)}
                      className={`h-10 rounded-xl border relative transition-all hover:scale-105 flex items-center justify-center ${
                        isSelected ? 'border-white scale-105 shadow-md' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recent Color History */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-400 block">Recent Color History</span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {recentColors.map((hex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectColor(hex)}
                    className="w-8 h-8 rounded-xl border border-white/20 hover:scale-110 transition-transform shrink-0"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: OKLAB / OKLCH POLAR PERCEPTUAL */}
        {activeTab === 'oklab' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-200">Perceptual OKLCh Space</span>
                <span className="text-[10px] text-sky-400">Uniform Perceived Contrast</span>
              </div>

              {/* Lightness L */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Perceived Lightness (L)</span>
                  <span className="font-mono text-zinc-300">{Math.round(oklch.L * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.98"
                  step="0.01"
                  value={oklch.L}
                  onChange={(e) => handleOklchChange(parseFloat(e.target.value), oklch.C, oklch.h)}
                  className="w-full accent-sky-400 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
                />
              </div>

              {/* Chroma C */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Chroma Saturation (C)</span>
                  <span className="font-mono text-zinc-300">{(oklch.C * 100).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.35"
                  step="0.005"
                  value={oklch.C}
                  onChange={(e) => handleOklchChange(oklch.L, parseFloat(e.target.value), oklch.h)}
                  className="w-full accent-purple-400 cursor-pointer h-2 bg-neutral-800 rounded-lg appearance-none"
                />
              </div>

              {/* Hue Angle h */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Hue Angle (h)</span>
                  <span className="font-mono text-zinc-300">{Math.round((oklch.h * 180) / Math.PI)}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.PI * 2}
                  step="0.02"
                  value={oklch.h}
                  onChange={(e) => handleOklchChange(oklch.L, oklch.C, parseFloat(e.target.value))}
                  className="w-full cursor-pointer h-3 rounded-lg appearance-none"
                  style={{
                    background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
                  }}
                />
              </div>
            </div>

            {onOpenColorStudio && (
              <button
                type="button"
                onClick={onOpenColorStudio}
                className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-white font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Open Full Color Studio (Gradients & Harmonizers)
              </button>
            )}
          </div>
        )}
      </div>

        {/* Footer Toast feedback */}
        {feedbackToast && (
          <div className="px-4 py-2 bg-purple-500/10 border-t border-purple-500/30 text-[11px] text-purple-300 text-center font-medium animate-in fade-in duration-100">
            {feedbackToast}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
