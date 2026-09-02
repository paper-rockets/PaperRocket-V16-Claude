// src/components/Toolbar.tsx
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  ToolType,
  BrushSettings,
  SymmetryMode,
  ActiveControllerType,
  ModelDisplayMode,
  MaterialType,
} from '../types';
import { normalizeHexColor } from '../core/materialCache';
import { StudioEngine } from '../core/studioEngine';
import { SampleModelFactory } from '../core/sampleModels';
import { ColorStudioModal } from './ColorStudioModal';
import { BrushPickerModal } from './BrushPickerModal';
import { PaintPickerModal } from './PaintPickerModal';
import {
  MousePointer2,
  CircleDashed,
  Scan,
  Box,
  Circle,
  Cylinder,
  Orbit,
  Disc3,
  Cone,
  Triangle,
  Disc,
  Pen,
  Spline,
  Layers,
  Cpu,
  Scissors,
  Square,
  Ruler,
  Palette,
  Droplet,
  Undo2,
  Redo2,
  Compass,
  ChevronLeft,
  ChevronRight,
  Paintbrush,
  Pin,
  PinOff,
  X,
  Pipette,
  Shapes,
  Sparkles,
  Zap,
  Sliders,
  Volume2,
  VolumeX,
  Touchpad,
  ShieldAlert,
  PenTool,
  Copy,
  FolderArchive,
  Sun,
  Grid3x3,
  RotateCcw,
  MoreHorizontal,
  Wand2,
  Shield,
  Clipboard,
  ClipboardPaste,
  Lock,
  Unlock,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  Maximize2,
  Glasses,
  Download,
  FolderOpen,
  Moon,
  Save,
  Upload,
  LayoutGrid,
} from 'lucide-react';
import { isFullscreen, toggleFullscreen, subscribeFullscreenChange } from '../utils/fullscreen';


