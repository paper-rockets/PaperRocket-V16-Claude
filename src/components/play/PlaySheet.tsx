import React, { useEffect, useRef } from 'react';
import { SheetId, closeSheet, useOpenSheet } from './sheetStore';

/**
 * The one bottom-sheet primitive every Play popover uses.
 *
 * Zone law: sheets rise from the bottom edge only, never wider than the screen and
 * never taller than 40vh, so the canvas above stays visible and drawable. Touching
 * the canvas dismisses — a child should never have to find a close button.
 */

interface PlaySheetProps {
  id: Exclude<SheetId, null>;
  title: string;
  children: React.ReactNode;
  theme?: 'light' | 'dark';
  /** Lists of settings need more room than a row of swatches. */
  tall?: boolean;
}

export const PlaySheet: React.FC<PlaySheetProps> = ({ id, title, children, theme = 'dark', tall = false }) => {
  const open = useOpenSheet() === id;
  const sheetRef = useRef<HTMLDivElement>(null);

  // Escape closes, and so does a pointer landing anywhere that is not this sheet.
  // The canvas is the common case, but tapping another zone should dismiss too.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target || !sheetRef.current || sheetRef.current.contains(target)) return;

      closeSheet();

      // Dismissing a sheet must not also leave a mark. Without this, tapping the
      // canvas to put a menu away draws a dot exactly where you tapped — which is
      // baffling if you are seven. Swallow only canvas taps: taps on other chrome
      // (a tool button, the top strip) should still do the thing you tapped.
      const el = target instanceof Element ? target : (target as Node).parentElement;
      if (el && el.closest('canvas')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', onKey);
    // Capture phase: the viewport stops propagation on its own pointer handlers,
    // so a bubbling listener would never see a tap that lands on the canvas.
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  if (!open) return null;

  const isLight = theme === 'light';

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-label={title}
      className={`fixed left-0 right-0 bottom-0 z-50 rounded-t-3xl border-t shadow-2xl
        motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-150
        ${isLight ? 'bg-white border-neutral-200 text-neutral-800' : 'bg-[#14161c] border-neutral-800 text-neutral-100'}`}
      style={{
        maxHeight: tall ? '68vh' : '40vh',
        paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
      }}
    >
      {/* Grab handle. Purely a visual affordance that this panel came from the bottom. */}
      <div className="flex justify-center pt-2 pb-1">
        <div className={`h-1 w-10 rounded-full ${isLight ? 'bg-neutral-300' : 'bg-neutral-700'}`} />
      </div>

      <div className="px-4 pb-1">
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
      </div>

      <div className="px-4 pb-3 overflow-y-auto" style={{ maxHeight: tall ? 'calc(68vh - 64px)' : 'calc(40vh - 64px)' }}>
        {children}
      </div>
    </div>
  );
};
