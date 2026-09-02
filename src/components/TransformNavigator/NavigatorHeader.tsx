import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  ChevronDown,
  Layers as LayersIcon,
  Box,
  Check,
  Shapes,
  Minus,
  Move,
  Rotate3d,
} from 'lucide-react';
import { TransformMode, AccessibilityMode, Layer, LoadedModelInfo, TransformTargetScope } from '../../types';
import { haptics } from '../../utils/haptics';

export interface NavigatorTabItem {
  id: string;
  label: string;
}

export interface NavigatorHeaderProps {
  mode: TransformMode;
  onModeChange: (mode: TransformMode) => void;
  tabs?: NavigatorTabItem[];
  showSegmentedControl?: boolean;
  isLocked?: boolean;
  onLockToggle?: () => void;
  onReset: () => void;
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
  onClose?: () => void;
  onMinimize?: () => void;
  targetName?: string;
  layers?: Layer[];
  activeLayerId?: string;
  onSelectLayer?: (layerId: string) => void;
  models?: LoadedModelInfo[];
  activeModelId?: string | null;
  onSelectModel?: (modelId: string | null) => void;
  targetScope?: TransformTargetScope;
  onSelectTargetScope?: (scope: TransformTargetScope) => void;
  accessibilityMode?: AccessibilityMode;
  onAccessibilityModeToggle?: () => void;
  onHeaderDragStart?: (e: React.PointerEvent) => void;
  onCopy?: () => void;
  onPaste?: () => void;
  clipboardCount?: number;
  scaleFactor?: number;
  onScaleCycle?: () => void;
  onScaleSet?: (scale: number) => void;
  sensitivity?: number;
  onSensitivityChange?: (s: number) => void;
}

const DEFAULT_TABS: NavigatorTabItem[] = [
  { id: '2d', label: 'Move' },
  { id: 'tactile', label: 'Rotate' },
];

