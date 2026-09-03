import React from 'react';
import { Undo2, Redo2, Menu } from 'lucide-react';
import { toggleSheet } from './sheetStore';

/**
 * Zone A — the top strip.
 *
 * Deliberately almost empty: the project name, undo, redo, and one menu. No FPS
 * counter, no GPU pod, no telemetry. Those are Pro-mode furniture.
 */

interface PlayTopStripProps {
  projectName: string;
  onOpenToybox: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  theme?: 'light' | 'dark';
}

export const PlayTopStrip: React.FC<PlayTopStripProps> = ({
  projectName,
  onOpenToybox,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const chip = isLight
    ? 'bg-white/90 border-neutral-200 text-neutral-800'
    : 'bg-[#14161c]/90 border-neutral-800 text-neutral-100';
  const btn = `h-11 w-11 rounded-2xl flex items-center justify-center border backdrop-blur-md transition-all active:scale-95 ${chip}`;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pointer-events-none"
      style={{ height: 56, paddingTop: 'max(env(safe-area-inset-top), 4px)' }}
    >
      {/* Project name doubles as the way into the Toybox — the thing you are colouring. */}
      <button
        type="button"
        onClick={onOpenToybox}
        className={`pointer-events-auto h-11 max-w-[52%] px-4 rounded-2xl border backdrop-blur-md
          text-sm font-bold truncate transition-all active:scale-95 ${chip}`}
        title="Pick something to colour"
      >
        {projectName}
      </button>

      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={`${btn} ${canUndo ? '' : 'opacity-30'}`}
          title="Undo"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className={`${btn} ${canRedo ? '' : 'opacity-30'}`}
          title="Redo"
        >
          <Redo2 className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => toggleSheet('settings')} className={btn} title="Settings">
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
