import React, { useCallback, useRef, useState } from 'react';
import { Upload, Check, Sliders, X, Loader2, Image, Box } from 'lucide-react';
import { StudioEngine } from '../../core/studioEngine';
import { ModelStorage } from '../../core/modelStorage';
import { Saved3DModel } from '../../types';
import { haptics } from '../../utils/haptics';

/**
 * Adding a model, the simple way.
 *
 * The old route was the full converter: up-axis pickers, Draco quantisation,
 * vertex-buffer baking, five lighting presets — a workbench, on a phone, in
 * front of someone who wants to colour a dog.
 *
 * This has three controls: pick a file, set the size, texture on or off. There
 * is no preview window, on purpose — the model loads onto the real canvas, so
 * the preview is the thing itself at full size, which is the one preview a
 * phone screen has room for. Everything else lives behind "Fine tuning", which
 * opens the original workbench untouched for the times it is genuinely needed.
 */

interface PlayImporterProps {
  isOpen: boolean;
  engine: StudioEngine | null;
  onClose: () => void;
  onSaved: (name: string) => void;
  onOpenFineTuning: () => void;
  theme?: 'light' | 'dark';
}

type Stage = 'choose' | 'adjusting' | 'saving';

export const PlayImporter: React.FC<PlayImporterProps> = ({
  isOpen,
  engine,
  onClose,
  onSaved,
  onOpenFineTuning,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('choose');
  const [name, setName] = useState<string>('');
  const [size, setSize] = useState<number>(1);
  const [textured, setTextured] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const baseScale = useRef<number>(1);
  /**
   * The bytes the user actually chose.
   *
   * Keeping these and storing them unchanged beats re-exporting the scene, for
   * three reasons: re-export chokes on compressed textures ("Invalid image
   * type"), it inflated a 29 KB file to 71 KB by unpacking them, and it can only
   * ever be a lossy copy of what was already a perfectly good file. Keep what
   * you were given.
   */
  const sourceBytes = useRef<ArrayBuffer | null>(null);
  const sourceFormat = useRef<string>('glb');

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!engine || !files || files.length === 0) return;
      setError(null);
      setStage('saving');
      // Copy the list before the first await. A FileList from an <input> is
      // live: the change handler clears the input straight afterwards, which
      // empties the list mid-flight and the load then fails with "no files".
      const picked = Array.from(files as ArrayLike<File>);
      try {
        const first = picked[0];
        sourceBytes.current = first ? await first.arrayBuffer() : null;
        sourceFormat.current = (first?.name.split('.').pop() || 'glb').toLowerCase();
        const res = await engine.loadUniversalFiles(picked);
        const shortName = (res.name || 'My model').replace(/\.[^.]+$/, '');
        setName(shortName);
        baseScale.current = 1;
        setSize(1);
        setTextured(true);
        engine.setModelDisplayMode('texture');
        setStage('adjusting');
        haptics.trigger('success');
      } catch {
        setError('That file would not open. Try a .glb file.');
        setStage('choose');
      }
    },
    [engine]
  );

  /** Size is applied as a step relative to whatever is on screen now. */
  const applySize = (next: number) => {
    if (!engine) return;
    const factor = next / size;
    if (Number.isFinite(factor) && factor > 0) engine.scaleModelOrSurface(factor);
    setSize(next);
  };

  const toggleTexture = () => {
    if (!engine) return;
    const next = !textured;
    setTextured(next);
    engine.setModelDisplayMode(next ? 'texture' : 'clay');
    haptics.trigger('light');
  };

  const keep = async () => {
    if (!engine) return;
    setStage('saving');
    setError(null);
    try {
      const bytes = sourceBytes.current;
      if (!bytes) throw new Error('no source bytes');
      const thumbnail = engine.captureSnapshot();
      const saved: Saved3DModel = {
        id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim() || 'My model',
        originalName: name.trim() || 'My model',
        originalFormat: sourceFormat.current,
        originalSize: bytes.byteLength,
        compressedSize: bytes.byteLength,
        savedDate: Date.now(),
        thumbnail,
        blob: bytes,
        triangleCount: 0,
        vertexCount: 0,
        meshCount: 0,
        materialCount: 0,
        dimensions: { x: 0, y: 0, z: 0 },
      } as Saved3DModel;
      await ModelStorage.saveModel(saved);
      haptics.trigger('success');
      onSaved(saved.name);
      setStage('choose');
      onClose();
    } catch {
      setError('Could not save it. It is still on your canvas to draw on.');
      setStage('adjusting');
    }
  };

  if (!isOpen) return null;

  const panel = isLight ? 'bg-white text-neutral-900' : 'bg-[#0e1015] text-neutral-100';
  const soft = isLight ? 'bg-neutral-100' : 'bg-white/5';

  return (
    <div className={`fixed inset-0 z-[56] flex flex-col ${panel}`}>
      <div className="shrink-0 flex items-center justify-between px-4 h-16">
        <h1 className="text-lg font-bold">Add a model</h1>
        <button
          type="button"
          onClick={() => {
            setStage('choose');
            onClose();
          }}
          className={`w-11 h-11 rounded-full flex items-center justify-center ${soft}`}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <p className="mx-4 mb-2 text-sm text-amber-500 font-medium">{error}</p>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {stage === 'saving' && (
          <div className="h-40 flex items-center justify-center gap-3 opacity-70">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-bold">Working…</span>
          </div>
        )}

        {stage === 'choose' && (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`w-full rounded-3xl border-2 border-dashed p-8 flex flex-col items-center gap-3
                transition-all active:scale-95 ${
                  isLight ? 'border-sky-400/60 hover:bg-sky-50' : 'border-sky-400/40 hover:bg-sky-400/10'
                }`}
            >
              <Upload className="w-12 h-12 text-sky-400" />
              <span className="text-base font-bold">Choose a file</span>
              <span className="text-xs opacity-60">.glb works best</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".glb,.gltf,.obj,.fbx,.stl,.ply,.dae,.3ds"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void handleFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </>
        )}

        {stage === 'adjusting' && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold opacity-60">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`mt-1 w-full h-12 rounded-2xl px-4 text-base font-bold outline-none ${soft}`}
                placeholder="My model"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold opacity-60">Size</label>
                <span className="text-xs font-mono opacity-60">{size.toFixed(1)}x</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs opacity-50">small</span>
                <input
                  type="range"
                  min={0.25}
                  max={4}
                  step={0.05}
                  value={size}
                  onChange={(e) => applySize(parseFloat(e.target.value))}
                  className="flex-1 h-11 accent-sky-400"
                />
                <span className="text-xs opacity-50">big</span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleTexture}
              className={`w-full h-14 rounded-2xl flex items-center justify-between px-4 ${soft}`}
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                {textured ? <Image className="w-5 h-5" /> : <Box className="w-5 h-5" />}
                Colours from the file
              </span>
              <span
                className={`w-14 h-8 rounded-full relative transition-colors ${
                  textured ? 'bg-sky-400' : 'bg-neutral-500/40'
                }`}
              >
                <span
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${
                    textured ? 'left-7' : 'left-1'
                  }`}
                />
              </span>
            </button>

            <p className="text-xs opacity-50 leading-relaxed">
              It is on your canvas already — turn the wheel and look around before you keep it.
            </p>
          </div>
        )}
      </div>

      {stage === 'adjusting' && (
        <div className="shrink-0 px-4 pb-5 pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenFineTuning();
            }}
            className={`h-14 px-4 rounded-2xl flex items-center gap-2 text-sm font-bold ${soft}`}
          >
            <Sliders className="w-4 h-4" />
            Fine tuning
          </button>
          <button
            type="button"
            onClick={() => void keep()}
            className="flex-1 h-14 rounded-2xl bg-sky-400 text-zinc-950 font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Check className="w-5 h-5" />
            Keep it
          </button>
        </div>
      )}
    </div>
  );
};
