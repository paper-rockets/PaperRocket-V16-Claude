import React, { useRef, useCallback } from 'react';
import { Brush, Shapes, Eraser, Move } from 'lucide-react';
import { ToolType, BrushSettings } from '../../types';
import { toggleSheet, openSheetId } from './sheetStore';
import { haptics } from '../../utils/haptics';

/**
 * Zone B — the left rail. Four tools, always in this order, never collapsing.
 *
 * The nine-item grid in Toolbar.tsx collapses to these four. The missing five are
 * not gone: eyedropper, the brush and paint pickers, the straight-line constraint
 * and liquify are all still in Pro mode. What a beginner needs is a mark, a shape,
 * a way to undo a mark physically, and a way to move things.
 */

export type PlayToolId = 'draw' | 'shape' | 'zap' | 'move';

interface PlayDockProps {
  tool: ToolType;
  shapeSnapping: boolean;
  onSelect: (id: PlayToolId) => void;
  theme?: 'light' | 'dark';
}

const TOOLS: { id: PlayToolId; label: string; icon: React.FC<{ className?: string }>; sheet?: 'brushes' | 'shapes' }[] = [
  { id: 'draw', label: 'Draw', icon: Brush, sheet: 'brushes' },
  { id: 'shape', label: 'Shape', icon: Shapes, sheet: 'shapes' },
  { id: 'zap', label: 'Super Zap', icon: Eraser },
  { id: 'move', label: 'Move', icon: Move },
];

/** Which Play tool the current engine state corresponds to. */
export function activePlayTool(tool: ToolType, shapeSnapping: boolean): PlayToolId {
  if (tool === 'eraser') return 'zap';
  if (tool === 'select' || tool === 'pointer') return 'move';
  if (shapeSnapping) return 'shape';
  return 'draw';
}

/** The engine state each Play tool means. Kept next to the dock so there is one answer. */
export function playToolSettings(id: PlayToolId): { tool: ToolType; patch: Partial<BrushSettings> } {
  switch (id) {
    case 'draw':
      return { tool: 'brush', patch: { shapeSnapping: false, straightLineMode: false } };
    case 'shape':
      return { tool: 'brush', patch: { shapeSnapping: true, straightLineMode: false } };
    case 'zap':
      // Play only ever vacuums: one drag removes whole strokes. Cutout stays in Pro.
      return { tool: 'eraser', patch: { eraserMode: 'vacuum', shapeSnapping: false } };
    case 'move':
      return { tool: 'select', patch: { shapeSnapping: false } };
  }
}

const LONG_PRESS_MS = 500;

export const PlayDock: React.FC<PlayDockProps> = ({ tool, shapeSnapping, onSelect, theme = 'dark' }) => {
  const active = activePlayTool(tool, shapeSnapping);
  const isLight = theme === 'light';

  const timerRef = useRef<number | null>(null);
  const firedRef = useRef<boolean>(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (id: PlayToolId, sheet?: 'brushes' | 'shapes') => {
      firedRef.current = false;
      if (!sheet) return;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true;
        haptics.trigger('medium');
        // A long press implies you want that tool as well as its options.
        onSelect(id);
        openSheetId(sheet);
      }, LONG_PRESS_MS);
    },
    [clearTimer, onSelect]
  );

  const handlePointerUp = useCallback(
    (id: PlayToolId, sheet?: 'brushes' | 'shapes') => {
      clearTimer();
      // The long press already acted; a tap must not act twice.
      if (firedRef.current) {
        firedRef.current = false;
        return;
      }
      haptics.trigger('light');
      // Tapping the tool you are already using opens its options — the shortcut
      // people reach for once the four tools are familiar.
      if (active === id && sheet) toggleSheet(sheet);
      else onSelect(id);
    },
    [active, clearTimer, onSelect]
  );

  return (
    <div
      className="fixed left-3 z-30 flex flex-col gap-2"
      style={{ top: '50%', transform: 'translateY(-50%)' }}
    >
      {TOOLS.map(({ id, label, icon: Icon, sheet }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            onPointerDown={() => handlePointerDown(id, sheet)}
            onPointerUp={() => handlePointerUp(id, sheet)}
            onPointerLeave={clearTimer}
            onPointerCancel={clearTimer}
            onContextMenu={(e) => e.preventDefault()}
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 border
              backdrop-blur-md transition-all active:scale-95 touch-none
              ${
                isActive
                  ? 'bg-sky-400 border-sky-300 text-zinc-950 shadow-lg shadow-sky-500/25'
                  : isLight
                    ? 'bg-white/90 border-neutral-200 text-neutral-600'
                    : 'bg-[#14161c]/90 border-neutral-800 text-neutral-300'
              }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-bold leading-none">{label}</span>
          </button>
        );
      })}
    </div>
  );
};
