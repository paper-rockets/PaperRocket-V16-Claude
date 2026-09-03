import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getFps, subscribeFps } from '../../core/telemetryStore';

/**
 * Frame rate and input lag, for testing on real hardware.
 *
 * A note on reading the frame number: the app deliberately slows down when you
 * are not touching the screen (20fps on a Tab S6 Lite, 30 on an S25 Ultra) to
 * save battery and keep a fanless tablet cool. A low number while idle is the
 * app resting, not the app struggling. The number that matters is the one while
 * you are drawing — that is why this shows the drawing figure separately.
 *
 * Input lag here means: how long from your finger or pen moving to the next
 * frame being drawn. It is measured only while you are actually touching the
 * screen, because that is the only time the question means anything.
 */

export const PlayStats: React.FC<{ theme?: 'light' | 'dark' }> = ({ theme = 'dark' }) => {
  const fps = useSyncExternalStore(subscribeFps, getFps, getFps);
  const [lagMs, setLagMs] = useState<number>(0);
  const [activeFps, setActiveFps] = useState<number>(0);

  const pendingInputAt = useRef<number | null>(null);
  const isDown = useRef<boolean>(false);
  const smoothedLag = useRef<number>(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const onDown = () => {
      isDown.current = true;
      pendingInputAt.current = performance.now();
    };
    const onMove = () => {
      if (isDown.current && pendingInputAt.current === null) {
        pendingInputAt.current = performance.now();
      }
    };
    const onUp = () => {
      isDown.current = false;
      pendingInputAt.current = null;
    };

    // Capture phase and passive: the viewport stops propagation on its own
    // handlers, and we must never interfere with drawing.
    const opts = { capture: true, passive: true } as AddEventListenerOptions;
    window.addEventListener('pointerdown', onDown, opts);
    window.addEventListener('pointermove', onMove, opts);
    window.addEventListener('pointerup', onUp, opts);
    window.addEventListener('pointercancel', onUp, opts);

    const tick = () => {
      const t = pendingInputAt.current;
      if (t !== null) {
        const sample = performance.now() - t;
        pendingInputAt.current = null;
        // Exponential smoothing, or the number is unreadable noise.
        smoothedLag.current = smoothedLag.current * 0.8 + sample * 0.2;
        setLagMs(smoothedLag.current);
      }
      if (isDown.current) setActiveFps(getFps());
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointerdown', onDown, opts);
      window.removeEventListener('pointermove', onMove, opts);
      window.removeEventListener('pointerup', onUp, opts);
      window.removeEventListener('pointercancel', onUp, opts);
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const isLight = theme === 'light';
  const resting = !isDown.current;

  return (
    <div
      className={`fixed left-3 z-20 rounded-xl border px-2.5 py-1.5 text-[10px] font-mono leading-tight
        pointer-events-none select-none
        ${isLight ? 'bg-white/95 border-neutral-200 text-neutral-700' : 'bg-[#14161c]/95 border-neutral-800 text-neutral-300'}`}
      style={{ bottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="opacity-60">now</span>
        <span className="font-bold tabular-nums">{fps}</span>
        <span className="opacity-40">fps</span>
        {resting && <span className="opacity-40">· resting</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="opacity-60">draw</span>
        <span className="font-bold tabular-nums">{activeFps || '--'}</span>
        <span className="opacity-40">fps</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="opacity-60">lag</span>
        <span className="font-bold tabular-nums">{lagMs ? lagMs.toFixed(0) : '--'}</span>
        <span className="opacity-40">ms</span>
      </div>
    </div>
  );
};
