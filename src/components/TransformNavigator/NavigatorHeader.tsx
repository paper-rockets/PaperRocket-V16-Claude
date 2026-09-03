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
  rotationAxis?: 'x' | 'y' | 'z';
  onRotationAxisChange?: (axis: 'x' | 'y' | 'z') => void;
  onCopy?: () => void;
  onPaste?: () => void;
  clipboardCount?: number;
  scaleFactor?: number;
  onScaleCycle?: () => void;
  onScaleSet?: (scale: number) => void;
  sensitivity?: number;
  onSensitivityChange?: (s: number) => void;
  theme?: 'light' | 'dark';
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
  theme = 'dark',
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
  rotationAxis,
  onRotationAxisChange,
  scaleFactor,
  onScaleCycle,
  onMinimize,
}) => {
  const isLight = theme === 'light';
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

  // Determine current display label and compact pill label
  let displayLabel = targetName;
  let shortLabel = targetName;
  if (targetScope === 'active_layer') {
    const activeL = layers.find((l) => l.id === activeLayerId);
    if (activeL) {
      displayLabel = activeL.name;
      shortLabel = activeL.name;
    } else {
      displayLabel = 'Active Layer';
      shortLabel = 'Layer';
    }
  } else if (targetScope === 'model') {
    if (activeModelId) {
      const activeM = models.find((m) => m.id === activeModelId);
      if (activeM) {
        displayLabel = activeM.name;
        shortLabel = activeM.name;
      }
    } else if (models.length > 0) {
      displayLabel = models[0].name;
      shortLabel = models[0].name;
    } else {
      displayLabel = '3D Model';
      shortLabel = 'Model';
    }
  } else if (targetScope === 'strokes') {
    displayLabel = 'All Curves';
    shortLabel = 'Curves';
  } else if (targetScope === 'all') {
    displayLabel = 'All Objects';
    shortLabel = 'All';
  }

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.tagName === 'INPUT' ||
      target.closest('input') ||
      target.closest('#navigator-target-dropdown-panel') ||
      target.closest('[role="listbox"]')
    ) {
      return;
    }
    onHeaderDragStart?.(e);
  };

  return (
    <div
      id="transform-navigator-header"
      onPointerDown={handleHeaderPointerDown}
      className={`w-[62px] shrink-0 flex flex-col justify-between items-center ${
        isLight
          ? 'border-l border-neutral-200/90 bg-neutral-50/50'
          : 'border-l border-white/[0.08]'
      } select-none relative p-1.5 gap-1.5 self-stretch z-30 cursor-grab active:cursor-grabbing`}
    >
      {/* 1. Top Section: Dedicated Drag Grip Handle */}
      <div
        id="navigator-drag-grip-handle"
        onPointerDown={onHeaderDragStart}
        className={`w-full flex items-center justify-center py-1.5 cursor-grab active:cursor-grabbing ${
          isLight ? 'hover:bg-neutral-200/60' : 'hover:bg-white/10'
        } rounded-md transition-colors select-none`}
        title="Drag to move navigator"
        aria-label="Drag to move navigator"
      >
        <div
          className={`w-6 h-1 rounded-full ${
            isLight ? 'bg-neutral-400 hover:bg-neutral-600' : 'bg-white/40 hover:bg-white/70'
          } transition-colors pointer-events-none`}
        />
      </div>

      {/* Main Mode Switcher: Vertically Stacked Icon Pill Box */}
      <div
        id="navigator-mode-segmented-control"
        className={`w-full flex flex-col p-1 rounded-xl ${
          isLight ? 'bg-neutral-200/80 border border-neutral-300/80' : 'bg-[#101114] border border-white/[0.08]'
        } shadow-inner gap-1`}
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
              className={`w-full py-2 flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer ${
                isSelected
                  ? isLight
                    ? 'bg-neutral-900 text-white shadow-md font-extrabold scale-[1.02]'
                    : 'bg-white text-zinc-950 shadow-md font-extrabold scale-[1.02]'
                  : isLight
                  ? 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {isRotate ? (
                <Rotate3d className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <Move className="w-5 h-5 stroke-[2.2]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Rotation Axis Switcher (X | Y | Z) in Move mode */}
      {rotationAxis && onRotationAxisChange && mode !== 'tactile_ball' && (
        <div
          id="navigator-rotation-axis-control"
          className={`w-full flex p-0.5 rounded-lg ${
            isLight ? 'bg-neutral-200/80 border border-neutral-300/80' : 'bg-[#101114] border border-white/[0.08]'
          } shadow-inner gap-0.5 select-none`}
          role="radiogroup"
          aria-label="Select Rotation Axis"
        >
          {(['x', 'y', 'z'] as const).map((axis) => {
            const isSelected = rotationAxis === axis;
            const activeStyles = {
              x: 'bg-rose-500/25 text-rose-500 dark:text-rose-300 border-rose-500/40 font-bold',
              y: 'bg-emerald-500/25 text-emerald-600 dark:text-emerald-300 border-emerald-500/40 font-bold',
              z: 'bg-sky-500/25 text-sky-600 dark:text-sky-300 border-sky-500/40 font-bold',
            };
            const titles = {
              x: 'Rotate X Axis (Pitch / Elevation)',
              y: 'Rotate Y Axis (Turntable / Yaw)',
              z: 'Rotate Z Axis (Roll / Screen-Space)',
            };
            return (
              <button
                key={axis}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  onRotationAxisChange(axis);
                  haptics.trigger('mode-switch');
                }}
                className={`flex-1 py-1 flex items-center justify-center rounded text-[9.5px] font-bold transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? `${activeStyles[axis]} border shadow-sm`
                    : isLight
                    ? 'text-neutral-500 hover:text-neutral-800 hover:bg-white/40 border border-transparent'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                }`}
                title={titles[axis]}
              >
                {axis.toUpperCase()}
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Middle Spacer Drag Zone */}
      <div
        onPointerDown={onHeaderDragStart}
        className={`w-full h-1 cursor-grab active:cursor-grabbing ${
          isLight ? 'hover:bg-neutral-200/50' : 'hover:bg-white/5'
        } rounded transition-colors select-none shrink-0`}
        title="Drag to move navigator"
      />

      {/* Compact Target Layer / Model Selector Button */}
      <div className="relative w-full">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setShowTargetDropdown(!showTargetDropdown)}
          title={`Target: ${displayLabel} (Click to select)`}
          aria-label="Select target layer or 3D model"
          className={`w-full flex items-center justify-between px-1.5 py-1 rounded-md ${
            isLight
              ? 'bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 border border-neutral-200'
              : 'bg-white/5 hover:bg-white/10 text-zinc-300'
          } text-[9px] font-semibold transition-all group cursor-pointer`}
        >
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                targetScope === 'model'
                  ? 'bg-sky-500'
                  : targetScope === 'all'
                  ? 'bg-amber-500'
                  : targetScope === 'strokes'
                  ? 'bg-emerald-500'
                  : 'bg-zinc-400'
              }`}
            />
            <span
              className={`${
                isLight ? 'text-neutral-800' : 'text-zinc-200'
              } font-bold truncate text-[9px] leading-tight text-left`}
            >
              {shortLabel}
            </span>
          </div>
          <ChevronDown
            className={`w-2.5 h-2.5 ${
              isLight ? 'text-neutral-500 group-hover:text-neutral-900' : 'text-zinc-400 group-hover:text-zinc-200'
            } shrink-0 ml-0.5 transition-transform ${
              showTargetDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Interactive Target Selection Popover Dropdown (floats to left) */}
        {showTargetDropdown && (
          <div
            ref={dropdownRef}
            className={`absolute right-full top-0 mr-2 w-52 max-h-72 overflow-y-auto rounded-2xl ${
              isLight
                ? 'bg-white/98 border border-neutral-200/90 text-neutral-800 shadow-[0_20px_45px_rgba(0,0,0,0.15)] divide-neutral-100'
                : 'bg-[#14151a]/98 border border-white/15 text-white shadow-[0_20px_45px_rgba(0,0,0,0.85)] divide-white/[0.06]'
            } backdrop-blur-2xl py-1.5 z-50 text-xs divide-y animate-in fade-in zoom-in-95 duration-100`}
          >
            {/* 1. Layers Section */}
            <div className="py-1 px-1">
              <div
                className={`px-2 py-0.5 text-[9.5px] uppercase tracking-wider font-bold ${
                  isLight ? 'text-neutral-500' : 'text-zinc-400'
                } flex items-center gap-1.5`}
              >
                <LayersIcon className="w-3 h-3" />
                <span>Layers</span>
              </div>
              {layers.length === 0 ? (
                <div
                  className={`px-2 py-1 text-[10.5px] ${
                    isLight ? 'text-neutral-400' : 'text-zinc-500'
                  } italic`}
                >
                  No layers
                </div>
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
                          ? isLight
                            ? 'bg-neutral-900 text-white font-bold'
                            : 'bg-white/15 text-white font-bold'
                          : isLight
                          ? 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950'
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
                      {isLayerActive && (
                        <Check className={`w-3.5 h-3.5 ${isLight ? 'text-white' : 'text-white'} shrink-0`} />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* 2. 3D Models Section */}
            <div className="py-1 px-1">
              <div
                className={`px-2 py-0.5 text-[9.5px] uppercase tracking-wider font-bold ${
                  isLight ? 'text-neutral-500' : 'text-zinc-400'
                } flex items-center gap-1.5`}
              >
                <Box className="w-3 h-3 text-sky-500" />
                <span>3D Models ({models.length})</span>
              </div>
              {models.length === 0 ? (
                <div
                  className={`px-2 py-1 text-[10.5px] ${
                    isLight ? 'text-neutral-400' : 'text-zinc-500'
                  } italic`}
                >
                  No 3D models loaded
                </div>
              ) : (
                models.map((model, idx) => {
                  const isModelActive =
                    targetScope === 'model' && (activeModelId === model.id || (!activeModelId && idx === 0));
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => handleSelectModelItem(model)}
                      className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between text-[11px] transition-colors cursor-pointer ${
                        isModelActive
                          ? 'bg-sky-500/20 text-sky-700 dark:text-sky-200 font-bold border border-sky-500/30'
                          : isLight
                          ? 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950'
                          : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Box className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span className="truncate">{model.name}</span>
                      </div>
                      {isModelActive && <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* 3. Global Scopes Section */}
            <div className="py-1 px-1">
              <div
                className={`px-2 py-0.5 text-[9.5px] uppercase tracking-wider font-bold ${
                  isLight ? 'text-neutral-500' : 'text-zinc-400'
                } flex items-center gap-1.5`}
              >
                <Shapes className="w-3 h-3 text-amber-500" />
                <span>Global Scopes</span>
              </div>
              <button
                type="button"
                onClick={() => handleSelectScopeItem('strokes')}
                className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between text-[11px] transition-colors cursor-pointer ${
                  targetScope === 'strokes'
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 font-bold'
                    : isLight
                    ? 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>All Curves (All Layers)</span>
                {targetScope === 'strokes' && (
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSelectScopeItem('all')}
                className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between text-[11px] transition-colors cursor-pointer ${
                  targetScope === 'all'
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-200 font-bold'
                    : isLight
                    ? 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>All Objects (Scene)</span>
                {targetScope === 'all' && (
                  <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Lower Spacer Drag Zone */}
      <div
        onPointerDown={onHeaderDragStart}
        className={`w-full flex-1 min-h-[16px] cursor-grab active:cursor-grabbing ${
          isLight ? 'hover:bg-neutral-200/50' : 'hover:bg-white/5'
        } rounded transition-colors select-none`}
        title="Drag to move navigator"
      />

      {/* Action Buttons: Reset, Scale, & Minimize */}
      <div
        className={`flex items-center justify-between gap-1 w-full pt-1 border-t ${
          isLight ? 'border-neutral-200' : 'border-white/[0.06]'
        }`}
      >
        {/* Reset Origin Button */}
        <button
          id="navigator-btn-reset"
          type="button"
          onClick={handleResetClick}
          title="Reset Transform Values"
          aria-label="Reset transform values"
          className={`flex-1 py-1 rounded-md ${
            isLight
              ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/10'
          } transition-all duration-150 flex items-center justify-center cursor-pointer`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Scale Cycle Button */}
        {onScaleCycle && (
          <button
            id="navigator-btn-scale"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onScaleCycle();
            }}
            title={`Scale: ${Math.round((scaleFactor || 1) * 100)}% (Click to cycle size)`}
            aria-label="Cycle tool scale"
            className={`px-1 py-1 rounded-md text-[9px] font-mono font-bold ${
              isLight
                ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            } transition-all duration-150 flex items-center justify-center cursor-pointer select-none`}
          >
            {Math.round((scaleFactor || 1) * 100)}%
          </button>
        )}

        {/* Minimize Button */}
        <button
          id="navigator-btn-minimize"
          type="button"
          onClick={onMinimize}
          title="Minimize Widget"
          aria-label="Minimize widget"
          className={`flex-1 py-1 rounded-md ${
            isLight
              ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/70'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          } transition-all duration-150 flex items-center justify-center cursor-pointer`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
