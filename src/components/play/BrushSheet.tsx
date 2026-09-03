import React from 'react';
import { BrushSettings } from '../../types';
import { PlaySheet } from './PlaySheet';
import { PLAY_BRUSHES, PLAY_BRUSH_LABELS } from '../../presets/playTiers';
import { DEFAULT_BRUSH_PRESETS } from '../../presets/brushPresets';
import { applyBrushPresetToSettings } from '../../presets/brushPresets';
import { haptics } from '../../utils/haptics';

interface BrushSheetProps {
  brushSettings: BrushSettings;
  setBrushSettings: React.Dispatch<React.SetStateAction<BrushSettings>>;
  theme?: 'light' | 'dark';
}

/**
 * SVG preview for each brush type.
 * Uses the current brush color and updates reactively.
 */
function BrushPreview({ brushId, color }: { brushId: string; color: string }) {
  if (brushId === 'spatial_pipe') {
    // Tube: thick round stroke with tapering and highlight
    return (
      <svg viewBox="0 0 56 56" className="w-14 h-14 flex-shrink-0 rounded" style={{ background: '#f5f5f5' }}>
        {/* Main thick tube stroke */}
        <path
          d="M 3 28 Q 28 12 53 28"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Highlight to show roundness */}
        <path
          d="M 3 20 Q 28 4 53 20"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />
      </svg>
    );
  } else if (brushId === 'conformal_bead') {
    // Ribbon: flat band with varying width
    return (
      <svg viewBox="0 0 56 56" className="w-14 h-14 flex-shrink-0 rounded" style={{ background: '#f5f5f5' }}>
        {/* Main ribbon shape with tapered width */}
        <path
          d="M 3 25 L 14 16 L 42 18 L 53 28 L 42 38 L 14 40 Z"
          fill={color}
        />
        {/* Shadow to show flatness */}
        <path
          d="M 3 29 L 42 38 L 53 31 L 42 23 Z"
          fill={color}
          opacity="0.2"
        />
      </svg>
    );
  } else if (brushId === 'stipple_texture') {
    // Star Dust: scattered circles of varying size and opacity
    const dots = [
      { cx: 8, cy: 14, r: 1.2, op: 1 },
      { cx: 20, cy: 8, r: 0.9, op: 0.7 },
      { cx: 28, cy: 17, r: 1.5, op: 1 },
      { cx: 37, cy: 25, r: 1, op: 0.8 },
      { cx: 45, cy: 11, r: 1.3, op: 0.9 },
      { cx: 14, cy: 34, r: 0.8, op: 0.6 },
      { cx: 31, cy: 37, r: 1.1, op: 0.9 },
      { cx: 42, cy: 34, r: 0.95, op: 0.7 },
      { cx: 23, cy: 25, r: 1.2, op: 1 },
      { cx: 48, cy: 31, r: 1, op: 0.8 },
      { cx: 11, cy: 22, r: 1.4, op: 0.85 },
      { cx: 35, cy: 9, r: 0.7, op: 0.6 },
    ];

    return (
      <svg viewBox="0 0 56 56" className="w-14 h-14 flex-shrink-0 rounded" style={{ background: '#f5f5f5' }}>
        {dots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill={color}
            opacity={dot.op}
          />
        ))}
      </svg>
    );
  }

  return null;
}

export const BrushSheet: React.FC<BrushSheetProps> = ({
  brushSettings,
  setBrushSettings,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  const handleSelectBrush = (brushId: string) => {
    haptics.trigger('light');
    const preset = DEFAULT_BRUSH_PRESETS.find((p) => p.id === brushId);
    if (preset) {
      setBrushSettings((prev) => ({
        // applyBrushPresetToSettings ends with `color: preset.color || current.color`,
        // and every preset carries a colour — so applying one silently repaints
        // whatever the user picked from the palette. In Pro that is intended: a
        // preset is a whole look. In Play, colour and brush are two separate
        // choices made in two separate places, and picking one must not quietly
        // change the other. Keep the shared helper as-is (Pro depends on it) and
        // put the user's colour back afterwards.
        ...applyBrushPresetToSettings(preset, prev),
        color: prev.color,
      }));
    }
  };

  const currentBrushId = brushSettings.shaderEffect
    ? PLAY_BRUSHES.find(
        (id) =>
          DEFAULT_BRUSH_PRESETS.find((p) => p.id === id)?.shaderEffect === brushSettings.shaderEffect
      )
    : PLAY_BRUSHES.find((id) => DEFAULT_BRUSH_PRESETS.find((p) => p.id === id)?.profile === brushSettings.profile);

  return (
    <PlaySheet id="brushes" title="Brushes" theme={theme}>
      <div className="space-y-1.5">
        {PLAY_BRUSHES.map((brushId) => {
          const preset = DEFAULT_BRUSH_PRESETS.find((p) => p.id === brushId);
          const info = PLAY_BRUSH_LABELS[brushId];
          const selected = brushId === currentBrushId;

          if (!preset) return null;

          return (
            <button
              key={brushId}
              type="button"
              onClick={() => handleSelectBrush(brushId)}
              className={`w-full p-2 rounded-xl border transition-all active:scale-95 flex gap-2
                ${
                  selected
                    ? 'bg-sky-400 border-sky-300 text-zinc-950'
                    : isLight
                      ? 'bg-neutral-100 border-neutral-200 hover:bg-neutral-200'
                      : 'bg-white/5 border-neutral-800 hover:bg-white/10'
                }`}
              style={{ minHeight: 72 }}
            >
              <BrushPreview brushId={brushId} color={brushSettings.color || "#22D3EE"} />
              <div className="text-left flex flex-col justify-center flex-1 min-w-0">
                <div className="font-bold text-sm leading-tight">{info.label}</div>
                <div className="text-xs opacity-75 mt-0.5 leading-tight">{info.blurb}</div>
              </div>
            </button>
          );
        })}
      </div>
    </PlaySheet>
  );
};
