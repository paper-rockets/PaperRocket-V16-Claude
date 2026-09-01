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
  Eye,
  EyeOff,
  Maximize2,
  Glasses,
  Download,
} from 'lucide-react';

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

export const Toolbar: React.FC<ToolbarProps> = ({
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
  onOpenBrushSettings,
  onOpenColorStudio,
}) => {
  const [selectionMode, setSelectionMode] = useState<'pointer' | 'lasso' | 'marquee'>('pointer');
  const [activePrimitive, setActivePrimitive] = useState<string | null>(null);
  const [showPrimitivesMenu, setShowPrimitivesMenu] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [showColorModal, setShowColorModal] = useState<boolean>(false);
  const [showBrushPickerModal, setShowBrushPickerModal] = useState<boolean>(false);
  const [showPaintPickerModal, setShowPaintPickerModal] = useState<boolean>(false);
  const [colorPickerTab, setColorPickerTab] = useState<'spectrum' | 'temperature' | 'swatches'>('spectrum');
  const [showSizePopup, setShowSizePopup] = useState<boolean>(false);
  const [showOpacityPopup, setShowOpacityPopup] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [customHex, setCustomHex] = useState<string>(brushSettings.color || '#000000');
  const [actionConfirmed, setActionConfirmed] = useState<boolean>(false);

  const nativeColorInputRef = useRef<HTMLInputElement>(null);
  const autoCollapseTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (brushSettings.color) {
      setCustomHex(brushSettings.color);
    }
  }, [brushSettings.color]);

  // Auto-collapse on global canvas pointer interaction unless pinned
  useEffect(() => {
    const handleCanvasPointerDown = (e: PointerEvent) => {
      if (isPinned) return;
      const target = e.target as HTMLElement;
      // If clicking inside the toolbar or modals, do not collapse
      if (
        target &&
        (target.closest('#mody-left-toolbar-dock') ||
          target.closest('#mody-left-toolbar-minimized') ||
          target.closest('#mody-primitives-flyout-menu') ||
          target.closest('.fixed'))
      ) {
        return;
      }
      setIsMinimized(true);
      setShowPrimitivesMenu(false);
    };

    window.addEventListener('pointerdown', handleCanvasPointerDown);
    return () => window.removeEventListener('pointerdown', handleCanvasPointerDown);
  }, [isPinned]);

  // Close size/opacity popovers and menus when clicking outside or pressing Escape
  useEffect(() => {
    if (!showSizePopup && !showOpacityPopup && !showMoreMenu) return;

    const handleClickOutsidePopovers = (e: MouseEvent | PointerEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        !target.closest('#toolbar-brush-size-popover') &&
        !target.closest('#toolbar-brush-opacity-popover') &&
        !target.closest('#toolbar-size-pill-trigger') &&
        !target.closest('#toolbar-opacity-pill-trigger') &&
        !target.closest('#toolbar-more-menu') &&
        !target.closest('#toolbar-more-menu-trigger')
      ) {
        setShowSizePopup(false);
        setShowOpacityPopup(false);
        setShowMoreMenu(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSizePopup(false);
        setShowOpacityPopup(false);
        setShowMoreMenu(false);
      }
    };

    window.addEventListener('pointerdown', handleClickOutsidePopovers);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handleClickOutsidePopovers);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSizePopup, showOpacityPopup, showMoreMenu]);

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
      setShowPrimitivesMenu(false);
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
    const valid = normalizeHexColor(hex, '#000000');
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

  const handleConfirmAction = () => {
    setActionConfirmed(true);
    setTimeout(() => setActionConfirmed(false), 800);
  };

  // Convert raw 3D brush size (0.01..0.25) to clean string
  const displayPxSize = (brushSettings.size * 30).toFixed(1) + 'px';

  const activePrimitiveItem = PRIMITIVE_ITEMS.find((p) => p.id === activePrimitive);
  const ActivePrimitiveIcon = activePrimitiveItem ? activePrimitiveItem.icon : Box;

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
          className="w-10 sm:w-11 py-2 px-1 rounded-2xl bg-[#141519]/95 backdrop-blur-xl border border-zinc-800 text-zinc-200 shadow-2xl flex flex-col items-center gap-1.5 transition-all animate-in fade-in slide-in-from-left duration-150"
        >
          {/* Expand Sideways Button */}
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Expand Tool Menu Sideways"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Divider */}
          <div className="w-5 h-[1px] bg-zinc-800" />

          {/* Active Tool Icon */}
          <button
            type="button"
            onClick={() => {
              setTool(tool === 'brush' ? 'eraser' : 'brush');
            }}
            className={`p-1.5 rounded-lg transition-all ${
              tool === 'brush'
                ? 'bg-white text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
            title={`Active Tool: ${tool}. Click to toggle brush/eraser`}
          >
            {tool === 'eraser' ? (
              <Scissors className="w-4 h-4 stroke-[2]" />
            ) : (
              <Paintbrush className="w-4 h-4 stroke-[2]" />
            )}
          </button>

          {/* Size Pill */}
          <button
            type="button"
            onClick={() => setShowSizePopup(!showSizePopup)}
            className="w-full py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[9px] font-mono text-zinc-200 flex items-center justify-center"
            title="Adjust Size"
          >
            <span>{displayPxSize.replace('px', '')}</span>
          </button>

          {/* Color Circle */}
          <button
            type="button"
            onClick={() => {
              if (onOpenColorStudio) onOpenColorStudio();
              else {
                setColorPickerTab('spectrum');
                setShowColorModal(true);
              }
            }}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Choose Color (Color Studio)"
          >
            <div
              className="w-4 h-4 rounded-full border border-black/40 shadow-inner"
              style={{ backgroundColor: brushSettings.color }}
            />
          </button>

          {/* Brush Dynamics & Surface Settings */}
          {onOpenBrushSettings && (
            <button
              type="button"
              onClick={onOpenBrushSettings}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Brush Dynamics & Surface Settings"
            >
              <Sliders className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          )}

          {/* Clone Button (Requirement 2) */}
          {onCloneModel && (
            <button
              type="button"
              onClick={onCloneModel}
              className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Clone 3D Model / Strokes"
            >
              <Copy className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          )}

          {/* Divider */}
          <div className="w-5 h-[1px] bg-zinc-800" />

          {/* Undo (Requirement 2) */}
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded-lg transition-all ${
              canUndo ? 'text-zinc-300 hover:text-white hover:bg-white/10' : 'text-zinc-600 opacity-40 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5 stroke-[2]" />
          </button>

          {/* Redo (Requirement 2) */}
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded-lg transition-all ${
              canRedo ? 'text-zinc-300 hover:text-white hover:bg-white/10' : 'text-zinc-600 opacity-40 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      ) : (
        /* EXPANDED 3-COLUMN CAD TOOL DOCK (EXPANDS SIDEWAYS) */
        <div
          id="mody-left-toolbar-dock"
          className="w-[144px] sm:w-[150px] max-h-[calc(100vh-80px)] overflow-y-auto scrollbar-none p-2 rounded-2xl bg-[#18191d]/95 backdrop-blur-xl border border-[#2b2c32] text-[#e2e4ea] shadow-2xl flex flex-col gap-1.5 transition-all animate-in fade-in slide-in-from-left duration-150"
        >
          {/* 1. TOP SELECTION MODES & PIN / COLLAPSE ROW */}
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectionMode('pointer');
                  setTool('brush');
                  if (!isPinned) scheduleAutoCollapse(1500);
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  selectionMode === 'pointer'
                    ? 'bg-[#2e303b] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
                title="Pointer / Selection"
              >
                <MousePointer2 className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectionMode('lasso');
                  if (!isPinned) scheduleAutoCollapse(1500);
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  selectionMode === 'lasso'
                    ? 'bg-[#2e303b] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
                title="Lasso Selection"
              >
                <CircleDashed className="w-3.5 h-3.5 stroke-[1.8]" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectionMode('marquee');
                  if (!isPinned) scheduleAutoCollapse(1500);
                }}
                className={`p-1.5 rounded-lg transition-all ${
                  selectionMode === 'marquee'
                    ? 'bg-[#2e303b] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
                title="Marquee Box Selection"
              >
                <Scan className="w-3.5 h-3.5 stroke-[1.8]" />
              </button>
            </div>

            <div className="flex items-center gap-0.5">
              {/* Pin Toggle */}
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isPinned ? 'text-white bg-white/10' : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title={isPinned ? 'Menu is Pinned (Will not auto-collapse)' : 'Auto-Collapse is Active (Click to Pin Open)'}
              >
                {isPinned ? <Pin className="w-3.5 h-3.5 stroke-[2]" /> : <PinOff className="w-3.5 h-3.5 stroke-[1.8]" />}
              </button>

              {/* Collapse sideways button */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Minimize Menu Sideways"
              >
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-[#27282f] w-full" />

          {/* 2. 3D PRIMITIVES COMBO BUTTON & FLYOUT */}
          <div className="relative px-0.5">
            <button
              id="btn-primitives-menu-trigger"
              type="button"
              onClick={() => {
                setShowPrimitivesMenu(!showPrimitivesMenu);
                if (!isPinned) scheduleAutoCollapse(3000);
              }}
              className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-medium flex items-center justify-between transition-all ${
                showPrimitivesMenu || activePrimitive
                  ? 'bg-[#2e303b] border-neutral-600 text-white shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
              title="3D Primitives (Cube, Sphere, Cylinder, Torus, Capsule, Cone, Pyramid, Disk)"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <ActivePrimitiveIcon className="w-3.5 h-3.5 stroke-[1.8] text-white shrink-0" />
                <span className="truncate text-[10px] font-semibold">
                  {activePrimitiveItem ? activePrimitiveItem.name : 'Primitives'}
                </span>
              </div>
              <ChevronRight
                className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform ${
                  showPrimitivesMenu ? 'rotate-90 sm:rotate-0' : ''
                }`}
              />
            </button>

            {/* Primitives Flyout Popover Menu */}
            {showPrimitivesMenu && (
              <div
                id="mody-primitives-flyout-menu"
                className="absolute left-full ml-2 top-0 w-48 p-2 rounded-2xl bg-[#141519]/98 backdrop-blur-2xl border border-zinc-800 shadow-2xl z-50 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 select-none"
              >
                <div className="flex items-center justify-between px-1 pb-1 border-b border-zinc-800 text-[10px] font-mono text-zinc-400">
                  <span>3D PRIMITIVES</span>
                  <button
                    type="button"
                    onClick={() => setShowPrimitivesMenu(false)}
                    className="text-zinc-500 hover:text-white p-0.5 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 pt-1">
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
                            ? 'bg-white text-zinc-950 font-bold shadow-sm'
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
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-[#27282f] w-full" />

          {/* 3. SCULPTING & LINE TOOLS GRID (3 COLUMNS) */}
          <div className="grid grid-cols-3 gap-1 px-0.5">
            {/* Direct Sketch Brush */}
            <button
              type="button"
              onClick={() => {
                setTool('brush');
                if (!isPinned) scheduleAutoCollapse(1200);
              }}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                tool === 'brush'
                  ? 'bg-[#2e303b] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="3D Pen Tool"
            >
              <Pen className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>

            {/* Wire / Curve Tool */}
            <button
              type="button"
              onClick={() => {
                setTool('brush');
                if (!isPinned) scheduleAutoCollapse(1200);
              }}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                tool === 'brush'
                  ? 'bg-[#2e303b] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="3D Curve Sketch"
            >
              <Spline className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>

            {/* Ribbon / Tube Profile */}
            <button
              type="button"
              onClick={() => {
                setBrushSettings((prev) => ({
                  ...prev,
                  strokeProfile: prev.strokeProfile === 'ribbon' ? 'tube' : 'ribbon',
                }));
              }}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                brushSettings.strokeProfile === 'ribbon'
                  ? 'bg-[#2e303b] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Stroke Profile: Ribbon / Tube"
            >
              <Layers className="w-3.5 h-3.5 stroke-[1.8]" />
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
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                brushSettings.shapeSnapping
                  ? 'bg-white text-zinc-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title={`Draw Shape Snapping: ${brushSettings.shapeSnapping ? 'ON (Auto-snaps lines, circles, arcs)' : 'OFF'}`}
            >
              <Shapes className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>

            {/* Eraser / Vacuum Purge Mode */}
            <div className="relative flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setTool('eraser');
                  if (!isPinned) scheduleAutoCollapse(1200);
                }}
                className={`p-1.5 rounded-lg flex items-center justify-center w-full transition-all ${
                  tool === 'eraser'
                    ? 'bg-white text-zinc-950 shadow-sm font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
                title={
                  brushSettings.eraserMode === 'vacuum'
                    ? 'Vacuum Eraser (Continuous Purge on Hit)'
                    : 'Cutout Eraser (Negative Space Mask)'
                }
              >
                <Scissors className="w-3.5 h-3.5 stroke-[1.8]" />
                {brushSettings.eraserMode === 'vacuum' && (
                  <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-white rounded-full" />
                )}
              </button>
            </div>

            {/* 3D Brush Picker */}
            <button
              type="button"
              onClick={() => {
                setShowBrushPickerModal(true);
                if (!isPinned) scheduleAutoCollapse(1200);
              }}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                tool === 'brush_picker' || showBrushPickerModal
                  ? 'bg-sky-400 text-zinc-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="3D Brush Picker & Stroke DNA Presets"
            >
              <Paintbrush className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>

            {/* 3D Paint & Finish Picker */}
            <button
              type="button"
              onClick={() => {
                setShowPaintPickerModal(true);
                if (!isPinned) scheduleAutoCollapse(1200);
              }}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                tool === 'paint_picker' || showPaintPickerModal
                  ? 'bg-purple-400 text-zinc-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="3D Paint & Material Finish Picker"
            >
              <Palette className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>

            {/* Eyedropper DNA & Surface Sampler */}
            <button
              type="button"
              onClick={() => {
                setTool('paint_picker');
                if (!isPinned) scheduleAutoCollapse(1200);
              }}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                tool === 'paint_picker' || tool === 'eyedropper'
                  ? 'bg-white text-zinc-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="True Eyedropper & Surface Finish Sampler"
            >
              <Pipette className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>

            {/* Measure / Ruler */}
            <button
              type="button"
              onClick={() => {
                setBrushSettings((prev) => ({
                  ...prev,
                  straightLineMode: !prev.straightLineMode,
                }));
              }}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all ${
                brushSettings.straightLineMode
                  ? 'bg-white text-zinc-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Straight Line Constraint"
            >
              <Ruler className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-zinc-800 w-full" />

          {/* Quick Drawing Space: Surface Conformal vs 3D Air */}
          <div className="flex flex-col gap-1 px-0.5">
            <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 uppercase tracking-wider px-0.5">
              <span>Drawing Space</span>
              {onOpenBrushSettings && (
                <button
                  type="button"
                  onClick={onOpenBrushSettings}
                  className="text-zinc-400 hover:text-white transition-colors"
                  title="Open Brush Dynamics & Surface Settings"
                >
                  <Sliders className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
              <button
                type="button"
                onClick={() => setBrushSettings((prev) => ({ ...prev, drawingMode: 'surface' }))}
                className={`py-1 px-1 rounded-md text-[9px] font-medium flex items-center justify-center gap-1 transition-all ${
                  brushSettings.drawingMode !== 'spatial_3d'
                    ? 'bg-white text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Surface Conformal (Snaps to 3D geometry)"
              >
                <Shapes className="w-3 h-3" />
                <span>Surface</span>
              </button>
              <button
                type="button"
                onClick={() => setBrushSettings((prev) => ({ ...prev, drawingMode: 'spatial_3d' }))}
                className={`py-1 px-1 rounded-md text-[9px] font-medium flex items-center justify-center gap-1 transition-all ${
                  brushSettings.drawingMode === 'spatial_3d'
                    ? 'bg-white text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Free 3D Spatial (Draws in mid-air)"
              >
                <Compass className="w-3 h-3" />
                <span>3D Air</span>
              </button>
            </div>
          </div>

          {/* Quick Material Mode: Flat | PBR | Glow | Mask */}
          <div className="flex flex-col gap-1 px-0.5">
            <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 uppercase tracking-wider px-0.5">
              <span>Material</span>
              <span className="text-[8px] font-mono text-zinc-500 capitalize">{brushSettings.materialType || 'shadeless'}</span>
            </div>
            <div className="grid grid-cols-4 gap-0.5 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
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
                    className={`py-1 rounded text-[9px] font-medium text-center transition-all ${
                      isSel
                        ? 'bg-white text-zinc-950 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title={`Material Shader: ${mat.label}`}
                  >
                    {mat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-zinc-800 w-full" />

          {/* 4. DYNAMIC BRUSH SIZE SCRUB RING */}
          <div className="relative flex items-center justify-center px-0.5">
            <button
              type="button"
              onClick={() => setShowSizePopup(!showSizePopup)}
              className="w-full py-1 px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center gap-2 text-xs font-mono transition-all"
              title="Adjust Brush Size"
            >
              <div
                className="w-3 h-3 rounded-full border border-neutral-300 transition-all"
                style={{
                  transform: `scale(${Math.min(1.4, Math.max(0.6, brushSettings.size * 10))})`,
                }}
              />
              <span className="text-[11px] text-zinc-300 font-mono">{displayPxSize}</span>
            </button>
          </div>

          {/* 5. COLOR WHEELS & SWATCHES ROW */}
          <div className="flex items-center justify-between px-1 py-0.5">
            {/* Active Brush Swatch Button */}
            <button
              type="button"
              onClick={() => {
                if (onOpenColorStudio) onOpenColorStudio();
                else setShowPaintPickerModal(true);
              }}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Active Color (Click for Color Studio)"
            >
              <div
                className="w-5 h-5 rounded-full border border-black/40 shadow-inner"
                style={{ backgroundColor: brushSettings.color }}
              />
            </button>

            {/* Color Wheel 1 (Spectrum) */}
            <button
              type="button"
              onClick={() => {
                if (onOpenColorStudio) {
                  onOpenColorStudio();
                } else {
                  setColorPickerTab('spectrum');
                  setShowColorModal(true);
                }
              }}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Spectrum Color Picker Studio"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 to-indigo-500 border border-white/20 shadow-sm" />
            </button>

            {/* Color Wheel 2 (Value / Temperature) */}
            <button
              type="button"
              onClick={() => {
                if (onOpenColorStudio) {
                  onOpenColorStudio();
                } else {
                  setColorPickerTab('temperature');
                  setShowColorModal(true);
                }
              }}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Temperature & Value Spectrum"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-b from-sky-400 via-neutral-100 to-amber-400 border border-white/20 shadow-sm" />
            </button>
          </div>

          {/* 6. PALETTE, COLOR SQUARE, OPACITY DROPLET */}
          <div className="flex items-center justify-between px-1 py-0.5">
            {/* Palette Icon */}
            <button
              type="button"
              onClick={() => {
                setShowPaintPickerModal(true);
              }}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="3D Paint & Material Palettes"
            >
              <Palette className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>

            {/* Color Square Swatch with Native Color Input */}
            <label
              className="w-5 h-5 rounded-md border border-neutral-600 shadow-sm cursor-pointer overflow-hidden block relative hover:scale-105 transition-transform"
              style={{ backgroundColor: brushSettings.color }}
              title="Choose Custom Color"
            >
              <input
                ref={nativeColorInputRef}
                type="color"
                value={brushSettings.color}
                onChange={(e) => handleSelectColor(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
            </label>

            {/* Opacity Droplet */}
            <button
              type="button"
              onClick={() => setShowOpacityPopup(!showOpacityPopup)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Brush Opacity"
            >
              <Droplet className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>
          </div>

          {/* 7. STUDIO & SCENE ACTIONS (INTEGRATED FROM TOP MENU BAR) */}
          <div className="flex flex-col gap-1 pt-1 border-t border-zinc-800">
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider px-0.5">Scene & Studio</span>
            <div className="grid grid-cols-3 gap-1 px-0.5">
              {/* Assets / Model Library */}
              {onOpenModelLibrary && (
                <button
                  type="button"
                  onClick={onOpenModelLibrary}
                  className="p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="3D Model & Preset Library"
                >
                  <FolderArchive className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span className="text-[8px] font-mono">Model</span>
                </button>
              )}

              {/* Texture / Clay Toggle */}
              {onToggleModelDisplayMode && (
                <button
                  type="button"
                  onClick={onToggleModelDisplayMode}
                  className={`p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    modelDisplayMode === 'texture'
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={`Surface Mode: ${modelDisplayMode === 'texture' ? 'Textured (Click for Clay)' : 'Clay White (Click for Textured)'}`}
                >
                  <Palette className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span className="text-[8px] font-mono">{modelDisplayMode === 'texture' ? 'Texture' : 'Clay'}</span>
                </button>
              )}

              {/* Clone Model */}
              {onCloneModel && (
                <button
                  type="button"
                  onClick={onCloneModel}
                  className="p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Clone 3D Model"
                >
                  <Copy className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span className="text-[8px] font-mono">Clone</span>
                </button>
              )}

              {/* Hide / Show 3D Model */}
              {onToggleModelVisibility && (
                <button
                  type="button"
                  onClick={onToggleModelVisibility}
                  className={`p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    !isModelVisible
                      ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={isModelVisible ? 'Hide 3D Model' : 'Show 3D Model'}
                >
                  {isModelVisible ? (
                    <Eye className="w-3.5 h-3.5 stroke-[1.8]" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 stroke-[1.8] text-zinc-500" />
                  )}
                  <span className="text-[8px] font-mono">{isModelVisible ? 'Show' : 'Hide'}</span>
                </button>
              )}

              {/* Skybox & Atmosphere Studio */}
              {onOpenIllumination && (
                <button
                  type="button"
                  onClick={onOpenIllumination}
                  className="p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Skybox, Lighting & Weather Studio"
                >
                  <Sun className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span className="text-[8px] font-mono">Skybox</span>
                </button>
              )}

              {/* Grid Toggle */}
              {onToggleGrid && (
                <button
                  type="button"
                  onClick={onToggleGrid}
                  className={`p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    showGrid
                      ? 'bg-white text-zinc-950 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={`Ground Grid: ${showGrid ? 'Visible' : 'Hidden'}`}
                >
                  <Grid3x3 className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span className="text-[8px] font-mono">Grid</span>
                </button>
              )}

              {/* Drawings Layers Panel */}
              {onOpenLayers && (
                <button
                  type="button"
                  onClick={onOpenLayers}
                  className="p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Drawings & Hierarchy Layers Panel"
                >
                  <Layers className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span className="text-[8px] font-mono">Layers</span>
                </button>
              )}

              {/* Drawing Plane Toggle */}
              {onTogglePlane && (
                <button
                  type="button"
                  onClick={onTogglePlane}
                  className="p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Toggle Construction Drawing Plane"
                >
                  <Maximize2 className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span className="text-[8px] font-mono">Plane</span>
                </button>
              )}

              {/* Reset Camera */}
              {onResetCamera && (
                <button
                  type="button"
                  onClick={onResetCamera}
                  className="p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Reset Camera Framing"
                >
                  <RotateCcw className="w-3.5 h-3.5 stroke-[1.8]" />
                  <span className="text-[8px] font-mono">Reset</span>
                </button>
              )}
            </div>

            {/* More Menu Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`w-full py-1 px-2 rounded-lg border text-[10px] font-medium flex items-center justify-between transition-all ${
                  showMoreMenu
                    ? 'bg-zinc-800 border-zinc-700 text-white'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
                }`}
                title="More Studio Tools & Export"
              >
                <div className="flex items-center gap-1.5">
                  <MoreHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                  <span>More Tools</span>
                </div>
                <span className="text-[8px] font-mono text-zinc-500">...</span>
              </button>

              {/* More Tools Popover Modal/Dropdown */}
              {showMoreMenu && (
                <div className="absolute left-full ml-2 bottom-0 w-56 p-1.5 rounded-2xl bg-[#141519]/98 backdrop-blur-2xl border border-zinc-800 shadow-2xl z-50 flex flex-col gap-0.5 text-xs animate-in fade-in zoom-in-95 select-none">
                  {onOpenExport && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenExport();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Export GLTF / Textures</span>
                    </button>
                  )}

                  {onOpenRenderSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenRenderSettings();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Post-Processing & Shaders</span>
                    </button>
                  )}

                  {onOpenLiquify && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenLiquify();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
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
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
                    >
                      <Scissors className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Curve Decimation (RDP)</span>
                    </button>
                  )}

                  {onOpenScaffolding && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenScaffolding();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
                    >
                      <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>3D Collision Scaffolding</span>
                    </button>
                  )}

                  {onOpenClipboard && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenClipboard();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
                    >
                      <Clipboard className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>2D Reference Clipboard</span>
                    </button>
                  )}

                  {onOpenBentGuide && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenBentGuide();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
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
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Arbitrary Mirror Plane</span>
                    </button>
                  )}

                  {onOpenRaycastSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenRaycastSettings();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
                    >
                      <Eye className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>Surface Snapping & Raycast</span>
                    </button>
                  )}

                  {onOpenARViewer && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenARViewer();
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-200 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
                    >
                      <Glasses className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>WebXR AR Spatial View</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 8. VIEWPORT & INPUT MODES */}
          <div className="flex flex-col gap-1 pt-1 border-t border-zinc-800">
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider px-0.5">Viewport & Input</span>

            {/* Stylus Detection Active Badge */}
            {isStylusDetected && (
              <div className="w-full py-1 px-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-between text-[10px] font-medium">
                <div className="flex items-center gap-1">
                  <PenTool className="w-3 h-3 text-zinc-300 shrink-0" />
                  <span>Stylus Pen</span>
                </div>
                <span className="text-[8px] font-mono bg-white text-zinc-950 px-1 rounded font-bold">Active</span>
              </div>
            )}

            {/* Projection Mode Toggle */}
            {onToggleProjection && (
              <button
                type="button"
                onClick={onToggleProjection}
                className="w-full py-1 px-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-between text-[10px] font-medium transition-all"
                title="Toggle Perspective / Orthographic Projection"
              >
                <div className="flex items-center gap-1">
                  <Box className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span>{projectionMode === 'orthographic' ? 'Ortho View' : 'Perspective'}</span>
                </div>
              </button>
            )}

            {/* Finger Draw / Finger Lock Accessibility Toggle */}
            {onToggleFingerPenMode && (
              <button
                type="button"
                onClick={() => onToggleFingerPenMode(!fingerPenMode)}
                className={`w-full py-1 px-1.5 rounded-lg border text-[10px] font-medium flex items-center justify-between transition-all ${
                  fingerPenMode
                    ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm font-semibold'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title={
                  fingerPenMode
                    ? 'Finger-Pen Mode ON: 1-finger touch draws on model (Stylus simulated for touchscreens)'
                    : 'Strict Segregation ON: Stylus strictly draws, 1-finger touch strictly orbits/pans'
                }
              >
                <div className="flex items-center gap-1">
                  <Touchpad className="w-3 h-3 shrink-0 text-zinc-400" />
                  <span>{fingerPenMode ? 'Finger Draw' : 'Finger Lock'}</span>
                </div>
                <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${fingerPenMode ? 'bg-white text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-500'}`}>
                  {fingerPenMode ? 'ON' : 'OFF'}
                </span>
              </button>
            )}

            {/* Right-Click Radial Menu Toggle */}
            {onToggleDisableContextMenu && (
              <button
                type="button"
                onClick={() => onToggleDisableContextMenu()}
                className={`w-full py-1 px-1.5 rounded-lg border text-[10px] font-medium flex items-center justify-between transition-all ${
                  !disableContextMenu
                    ? 'bg-zinc-800 border-zinc-600 text-white shadow-sm font-semibold'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
                title={
                  disableContextMenu
                    ? 'Right-Click Radial Menu: OFF (Click to turn ON)'
                    : 'Right-Click Radial Menu: ON (Click to turn OFF for desktop orbit)'
                }
              >
                <div className="flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 shrink-0 text-zinc-400" />
                  <span>Radial Menu</span>
                </div>
                <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${!disableContextMenu ? 'bg-white text-zinc-950' : 'bg-zinc-800 text-zinc-500'}`}>
                  {!disableContextMenu ? 'ON' : 'OFF'}
                </span>
              </button>
            )}

            {/* 3D Navigator Controller Switcher (Card Dial vs Circular Tactile Wheel) */}
            {onChangeController && (
              <div className="flex flex-col gap-1 pt-1 border-t border-zinc-800/60">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">3D Controller</span>
                  <button
                    type="button"
                    onClick={() => onChangeController(activeController === 'hidden' ? 'both' : 'hidden')}
                    className="text-[8px] font-mono text-zinc-500 hover:text-zinc-300"
                  >
                    {activeController === 'hidden' ? 'Show' : 'Hide'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeController === 'navigator') onChangeController('hidden');
                      else if (activeController === 'both') onChangeController('tactile');
                      else if (activeController === 'tactile') onChangeController('both');
                      else onChangeController('navigator');
                    }}
                    className={`py-1 px-1 rounded-md text-[9px] font-medium flex items-center justify-center gap-1 transition-all ${
                      activeController === 'navigator' || activeController === 'both'
                        ? 'bg-white text-zinc-950 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Toggle Rectangular Transform Card Dial"
                  >
                    <Compass className="w-3 h-3 stroke-[2]" />
                    <span>Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (activeController === 'tactile') onChangeController('hidden');
                      else if (activeController === 'both') onChangeController('navigator');
                      else if (activeController === 'navigator') onChangeController('both');
                      else onChangeController('tactile');
                    }}
                    className={`py-1 px-1 rounded-md text-[9px] font-medium flex items-center justify-center gap-1 transition-all ${
                      activeController === 'tactile' || activeController === 'both'
                        ? 'bg-white text-zinc-950 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title="Toggle Circular Tactile Spatial Wheel"
                  >
                    <Disc className="w-3 h-3 stroke-[2]" />
                    <span>Circular</span>
                  </button>
                </div>
              </div>
            )}

            {/* Global UI Scale Setting */}
            {onUiScaleChange && (
              <div className="flex flex-col gap-1 pt-1 border-t border-zinc-800/60">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase">UI Scale</span>
                  <span className="text-[9px] font-mono font-bold text-zinc-200">
                    {Math.round((uiScale || 1.0) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onUiScaleChange((uiScale || 1.0) - 0.1)}
                    className="flex-1 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-bold"
                    title="Decrease UI Scale (-10%)"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const presets = [0.8, 0.9, 1.0, 1.15, 1.3, 1.5];
                      const current = uiScale || 1.0;
                      const idx = presets.findIndex((s) => Math.abs(s - current) < 0.05);
                      const next = presets[(idx + 1) % presets.length];
                      onUiScaleChange(next);
                    }}
                    className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[9px] font-mono text-zinc-300 hover:text-white"
                    title="Cycle Scale Presets (80%, 90%, 100%, 115%, 130%, 150%)"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => onUiScaleChange((uiScale || 1.0) + 0.1)}
                    className="flex-1 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-bold"
                    title="Increase UI Scale (+10%)"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 9. FOOTER: UNDO / SOUND / REDO (SOUND IN EXPANDED MENU PER REQ 3) */}
          <div className="flex items-center justify-between px-1 pt-1 border-t border-zinc-800">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1 rounded-lg transition-all ${
                canUndo ? 'text-zinc-300 hover:text-white hover:bg-white/10' : 'text-zinc-600 opacity-40 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5 stroke-[2]" />
            </button>

            {onToggleSound && (
              <button
                type="button"
                onClick={onToggleSound}
                className={`p-1 px-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-all ${
                  soundEnabled
                    ? 'text-white bg-white/10 border border-white/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 border border-transparent'
                }`}
                title={soundEnabled ? 'Haptic Sound Effects: Enabled (Click to mute)' : 'Haptic Sound Effects: Muted (Click to enable)'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-zinc-200" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                )}
                <span className="font-mono text-[9px]">{soundEnabled ? 'Sound' : 'Mute'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1 rounded-lg transition-all ${
                canRedo ? 'text-zinc-300 hover:text-white hover:bg-white/10' : 'text-zinc-600 opacity-40 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>
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
        theme="dark"
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
        theme="dark"
      />

      {/* ---------------------------------------------------- */}
      {/* ADVANCED COLOR STUDIO MODAL (HSV & OKLCh POLAR)      */}
      {/* ---------------------------------------------------- */}
      <ColorStudioModal
        isOpen={showColorModal}
        onClose={() => setShowColorModal(false)}
        currentColor={brushSettings.color || '#38bdf8'}
        onChangeColor={(hex) => handleSelectColor(hex)}
        onSampleFromScreen={() => {
          setTool('paint_picker');
        }}
        theme="dark"
      />

      {/* ---------------------------------------------------- */}
      {/* BRUSH SIZE POPOVER                                   */}
      {/* ---------------------------------------------------- */}
      {showSizePopup && (
        <div
          id="toolbar-brush-size-popover"
          className="absolute left-full ml-2 top-10 p-3 rounded-xl bg-[#18191d]/95 backdrop-blur-xl border border-[#2b2c32] shadow-2xl z-50 flex flex-col gap-2 w-48 text-xs animate-in fade-in zoom-in-95 select-none"
        >
          <div className="flex justify-between items-center font-semibold pb-1 border-b border-[#282a32]">
            <span className="text-xs text-white">Brush Size</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-neutral-400">{displayPxSize}</span>
              <button
                type="button"
                onClick={() => setShowSizePopup(false)}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0.01"
            max="0.25"
            step="0.005"
            value={brushSettings.size}
            onChange={(e) => handleSizeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
          />
          {/* Quick presets for mobile touch */}
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#282a32]">
            {[0.02, 0.05, 0.1, 0.2].map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => handleSizeChange(sz)}
                className={`flex-1 py-1 rounded text-[10px] font-mono transition-colors ${
                  Math.abs(brushSettings.size - sz) < 0.01
                    ? 'bg-white text-black font-bold'
                    : 'bg-[#22242c] text-neutral-300 hover:bg-[#2c2e38]'
                }`}
              >
                {(sz * 30).toFixed(0)}px
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* BRUSH OPACITY POPOVER                                */}
      {/* ---------------------------------------------------- */}
      {showOpacityPopup && (
        <div
          id="toolbar-brush-opacity-popover"
          className="absolute left-full ml-2 top-24 p-3 rounded-xl bg-[#18191d]/95 backdrop-blur-xl border border-[#2b2c32] shadow-2xl z-50 flex flex-col gap-2 w-48 text-xs animate-in fade-in zoom-in-95 select-none"
        >
          <div className="flex justify-between items-center font-semibold pb-1 border-b border-[#282a32]">
            <span className="text-xs text-white">Opacity</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-neutral-400">{Math.round(brushSettings.opacity * 100)}%</span>
              <button
                type="button"
                onClick={() => setShowOpacityPopup(false)}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0.05"
            max="1.0"
            step="0.05"
            value={brushSettings.opacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
          />
          {/* Quick presets for mobile touch */}
          <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#282a32]">
            {[0.25, 0.5, 0.75, 1.0].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => handleOpacityChange(op)}
                className={`flex-1 py-1 rounded text-[10px] font-mono transition-colors ${
                  Math.abs(brushSettings.opacity - op) < 0.05
                    ? 'bg-white text-black font-bold'
                    : 'bg-[#22242c] text-neutral-300 hover:bg-[#2c2e38]'
                }`}
              >
                {Math.round(op * 100)}%
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
