import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  Unlock,
  RotateCcw,
  PenTool,
  Vibrate,
  Copy,
  ClipboardPaste,
  ChevronDown,
  Layers as LayersIcon,
  Box,
  Check,
  Shapes,
  SlidersHorizontal,
} from 'lucide-react';
import { TransformMode, AccessibilityMode, Layer, LoadedModelInfo, TransformTargetScope } from '../../types';
import { haptics } from '../../utils/haptics';

export interface NavigatorTabItem {
  id: string;
  label: string;
}

export interface NavigatorHeaderProps {
  mode: string;
  onModeChange: (mode: any) => void;
  tabs?: NavigatorTabItem[];
  isLocked: boolean;
  onLockToggle: () => void;
  onReset: () => void;
  isCollapsed?: boolean;
  onCollapseToggle?: () => void;
  onClose?: () => void;
  targetName?: string;
  layers?: Layer[];
  activeLayerId?: string;
  onSelectLayer?: (layerId: string) => void;
  models?: LoadedModelInfo[];
  activeModelId?: string | null;
  onSelectModel?: (modelId: string | null) => void;
  targetScope?: TransformTargetScope;
  onSelectTargetScope?: (scope: TransformTargetScope) => void;
  accessibilityMode: AccessibilityMode;
  onAccessibilityModeToggle: () => void;
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
  { id: '2d', label: '2D Dial' },
  { id: '3d', label: '3D Spatial' },
  { id: 'tactile', label: 'Tactile Ball' },
];

