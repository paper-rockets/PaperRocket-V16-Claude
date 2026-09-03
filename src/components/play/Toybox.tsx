import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Loader2, Sparkles, Flame, Home, Bot, Cat, Shapes as ShapesIcon } from 'lucide-react';
import { StudioEngine } from '../../core/studioEngine';
import { BrushSettings } from '../../types';
import { SampleModelFactory, PresetModelDefinition } from '../../core/sampleModels';
import { resolveAssetUrl } from '../../utils/assetUrl';
import { haptics } from '../../utils/haptics';

/**
 * The Toybox — a full-screen coloring-book picker over the 3D model catalog.
 *
 * This replaces the old "Model Library" menu entry point for Play mode. One tap on
 * a tile clears the page, loads the model, and arms the brush to stick to it — the
 * whole "pick something to colour" journey in a single gesture.
 *
 * Not a dialog laid over the canvas: while open, it is the whole screen.
 */

interface ToyboxProps {
  isOpen: boolean;
  engine: StudioEngine | null;
  onClose: () => void;
  onSpawned: (modelName: string) => void;
  setBrushSettings: React.Dispatch<React.SetStateAction<BrushSettings>>;
  theme?: 'light' | 'dark';
}

type CategoryId = PresetModelDefinition['category'];

// Tab order. There are exactly six categories in sampleModels.ts today; if a new one
// is ever added there, add it here too so it gets its own tab.
const CATEGORY_ORDER: CategoryId[] = [
  'Anime & Manga',
  'Characters & Figures',
  'Houses & Architecture',
  'Vehicles & Tech',
  'Animals & Creatures',
  'Shapes & Benchmarks',
];

// Display-only relabeling. The union type in sampleModels.ts is untouched — this map
// only changes what shows on screen.
const CATEGORY_LABEL: Record<CategoryId, string> = {
  'Anime & Manga': 'Anime & Manga',
  'Characters & Figures': 'Characters & Figures',
  'Houses & Architecture': 'Houses & Architecture',
  'Vehicles & Tech': 'Vehicles & Tech',
  'Animals & Creatures': 'Animals & Creatures',
  'Shapes & Benchmarks': 'Simple Shapes',
};

// One icon per category, reused as both the tab icon and the thumbnail fallback
// when a build-time image is missing. Never a live 3D preview — see
// scripts/generate-toybox-thumbs.mjs for why.
const CATEGORY_ICON: Record<CategoryId, React.FC<{ className?: string }>> = {
  'Anime & Manga': Sparkles,
  'Characters & Figures': Flame,
  'Houses & Architecture': Home,
  'Vehicles & Tech': Bot,
  'Animals & Creatures': Cat,
  'Shapes & Benchmarks': ShapesIcon,
};

function thumbnailUrl(presetId: string): string {
  return resolveAssetUrl(`/imported_templates/${presetId}.webp`);
}

