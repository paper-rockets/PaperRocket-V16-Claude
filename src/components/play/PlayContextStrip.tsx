import React from 'react';
import { Sparkles } from 'lucide-react';
import { BrushSettings } from '../../types';
import { PLAY_PALETTE, findSwatch } from '../../presets/playPalette';
import { toggleSheet, closeSheet } from './sheetStore';
import { PlaySheet } from './PlaySheet';
import { haptics } from '../../utils/haptics';

/**
 * Zone D — the bottom strip: colour, size, effect.
 *
 * Three controls, each raising one sheet. This is the whole of Play's styling
 * surface; the OKLCh studio, the PBR sliders and the 15 paint presets stay in Pro.
 */

interface PlayContextStripProps {
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
  brushSettings,
  setBrushSettings,
  fxSheet,
  brushSheet,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const colour = brushSettings.color || '#22D3EE';
  const swatch = findSwatch(colour);
  const activeSize = SIZES.reduce((best, s) =>
    Math.abs(s.value - brushSettings.size) < Math.abs(best.value - brushSettings.size) ? s : best
  );

  const chip = isLight
    ? 'bg-white/90 border-neutral-200 text-neutral-800'
    : 'bg-[#14161c]/90 border-neutral-800 text-neutral-100';

  const pickColour = (hex: string, name: string) => {
    haptics.trigger('light');
    setBrushSettings((prev) => ({ ...prev, color: hex }));
    void name;
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
          className={`h-14 pl-2 pr-4 rounded-2xl border backdrop-blur-md flex items-center gap-2
            transition-all active:scale-95 ${chip}`}
          title="Colour"
        >
          <span
            className="w-10 h-10 rounded-xl border-2 border-white/30 shadow-inner"
            style={{ backgroundColor: colour }}
          />
          <span className="text-xs font-bold">{swatch?.name ?? 'Colour'}</span>
        </button>

        {/* Size */}
        <button
          type="button"
          onClick={() => toggleSheet('size')}
          className={`h-14 px-4 rounded-2xl border backdrop-blur-md flex flex-col items-center justify-center
            transition-all active:scale-95 ${chip}`}
          title="Brush size"
        >
          <span
            className="rounded-full bg-current"
            style={{
              width: Math.max(6, activeSize.value * 110),
              height: Math.max(6, activeSize.value * 110),
            }}
          />
          <span className="text-[9px] font-bold mt-0.5">{activeSize.label}</span>
        </button>

        {/* Magic FX */}
        <button
          type="button"
          onClick={() => toggleSheet('fx')}
          className={`h-14 px-4 rounded-2xl border backdrop-blur-md flex flex-col items-center justify-center gap-0.5
            transition-all active:scale-95 ${chip}`}
          title="Magic effects"
        >
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-[9px] font-bold">Magic</span>
        </button>
      </div>

      {/* --- Sheets --- */}

      <PlaySheet id="colour" title="Colour" theme={theme}>
        <div className="grid grid-cols-8 gap-2">
          {PLAY_PALETTE.map((s) => {
            const selected = s.hex.toLowerCase() === colour.toLowerCase();
            return (
              <button
                key={s.hex}
                type="button"
                onClick={() => pickColour(s.hex, s.name)}
                title={s.name}
                aria-label={s.name}
                className={`aspect-square rounded-full transition-all active:scale-90 border-2
                  ${selected ? 'ring-4 ring-sky-400 border-white scale-105' : 'border-white/20'}`}
                style={{ backgroundColor: s.hex, minHeight: 48 }}
              />
            );
          })}
        </div>
        <p className="mt-3 text-xs opacity-60">{swatch?.name ?? colour}</p>
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
                  style={{ width: s.value * 200, height: s.value * 200 }}
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
