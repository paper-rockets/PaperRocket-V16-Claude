import React, { useCallback, useEffect, useState } from 'react';
import { X, Upload, Square, AlertCircle, Loader2 } from 'lucide-react';
import { StudioEngine } from '../../core/studioEngine';
import { ModelStorage } from '../../core/modelStorage';
import { BrushSettings, Saved3DModel } from '../../types';
import { haptics } from '../../utils/haptics';

/**
 * The Toybox — pick something to colour.
 *
 * It used to list 46 bundled models. Those are gone: people bring their own
 * work, so this lists what has actually been imported. Every stored model
 * already carries a thumbnail generated at import time, which is why there is no
 * thumbnail pipeline here — the picture comes free with the file.
 *
 * One tap has to do everything, because the whole point is that the next stroke
 * lands on the model without touching another control.
 */

interface ToyboxProps {
  isOpen: boolean;
  engine: StudioEngine | null;
  onClose: () => void;
  onSpawned: (modelName: string) => void;
  setBrushSettings: React.Dispatch<React.SetStateAction<BrushSettings>>;
  /** Opens the importer, which is where models come from now. */
  onOpenImporter?: () => void;
  theme?: 'light' | 'dark';
}

export const Toybox: React.FC<ToyboxProps> = ({
  isOpen,
  engine,
  onClose,
  onSpawned,
  setBrushSettings,
  onOpenImporter,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [models, setModels] = useState<Saved3DModel[]>([]);
  const [listLoading, setListLoading] = useState<boolean>(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmFor, setConfirmFor] = useState<Saved3DModel | 'blank' | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setListLoading(true);
    setError(null);
    ModelStorage.getAllModels()
      .then((list) => {
        if (!cancelled) setModels(list.sort((a, b) => b.savedDate - a.savedDate));
      })
      .catch(() => {
        if (!cancelled) setError("Could not read your saved models.");
      })
      .finally(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /** True when there is work on the canvas that spawning would throw away. */
  const canvasHasWork = useCallback((): boolean => {
    if (!engine) return false;
    try {
      const layers = engine.getLayersSnapshot();
      return layers.some((l) => (l.strokeIds?.length ?? 0) > 0);
    } catch {
      return false;
    }
  }, [engine]);

  const spawn = useCallback(
    async (target: Saved3DModel | 'blank') => {
      if (!engine) return;
      const id = target === 'blank' ? 'blank' : target.id;
      setBusyId(id);
      setError(null);
      try {
        engine.clearAllStrokes();

        if (target === 'blank') {
          await engine.loadPresetModel('drawing_plane');
        } else {
          // loadGLTF takes the stored ArrayBuffer directly, and setModelObject
          // centres and frames the camera itself — no extra step needed, and the
          // model becomes a paint target the moment this resolves.
          await engine.loadGLTF(target.blob, target.name);
        }

        // Land the next stroke ON the thing, not in the air in front of it.
        setBrushSettings((prev) => ({
          ...prev,
          drawingMode: 'surface',
          profile: 'conformal',
        }));

        onSpawned(target === 'blank' ? 'Drawing Canvas' : target.name);
        haptics.trigger('success');
        onClose();
      } catch {
        setError("That model would not open. It may need importing again.");
      } finally {
        setBusyId(null);
        setConfirmFor(null);
      }
    },
    [engine, onClose, onSpawned, setBrushSettings]
  );

  const requestSpawn = (target: Saved3DModel | 'blank') => {
    haptics.trigger('light');
    if (canvasHasWork()) setConfirmFor(target);
    else void spawn(target);
  };

  if (!isOpen) return null;

  const panel = isLight ? 'bg-white text-neutral-900' : 'bg-[#0e1015] text-neutral-100';
  const card = isLight
    ? 'bg-neutral-100 border-neutral-200 hover:bg-neutral-200'
    : 'bg-white/5 border-neutral-800 hover:bg-white/10';

  return (
    <div className={`fixed inset-0 z-[55] flex flex-col ${panel}`}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 h-16 border-b border-neutral-800/30">
        <h1 className="text-lg font-bold">Pick something to colour</h1>
        <button
          type="button"
          onClick={onClose}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 ${
            isLight ? 'bg-neutral-100 hover:bg-neutral-200' : 'bg-white/10 hover:bg-white/20'
          }`}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="shrink-0 mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-sm">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {listLoading ? (
          <div className="h-full flex items-center justify-center opacity-60">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {/* Always available: the blank sheet. */}
            <button
              type="button"
              onClick={() => requestSpawn('blank')}
              disabled={busyId !== null}
              className={`rounded-2xl border p-3 flex flex-col gap-2 transition-all active:scale-95 disabled:opacity-50 ${card}`}
            >
              <div className="aspect-square rounded-xl bg-gradient-to-br from-sky-400/20 to-sky-600/10 flex items-center justify-center">
                {busyId === 'blank' ? (
                  <Loader2 className="w-8 h-8 animate-spin opacity-70" />
                ) : (
                  <Square className="w-10 h-10 opacity-60" />
                )}
              </div>
              <span className="text-sm font-bold text-left">Blank sheet</span>
            </button>

            {/* Import: the only way models get here now. */}
            {onOpenImporter && (
              <button
                type="button"
                onClick={() => {
                  haptics.trigger('light');
                  onClose();
                  onOpenImporter();
                }}
                className={`rounded-2xl border-2 border-dashed p-3 flex flex-col gap-2 transition-all active:scale-95 ${
                  isLight
                    ? 'border-sky-400/60 hover:bg-sky-50'
                    : 'border-sky-400/40 hover:bg-sky-400/10'
                }`}
              >
                <div className="aspect-square rounded-xl flex items-center justify-center">
                  <Upload className="w-10 h-10 text-sky-400" />
                </div>
                <span className="text-sm font-bold text-left">Add your own</span>
              </button>
            )}

            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => requestSpawn(m)}
                disabled={busyId !== null}
                className={`rounded-2xl border p-3 flex flex-col gap-2 transition-all active:scale-95 disabled:opacity-50 ${card}`}
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-black/20 flex items-center justify-center">
                  {busyId === m.id ? (
                    <Loader2 className="w-8 h-8 animate-spin opacity-70" />
                  ) : m.thumbnail ? (
                    <img src={m.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Square className="w-10 h-10 opacity-40" />
                  )}
                </div>
                <span className="text-sm font-bold text-left truncate w-full">{m.name}</span>
              </button>
            ))}
          </div>
        )}

        {!listLoading && models.length === 0 && (
          <p className="mt-6 text-sm opacity-60 max-w-md">
            Nothing saved yet. Tap <strong>Add your own</strong> to bring in a model, or start on a
            blank sheet.
          </p>
        )}
      </div>

      {/* Confirm, only when there is work to lose. */}
      {confirmFor !== null && (
        <div className="fixed inset-0 z-[56] bg-black/60 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl ${panel}`}>
            <p className="text-base font-bold">Start a new page? Your drawing will be cleared.</p>
            <div className="mt-5 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmFor(null)}
                className={`h-11 px-5 rounded-full font-bold text-sm ${
                  isLight ? 'bg-neutral-200' : 'bg-white/10'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void spawn(confirmFor)}
                className="h-11 px-5 rounded-full font-bold text-sm bg-sky-400 text-zinc-950"
              >
                Start fresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
