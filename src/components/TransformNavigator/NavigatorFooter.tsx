import React from 'react';
import { TransformMode, AccessibilityMode } from '../../types';

interface NavigatorFooterProps {
  mode: TransformMode;
  activeHandle: string | null;
  isLocked: boolean;
  accessibilityMode: AccessibilityMode;
  onFooterDragStart?: (e: React.PointerEvent) => void;
}

export const NavigatorFooter: React.FC<NavigatorFooterProps> = ({
  mode,
  activeHandle,
  isLocked,
  accessibilityMode,
  onFooterDragStart,
}) => {
  const defaultHelperText =
    mode === '2d'
      ? 'Screen View Aligned • Center Crosshair'
      : 'Spatial Global XYZ • Centroid Pivot';

  return (
    <div
      id="transform-navigator-footer"
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('button')) {
          onFooterDragStart?.(e);
        }
      }}
      title="Drag here to move controller anywhere on screen"
      className="px-3 py-2 bg-[#141519]/95 hover:bg-[#1a1b22] border-t border-white/[0.08] flex flex-col items-center justify-center text-center select-none cursor-grab active:cursor-grabbing touch-none transition-colors group"
    >
      <div className="flex items-center gap-1.5 justify-center">
        {activeHandle ? (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-emerald-400 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Engaged: {activeHandle.replace(/-/g, ' ').toUpperCase()}
          </span>
        ) : (
          <p className="text-[10.5px] font-medium text-zinc-400 tracking-wide">
            {defaultHelperText}
          </p>
        )}
      </div>

      {/* Auxiliary tiny indicators if special mode active */}
      {(isLocked || accessibilityMode === 'finger-pen') && (
        <div className="mt-0.5 flex items-center gap-2 text-[9px] text-zinc-500">
          {isLocked && (
            <span className="text-red-400/90 font-mono tracking-tight">
              [CONSTRAINTS LOCKED]
            </span>
          )}
          {accessibilityMode === 'finger-pen' && (
            <span className="text-amber-400/90 font-mono tracking-tight">
              [FINGER-PEN OVERRIDE]
            </span>
          )}
        </div>
      )}

      {/* Subtle Drag Handle Grip Bar */}
      <div className="w-10 h-1 rounded-full bg-zinc-700/50 mt-1 group-hover:bg-zinc-500/80 transition-colors" />
    </div>
  );
};
