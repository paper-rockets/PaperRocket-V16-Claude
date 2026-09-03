import React from 'react';
import { Sun, Moon, Wrench, Gauge, Compass, Hand } from 'lucide-react';
import { PlaySheet } from './PlaySheet';
import { setUiMode, useUiMode } from '../../core/uiModeStore';
import { haptics } from '../../utils/haptics';

/**
 * The menu behind the button in the top strip.
 *
 * It used to open a sheet that did not exist, and because opening a sheet hides
 * the turn wheel, the only visible effect was the wheel disappearing — so the
 * button looked like a wheel toggle that lied about being a menu. This is the
 * sheet it was always meant to open.
 */

interface PlaySettingsSheetProps {
  theme: 'light' | 'dark';
  onSetTheme: (t: 'light' | 'dark') => void;
  showNavigator: boolean;
  onToggleNavigator: (show: boolean) => void;
  showStats: boolean;
  onToggleStats: (show: boolean) => void;
  fingerDraw: boolean;
  onToggleFingerDraw: (on: boolean) => void;
}

const Row: React.FC<{
  icon: React.FC<{ className?: string }>;
  label: string;
  hint?: string;
  children: React.ReactNode;
  isLight: boolean;
}> = ({ icon: Icon, label, hint, children, isLight }) => (
  <div
    className={`flex items-center gap-3 py-2.5 border-b last:border-b-0 ${
      isLight ? 'border-neutral-200' : 'border-neutral-800'
    }`}
  >
    <Icon className="w-5 h-5 shrink-0 opacity-70" />
    <div className="flex-1 min-w-0">
      <div className="text-sm font-bold leading-tight">{label}</div>
      {hint && <div className="text-[11px] opacity-60 leading-tight mt-0.5">{hint}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

/** A plain two-state switch, sized for a finger. */
const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; label: string }> = ({
  on,
  onChange,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => {
      haptics.trigger('light');
      onChange(!on);
    }}
    className={`w-14 h-8 rounded-full transition-colors relative ${on ? 'bg-sky-400' : 'bg-neutral-500/40'}`}
  >
    <span
      className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${
        on ? 'left-7' : 'left-1'
      }`}
    />
  </button>
);

export const PlaySettingsSheet: React.FC<PlaySettingsSheetProps> = ({
  theme,
  onSetTheme,
  showNavigator,
  onToggleNavigator,
  showStats,
  onToggleStats,
  fingerDraw,
  onToggleFingerDraw,
}) => {
  const isLight = theme === 'light';
  const uiMode = useUiMode();

  const pill = (active: boolean) =>
    `flex-1 h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
      active
        ? 'bg-sky-400 text-zinc-950'
        : isLight
          ? 'bg-neutral-100 text-neutral-600'
          : 'bg-white/5 text-neutral-300'
    }`;

  return (
    <PlaySheet id="settings" title="Settings" theme={theme} tall>
      <Row icon={isLight ? Sun : Moon} label="Look" hint="Light or dark" isLight={isLight}>
        <div className="flex gap-1.5 w-40">
          <button
            type="button"
            onClick={() => {
              haptics.trigger('light');
              onSetTheme('light');
            }}
            className={pill(isLight)}
          >
            <Sun className="w-4 h-4" /> Light
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.trigger('light');
              onSetTheme('dark');
            }}
            className={pill(!isLight)}
          >
            <Moon className="w-4 h-4" /> Dark
          </button>
        </div>
      </Row>

      <Row icon={Compass} label="Turn wheel" hint="The dial in the corner" isLight={isLight}>
        <Toggle on={showNavigator} onChange={onToggleNavigator} label="Turn wheel" />
      </Row>

      <Row icon={Hand} label="Finger draw" hint="Draw with a finger when you have no pen" isLight={isLight}>
        <Toggle on={fingerDraw} onChange={onToggleFingerDraw} label="Finger draw" />
      </Row>

      <Row icon={Gauge} label="Speed readout" hint="Frame rate and pen delay" isLight={isLight}>
        <Toggle on={showStats} onChange={onToggleStats} label="Speed readout" />
      </Row>

      <Row
        icon={Wrench}
        label="Advanced tools"
        hint="Every control, for grown-up 3D work"
        isLight={isLight}
      >
        <Toggle
          on={uiMode === 'pro'}
          onChange={(v) => {
            haptics.trigger('mode-switch');
            setUiMode(v ? 'pro' : 'play');
          }}
          label="Advanced tools"
        />
      </Row>
    </PlaySheet>
  );
};
