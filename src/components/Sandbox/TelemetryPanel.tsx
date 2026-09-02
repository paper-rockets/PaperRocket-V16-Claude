/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SandboxNavState, SandboxTheme, TelemetryEvent } from './types';

interface TelemetryPanelProps {
  navState: SandboxNavState;
  events: TelemetryEvent[];
  theme: SandboxTheme;
  onClearEvents: () => void;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  navState,
  events,
  theme,
  onClearEvents,
}) => {
  const isSage = theme === 'sage';
  const isDark = theme === 'dark';

  const panelBg = isSage ? 'bg-[#c2cdc1]/80 text-[#232628]' : isDark ? 'bg-[#14161a]/90 text-[#f3f4f6]' : 'bg-white/95 text-black';
  const borderCol = isSage ? 'border-[#232628]/20' : isDark ? 'border-neutral-800' : 'border-neutral-200';
  const highlightCol = isSage ? 'text-[#d35f4c]' : isDark ? 'text-sky-400' : 'text-blue-600';
  const mutedCol = isSage ? 'text-[#232628]/60' : isDark ? 'text-neutral-400' : 'text-neutral-500';

  return (
    <div className={`flex flex-col h-full border-l ${borderCol} ${panelBg} font-mono text-xs select-none backdrop-blur-sm p-4 overflow-hidden`}>
      <div className="flex items-center justify-between pb-3 border-b border-inherit mb-3">
        <span className="font-semibold tracking-wider text-[11px] uppercase">Telemetry Stream</span>
        <button
          onClick={onClearEvents}
          className={`px-2 py-0.5 text-[10px] border border-inherit rounded transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer`}
        >
          Clear
        </button>
      </div>

      {/* Numerical Coordinate State */}
      <div className="grid grid-cols-2 gap-2 mb-4 pb-3 border-b border-inherit text-[11px]">
        <div>
          <div className={mutedCol}>PAN X / Y</div>
          <div className="font-medium">{navState.x.toFixed(1)} / {navState.y.toFixed(1)} mm</div>
        </div>
        <div>
          <div className={mutedCol}>DEPTH Z</div>
          <div className="font-medium">{navState.z.toFixed(1)} mm</div>
        </div>
        <div>
          <div className={mutedCol}>PITCH / YAW</div>
          <div className="font-medium">{navState.pitch.toFixed(1)}° / {navState.yaw.toFixed(1)}°</div>
        </div>
        <div>
          <div className={mutedCol}>ROLL</div>
          <div className="font-medium">{navState.roll.toFixed(1)}°</div>
        </div>
        <div>
          <div className={mutedCol}>SCALE</div>
          <div className={`font-medium ${highlightCol}`}>{navState.scale.toFixed(2)}x</div>
        </div>
        <div>
          <div className={mutedCol}>BRUSH RADIUS</div>
          <div className={`font-medium ${highlightCol}`}>{navState.brushSize.toFixed(1)} px</div>
        </div>
      </div>

      {/* Live Event Log */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-muted">Input Events</span>
        <span className="text-[10px] opacity-50">{events.length} logged</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px]">
        {events.length === 0 ? (
          <div className={`italic py-4 text-center ${mutedCol}`}>Interact with the navigator to stream live input events</div>
        ) : (
          events.slice(0, 40).map((ev) => (
            <div key={ev.id} className="flex items-start justify-between py-1 border-b border-inherit/30 gap-2">
              <div>
                <span className={`font-semibold mr-1.5 ${highlightCol}`}>[{ev.source}]</span>
                <span>{ev.action}</span>
              </div>
              <span className="opacity-75 shrink-0">{ev.value}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
