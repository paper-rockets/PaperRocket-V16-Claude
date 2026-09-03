import React from 'react';
import { BrushSettings } from '../../types';
import { PlaySheet } from './PlaySheet';
import { haptics } from '../../utils/haptics';

/**
 * What the Shape tool offers.
 *
 * The Shape button used to open a sheet that did not exist, so the only visible
 * effect of tapping it was the turn wheel disappearing — the same trap the menu
 * button had.
 *
 * A note on what is honest here: the engine DETECTS shapes from what you drew,
 * it does not draw a shape you chose in advance. So this does not offer "draw a
 * circle" buttons that quietly do nothing. It offers the two things that really
 * are controllable — whether tidying is on, and how eager it is — plus a plain
 * list of what it can recognise, so the tool stops being a mystery.
 */

interface ShapesSheetProps {
  brushSettings: BrushSettings;
  setBrushSettings: React.Dispatch<React.SetStateAction<BrushSettings>>;
  theme?: 'light' | 'dark';
}

const STRICTNESS: { id: string; label: string; hint: string; tol: number }[] = [
  { id: 'loose', label: 'Eager', hint: 'Tidies almost anything', tol: 0.42 },
  { id: 'normal', label: 'Normal', hint: 'A good middle', tol: 0.28 },
  { id: 'strict', label: 'Fussy', hint: 'Only when you were close', tol: 0.14 },
];

const RECOGNISES = ['Straight line', 'Circle', 'Oval', 'Arc', 'Triangle', 'Square', 'Polygon'];

export const ShapesSheet: React.FC<ShapesSheetProps> = ({
  brushSettings,
  setBrushSettings,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const snapOn = brushSettings.shapeSnapping ?? false;
  const straightOnly = brushSettings.straightLineMode ?? false;
  const tol = brushSettings.shapeSnapTolerance ?? 0.28;
  const activeStrictness =
    STRICTNESS.reduce((best, s) => (Math.abs(s.tol - tol) < Math.abs(best.tol - tol) ? s : best));

  const soft = isLight ? 'bg-neutral-100 border-neutral-200' : 'bg-white/5 border-neutral-800';

  const Toggle: React.FC<{ on: boolean; onChange: () => void; label: string }> = ({ on, onChange, label }) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        haptics.trigger('light');
        onChange();
      }}
      className={`w-14 h-8 rounded-full relative shrink-0 transition-colors ${
        on ? 'bg-sky-400' : 'bg-neutral-500/40'
      }`}
    >
      <span
        className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`}
      />
    </button>
  );

  return (
    <PlaySheet id="shapes" title="Shape" theme={theme} tall>
      <div className={`flex items-center gap-3 py-3 border-b ${isLight ? 'border-neutral-200' : 'border-neutral-800'}`}>
        <div className="flex-1">
          <div className="text-sm font-bold">Tidy up my shapes</div>
          <div className="text-[11px] opacity-60">Wobbly circles become circles</div>
        </div>
        <Toggle
          on={snapOn}
          label="Tidy up my shapes"
          onChange={() => setBrushSettings((p) => ({ ...p, shapeSnapping: !snapOn }))}
        />
      </div>

      <div className={`flex items-center gap-3 py-3 border-b ${isLight ? 'border-neutral-200' : 'border-neutral-800'}`}>
        <div className="flex-1">
          <div className="text-sm font-bold">Straight lines only</div>
          <div className="text-[11px] opacity-60">Every stroke snaps to a ruler</div>
        </div>
        <Toggle
          on={straightOnly}
          label="Straight lines only"
          onChange={() => setBrushSettings((p) => ({ ...p, straightLineMode: !straightOnly }))}
        />
      </div>

      <div className="py-3">
        <div className="text-sm font-bold">How keen is it?</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {STRICTNESS.map((s) => {
            const active = s.id === activeStrictness.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={!snapOn}
                onClick={() => {
                  haptics.trigger('light');
                  setBrushSettings((p) => ({ ...p, shapeSnapTolerance: s.tol }));
                }}
                className={`h-16 rounded-2xl border flex flex-col items-center justify-center px-1 transition-all
                  ${!snapOn ? 'opacity-40' : ''}
                  ${active ? 'bg-sky-400 border-sky-300 text-zinc-950' : soft}`}
              >
                <span className="text-xs font-bold">{s.label}</span>
                <span className="text-[9.5px] opacity-70 text-center leading-tight mt-0.5">{s.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pb-1">
        <div className="text-[11px] font-bold opacity-60 mb-1.5">It can tidy these</div>
        <div className="flex flex-wrap gap-1.5">
          {RECOGNISES.map((r) => (
            <span key={r} className={`px-2.5 py-1 rounded-lg text-[11px] border ${soft}`}>
              {r}
            </span>
          ))}
        </div>
      </div>
    </PlaySheet>
  );
};
