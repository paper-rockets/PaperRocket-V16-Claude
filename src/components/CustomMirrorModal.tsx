import React from 'react';
import { CustomMirrorPlane, NumpadTarget } from '../types';
import {
  Compass,
  RotateCcw,
  Eye,
  Check,
  X,
  Sliders,
  Move,
  RotateCw,
  Camera,
} from 'lucide-react';
import { StudioEngine } from '../core/studioEngine';

interface CustomMirrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mirrorConfig: CustomMirrorPlane;
  setMirrorConfig: React.Dispatch<React.SetStateAction<CustomMirrorPlane>>;
  engine: StudioEngine | null;
  onOpenNumpad: (target: NumpadTarget) => void;
  theme?: 'light' | 'dark';
}

export const CustomMirrorModal: React.FC<CustomMirrorModalProps> = ({
  isOpen,
  onClose,
  mirrorConfig,
  setMirrorConfig,
  engine,
  onOpenNumpad,
  theme = 'dark',
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleAlignToCamera = () => {
    if (!engine) return;
    const camInfo = engine.getCameraOrientationForMirror();
    if (camInfo) {
      setMirrorConfig((prev) => ({
        ...prev,
        origin: { ...camInfo.target },
        normal: { ...camInfo.normal },
        rotation: { ...camInfo.rotation },
        enabled: true,
        visible: true,
      }));
      engine.setCustomMirrorPlane(camInfo.target, camInfo.normal, true);
    }
  };

  const handleResetToCenter = () => {
    const defaultPlane = {
      enabled: true,
      origin: { x: 0, y: 0, z: 0 },
      normal: { x: 1, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      visible: true,
      opacity: 0.4,
    };
    setMirrorConfig(defaultPlane);
    engine?.setCustomMirrorPlane(defaultPlane.origin, defaultPlane.normal, true);
  };

  const handleToggleEnable = () => {
    const nextEnabled = !mirrorConfig.enabled;
    setMirrorConfig((prev) => ({ ...prev, enabled: nextEnabled, visible: nextEnabled }));
    engine?.toggleCustomMirrorPlane(nextEnabled);
  };

  return (
    <div className="fixed top-16 left-4 sm:left-20 z-30 w-80 select-none shadow-2xl rounded-2xl border backdrop-blur-2xl p-4 space-y-3 font-sans animate-in fade-in slide-in-from-left-2 duration-150 bg-[#18191d]/98 border-[#2c2e36] text-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Arbitrary 3D Mirror Plane
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Enable Toggle */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/90 border border-neutral-800">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              mirrorConfig.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
            }`}
          />
          <span className="text-xs font-semibold">Custom Plane Symmetry</span>
        </div>
        <button
          onClick={handleToggleEnable}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            mirrorConfig.enabled
              ? 'bg-emerald-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:text-white'
          }`}
        >
          {mirrorConfig.enabled ? 'Active' : 'Disabled'}
        </button>
      </div>

      {/* Origin Coordinates (P0) with Numpad */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
          Plane Origin (P₀)
        </span>
        <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
          {(['x', 'y', 'z'] as const).map((axis) => (
            <button
              key={axis}
              onClick={() =>
                onOpenNumpad({
                  id: `mirror_origin_${axis}`,
                  title: `Mirror Origin ${axis.toUpperCase()}`,
                  value: mirrorConfig.origin[axis],
                  min: -5.0,
                  max: 5.0,
                  step: 0.05,
                  unit: 'm',
                  onConfirm: (val) => {
                    const next = { ...mirrorConfig.origin, [axis]: val };
                    setMirrorConfig((prev) => ({ ...prev, origin: next }));
                    engine?.setCustomMirrorPlane(next, mirrorConfig.normal, mirrorConfig.enabled);
                  },
                })
              }
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between text-neutral-300"
            >
              <span className="text-neutral-500 font-bold uppercase">{axis}:</span>
              <span className="font-bold text-indigo-300">
                {mirrorConfig.origin[axis].toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Normal Direction (n) */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
          Plane Normal Vector (n̂)
        </span>
        <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
          {(['x', 'y', 'z'] as const).map((axis) => (
            <button
              key={axis}
              onClick={() =>
                onOpenNumpad({
                  id: `mirror_norm_${axis}`,
                  title: `Mirror Normal ${axis.toUpperCase()}`,
                  value: mirrorConfig.normal[axis],
                  min: -1.0,
                  max: 1.0,
                  step: 0.1,
                  unit: '',
                  onConfirm: (val) => {
                    const next = { ...mirrorConfig.normal, [axis]: val };
                    setMirrorConfig((prev) => ({ ...prev, normal: next }));
                    engine?.setCustomMirrorPlane(mirrorConfig.origin, next, mirrorConfig.enabled);
                  },
                })
              }
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between text-neutral-300"
            >
              <span className="text-neutral-500 font-bold uppercase">{axis}:</span>
              <span className="font-bold text-cyan-300">{mirrorConfig.normal[axis].toFixed(2)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Orientations */}
      <div className="pt-2 border-t border-neutral-800 grid grid-cols-2 gap-2">
        <button
          onClick={handleAlignToCamera}
          className="py-1.5 px-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/60 text-indigo-200 text-xs font-semibold flex items-center justify-center gap-1.5"
          title="Align mirror plane perpendicular to current camera view"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Align to View</span>
        </button>
        <button
          onClick={handleResetToCenter}
          className="py-1.5 px-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Center YZ</span>
        </button>
      </div>
    </div>
  );
};
