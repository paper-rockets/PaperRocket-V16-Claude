import React, { useState } from 'react';
import { HolisticStrokeDNA, BrushSettings } from '../types';
import {
  Dna,
  Check,
  Zap,
  Sliders,
  Layers,
  Sparkles,
  Palette,
  Droplet,
  Flame,
  Scissors,
  X,
  ArrowRight,
} from 'lucide-react';

interface HolisticDNAInspectorProps {
  dna: HolisticStrokeDNA | null;
  onClose: () => void;
  onInjectDNA: (dna: HolisticStrokeDNA) => void;
  theme?: 'light' | 'dark';
}

export const HolisticDNAInspector: React.FC<HolisticDNAInspectorProps> = ({
  dna,
  onClose,
  onInjectDNA,
  theme = 'dark',
}) => {
  const [injected, setInjected] = useState<boolean>(false);

  if (!dna) return null;

  const handleInject = () => {
    onInjectDNA(dna);
    setInjected(true);
    setTimeout(() => {
      setInjected(false);
      onClose();
    }, 800);
  };

  const getSourceLabel = (src: HolisticStrokeDNA['sourceType']) => {
    switch (src) {
      case 'stroke':
        return '3D Ribbon / Tube Stroke';
      case 'model_mesh':
        return 'PBR Model Surface Mesh';
      case 'pixel_framebuffer':
      default:
        return 'WebGL Framebuffer';
    }
  };

  return (
    <div
      id="holistic-dna-inspector"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div
        className={`w-96 rounded-2xl p-4 shadow-2xl border backdrop-blur-xl flex flex-col gap-3 select-none ${
          theme === 'light'
            ? 'bg-white/95 border-neutral-200 text-neutral-800 shadow-neutral-300/50'
            : 'bg-[#14161d]/95 border-[#2b2e3a] text-[#e2e4ea] shadow-black/70'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-2.5 border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Dna className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs leading-none flex items-center gap-1.5">
                <span>Holistic Stroke DNA</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">
                  Captured
                </span>
              </div>
              <div className="text-[10px] text-neutral-400 mt-0.5">
                {getSourceLabel(dna.sourceType)}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* DNA Attributes Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Swatch & Color */}
          <div className="p-2.5 rounded-xl bg-neutral-950/40 border border-white/5 flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg border border-white/20 shadow-inner flex-shrink-0"
              style={{ backgroundColor: dna.colorHex }}
            />
            <div className="overflow-hidden">
              <div className="text-[10px] text-neutral-400">Hex Code</div>
              <div className="font-mono font-bold text-neutral-200 truncate">
                {dna.colorHex.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Material Shader */}
          <div className="p-2.5 rounded-xl bg-neutral-950/40 border border-white/5 flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] text-neutral-400">Material Shader</div>
              <div className="font-semibold text-neutral-200 capitalize">
                {dna.materialType}
              </div>
            </div>
          </div>

          {/* Size & Opacity */}
          <div className="p-2.5 rounded-xl bg-neutral-950/40 border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-neutral-400">Brush Size</div>
              <div className="font-mono text-neutral-200 font-semibold">
                {(dna.size * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 text-right">Opacity</div>
              <div className="font-mono text-neutral-200 font-semibold text-right">
                {Math.round(dna.opacity * 100)}%
              </div>
            </div>
          </div>

          {/* Roughness & Metalness */}
          <div className="p-2.5 rounded-xl bg-neutral-950/40 border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-neutral-400">Roughness</div>
              <div className="font-mono text-neutral-200 font-semibold">
                {Math.round(dna.roughness * 100)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 text-right">Metalness</div>
              <div className="font-mono text-neutral-200 font-semibold text-right">
                {Math.round(dna.metalness * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Profile & Pressure */}
        <div className="p-2.5 rounded-xl bg-neutral-950/40 border border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-neutral-400">Profile:</span>
            <span className="font-semibold text-neutral-200 capitalize">{dna.profile}</span>
          </div>
          {dna.shaderEffect && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
              {dna.shaderEffect}
            </span>
          )}
        </div>

        {/* Injection Action */}
        <button
          onClick={handleInject}
          className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
            injected
              ? 'bg-emerald-500 text-white'
              : 'bg-sky-500 hover:bg-sky-400 text-white active:scale-98'
          }`}
        >
          {injected ? (
            <>
              <Check className="w-4 h-4" />
              <span>DNA Injected to Active Brush!</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Inject DNA into Active Brush</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
