import React, { useState } from 'react';
import { StudioEngine } from '../core/studioEngine';
import { ModelDisplayMode, ModelMetadata } from '../types';
import {
  Layers,
  Eye,
  EyeOff,
  Crosshair,
  Maximize2,
  Box,
  Palette,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface ModelDisplayPanelProps {
  engine: StudioEngine | null;
  activeModelName: string;
  metadata: ModelMetadata | null;
  displayMode: ModelDisplayMode;
  onDisplayModeChange: (mode: ModelDisplayMode) => void;
  onOpenLibrary: () => void;
  onClose?: () => void;
}

export const ModelDisplayPanel: React.FC<ModelDisplayPanelProps> = ({
  engine,
  activeModelName,
  metadata,
  displayMode,
  onDisplayModeChange,
  onOpenLibrary,
  onClose,
}) => {
  const [modelOpacity, setModelOpacityState] = useState(1.0);
  const [wireframeOpacity, setWireframeOpacityState] = useState(0.0);
  const [isVisible, setIsVisible] = useState(true);

  const [cloneStatus, setCloneStatus] = useState<string | null>(null);

  const handleClone = () => {
    if (!engine) return;
    const cloned = engine.cloneModel();
    if (cloned) {
      setCloneStatus('Cloned!');
      setTimeout(() => setCloneStatus(null), 1500);
    }
  };

  const handleOpacityChange = (val: number) => {
    setModelOpacityState(val);
    engine?.setModelOpacity(val);
  };

  const handleWireframeChange = (val: number) => {
    setWireframeOpacityState(val);
    engine?.setModelWireframeOpacity(val);
  };

  const handleToggleVisibility = () => {
    const next = engine ? engine.toggleModelVisibility() : !isVisible;
    setIsVisible(next);
  };

  const handleCenter = () => {
    engine?.centerModelToOrigin();
  };

  const handleResetCamera = () => {
    engine?.snapToView('isometric');
  };

  return (
    <div
      id="model-display-panel"
      className="w-80 rounded-2xl bg-neutral-900/95 border border-neutral-800 shadow-2xl p-4 flex flex-col gap-3 text-neutral-200 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-neutral-100 uppercase tracking-wider">
            3D Model & Display Mode
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Active Model Info & Switcher */}
      <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <div className="text-xs font-semibold text-neutral-100 truncate">{activeModelName}</div>
          <div className="text-[10px] text-neutral-400 mt-0.5 flex gap-2">
            <span>{metadata ? `${(metadata.triangleCount / 1000).toFixed(1)}k tris` : '3D Mesh'}</span>
            <span>•</span>
            <span>{metadata ? `${(metadata.vertexCount / 1000).toFixed(1)}k verts` : 'Draco'}</span>
          </div>
        </div>
        <button
          onClick={onOpenLibrary}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors whitespace-nowrap shadow-sm shadow-blue-500/20"
        >
          Change Model
        </button>
      </div>

      {/* Display Mode (Texture vs Clay White) */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
          Surface Rendering Shading
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onDisplayModeChange('texture')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
              displayMode === 'texture'
                ? 'bg-blue-950/40 border-blue-500/60 text-white shadow-sm'
                : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-blue-400" />
            <span>Texture (Original)</span>
          </button>

          <button
            onClick={() => onDisplayModeChange('clay')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
              displayMode === 'clay'
                ? 'bg-blue-950/40 border-blue-500/60 text-white shadow-sm'
                : 'bg-neutral-950/40 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-neutral-300" />
            <span>Plain White Canvas</span>
          </button>
        </div>
      </div>

      {/* Sliders: Model Opacity & Wireframe */}
      <div className="space-y-2 text-[11px] pt-1">
        <div>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>Model Surface Opacity</span>
            <span className="text-neutral-200 font-mono">{Math.round(modelOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.02"
            value={modelOpacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-neutral-400 mb-1">
            <span>Wireframe Polygon Overlay</span>
            <span className="text-neutral-200 font-mono">{Math.round(wireframeOpacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={wireframeOpacity}
            onChange={(e) => handleWireframeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>

      {/* Action Buttons: Clone, Hide/Show, Center, Reset Camera */}
      <div className="pt-2 border-t border-neutral-800 grid grid-cols-4 gap-1.5 text-xs">
        <button
          onClick={handleClone}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-neutral-950/40 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-center transition-all"
          title="Clone 3D Model with offset"
        >
          <Layers className="w-4 h-4 text-purple-400" />
          <span className="text-[10px]">{cloneStatus || 'Clone'}</span>
        </button>

        <button
          onClick={handleToggleVisibility}
          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border text-center transition-all ${
            isVisible
              ? 'bg-neutral-950/40 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
              : 'bg-red-950/30 border-red-800/60 text-red-300'
          }`}
          title={isVisible ? 'Hide Model' : 'Show Model'}
        >
          {isVisible ? <Eye className="w-4 h-4 text-blue-400" /> : <EyeOff className="w-4 h-4" />}
          <span className="text-[10px]">{isVisible ? 'Hide' : 'Show'}</span>
        </button>

        <button
          onClick={handleCenter}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-neutral-950/40 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-center transition-all"
          title="Recenter Camera & Model"
        >
          <Crosshair className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px]">Center</span>
        </button>

        <button
          onClick={handleResetCamera}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-neutral-950/40 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 text-center transition-all"
          title="Reset Isometric Camera"
        >
          <RotateCcw className="w-4 h-4 text-amber-400" />
          <span className="text-[10px]">Reset Cam</span>
        </button>
      </div>
    </div>
  );
};