interface ToolbarProps {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  brushSettings: BrushSettings;
  setBrushSettings: React.Dispatch<React.SetStateAction<BrushSettings>>;
  symmetry: SymmetryMode;
  setSymmetry: (sym: SymmetryMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onSaveProject?: () => void;
  onLoadProject?: (file: File) => void;
  engine?: StudioEngine | null;
  onSelectPrimitiveName?: (name: string) => void;
  isGizmoActive?: boolean;
  onToggleGizmo?: () => void;
  onOpenLayers?: () => void;
  onToggleNavigator?: () => void;
  activeController?: ActiveControllerType;
  onChangeController?: (ctrl: ActiveControllerType) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  fingerPenMode?: boolean;
  onToggleFingerPenMode?: (enabled: boolean) => void;
  projectionMode?: 'perspective' | 'orthographic';
  onToggleProjection?: () => void;
  disableContextMenu?: boolean;
  onToggleDisableContextMenu?: () => void;
  isStylusDetected?: boolean;
  uiScale?: number;
  onUiScaleChange?: (scale: number) => void;
  isGizmoLocked?: boolean;
  onToggleLock?: () => void;
  onCopyStrokes?: () => void;
  onPasteStrokes?: () => void;
  clipboardCount?: number;
  navigatorSensitivity?: number;
  onSensitivityChange?: (s: number) => void;

  // Integrated Top Menu Bar Props
  showGrid?: boolean;
  onToggleGrid?: () => void;
  onOpenModelLibrary?: () => void;
  activeModelName?: string;
  isModelVisible?: boolean;
  onToggleModelVisibility?: () => void;
  modelDisplayMode?: ModelDisplayMode;
  onToggleModelDisplayMode?: () => void;
  onCloneModel?: () => void;
  onOpenIllumination?: () => void;
  onResetCamera?: () => void;
  onTogglePlane?: () => void;
  onOpenExport?: () => void;
  onOpenRenderSettings?: () => void;
  onOpenRaycastSettings?: () => void;
  onOpenLiquify?: () => void;
  onOpenDecimate?: () => void;
  onOpenBentGuide?: () => void;
  onOpenCustomMirror?: () => void;
  onOpenARViewer?: () => void;
  onOpenScaffolding?: () => void;
  onOpenClipboard?: () => void;
  onOpenBrushSettings?: () => void;
  onOpenSandbox?: () => void;
  onOpenColorStudio?: () => void;
}

const MONO_QUICK_COLORS = [
  '#000000',
  '#18181b',
  '#27272a',
  '#3f3f46',
  '#52525b',
  '#71717a',
  '#a1a1aa',
  '#d4d4d8',
  '#f4f4f5',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
];

const TEMPERATURE_COLORS = [
  '#38bdf8',
  '#7dd3fc',
  '#bae6fd',
  '#e0f2fe',
  '#f1f5f9',
  '#ffffff',
  '#fef3c7',
  '#fde68a',
  '#fcd34d',
  '#fbbf24',
  '#f59e0b',
  '#ea580c',
];

interface PrimitiveItem {
  id: string;
  name: string;
  icon: React.FC<{ className?: string }>;
}

const PRIMITIVE_ITEMS: PrimitiveItem[] = [
  { id: 'cube', name: 'Cube', icon: Box },
  { id: 'sphere', name: 'Sphere', icon: Circle },
  { id: 'cylinder', name: 'Cylinder', icon: Cylinder },
  { id: 'torus', name: 'Torus', icon: Orbit },
  { id: 'capsule', name: 'Capsule', icon: Disc3 },
  { id: 'cone', name: 'Cone', icon: Cone },
  { id: 'pyramid', name: 'Pyramid', icon: Triangle },
  { id: 'disk', name: 'Disk', icon: Disc },
];

export const ToolbarComponent: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  brushSettings,
  setBrushSettings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  engine,
  onSelectPrimitiveName,
  isGizmoActive = true,
  onToggleGizmo,
  onOpenLayers,
  onToggleNavigator,
  activeController = 'navigator',
  onChangeController,
  soundEnabled = true,
  onToggleSound,
  fingerPenMode = true,
  onToggleFingerPenMode,
  projectionMode = 'perspective',
  onToggleProjection,
  disableContextMenu = false,
  onToggleDisableContextMenu,
  isStylusDetected = false,
  uiScale = 1.0,
  onUiScaleChange,
  showGrid = true,
  onToggleGrid,
  onOpenModelLibrary,
  activeModelName = 'Custom Model',
  isModelVisible = true,
  onToggleModelVisibility,
  modelDisplayMode = 'texture',
  onToggleModelDisplayMode,
  onCloneModel,
  onOpenIllumination,
  onResetCamera,
  onTogglePlane,
  onOpenExport,
  onOpenRenderSettings,
  onOpenRaycastSettings,
  onOpenLiquify,
  onOpenDecimate,
  onOpenBentGuide,
  onOpenCustomMirror,
  onOpenARViewer,
  onOpenScaffolding,
  onOpenClipboard,
  onOpenSandbox,
  theme = 'dark',
  onToggleTheme,
  onSaveProject,
  onLoadProject,
  onOpenBrushSettings,
  onOpenColorStudio,
  isGizmoLocked = false,
  onToggleLock,
  onCopyStrokes,
  onPasteStrokes,
  clipboardCount = 0,
  navigatorSensitivity = 0.5,
  onSensitivityChange,
}) => {
  const [selectionMode, setSelectionMode] = useState<'pointer' | 'lasso' | 'marquee'>('pointer');
  const [activePrimitive, setActivePrimitive] = useState<string | null>(null);
  const [showPrimitivesMenu, setShowPrimitivesMenu] = useState<boolean>(false);
  const [showBrushShelf, setShowBrushShelf] = useState<boolean>(false);
  const [showSceneShelf, setShowSceneShelf] = useState<boolean>(false);
  const [showSettingsShelf, setShowSettingsShelf] = useState<boolean>(false);
  const [showSensitivityPopover, setShowSensitivityPopover] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [pasteFeedback, setPasteFeedback] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [showColorModal, setShowColorModal] = useState<boolean>(false);
  const [showBrushPickerModal, setShowBrushPickerModal] = useState<boolean>(false);
  const [showPaintPickerModal, setShowPaintPickerModal] = useState<boolean>(false);
  const [customHex, setCustomHex] = useState<string>(brushSettings.color || '#000000');
  const [isBrowserFs, setIsBrowserFs] = useState<boolean>(false);

  useEffect(() => {
    setIsBrowserFs(isFullscreen());
    const unsub = subscribeFullscreenChange((active) => {
      setIsBrowserFs(active);
    });
    return unsub;
  }, []);

  const nativeColorInputRef = useRef<HTMLInputElement>(null);
  const loadFileInputRef = useRef<HTMLInputElement>(null);
  const autoCollapseTimerRef = useRef<number | null>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onLoadProject) {
      onLoadProject(file);
    }
    if (e.target) e.target.value = '';
  };

  useEffect(() => {
    if (brushSettings.color) {
      setCustomHex(brushSettings.color);
    }
  }, [brushSettings.color]);

  const closeAllShelves = () => {
    setShowPrimitivesMenu(false);
    setShowBrushShelf(false);
    setShowSceneShelf(false);
    setShowSettingsShelf(false);
    setShowMoreMenu(false);
  };

  const toggleShelf = (shelf: 'primitives' | 'brush' | 'scene' | 'settings') => {
    if (shelf === 'primitives') {
      const next = !showPrimitivesMenu;
      closeAllShelves();
      setShowPrimitivesMenu(next);
    } else if (shelf === 'brush') {
      const next = !showBrushShelf;
      closeAllShelves();
      setShowBrushShelf(next);
    } else if (shelf === 'scene') {
      const next = !showSceneShelf;
      closeAllShelves();
      setShowSceneShelf(next);
    } else if (shelf === 'settings') {
      const next = !showSettingsShelf;
      closeAllShelves();
      setShowSettingsShelf(next);
    }
  };

  // Auto-collapse on global canvas pointer interaction unless pinned
  useEffect(() => {
    const handleCanvasPointerDown = (e: PointerEvent) => {
      if (isPinned) return;
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.closest('#mody-left-toolbar-dock') ||
          target.closest('#mody-left-toolbar-minimized') ||
          target.closest('#mody-primitives-flyout-menu') ||
          target.closest('#mody-brush-shelf-flyout') ||
          target.closest('#mody-scene-shelf-flyout') ||
          target.closest('#mody-settings-shelf-flyout') ||
          target.closest('.fixed'))
      ) {
        return;
      }
      setIsMinimized(true);
      closeAllShelves();
    };

    window.addEventListener('pointerdown', handleCanvasPointerDown);
    return () => window.removeEventListener('pointerdown', handleCanvasPointerDown);
  }, [isPinned]);

  // Close flyouts on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAllShelves();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const clearCollapseTimer = () => {
    if (autoCollapseTimerRef.current) {
      clearTimeout(autoCollapseTimerRef.current);
      autoCollapseTimerRef.current = null;
    }
  };

  const scheduleAutoCollapse = (delay = 2000) => {
    if (isPinned) return;
    clearCollapseTimer();
    autoCollapseTimerRef.current = window.setTimeout(() => {
      setIsMinimized(true);
      closeAllShelves();
    }, delay);
  };

  const handleMouseEnter = () => {
    clearCollapseTimer();
  };

  const handleMouseLeave = () => {
    if (!isPinned && !isMinimized) {
      scheduleAutoCollapse(1800);
    }
  };

  const handleSelectColor = (hex: string) => {
    const valid = normalizeHexColor(hex, brushSettings.color || '#38bdf8');
    setBrushSettings((prev) => ({ ...prev, color: valid }));
    setCustomHex(valid);
  };

  const handleSizeChange = (val: number) => {
    setBrushSettings((prev) => ({ ...prev, size: val }));
  };

  const handleOpacityChange = (val: number) => {
    setBrushSettings((prev) => ({ ...prev, opacity: val }));
  };

  const handleSpawnPrimitive = (primitiveId: string) => {
    setActivePrimitive(primitiveId);
    setShowPrimitivesMenu(false);
    if (!engine) return;

    let mesh: THREE.Object3D | null = null;
    let name = 'Primitive';

    switch (primitiveId) {
      case 'cube':
        mesh = SampleModelFactory.createCube();
        name = 'Primitive Cube';
        break;
      case 'sphere':
        mesh = SampleModelFactory.createSphere();
        name = 'Primitive Sphere';
        break;
      case 'cylinder':
        mesh = SampleModelFactory.createCylinder();
        name = 'Primitive Cylinder';
        break;
      case 'torus':
        mesh = SampleModelFactory.createTorus();
        name = 'Primitive Torus';
        break;
      case 'capsule':
        mesh = SampleModelFactory.createCapsule();
        name = 'Primitive Capsule';
        break;
      case 'cone':
        mesh = SampleModelFactory.createCone();
        name = 'Primitive Cone';
        break;
      case 'pyramid':
        mesh = SampleModelFactory.createPyramid();
        name = 'Primitive Pyramid';
        break;
      case 'disk':
        mesh = SampleModelFactory.createDisk();
        name = 'Primitive Disk';
        break;
      default:
        mesh = SampleModelFactory.createCube();
        name = 'Primitive Cube';
    }

    if (mesh) {
      engine.setModelObject(mesh, name);
      if (onSelectPrimitiveName) onSelectPrimitiveName(name);
    }

    // Auto-collapse after spawning if not pinned
    if (!isPinned) {
      scheduleAutoCollapse(1200);
    }
  };

  const handleCopy = () => {
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 900);
    onCopyStrokes?.();
  };

  const handlePaste = () => {
    setPasteFeedback(true);
    setTimeout(() => setPasteFeedback(false), 900);
    onPasteStrokes?.();
  };

  // Convert raw 3D brush size (0.01..0.25) to clean string
  const displayPxSize = (brushSettings.size * 30).toFixed(1) + 'px';

  return (
    <div
      className="fixed top-12 sm:top-14 left-2 sm:left-3 z-30 flex items-start gap-2 select-none font-sans"
      style={{
        transform: uiScale !== 1.0 ? `scale(${uiScale})` : undefined,
        transformOrigin: 'top left',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ---------------------------------------------------- */}
      {/* MAIN LEFT TOOLBAR DOCK (AUTO-COLLAPSING / MINIMIZED) */}
      {/* ---------------------------------------------------- */}
      {isMinimized ? (
        /* MINIMIZED SLIM VERTICAL RAIL - MINIMIZES SIDEWAYS TO THE LEFT */
        <div
          id="mody-left-toolbar-minimized"
          className={`w-12 sm:w-13 py-2.5 px-1.5 rounded-2xl backdrop-blur-xl border shadow-2xl flex flex-col items-center gap-1.5 transition-all animate-in fade-in slide-in-from-left duration-150 ${
            theme === 'light'
              ? 'bg-white/95 border-neutral-200 text-neutral-800'
              : 'bg-[#141519]/95 border-zinc-800 text-zinc-200'
          }`}
        >
          {/* Expand Sideways Button */}
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              theme === 'light'
                ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title="Expand Tool Menu Sideways"
          >
            <ChevronRight className="w-4.5 h-4.5 stroke-[2.2]" />
          </button>

          {/* Divider */}
          <div className={`w-6 h-[1px] ${theme === 'light' ? 'bg-neutral-200' : 'bg-zinc-800'}`} />

          {/* Active Tool Icon */}
          <button
            type="button"
            onClick={() => {
              setTool(tool === 'brush' ? 'eraser' : 'brush');
            }}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              tool === 'brush'
                ? theme === 'light' ? 'bg-neutral-900 text-white font-bold shadow-sm' : 'bg-white text-zinc-950 font-bold shadow-sm'
                : theme === 'light' ? 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100' : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
            title={`Active Tool: ${tool}. Click to toggle brush/eraser`}
          >
            {tool === 'eraser' ? (
              <Scissors className="w-4.5 h-4.5 stroke-[2]" />
            ) : (
              <Paintbrush className="w-4.5 h-4.5 stroke-[2]" />
            )}
          </button>

          {/* Size Pill */}
          <button
            type="button"
            onClick={() => {
              setIsMinimized(false);
              toggleShelf('brush');
            }}
            className={`w-full py-1.5 rounded-lg border text-[10px] font-mono flex items-center justify-center transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800'
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
            }`}
            title="Adjust Size & Brush Settings"
          >
            <span>{displayPxSize.replace('px', '')}</span>
          </button>

          {/* Color Circle */}
          <button
            type="button"
            onClick={() => {
              if (onOpenColorStudio) onOpenColorStudio();
              else setShowColorModal(true);
            }}
            className="p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Choose Color (Color Studio)"
          >
            <div
              className="w-5 h-5 rounded-full border border-black/30 shadow-inner"
              style={{ backgroundColor: brushSettings.color }}
            />
          </button>

          {/* Brush Dynamics & Surface Settings */}
          {onOpenBrushSettings && (
            <button
              type="button"
              onClick={onOpenBrushSettings}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Brush Dynamics & Surface Settings"
            >
              <Sliders className="w-4 h-4 stroke-[2]" />
            </button>
          )}

          {/* Divider */}
          <div className={`w-6 h-[1px] ${theme === 'light' ? 'bg-neutral-200' : 'bg-zinc-800'}`} />

          {/* Lock Constraints Button */}
          {onToggleLock && (
            <button
              type="button"
              onClick={onToggleLock}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isGizmoLocked
                  ? theme === 'light' ? 'bg-neutral-900 text-white font-bold shadow-sm' : 'bg-white text-zinc-950 font-bold shadow-sm'
                  : theme === 'light' ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100' : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title={isGizmoLocked ? 'Transform Constraints: LOCKED (Click to unlock)' : 'Transform Constraints: Unlocked (Click to lock)'}
            >
              {isGizmoLocked ? <Lock className="w-4 h-4 stroke-[2]" /> : <Unlock className="w-4 h-4 stroke-[2]" />}
            </button>
          )}

          {/* Copy Curves */}
          {onCopyStrokes && (
            <button
              type="button"
              onClick={handleCopy}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                copyFeedback
                  ? theme === 'light' ? 'bg-neutral-900 text-white font-bold' : 'bg-white text-zinc-950 font-bold'
                  : theme === 'light' ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100' : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Copy Curves (Ctrl+C)"
            >
              <Copy className="w-4 h-4 stroke-[2]" />
            </button>
          )}

          {/* Paste Curves */}
          {onPasteStrokes && (
            <button
              type="button"
              onClick={handlePaste}
              className={`p-2 rounded-xl transition-all relative cursor-pointer ${
                pasteFeedback
                  ? theme === 'light' ? 'bg-neutral-900 text-white font-bold' : 'bg-white text-zinc-950 font-bold'
                  : theme === 'light' ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100' : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title={`Paste Curves (Ctrl+V)${clipboardCount > 0 ? ` • ${clipboardCount} copied` : ''}`}
            >
              <ClipboardPaste className="w-4 h-4 stroke-[2]" />
              {clipboardCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1 py-0.2 rounded-full bg-sky-500 text-[8px] font-mono font-bold text-black leading-tight">
                  {clipboardCount}
                </span>
              )}
            </button>
          )}

          {/* Navigator Sensitivity Popover */}
          {onSensitivityChange && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSensitivityPopover((prev) => !prev)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  showSensitivityPopover
                    ? 'bg-sky-500 text-black font-bold shadow-sm'
                    : theme === 'light' ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
                title={`Navigator Sensitivity: ${navigatorSensitivity.toFixed(2)}x`}
              >
                <SlidersHorizontal className="w-4 h-4 stroke-[2]" />
              </button>

              {showSensitivityPopover && (
                <div
                  className={`absolute left-full top-0 ml-2 w-48 p-2.5 rounded-2xl backdrop-blur-2xl border shadow-2xl z-50 text-xs flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-100 ${
                    theme === 'light' ? 'bg-white/98 border-neutral-200 text-neutral-800' : 'bg-[#14151a]/98 border-white/15 text-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold">SENSITIVITY</span>
                    <span className="text-sky-400 font-bold">{navigatorSensitivity.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.05"
                    value={navigatorSensitivity}
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
          )}

          {/* Finger-Pen Mode Toggle */}
          {onToggleFingerPenMode && (
            <button
              type="button"
              onClick={() => onToggleFingerPenMode(!fingerPenMode)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                fingerPenMode
                  ? theme === 'light' ? 'bg-neutral-900 text-white font-bold shadow-sm' : 'bg-white text-zinc-950 font-bold shadow-sm'
                  : theme === 'light' ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100' : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title={`Finger-Pen Touch Mode: ${fingerPenMode ? 'ON (Stylus draws, fingers pan)' : 'OFF'}`}
            >
              <PenTool className="w-4 h-4 stroke-[2]" />
            </button>
          )}

          {/* Clone Button */}
          {onCloneModel && (
            <button
              type="button"
              onClick={onCloneModel}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                  : 'text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
              title="Clone 3D Model / Strokes"
            >
              <Copy className="w-4 h-4 stroke-[2]" />
            </button>
          )}

          {/* Divider */}
          <div className={`w-6 h-[1px] ${theme === 'light' ? 'bg-neutral-200' : 'bg-zinc-800'}`} />

          {/* Undo */}
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-xl transition-all ${
              canUndo
                ? theme === 'light' ? 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 cursor-pointer' : 'text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer'
                : 'text-zinc-500 opacity-40 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Redo */}
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-xl transition-all ${
              canRedo
                ? theme === 'light' ? 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 cursor-pointer' : 'text-zinc-300 hover:text-white hover:bg-white/10 cursor-pointer'
                : 'text-zinc-500 opacity-40 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      ) : (
        /* EXPANDED COMPACT CAD TOOL DOCK (WITH HORIZONTAL FLYOUT SHELVES EXPANDING TO THE RIGHT) */
        <div
          id="mody-left-toolbar-dock"
          className={`relative w-[156px] sm:w-[164px] p-2 rounded-2xl backdrop-blur-xl border shadow-2xl flex flex-col gap-1.5 transition-all animate-in fade-in slide-in-from-left duration-150 select-none ${
            theme === 'light'
              ? 'bg-white/95 border-neutral-200 text-neutral-800'
              : 'bg-[#18191d]/95 border-[#2b2c32] text-[#e2e4ea]'
          }`}
        >
          {/* Hidden File Input for Loading .remix3d project */}
          <input
            ref={loadFileInputRef}
            type="file"
            accept=".remix3d,.json"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* 1. TOP HEADER: SELECTION MODES + COMPACT PRIMITIVES BOX + PIN + COLLAPSE */}
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectionMode('pointer');
                  setTool('pointer');
                  if (!isPinned) scheduleAutoCollapse(1500);
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  tool === 'pointer' || selectionMode === 'pointer'
                    ? theme === 'light' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-[#2e303b] text-white shadow-sm'
                    : theme === 'light' ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
                title="Pointer / Stroke Selection"
              >
                <MousePointer2 className="w-4 h-4 stroke-[2.2]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectionMode('lasso');
                  setTool('pointer');
                  if (!isPinned) scheduleAutoCollapse(1500);
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  selectionMode === 'lasso'
                    ? theme === 'light' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-[#2e303b] text-white shadow-sm'
                    : theme === 'light' ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
                title="Lasso Selection"
              >
                <CircleDashed className="w-4 h-4 stroke-[1.8]" />
              </button>

              {/* Muted Compact Primitives Box Icon */}
              <button
                id="btn-primitives-menu-trigger"
                type="button"
                onClick={() => toggleShelf('primitives')}
                className={`p-1.5 rounded-lg transition-all border ${
                  showPrimitivesMenu || activePrimitive
                    ? theme === 'light' ? 'bg-neutral-900 border-neutral-800 text-white shadow-sm' : 'bg-sky-500/20 border-sky-400/50 text-sky-300 shadow-sm'
                    : theme === 'light' ? 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
                title="3D Primitives (Cube, Sphere, Cylinder, Torus, Capsule, Cone, Pyramid, Disk)"
              >
                <Box className="w-4 h-4 stroke-[1.8]" />
              </button>
            </div>

            <div className="flex items-center gap-0.5">
              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={() => toggleFullscreen()}
                className={`p-1.5 rounded-lg transition-colors ${
                  isBrowserFs
                    ? theme === 'light' ? 'text-sky-600 bg-sky-100' : 'text-sky-300 bg-sky-500/20'
                    : theme === 'light' ? 'text-neutral-400 hover:text-neutral-700' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title={isBrowserFs ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isBrowserFs ? <Minimize className="w-3.5 h-3.5 stroke-[2]" /> : <Maximize className="w-3.5 h-3.5 stroke-[2]" />}
              </button>

              {/* Pin Toggle */}
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isPinned
                    ? theme === 'light' ? 'text-neutral-900 bg-neutral-100' : 'text-white bg-white/10'
                    : theme === 'light' ? 'text-neutral-400 hover:text-neutral-700' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title={isPinned ? 'Pinned Open' : 'Click to Pin Open'}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5 stroke-[2]" /> : <PinOff className="w-3.5 h-3.5 stroke-[1.8]" />}
              </button>

              {/* Collapse sideways button */}
              <button
                type="button"
                onClick={() => {
                  setIsMinimized(true);
                  closeAllShelves();
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  theme === 'light'
                    ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                    : 'text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
                title="Minimize Menu Sideways"
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className={`h-[1px] w-full ${theme === 'light' ? 'bg-neutral-200' : 'bg-[#27282f]'}`} />

          {/* 2. CORE 3x3 SCULPTING & DRAWING TOOLS GRID */}
          <div className="grid grid-cols-3 gap-1 px-0.5">
            {/* Direct Sketch Brush */}
            <button
              type="button"
              onClick={() => {
                setTool('brush');
                if (!isPinned) scheduleAutoCollapse(1200);
              }}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                tool === 'brush'
                  ? theme === 'light' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-[#2e303b] text-white shadow-sm'
                  : theme === 'light' ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="3D Pen Tool"
            >
              <Pen className="w-4 h-4 stroke-[1.8]" />
            </button>

            {/* Wire / Curve Tool */}
            <button
              type="button"
              onClick={() => {
                setTool('brush');
                if (!isPinned) scheduleAutoCollapse(1200);
              }}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                tool === 'brush'
                  ? theme === 'light' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-[#2e303b] text-white shadow-sm'
                  : theme === 'light' ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="3D Curve Sketch"
            >
              <Spline className="w-4 h-4 stroke-[1.8]" />
            </button>

            {/* Ribbon / Tube Profile */}
            <button
              type="button"
              onClick={() => {
                setBrushSettings((prev) => ({
                  ...prev,
                  profile: prev.profile === 'ribbon' ? 'tube' : 'ribbon',
                }));
              }}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                brushSettings.profile === 'ribbon'
                  ? theme === 'light' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-[#2e303b] text-white shadow-sm'
                  : theme === 'light' ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Stroke Profile: Ribbon / Tube"
            >
              <Layers className="w-4 h-4 stroke-[1.8]" />
            </button>

            {/* Shape Snapping Engine */}
            <button
              type="button"
              onClick={() => {
                setBrushSettings((prev) => ({
                  ...prev,
                  shapeSnapping: !prev.shapeSnapping,
                }));
              }}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                brushSettings.shapeSnapping
                  ? theme === 'light' ? 'bg-neutral-900 text-white font-bold shadow-sm' : 'bg-white text-zinc-950 font-bold shadow-sm'
                  : theme === 'light' ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title={`Draw Shape Snapping: ${brushSettings.shapeSnapping ? 'ON' : 'OFF'}`}
            >
              <Shapes className="w-4 h-4 stroke-[1.8]" />
            </button>

            {/* Eraser / Vacuum Purge Mode */}
            <button
              type="button"
              onClick={() => {
                setTool('eraser');
                if (!isPinned) scheduleAutoCollapse(1200);
              }}
              className={`p-2 rounded-xl flex items-center justify-center transition-all relative ${
                tool === 'eraser'
                  ? theme === 'light' ? 'bg-neutral-900 text-white shadow-sm font-bold' : 'bg-white text-zinc-950 shadow-sm font-bold'
                  : theme === 'light' ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Cutout / Vacuum Eraser"
            >
              <Scissors className="w-4 h-4 stroke-[1.8]" />
              {brushSettings.eraserMode === 'vacuum' && (
                <span className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-sky-400 rounded-full" />
              )}
            </button>

            {/* 3D Brush Picker Preset Studio */}
            <button
              type="button"
              onClick={() => {
                setShowBrushPickerModal(true);
                if (!isPinned) scheduleAutoCollapse(1200);
              }}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                tool === 'brush_picker' || showBrushPickerModal
                  ? 'bg-sky-400 text-zinc-950 font-bold shadow-sm'
                  : theme === 'light' ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="3D Brush Presets & DNA Studio"
            >
              <Paintbrush className="w-4 h-4 stroke-[1.8]" />
            </button>

            {/* Eyedropper DNA & Surface Sampler */}
            <button
              type="button"
              onClick={() => {
                setTool('eyedropper');
                if (!isPinned) scheduleAutoCollapse(1200);
              }}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                tool === 'eyedropper'
                  ? theme === 'light' ? 'bg-neutral-900 text-white font-bold shadow-sm' : 'bg-white text-zinc-950 font-bold shadow-sm'
                  : theme === 'light' ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Eyedropper Surface Finish Sampler"
            >
              <Pipette className="w-4 h-4 stroke-[1.8]" />
            </button>

            {/* Measure / Straight Line */}
            <button
              type="button"
              onClick={() => {
                setBrushSettings((prev) => ({
                  ...prev,
                  straightLineMode: !prev.straightLineMode,
                }));
              }}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                brushSettings.straightLineMode
                  ? theme === 'light' ? 'bg-neutral-900 text-white font-bold shadow-sm' : 'bg-white text-zinc-950 font-bold shadow-sm'
                  : theme === 'light' ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Straight Line Constraint"
            >
              <Ruler className="w-4 h-4 stroke-[1.8]" />
            </button>

            {/* 3D Paint & Material Studio trigger */}
            <button
              type="button"
              onClick={() => {
                if (onOpenColorStudio) onOpenColorStudio();
                else setShowColorModal(true);
                if (!isPinned) scheduleAutoCollapse(1200);
              }}
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                tool === 'paint_picker'
                  ? 'bg-purple-500 text-white font-bold shadow-sm'
                  : theme === 'light' ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Color & Material Studio"
            >
              <Palette className="w-4 h-4 stroke-[1.8]" />
            </button>
          </div>

          {/* Divider */}
          <div className={`h-[1px] w-full ${theme === 'light' ? 'bg-neutral-200' : 'bg-zinc-800'}`} />

          {/* 3. HORIZONTAL SHELF FLYOUT TRIGGER BUTTONS (EXPAND TO THE RIGHT) */}
          <div className="flex flex-col gap-1 px-0.5">
            {/* Brush & Stroke Setup Flyout Trigger */}
            <button
              type="button"
              onClick={() => toggleShelf('brush')}
              className={`w-full py-1.5 px-2 rounded-xl border text-[11px] font-medium flex items-center justify-between transition-all ${
                showBrushShelf
                  ? theme === 'light' ? 'bg-neutral-900 border-neutral-800 text-white shadow-sm' : 'bg-sky-500/20 border-sky-400/50 text-sky-300 shadow-sm'
                  : theme === 'light' ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
              title="Brush Size, Material & Space (Expands to the Right)"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="w-4 h-4 rounded-full border border-black/30 shadow-inner shrink-0"
                  style={{ backgroundColor: brushSettings.color }}
                />
                <span className="font-mono text-[10.5px] font-semibold">{displayPxSize}</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${showBrushShelf ? 'translate-x-0.5 text-sky-400' : 'text-zinc-500'}`} />
            </button>

            {/* Scene & Studio Shelf Flyout Trigger */}
            <button
              type="button"
              onClick={() => toggleShelf('scene')}
              className={`w-full py-1.5 px-2 rounded-xl border text-[11px] font-medium flex items-center justify-between transition-all ${
                showSceneShelf
                  ? theme === 'light' ? 'bg-neutral-900 border-neutral-800 text-white shadow-sm' : 'bg-purple-500/20 border-purple-400/50 text-purple-300 shadow-sm'
                  : theme === 'light' ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
              title="Scene, Models, Grid & Save/Load (Expands to the Right)"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <FolderArchive className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-[10.5px] font-semibold">Scene & Tools</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${showSceneShelf ? 'translate-x-0.5 text-purple-400' : 'text-zinc-500'}`} />
            </button>

            {/* Viewport Settings Shelf Flyout Trigger */}
            <button
              type="button"
              onClick={() => toggleShelf('settings')}
              className={`w-full py-1.5 px-2 rounded-xl border text-[11px] font-medium flex items-center justify-between transition-all ${
                showSettingsShelf
                  ? theme === 'light' ? 'bg-neutral-900 border-neutral-800 text-white shadow-sm' : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-sm'
                  : theme === 'light' ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
              title="Viewport, Controllers & Scale (Expands to the Right)"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Touchpad className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[10.5px] font-semibold">Settings</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${showSettingsShelf ? 'translate-x-0.5 text-emerald-400' : 'text-zinc-500'}`} />
            </button>
          </div>

          {/* Divider */}
          <div className={`h-[1px] w-full ${theme === 'light' ? 'bg-neutral-200' : 'bg-zinc-800'}`} />

          {/* 4. FOOTER ROW: UNDO / SOUND / THEME / REDO */}
          <div className="flex items-center justify-between px-0.5 pt-0.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded-lg transition-all ${
                canUndo
                  ? theme === 'light' ? 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100' : 'text-zinc-300 hover:text-white hover:bg-white/10'
                  : 'text-zinc-500 opacity-40 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4 stroke-[2]" />
            </button>

            {onToggleSound && (
              <button
                type="button"
                onClick={onToggleSound}
                className={`p-1.5 rounded-lg transition-colors ${
                  theme === 'light' ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
                title={soundEnabled ? 'Sound: Enabled' : 'Sound: Muted'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-sky-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-zinc-500" />
                )}
              </button>
            )}

            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`p-1.5 rounded-lg transition-colors ${
                  theme === 'light' ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100' : 'text-zinc-400 hover:text-white hover:bg-white/10'
                }`}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Theme`}
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-indigo-500" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded-lg transition-all ${
                canRedo
                  ? theme === 'light' ? 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100' : 'text-zinc-300 hover:text-white hover:bg-white/10'
                  : 'text-zinc-500 opacity-40 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4 stroke-[2]" />
            </button>
          </div>

          {/* ========================================================================= */}
          {/* HORIZONTAL FLYOUT SHELF 1: 3D PRIMITIVES (EXPANDS TO THE RIGHT)            */}
          {/* ========================================================================= */}
          {showPrimitivesMenu && (
            <div
              id="mody-primitives-flyout-menu"
              className={`absolute left-full top-0 ml-2.5 w-52 p-2.5 rounded-2xl backdrop-blur-2xl border shadow-2xl z-50 flex flex-col gap-1.5 text-xs animate-in fade-in slide-in-from-left-2 duration-150 select-none ${
                theme === 'light'
                  ? 'bg-white/98 border-neutral-200 text-neutral-800'
                  : 'bg-[#141519]/98 border-zinc-800 text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between px-1 pb-1.5 border-b border-zinc-800/80 text-[10px] font-mono">
                <span className="font-semibold text-sky-400 tracking-wider">3D PRIMITIVES</span>
                <button
                  type="button"
                  onClick={() => setShowPrimitivesMenu(false)}
                  className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1 pt-0.5">
                {PRIMITIVE_ITEMS.map((item) => {
                  const ItemIcon = item.icon;
                  const isSelected = activePrimitive === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`primitive-btn-${item.id}`}
                      type="button"
                      onClick={() => {
                        handleSpawnPrimitive(item.id);
                        setShowPrimitivesMenu(false);
                      }}
                      className={`flex items-center gap-1.5 p-1.5 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'bg-sky-500 text-white font-bold shadow-sm'
                          : theme === 'light'
                          ? 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100'
                          : 'text-zinc-300 hover:text-white hover:bg-white/10'
                      }`}
                      title={`Spawn Primitive ${item.name}`}
                    >
                      <ItemIcon className="w-3.5 h-3.5 shrink-0 stroke-[1.8]" />
                      <span className="text-[11px] truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* HORIZONTAL FLYOUT SHELF 2: BRUSH & STROKE SETUP (EXPANDS TO THE RIGHT)    */}
          {/* ========================================================================= */}
          {showBrushShelf && (
            <div
              id="mody-brush-shelf-flyout"
              className={`absolute left-full top-0 ml-2.5 w-64 sm:w-72 p-3 rounded-2xl backdrop-blur-2xl border shadow-2xl z-50 flex flex-col gap-2.5 text-xs animate-in fade-in slide-in-from-left-2 duration-150 select-none ${
                theme === 'light'
                  ? 'bg-white/98 border-neutral-200 text-neutral-800'
                  : 'bg-[#141519]/98 border-zinc-800 text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80">
                <span className="font-semibold text-xs text-sky-400">Brush & Stroke Setup</span>
                <button
                  type="button"
                  onClick={() => setShowBrushShelf(false)}
                  className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 1. Drawing Space: Surface Conformal vs 3D Free Air */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">Drawing Space</span>
                <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${theme === 'light' ? 'bg-neutral-100 border-neutral-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  <button
                    type="button"
                    onClick={() => setBrushSettings((prev) => ({ ...prev, drawingMode: 'surface' }))}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                      brushSettings.drawingMode !== 'spatial_3d'
                        ? theme === 'light' ? 'bg-neutral-900 text-white font-bold shadow-sm' : 'bg-white text-zinc-950 font-bold shadow-sm'
                        : theme === 'light' ? 'text-neutral-500 hover:text-neutral-900' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Shapes className="w-3.5 h-3.5" />
                    <span>Surface</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBrushSettings((prev) => ({ ...prev, drawingMode: 'spatial_3d' }))}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                      brushSettings.drawingMode === 'spatial_3d'
                        ? theme === 'light' ? 'bg-neutral-900 text-white font-bold shadow-sm' : 'bg-white text-zinc-950 font-bold shadow-sm'
                        : theme === 'light' ? 'text-neutral-500 hover:text-neutral-900' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>3D Air</span>
                  </button>
                </div>
              </div>

              {/* 2. Material Finishes */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">Finish Shaders</span>
                <div className={`grid grid-cols-4 gap-1 p-1 rounded-xl border ${theme === 'light' ? 'bg-neutral-100 border-neutral-200' : 'bg-zinc-900 border-zinc-800'}`}>
                  {[
                    { id: 'shadeless' as MaterialType, label: 'Flat' },
                    { id: 'shaded' as MaterialType, label: 'PBR' },
                    { id: 'glow' as MaterialType, label: 'Glow' },
                    { id: 'cutout' as MaterialType, label: 'Mask' },
                  ].map((mat) => {
                    const isSel = (brushSettings.materialType || 'shadeless') === mat.id;
                    return (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => setBrushSettings((prev) => ({ ...prev, materialType: mat.id }))}
                        className={`py-1 rounded-lg text-[10px] font-medium text-center transition-all ${
                          isSel
                            ? theme === 'light' ? 'bg-neutral-900 text-white font-bold shadow-sm' : 'bg-white text-zinc-950 font-bold shadow-sm'
                            : theme === 'light' ? 'text-neutral-500 hover:text-neutral-900' : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {mat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Brush Size Slider & Quick Presets */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Brush Size</span>
                  <span className="font-mono text-sky-400 font-bold">{displayPxSize}</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.25"
                  step="0.005"
                  value={brushSettings.size}
                  onChange={(e) => handleSizeChange(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {[0.015, 0.035, 0.065, 0.1, 0.16, 0.25].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => handleSizeChange(sz)}
                      className={`py-0.5 rounded text-[9.5px] font-mono border transition-all ${
                        Math.abs(brushSettings.size - sz) < 0.01
                          ? 'bg-sky-400 text-black font-bold border-sky-400'
                          : theme === 'light' ? 'border-neutral-200 text-neutral-700 hover:bg-neutral-100' : 'border-zinc-800 text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      {(sz * 30).toFixed(0)}px
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Stroke Opacity Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-zinc-400">
                  <span>Opacity</span>
                  <span className="font-mono text-sky-400 font-bold">{Math.round(brushSettings.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={brushSettings.opacity}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  className="w-full accent-sky-400 h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* 5. Quick Color Swatches */}
              <div className="space-y-1 pt-1 border-t border-zinc-800/80">
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Quick Swatches</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenColorStudio) onOpenColorStudio();
                      else setShowColorModal(true);
                    }}
                    className="text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>Full Studio...</span>
                  </button>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {['#000000', '#ffffff', '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#34d399', '#facc15'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => handleSelectColor(hex)}
                      className={`h-5 rounded-md border transition-transform active:scale-90 ${
                        (brushSettings.color || '').toLowerCase() === hex.toLowerCase()
                          ? 'border-white ring-2 ring-sky-400 scale-110'
                          : 'border-black/30 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>

              {/* Advanced Settings Button */}
              {onOpenBrushSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setShowBrushShelf(false);
                    onOpenBrushSettings();
                  }}
                  className={`w-full py-1.5 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    theme === 'light' ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Advanced Dynamics & Curves...</span>
                </button>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* HORIZONTAL FLYOUT SHELF 3: SCENE & STUDIO ACTIONS (EXPANDS TO THE RIGHT)   */}
          {/* ========================================================================= */}
          {showSceneShelf && (
            <div
              id="mody-scene-shelf-flyout"
              className={`absolute left-full top-0 ml-2.5 w-64 sm:w-72 p-3 rounded-2xl backdrop-blur-2xl border shadow-2xl z-50 flex flex-col gap-2.5 text-xs animate-in fade-in slide-in-from-left-2 duration-150 select-none ${
                theme === 'light'
                  ? 'bg-white/98 border-neutral-200 text-neutral-800'
                  : 'bg-[#141519]/98 border-zinc-800 text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80">
                <span className="font-semibold text-xs text-purple-400">Scene & Studio Actions</span>
                <button
                  type="button"
                  onClick={() => setShowSceneShelf(false)}
                  className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3x3 Scene Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {onOpenModelLibrary && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenModelLibrary();
                      setShowSceneShelf(false);
                    }}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors border ${
                      theme === 'light' ? 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                    }`}
                    title="Model Library"
                  >
                    <FolderArchive className="w-4 h-4 text-purple-400" />
                    <span className="text-[9.5px]">Models</span>
                  </button>
                )}

                {onToggleModelDisplayMode && (
                  <button
                    type="button"
                    onClick={onToggleModelDisplayMode}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors border ${
                      modelDisplayMode === 'texture'
                        ? theme === 'light' ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-zinc-800 border-zinc-700 text-white'
                        : theme === 'light' ? 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                    }`}
                    title="Texture / Clay Surface"
                  >
                    <Palette className="w-4 h-4 text-sky-400" />
                    <span className="text-[9.5px]">{modelDisplayMode === 'texture' ? 'Texture' : 'Clay'}</span>
                  </button>
                )}

                {onCloneModel && (
                  <button
                    type="button"
                    onClick={onCloneModel}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors border ${
                      theme === 'light' ? 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                    }`}
                    title="Clone Active 3D Model"
                  >
                    <Copy className="w-4 h-4 text-emerald-400" />
                    <span className="text-[9.5px]">Clone</span>
                  </button>
                )}

                {onToggleModelVisibility && (
                  <button
                    type="button"
                    onClick={onToggleModelVisibility}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors border ${
                      !isModelVisible
                        ? theme === 'light' ? 'bg-neutral-200 border-neutral-300 text-neutral-600' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                        : theme === 'light' ? 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                    }`}
                    title="Hide/Show 3D Model"
                  >
                    {isModelVisible ? <Eye className="w-4 h-4 text-amber-400" /> : <EyeOff className="w-4 h-4 text-zinc-500" />}
                    <span className="text-[9.5px]">{isModelVisible ? 'Show' : 'Hide'}</span>
                  </button>
                )}

                {onOpenIllumination && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenIllumination();
                      setShowSceneShelf(false);
                    }}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors border ${
                      theme === 'light' ? 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                    }`}
                    title="Skybox & Atmosphere"
                  >
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="text-[9.5px]">Skybox</span>
                  </button>
                )}

                {onToggleGrid && (
                  <button
                    type="button"
                    onClick={onToggleGrid}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors border ${
                      showGrid
                        ? theme === 'light' ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-zinc-800 border-zinc-700 text-white font-bold'
                        : theme === 'light' ? 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                    }`}
                    title="Ground Grid"
                  >
                    <Grid3x3 className="w-4 h-4 text-sky-400" />
                    <span className="text-[9.5px]">Grid</span>
                  </button>
                )}

                {onOpenLayers && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenLayers();
                      setShowSceneShelf(false);
                    }}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors border ${
                      theme === 'light' ? 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                    }`}
                    title="Layers Panel"
                  >
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span className="text-[9.5px]">Layers</span>
                  </button>
                )}

                {onTogglePlane && (
                  <button
                    type="button"
                    onClick={onTogglePlane}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors border ${
                      theme === 'light' ? 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                    }`}
                    title="Drawing Plane"
                  >
                    <Maximize2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-[9.5px]">Plane</span>
                  </button>
                )}

                {onResetCamera && (
                  <button
                    type="button"
                    onClick={onResetCamera}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors border ${
                      theme === 'light' ? 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                    }`}
                    title="Reset Camera"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    <span className="text-[9.5px]">Reset</span>
                  </button>
                )}

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={() => toggleFullscreen()}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors border ${
                    isBrowserFs
                      ? theme === 'light' ? 'bg-sky-500 text-white border-sky-600 font-bold' : 'bg-sky-600/30 border-sky-500/60 text-sky-200 font-bold'
                      : theme === 'light' ? 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800' : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200'
                  }`}
                  title={isBrowserFs ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                  {isBrowserFs ? <Minimize className="w-4 h-4 text-amber-400" /> : <Maximize className="w-4 h-4 text-sky-400" />}
                  <span className="text-[9.5px]">{isBrowserFs ? 'Exit FS' : 'Fullscreen'}</span>
                </button>
              </div>

              {/* Save & Load Project File Buttons */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => {
                    if (onSaveProject) onSaveProject();
                    setShowSceneShelf(false);
                  }}
                  className={`py-1.5 px-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                    theme === 'light'
                      ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-300 text-neutral-800'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                  }`}
                  title="Save Project (.remix3d file)"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Project</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    loadFileInputRef.current?.click();
                    setShowSceneShelf(false);
                  }}
                  className={`py-1.5 px-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                    theme === 'light'
                      ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-300 text-neutral-800'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200'
                  }`}
                  title="Load Project (.remix3d file)"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span>Load Project</span>
                </button>
              </div>

              {/* More Tools Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`w-full py-1.5 px-2.5 rounded-xl border text-[11px] font-medium flex items-center justify-between transition-all ${
                  showMoreMenu
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                    : theme === 'light' ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <MoreHorizontal className="w-4 h-4 text-purple-400" />
                  <span>Additional Studio Tools</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-500">{showMoreMenu ? '▲' : '▼'}</span>
              </button>

              {/* Additional Tools Extended List */}
              {showMoreMenu && (
                <div className="flex flex-col gap-1 p-1 rounded-xl bg-black/40 border border-zinc-800/80 max-h-48 overflow-y-auto">
                  {onOpenExport && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenExport();
                        setShowSceneShelf(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[10.5px] hover:bg-white/10 text-zinc-300 hover:text-white"
                    >
                      <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Export 3D / Textures</span>
                    </button>
                  )}
                  {onOpenRenderSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenRenderSettings();
                        setShowSceneShelf(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[10.5px] hover:bg-white/10 text-zinc-300 hover:text-white"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Post-Processing Shaders</span>
                    </button>
                  )}
                  {onOpenLiquify && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenLiquify();
                        setShowSceneShelf(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[10.5px] hover:bg-white/10 text-zinc-300 hover:text-white"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Volumetric Liquify</span>
                    </button>
                  )}
                  {onOpenDecimate && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenDecimate();
                        setShowSceneShelf(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[10.5px] hover:bg-white/10 text-zinc-300 hover:text-white"
                    >
                      <Scissors className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>RDP Curve Decimator</span>
                    </button>
                  )}
                  {onOpenScaffolding && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenScaffolding();
                        setShowSceneShelf(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[10.5px] hover:bg-white/10 text-zinc-300 hover:text-white"
                    >
                      <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Collision Scaffolding</span>
                    </button>
                  )}
                  {onOpenClipboard && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenClipboard();
                        setShowSceneShelf(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[10.5px] hover:bg-white/10 text-zinc-300 hover:text-white"
                    >
                      <Clipboard className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Reference Moodboard</span>
                    </button>
                  )}
                  {onOpenBentGuide && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenBentGuide();
                        setShowSceneShelf(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[10.5px] hover:bg-white/10 text-zinc-300 hover:text-white"
                    >
                      <Spline className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Bent Manifold Guides</span>
                    </button>
                  )}
                  {onOpenCustomMirror && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCustomMirror();
                        setShowSceneShelf(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[10.5px] hover:bg-white/10 text-zinc-300 hover:text-white"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Arbitrary Mirror Plane</span>
                    </button>
                  )}
                  {onOpenARViewer && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenARViewer();
                        setShowSceneShelf(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[10.5px] hover:bg-white/10 text-zinc-300 hover:text-white"
                    >
                      <Glasses className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>WebXR AR Spatial View</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* HORIZONTAL FLYOUT SHELF 4: VIEWPORT & SETTINGS (EXPANDS TO THE RIGHT)      */}
          {/* ========================================================================= */}
          {showSettingsShelf && (
            <div
              id="mody-settings-shelf-flyout"
              className={`absolute left-full top-0 ml-2.5 w-60 sm:w-64 p-3 rounded-2xl backdrop-blur-2xl border shadow-2xl z-50 flex flex-col gap-2.5 text-xs animate-in fade-in slide-in-from-left-2 duration-150 select-none ${
                theme === 'light'
                  ? 'bg-white/98 border-neutral-200 text-neutral-800'
                  : 'bg-[#141519]/98 border-zinc-800 text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80">
                <span className="font-semibold text-xs text-emerald-400">Viewport & Hardware</span>
                <button
                  type="button"
                  onClick={() => setShowSettingsShelf(false)}
                  className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stylus Status */}
              {isStylusDetected && (
                <div className="py-1 px-2 rounded-xl bg-sky-950/40 border border-sky-500/30 flex items-center justify-between text-[10.5px]">
                  <div className="flex items-center gap-1.5 text-sky-300">
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Stylus Hardware</span>
                  </div>
                  <span className="text-[8px] font-mono bg-sky-400 text-black px-1.5 py-0.2 rounded font-bold">Active</span>
                </div>
              )}

              {/* Projection Toggle */}
              {onToggleProjection && (
                <button
                  type="button"
                  onClick={onToggleProjection}
                  className={`w-full py-1.5 px-2 rounded-xl border flex items-center justify-between text-[10.5px] font-medium transition-all ${
                    theme === 'light'
                      ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Camera Projection</span>
                  </div>
                  <span className="text-[9px] font-mono capitalize">{projectionMode}</span>
                </button>
              )}

              {/* Finger Draw Toggle */}
              {onToggleFingerPenMode && (
                <button
                  type="button"
                  onClick={() => onToggleFingerPenMode(!fingerPenMode)}
                  className={`w-full py-1.5 px-2 rounded-xl border text-[10.5px] font-medium flex items-center justify-between transition-all ${
                    fingerPenMode
                      ? theme === 'light' ? 'bg-neutral-900 border-neutral-800 text-white font-semibold' : 'bg-zinc-800 border-zinc-600 text-white shadow-sm font-semibold'
                      : theme === 'light' ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Touchpad className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Finger Touch Draw</span>
                  </div>
                  <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold ${fingerPenMode ? 'bg-sky-400 text-black' : 'bg-neutral-700 text-neutral-300'}`}>
                    {fingerPenMode ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}

              {/* Radial Menu Toggle */}
              {onToggleDisableContextMenu && (
                <button
                  type="button"
                  onClick={() => onToggleDisableContextMenu()}
                  className={`w-full py-1.5 px-2 rounded-xl border text-[10.5px] font-medium flex items-center justify-between transition-all ${
                    !disableContextMenu
                      ? theme === 'light' ? 'bg-neutral-900 border-neutral-800 text-white font-semibold' : 'bg-zinc-800 border-zinc-600 text-white shadow-sm font-semibold'
                      : theme === 'light' ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700' : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Radial Menu</span>
                  </div>
                  <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded font-bold ${!disableContextMenu ? 'bg-sky-400 text-black' : 'bg-neutral-700 text-neutral-300'}`}>
                    {!disableContextMenu ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}

              {/* 3D Navigator Controller Mode */}
              {onChangeController && (
                <div className="space-y-1 pt-1 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 uppercase">
                    <span>3D Controller</span>
                    <button
                      type="button"
                      onClick={() => onChangeController(activeController === 'hidden' ? 'both' : 'hidden')}
                      className="text-sky-400 hover:underline"
                    >
                      {activeController === 'hidden' ? 'Show' : 'Hide'}
                    </button>
                  </div>
                  <div className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${theme === 'light' ? 'bg-neutral-100 border-neutral-200' : 'bg-zinc-900 border-zinc-800'}`}>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeController === 'navigator') onChangeController('hidden');
                        else onChangeController('navigator');
                      }}
                      className={`py-1 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition-all ${
                        activeController === 'navigator' || activeController === 'both'
                          ? 'bg-sky-400 text-black font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeController === 'tactile') onChangeController('hidden');
                        else onChangeController('tactile');
                      }}
                      className={`py-1 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition-all ${
                        activeController === 'tactile' || activeController === 'both'
                          ? 'bg-sky-400 text-black font-bold'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Disc className="w-3.5 h-3.5" />
                      <span>Circular</span>
                    </button>
                  </div>

                  {onOpenSandbox && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSceneShelf(false);
                        onOpenSandbox();
                      }}
                      className="w-full mt-1.5 py-1.5 px-2 rounded-lg text-[10px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                        <span>Navigator Sandbox</span>
                      </div>
                      <span className="text-[9px] font-mono px-1 rounded bg-amber-400/20 text-amber-200">6 Variations</span>
                    </button>
                  )}
                </div>
              )}

              {/* Navigator Sensitivity Control */}
              {onSensitivityChange && (
                <div className="space-y-1 pt-1 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
                    <span>SENSITIVITY</span>
                    <span className="text-sky-400 font-bold">{navigatorSensitivity.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.05"
                    value={navigatorSensitivity}
                    onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                  <div className="flex items-center justify-between text-[8px] font-mono text-zinc-500">
                    <button type="button" onClick={() => onSensitivityChange(0.25)} className="hover:text-white">0.25x</button>
                    <button type="button" onClick={() => onSensitivityChange(0.5)} className="hover:text-white font-bold text-sky-400">0.5x</button>
                    <button type="button" onClick={() => onSensitivityChange(1.0)} className="hover:text-white">1.0x</button>
                    <button type="button" onClick={() => onSensitivityChange(2.0)} className="hover:text-white">2.0x</button>
                  </div>
                </div>
              )}

              {/* Global UI Scale */}
              {onUiScaleChange && (
                <div className="space-y-1 pt-1 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400">
                    <span>UI SCALE</span>
                    <span className="text-white font-bold">{Math.round((uiScale || 1.0) * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onUiScaleChange((uiScale || 1.0) - 0.1)}
                      className="flex-1 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => onUiScaleChange(1.0)}
                      className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-[9.5px] font-mono"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      onClick={() => onUiScaleChange((uiScale || 1.0) + 0.1)}
                      className="flex-1 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3D BRUSH PICKER MODAL (PROFILES & STROKE DNA)        */}
      {/* ---------------------------------------------------- */}
      <BrushPickerModal
        isOpen={showBrushPickerModal}
        onClose={() => setShowBrushPickerModal(false)}
        brushSettings={brushSettings}
        setBrushSettings={setBrushSettings}
        tool={tool}
        setTool={setTool}
        theme={theme}
      />

      {/* ---------------------------------------------------- */}
      {/* 3D PAINT & MATERIAL PICKER MODAL (PBR & OKLAB)       */}
      {/* ---------------------------------------------------- */}
      <PaintPickerModal
        isOpen={showPaintPickerModal}
        onClose={() => setShowPaintPickerModal(false)}
        brushSettings={brushSettings}
        setBrushSettings={setBrushSettings}
        tool={tool}
        setTool={setTool}
        onOpenColorStudio={() => {
          setShowPaintPickerModal(false);
          setShowColorModal(true);
        }}
        theme={theme}
      />

      {/* ---------------------------------------------------- */}
      {/* ADVANCED COLOR STUDIO MODAL (HSV & OKLCh POLAR)      */}
      {/* ---------------------------------------------------- */}
      <ColorStudioModal
        isOpen={showColorModal}
        onClose={() => setShowColorModal(false)}
        currentColor={brushSettings.color || '#38bdf8'}
        onChangeColor={(hex) => handleSelectColor(hex)}
        onApplyBrushSettings={(newSettings) =>
          setBrushSettings((prev) => ({ ...prev, ...newSettings }))
        }
        onApplyToModel={(mat) => engine?.setModelCustomMaterial(mat)}
        onSampleFromScreen={() => {
          setTool('paint_picker');
        }}
        theme={theme}
      />
    </div>
  );
};

export const Toolbar = React.memo(ToolbarComponent);