export const NavigatorHeader: React.FC<NavigatorHeaderProps> = ({
  mode,
  onModeChange,
  tabs = DEFAULT_TABS,
  onReset,
  targetName = 'Main Curves',
  layers = [],
  activeLayerId,
  onSelectLayer,
  models = [],
  activeModelId,
  onSelectModel,
  targetScope = 'active_layer',
  onSelectTargetScope,
  onHeaderDragStart,
  onMinimize,
}) => {
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!showTargetDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setShowTargetDropdown(false);
      }
    };
    window.addEventListener('pointerdown', handleClickOutside);
    return () => window.removeEventListener('pointerdown', handleClickOutside);
  }, [showTargetDropdown]);

  const handleModeSwitch = (newMode: string) => {
    if (newMode !== mode) {
      haptics.trigger('mode-switch');
      onModeChange(newMode);
    }
  };

  const handleResetClick = () => {
    haptics.trigger('heavy');
    onReset();
  };

  const handleSelectLayerItem = (layer: Layer) => {
    haptics.trigger('light');
    onSelectLayer?.(layer.id);
    onSelectTargetScope?.('active_layer');
    setShowTargetDropdown(false);
  };

  const handleSelectModelItem = (model: LoadedModelInfo) => {
    haptics.trigger('light');
    onSelectModel?.(model.id);
    onSelectTargetScope?.('model');
    setShowTargetDropdown(false);
  };

  const handleSelectScopeItem = (scope: TransformTargetScope) => {
    haptics.trigger('light');
    onSelectTargetScope?.(scope);
    setShowTargetDropdown(false);
  };

  // Determine current display label
  let displayLabel = targetName;
  if (targetScope === 'active_layer') {
    const activeL = layers.find((l) => l.id === activeLayerId);
    if (activeL) displayLabel = activeL.name;
  } else if (targetScope === 'model') {
    if (activeModelId) {
      const activeM = models.find((m) => m.id === activeModelId);
      if (activeM) displayLabel = activeM.name;
    } else if (models.length > 0) {
      displayLabel = models[0].name;
    }
  } else if (targetScope === 'strokes') {
    displayLabel = 'All Curves';
  } else if (targetScope === 'all') {
    displayLabel = 'All Objects';
  }

  return (
    <div
      id="transform-navigator-header"
      className="w-[62px] shrink-0 flex flex-col justify-between items-center border-l border-white/[0.08] select-none relative p-1.5 gap-1.5 self-stretch z-30"
    >
      {/* Dedicated Drag Grip Handle */}
      <div
        onPointerDown={onHeaderDragStart}
        className="w-full flex items-center justify-center py-0.5 cursor-grab active:cursor-grabbing hover:bg-white/10 rounded-md transition-colors"
        title="Drag to move navigator"
        role="button"
        aria-label="Drag to move navigator"
      >
        <div className="w-6 h-1 rounded-full bg-white/30 hover:bg-white/60 transition-colors pointer-events-none" />
      </div>

      {/* Main Mode Switcher: Mini Icon Pill Box */}
      <div
        id="navigator-mode-segmented-control"
        className="w-full flex p-0.5 rounded-lg bg-[#101114] border border-white/[0.08] shadow-inner gap-0.5"
        role="tablist"
        aria-label="Transform Dimension Mode"
      >
        {tabs.map((tab) => {
          const isSelected = mode === tab.id;
          const isRotate = tab.id === 'tactile' || tab.id === 'tactile_ball' || tab.label.toLowerCase().includes('rot');
          return (
            <button
              key={tab.id}
              id={`navigator-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              title={tab.label}
              onClick={() => handleModeSwitch(tab.id)}
              className={`flex-1 py-1.5 flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-white text-zinc-950 shadow-sm font-extrabold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {isRotate ? (
                <Rotate3d className="w-3.5 h-3.5 stroke-[2.2]" />
              ) : (
                <Move className="w-3.5 h-3.5 stroke-[2.2]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Compact Target Layer / Model Selector Button */}
      <div className="relative w-full">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setShowTargetDropdown(!showTargetDropdown)}
          title={`Target: ${displayLabel} (Click to select)`}
          aria-label="Select target layer or 3D model"
          className="w-full flex items-center justify-between px-1 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[9px] text-zinc-300 font-semibold transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-1 min-w-0">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                targetScope === 'model'
                  ? 'bg-sky-400'
                  : targetScope === 'all'
                  ? 'bg-amber-400'
                  : targetScope === 'strokes'
                  ? 'bg-emerald-400'
                  : 'bg-zinc-400'
              }`}
            />
            <span className="text-zinc-200 font-bold truncate text-[9px] leading-tight text-left">
              {displayLabel.length > 4 ? `${displayLabel.slice(0, 4)}..` : displayLabel}
            </span>
          </div>
          <ChevronDown
            className={`w-2.5 h-2.5 text-zinc-400 group-hover:text-zinc-200 shrink-0 transition-transform ${
              showTargetDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Interactive Target Selection Popover Dropdown (floats to left) */}
        {showTargetDropdown && (
          <div
            ref={dropdownRef}
            className="absolute right-full top-0 mr-2 w-52 max-h-72 overflow-y-auto rounded-2xl bg-[#14151a]/98 backdrop-blur-2xl border border-white/15 shadow-[0_20px_45px_rgba(0,0,0,0.85)] py-1.5 z-50 text-xs text-white divide-y divide-white/[0.06] animate-in fade-in zoom-in-95 duration-100"
          >
            {/* 1. Layers Section */}
            <div className="py-1 px-1">
              <div className="px-2 py-0.5 text-[9.5px] uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-1.5">
                <LayersIcon className="w-3 h-3 text-zinc-400" />
                <span>Layers</span>
              </div>
              {layers.length === 0 ? (
                <div className="px-2 py-1 text-[10.5px] text-zinc-500 italic">No layers</div>
              ) : (
                layers.map((layer) => {
                  const isLayerActive = targetScope === 'active_layer' && activeLayerId === layer.id;
                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => handleSelectLayerItem(layer)}
                      className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between text-[11px] transition-colors cursor-pointer ${
                        isLayerActive
                          ? 'bg-white/15 text-white font-bold'
                          : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: layer.colorTag || '#38bdf8' }}
                        />
                        <span className="truncate">{layer.name}</span>
                      </div>
                      {isLayerActive && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* 2. 3D Models Section */}
            <div className="py-1 px-1">
              <div className="px-2 py-0.5 text-[9.5px] uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-1.5">
                <Box className="w-3 h-3 text-sky-400" />
                <span>3D Models ({models.length})</span>
              </div>
              {models.length === 0 ? (
                <div className="px-2 py-1 text-[10.5px] text-zinc-500 italic">No 3D models loaded</div>
              ) : (
                models.map((model, idx) => {
                  const isModelActive = targetScope === 'model' && (activeModelId === model.id || (!activeModelId && idx === 0));
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleSelectModelItem(model)}
                      className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between text-[11px] transition-colors cursor-pointer ${
                        isModelActive
                          ? 'bg-sky-500/20 text-sky-200 font-bold border border-sky-500/30'
                          : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Box className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="truncate">{model.name}</span>
                      </div>
                      {isModelActive && <Check className="w-3.5 h-3.5 text-sky-300 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* 3. Global Scopes Section */}
            <div className="py-1 px-1">
              <div className="px-2 py-0.5 text-[9.5px] uppercase tracking-wider font-bold text-zinc-400 flex items-center gap-1.5">
                <Shapes className="w-3 h-3 text-amber-400" />
                <span>Global Scopes</span>
              </div>
              <button
                type="button"
                onClick={() => handleSelectScopeItem('strokes')}
                className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between text-[11px] transition-colors cursor-pointer ${
                  targetScope === 'strokes'
                    ? 'bg-emerald-500/20 text-emerald-200 font-bold'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>All Curves (All Layers)</span>
                {targetScope === 'strokes' && <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectScopeItem('all')}
                className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between text-[11px] transition-colors cursor-pointer ${
                  targetScope === 'all'
                    ? 'bg-amber-500/20 text-amber-200 font-bold'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>All Objects (Scene)</span>
                {targetScope === 'all' && <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons: Reset & Minimize */}
      <div className="flex items-center justify-between gap-1 w-full pt-1 border-t border-white/[0.06]">
        {/* Reset Origin Button */}
        <button
          id="navigator-btn-reset"
          type="button"
          onClick={handleResetClick}
          title="Reset Transform Values"
          aria-label="Reset transform values"
          className="flex-1 py-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-all duration-150 flex items-center justify-center cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Minimize Button */}
        <button
          id="navigator-btn-minimize"
          type="button"
          onClick={onMinimize}
          title="Minimize Widget"
          aria-label="Minimize widget"
          className="flex-1 py-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-150 flex items-center justify-center cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