export const Toybox: React.FC<ToyboxProps> = ({
  isOpen,
  engine,
  onClose,
  onSpawned,
  setBrushSettings,
  theme = 'light',
}) => {
  const isLight = theme === 'light';
  const presets = useMemo(() => SampleModelFactory.getPresets(), []);

  const [selectedCategory, setSelectedCategory] = useState<CategoryId>(CATEGORY_ORDER[0]);
  const [pendingPreset, setPendingPreset] = useState<PresetModelDefinition | null>(null);
  const [loadingPreset, setLoadingPreset] = useState<PresetModelDefinition | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [brokenThumbs, setBrokenThumbs] = useState<Set<string>>(() => new Set());

  // Fresh state every time the Toybox is opened — a confirm dialog or error left
  // over from last time should never reappear on the next open.
  useEffect(() => {
    if (isOpen) {
      setPendingPreset(null);
      setErrorText(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loadingPreset) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, loadingPreset, onClose]);

  const visiblePresets = useMemo(
    () => presets.filter((p) => p.category === selectedCategory),
    [presets, selectedCategory]
  );

  /** True if there is anything on the page worth warning the child about losing. */
  const canvasHasStrokes = useCallback((): boolean => {
    if (!engine) return false;
    try {
      const layers = engine.getLayersSnapshot();
      return layers.some((l) => l.strokeIds && l.strokeIds.length > 0);
    } catch (e) {
      console.warn('Toybox: could not read the current page state', e);
      return false;
    }
  }, [engine]);

  /**
   * The one operation a tile tap performs: clear, load, arm the brush, hand off.
   *
   * loadPresetModel() already clears the outgoing model and auto-frames the camera
   * for the new one (studioEngine.ts:665/712) — that is not reimplemented here.
   * It also already registers every mesh of the freshly loaded model as a paintable
   * surface (setModelObject, studioEngine.ts:739-746), so as soon as this resolves,
   * 'surface' drawing mode below lands on the model with no separate collider step.
   */
  const spawnPreset = useCallback(
    async (preset: PresetModelDefinition) => {
      if (!engine) return;
      setPendingPreset(null);
      setErrorText(null);
      setLoadingPreset(preset);
      try {
        // Redundant with the internal clear inside loadPresetModel, but kept as its
        // own explicit step so a page is never left half-cleared if loading throws
        // before that internal clear runs.
        engine.clearAllStrokes();
        await engine.loadPresetModel(preset.id);
        setBrushSettings((prev) => ({ ...prev, drawingMode: 'surface', profile: 'conformal' }));
        onSpawned(preset.name);
        onClose();
      } catch (err) {
        console.warn('Toybox: could not load preset', preset.id, err);
        setErrorText(`Could not load ${preset.name}. Try another one.`);
      } finally {
        setLoadingPreset(null);
      }
    },
    [engine, setBrushSettings, onSpawned, onClose]
  );

  const handleTileTap = useCallback(
    (preset: PresetModelDefinition) => {
      if (!engine || loadingPreset) return;
      haptics.trigger('light');
      if (canvasHasStrokes()) {
        setPendingPreset(preset);
      } else {
        void spawnPreset(preset);
      }
    },
    [engine, loadingPreset, canvasHasStrokes, spawnPreset]
  );

  const markThumbBroken = useCallback((id: string) => {
    setBrokenThumbs((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  if (!isOpen) return null;

  const panelBg = isLight ? 'bg-neutral-50 text-neutral-900' : 'bg-[#0b0d12] text-neutral-100';
  const chip = isLight
    ? 'bg-white border-neutral-200 text-neutral-800'
    : 'bg-[#14161c] border-neutral-800 text-neutral-100';
  const tileBg = isLight
    ? 'bg-white border-neutral-200 active:bg-neutral-100'
    : 'bg-[#14161c] border-neutral-800 active:bg-[#1c1f28]';
  const tabInactive = isLight
    ? 'bg-white border-neutral-200 text-neutral-600'
    : 'bg-[#14161c] border-neutral-800 text-neutral-300';

  return (
    <div
      role="dialog"
      aria-label="Pick something to colour"
      className={`fixed inset-0 z-[70] flex flex-col ${panelBg}`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-4 pb-2 flex-none"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
      >
        <h1 className="text-lg font-bold tracking-tight">Pick something to colour</h1>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className={`h-11 w-11 rounded-2xl flex items-center justify-center border transition-all active:scale-95 ${chip}`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex-none px-4 pb-3 overflow-x-auto">
        <div className="flex items-center gap-2 w-max">
          {CATEGORY_ORDER.map((cat) => {
            const Icon = CATEGORY_ICON[cat];
            const active = cat === selectedCategory;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  haptics.trigger('light');
                  setSelectedCategory(cat);
                }}
                aria-pressed={active}
                className={`h-11 px-4 rounded-2xl border flex items-center gap-2 whitespace-nowrap
                  transition-all active:scale-95
                  ${active ? 'bg-sky-400 border-sky-300 text-zinc-950' : tabInactive}`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-bold">{CATEGORY_LABEL[cat]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {visiblePresets.length === 0 ? (
          <p className="text-sm opacity-60 pt-8 text-center">Nothing here yet.</p>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
          >
            {visiblePresets.map((preset) => {
              const CategoryIcon = CATEGORY_ICON[preset.category];
              const thumbBroken = brokenThumbs.has(preset.id);
              const disabled = !engine || !!loadingPreset;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleTileTap(preset)}
                  disabled={disabled}
                  aria-label={preset.name}
                  title={preset.name}
                  className={`flex flex-col rounded-2xl border p-2 text-left transition-all
                    active:scale-[0.97] ${tileBg} ${disabled ? 'opacity-50' : ''}`}
                  style={{ minHeight: 160 }}
                >
                  <div
                    className={`relative w-full aspect-square rounded-xl overflow-hidden flex items-center justify-center
                      ${isLight ? 'bg-neutral-100' : 'bg-black/30'}`}
                  >
                    {thumbBroken ? (
                      <CategoryIcon className={`w-10 h-10 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`} />
                    ) : (
                      <img
                        src={thumbnailUrl(preset.id)}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        className="w-full h-full object-cover"
                        onError={() => markThumbBroken(preset.id)}
                      />
                    )}
                  </div>
                  <span className="mt-2 text-xs font-bold leading-snug line-clamp-2">{preset.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Error banner */}
      {errorText && (
        <div className="flex-none px-4 pb-3">
          <button
            type="button"
            onClick={() => setErrorText(null)}
            className={`w-full min-h-[44px] px-4 py-2 rounded-2xl border text-sm font-semibold text-left
              ${isLight ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-rose-950/60 border-rose-900 text-rose-200'}`}
          >
            {errorText} <span className="opacity-60 font-normal">(tap to dismiss)</span>
          </button>
        </div>
      )}

      {/* Confirm-clear dialog */}
      {pendingPreset && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-label="Start a new page?"
            className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl ${chip}`}
          >
            <p className="text-base font-bold leading-snug">
              Start a new page? Your drawing will be cleared.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingPreset(null)}
                className={`flex-1 min-h-[48px] rounded-2xl border font-bold text-sm transition-all active:scale-95 ${tabInactive}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const preset = pendingPreset;
                  if (preset) void spawnPreset(preset);
                }}
                className="flex-1 min-h-[48px] rounded-2xl bg-sky-400 border border-sky-300 text-zinc-950 font-bold text-sm transition-all active:scale-95"
              >
                Start fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loadingPreset && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-sm font-semibold">Loading {loadingPreset.name}…</p>
        </div>
      )}
    </div>
  );
};