export const NavigatorHeader: React.FC<NavigatorHeaderProps> = ({
  mode,
  onModeChange,
  tabs = DEFAULT_TABS,
  isLocked,
  onLockToggle,
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
  accessibilityMode,
  onAccessibilityModeToggle,
  onCopy,
  onPaste,
  clipboardCount = 0,
  sensitivity = 0.5,
  onSensitivityChange,
}) => {
  const [hapticsEnabled, setHapticsEnabled] = useState(haptics.getEnabled());
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [pasteFeedback, setPasteFeedback] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [showSensitivityPopover, setShowSensitivityPopover] = useState(false);
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

  const handleLockClick = () => {
    haptics.trigger(isLocked ? 'unlock' : 'lock');
    onLockToggle();
  };

  const handleResetClick = () => {
    haptics.trigger('heavy');
    onReset();
  };

  const handleAccessibilityClick = () => {
    haptics.trigger('light');
    onAccessibilityModeToggle();
  };

  const handleHapticsToggle = () => {
    const next = haptics.toggleEnabled();
    setHapticsEnabled(next);
  };

  const handleCopyClick = () => {
    haptics.trigger('light');
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 900);
    onCopy?.();
  };

  const handlePasteClick = () => {
    haptics.trigger('medium');
    setPasteFeedback(true);
    setTimeout(() => setPasteFeedback(false), 900);
    onPaste?.();
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

  const gridColsClass =
    tabs.length === 2
      ? 'grid-cols-2'
      : tabs.length === 3
      ? 'grid-cols-3'
      : tabs.length === 4
      ? 'grid-cols-4'
      : 'grid-cols-3';

  return (
    <div id="transform-navigator-header" className="flex flex-col select-none border-b border-white/[0.08] relative cursor-grab active:cursor-grabbing">
      {/* Top Drag Grip Handle */}
      <div className="w-full flex items-center justify-center pt-1.5 pb-0.5 pointer-events-none">
        <div className="w-9 h-1 rounded-full bg-white/20 hover:bg-white/40 transition-colors" />
      </div>

      {/* Main Controls: Segmented pill toggle + actions */}
      <div className="px-2 pt-0.5 pb-1.5 flex flex-col gap-1.5">
        {/* Segmented Control Pill */}
        <div
          id="navigator-mode-segmented-control"
          className={`w-full grid ${gridColsClass} p-0.5 rounded-full bg-[#101114] border border-white/[0.08] shadow-inner`}
          role="tablist"
          aria-label="Transform Dimension Mode"
        >
          {tabs.map((tab) => {
            const isSelected = mode === tab.id;
            return (
              <button
                key={tab.id}
                id={`navigator-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => handleModeSwitch(tab.id)}
                className={`relative z-10 py-1 text-xs font-semibold rounded-full transition-all duration-150 text-center ${
                  isSelected
                    ? 'bg-white text-zinc-950 shadow-sm font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Action Icons row: Target Selector, Copy, Paste, Lock, Reset, Accessibility, Haptics */}
        <div className="flex items-center justify-between px-1">
          {/* Target Layer / Model Selector Button */}
          <div className="relative">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setShowTargetDropdown(!showTargetDropdown)}
              title="Select Active Layer or 3D Model"
              aria-label="Select target layer or 3D model"
              className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-white/10 text-[10.5px] text-zinc-300 font-medium transition-all group max-w-[110px]"
            >
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
              <span className="text-zinc-200 font-semibold truncate text-[11px] leading-none">
                {displayLabel}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-zinc-400 group-hover:text-zinc-200 shrink-0 transition-transform ${
                  showTargetDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Interactive Target Selection Popover Dropdown */}
            {showTargetDropdown && (
              <div
                ref={dropdownRef}
                className="absolute left-0 top-full mt-1.5 w-52 max-h-72 overflow-y-auto rounded-2xl bg-[#14151a]/98 backdrop-blur-2xl border border-white/15 shadow-[0_20px_45px_rgba(0,0,0,0.85)] py-1.5 z-50 text-xs text-white divide-y divide-white/[0.06] animate-in fade-in zoom-in-95 duration-100"
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
                          className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between text-[11px] transition-colors ${
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
                          className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between text-[11px] transition-colors ${
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
                    className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between text-[11px] transition-colors ${
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
                    className={`w-full px-2 py-1.5 rounded-lg text-left flex items-center justify-between text-[11px] transition-colors ${
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

          <div className="flex items-center gap-0.5">
            {/* Copy Action */}
            <button
              id="navigator-btn-copy"
              type="button"
              onClick={handleCopyClick}
              title="Copy Curves in Active Layer (Ctrl+C)"
              aria-label="Copy curves"
              className={`p-1.5 rounded-lg text-xs transition-all duration-150 flex items-center justify-center ${
                copyFeedback
                  ? 'bg-white text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Paste Action */}
            <button
              id="navigator-btn-paste"
              type="button"
              onClick={handlePasteClick}
              title={`Paste Copied Curves (Ctrl+V)${clipboardCount > 0 ? ` • ${clipboardCount} in clipboard` : ''}`}
              aria-label="Paste copied curves"
              className={`p-1.5 rounded-lg text-xs transition-all duration-150 flex items-center justify-center relative ${
                pasteFeedback
                  ? 'bg-white text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
            </button>

            {/* Sensitivity Slider Popover Toggle */}
            <div className="relative">
              <button
                id="navigator-btn-sensitivity"
                type="button"
                onClick={() => setShowSensitivityPopover(!showSensitivityPopover)}
                title={`Navigator Sensitivity: ${sensitivity.toFixed(2)}x (Click to adjust)`}
                aria-label="Adjust navigator sensitivity"
                className={`p-1.5 rounded-lg text-xs transition-all duration-150 flex items-center justify-center ${
                  showSensitivityPopover
                    ? 'bg-sky-500 text-black font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>

              {showSensitivityPopover && (
                <div className="absolute right-0 top-full mt-2 w-48 p-2.5 rounded-2xl bg-[#14151a]/98 backdrop-blur-2xl border border-white/15 shadow-[0_20px_45px_rgba(0,0,0,0.85)] z-50 text-xs text-white flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-300">
                    <span className="font-bold">SENSITIVITY</span>
                    <span className="text-sky-400 font-bold">{sensitivity.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.05"
                    value={sensitivity}
                    onChange={(e) => onSensitivityChange?.(parseFloat(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                  <div className="flex items-center justify-between text-[8.5px] font-mono text-zinc-500">
                    <button type="button" onClick={() => onSensitivityChange?.(0.25)} className="hover:text-white">0.25x</button>
                    <button type="button" onClick={() => onSensitivityChange?.(0.5)} className="hover:text-white font-bold text-sky-400">0.5x (Def)</button>
                    <button type="button" onClick={() => onSensitivityChange?.(1.0)} className="hover:text-white">1.0x</button>
                    <button type="button" onClick={() => onSensitivityChange?.(2.0)} className="hover:text-white">2.0x</button>
                  </div>
                </div>
              )}
            </div>

            {/* Lock Constraint Button */}
            <button
              id="navigator-btn-lock"
              type="button"
              onClick={handleLockClick}
              title={isLocked ? 'Constraints Locked (Click to Unlock)' : 'Unlocked (Click to Lock)'}
              aria-label={isLocked ? 'Unlock constraints' : 'Lock constraints'}
              className={`p-1.5 rounded-lg text-xs transition-all duration-150 flex items-center justify-center ${
                isLocked
                  ? 'bg-white text-zinc-950 font-bold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            {/* Reset Origin Button */}
            <button
              id="navigator-btn-reset"
              type="button"
              onClick={handleResetClick}
              title="Reset Transform Values"
              aria-label="Reset transform values"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all duration-150 flex items-center justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Finger-Pen Accessibility Mode Toggle */}
            <button
              id="navigator-btn-accessibility"
              type="button"
              onClick={handleAccessibilityClick}
              title={`Accessibility Mode: ${accessibilityMode} (Click to toggle)`}
              aria-label={`Toggle accessibility mode. Current: ${accessibilityMode}`}
              className={`p-1.5 rounded-lg text-xs transition-all duration-150 flex items-center justify-center ${
                accessibilityMode === 'finger-pen'
                  ? 'bg-white text-zinc-950 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
            </button>

            {/* Haptic Feedback Toggle */}
            <button
              id="navigator-btn-haptics"
              type="button"
              onClick={handleHapticsToggle}
              title={hapticsEnabled ? 'Haptic Feedback: Enabled (Click to Mute)' : 'Haptic Feedback: Disabled (Click to Enable)'}
              aria-label={hapticsEnabled ? 'Disable haptic feedback' : 'Enable haptic feedback'}
              className={`p-1.5 rounded-lg text-xs transition-all duration-150 flex items-center justify-center ${
                hapticsEnabled
                  ? 'text-zinc-200 hover:bg-white/10'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5 line-through'
              }`}
            >
              <Vibrate className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
