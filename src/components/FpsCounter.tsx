import React, { useSyncExternalStore } from 'react';
import { subscribeFps, getFps } from '../core/telemetryStore';

interface FpsCounterProps {
  uiScale?: number;
}

/**
 * Isolated FPS readout.
 *
 * This is deliberately a leaf component subscribed directly to the telemetry
 * store: the counter updates about twice a second, and keeping it out of App's
 * state means those updates re-render this badge alone instead of the entire
 * application tree (toolbar, navigator, viewport wrapper and every modal).
 */
const FpsCounterComponent: React.FC<FpsCounterProps> = ({ uiScale = 1.0 }) => {
  const fps = useSyncExternalStore(subscribeFps, getFps, getFps);

  return (
    <div
      style={{
        transform: uiScale !== 1.0 ? `scale(${uiScale})` : undefined,
        transformOrigin: 'bottom left',
      }}
      className="fixed bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 pointer-events-none select-none"
    >
      <div className="px-2 py-0.5 rounded-md bg-[#141519]/90 backdrop-blur-md border border-zinc-800 text-[10px] font-mono text-zinc-400 shadow-sm flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
        <span>{fps} FPS</span>
      </div>
    </div>
  );
};

export const FpsCounter = React.memo(FpsCounterComponent);
