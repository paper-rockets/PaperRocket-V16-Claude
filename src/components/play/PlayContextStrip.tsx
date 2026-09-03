import React from 'react';
import { Sparkles } from 'lucide-react';
import { BrushSettings } from '../../types';
import { MOODS, DEFAULT_MOOD_ID, findMood } from '../../presets/playMoods';
import { toggleSheet, closeSheet } from './sheetStore';
import { PlaySheet } from './PlaySheet';
import { haptics } from '../../utils/haptics';
import { StudioEngine } from '../../core/studioEngine';
import { strokeDiameterPx } from './brushScale';

/**
 * Zone D — the bottom strip: colour, size, effect.
 *
 * Three controls, each raising one sheet. This is the whole of Play's styling
 * surface; the OKLCh studio, the PBR sliders and the 15 paint presets stay in Pro.
 */

interface PlayContextStripProps {
  engine?: StudioEngine | null;
  brushSettings: BrushSettings;
  setBrushSettings: React.Dispatch<React.SetStateAction<BrushSettings>>;
  fxSheet?: React.ReactNode;
  brushSheet?: React.ReactNode;
  theme?: 'light' | 'dark';
}

/** Brush sizes as four named steps rather than a continuous slider. */
const SIZES: { label: string; value: number }[] = [
  { label: 'Thin', value: 0.015 },
  { label: 'Medium', value: 0.035 },
  { label: 'Thick', value: 0.07 },
  { label: 'Chunky', value: 0.13 },
];

export const PlayContextStrip: React.FC<PlayContextStripProps> = ({
  engine = null,
  brushSettings,
  setBrushSettings,
  fxSheet,
  brushSheet,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const colour = brushSettings.color || '#22D3EE';
  const [moodId, setMoodId] = React.useState<string>(DEFAULT_MOOD_ID);
  const mood = findMood(moodId);
  const activeSize = SIZES.reduce((best, s) =>
    Math.abs(s.value - brushSettings.size) < Math.abs(best.value - brushSettings.size) ? s : best
  );

  const chip = isLight
    ? 'bg-white border-neutral-200 text-neutral-800'
    : 'bg-[#14161c] border-neutral-800 text-neutral-100';

  const pickColour = (hex: string, name: string) => {
    haptics.trigger('light');
    setBrushSettings((prev) => ({ ...prev, color: hex }));
    void name;
  };

  /** True on-screen width of a given brush size, for the previews. */
  const previewPx = (worldSize: number, cap: number) => {
    const px = strokeDiameterPx(
      engine,
      worldSize,
      brushSettings.brushWidthMultiplier,
      typeof window !== 'undefined' ? window.innerHeight : 800
    );
    return Math.max(4, Math.min(cap, px));
  };

  const pickSize = (value: number) => {
    haptics.trigger('light');
    setBrushSettings((prev) => ({ ...prev, size: value }));
  };

  return (
    <>
      <div
        className="fixed left-1/2 -translate-x-1/2 z-30 flex items-center gap-2"
        style={{ bottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        {/* Colour */}
        <button
          type="button"
          onClick={() => toggleSheet('colour')}
          className={`h-14 pl-2 pr-4 rounded-2xl border flex items-center gap-2
            transition-all active:scale-95 ${chip}`}
          title="Colour"
        >
          <span
            className="w-10 h-10 rounded-xl border-2 border-white/30 shadow-inner"
            style={{ backgroundColor: colour }}
          />
          <span className="text-xs font-bold">Colour</span>
        </button>

        {/* Size */}
        <button
          type="button"
          onClick={() => toggleSheet('size')}
          className={`h-14 px-4 rounded-2xl border flex flex-col items-center justify-center
            transition-all active:scale-95 ${chip}`}
          title="Brush size"
        >
          <span
            className="rounded-full bg-current"
            style={{
              width: previewPx(activeSize.value, 26),
              height: previewPx(activeSize.value, 26),
            }}
          />
          <span className="text-[9px] font-bold mt-0.5">{activeSize.label}</span>
        </button>

        {/* Magic FX */}
        <button
          type="button"
          onClick={() => toggleSheet('fx')}
          className={`h-14 px-4 rounded-2xl border flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 ${chip}`}
          title="Magic effects"
        >
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-[9px] font-bold">Magic</span>
        </button>
      </div>

      {/* --- Sheets --- */}

      <PlaySheet id="colour" title="Colour" theme={theme} tall>
        {/* Pick a feeling first, then a colour from it. Every colour inside a
            mood is generated in even perceptual steps, so they already agree
            with each other — no wheel, no harmony rules, nothing to operate. */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {MOODS.map((m) => {
            const active = m.id === moodId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  haptics.trigger('light');
                  setMoodId(m.id);
                }}
                className={`shrink-0 rounded-2xl border px-3 py-2 transition-all active:scale-95 ${
                  active
                    ? 'border-sky-400 ring-2 ring-sky-400'
                    : isLight
                      ? 'border-neutral-200'
                      : 'border-neutral-800'
                }`}
              >
                <span className="flex gap-0.5 mb-1.5">
                  {m.colors.filter((_, i) => i % 2 === 0).map((c) => (
                    <span key={c} className="w-3 h-6 rounded-sm" style={{ backgroundColor: c }} />
                  ))}
                </span>
                <span className="text-[11px] font-bold">{m.name}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-4 gap-2.5 mt-1">
          {mood.colors.map((hex) => {
            const selected = hex.toLowerCase() === colour.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() => pickColour(hex, mood.name)}
                aria-label={`${mood.name} colour`}
                className={`aspect-square rounded-2xl transition-all active:scale-90 border-2
                  ${selected ? 'ring-4 ring-sky-400 border-white scale-105' : 'border-white/15'}`}
                style={{ backgroundColor: hex, minHeight: 52 }}
              />
            );
          })}
        </div>
      </PlaySheet>

      <PlaySheet id="size" title="Brush size" theme={theme}>
        <div className="grid grid-cols-4 gap-3">
          {SIZES.map((s) => {
            const selected = s.value === activeSize.value;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => pickSize(s.value)}
                className={`h-24 rounded-2xl border flex flex-col items-center justify-center gap-2
                  transition-all active:scale-95
                  ${
                    selected
                      ? 'bg-sky-400 border-sky-300 text-zinc-950'
                      : isLight
                        ? 'bg-neutral-100 border-neutral-200'
                        : 'bg-white/5 border-neutral-800'
                  }`}
              >
                <span
                  className="rounded-full bg-current"
                  style={{ width: previewPx(s.value, 56), height: previewPx(s.value, 56) }}
                />
                <span className="text-xs font-bold">{s.label}</span>
              </button>
            );
          })}
        </div>
      </PlaySheet>

      {/* Filled by the brush and effect phases. */}
      {brushSheet}
      {fxSheet}
    </>
  );
};

export { closeSheet };
