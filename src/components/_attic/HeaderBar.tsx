import React, { useState } from 'react';
import {
  LightingPreset,
  GizmoMode,
  ActiveControllerType,
  ModelDisplayMode,
} from '../types';
import {
  FolderArchive,
  Sun,
  Grid3x3,
  Layers,
  Compass,
  RotateCcw,
  MoreHorizontal,
  Sparkles,
  Cpu,
  Scissors,
  Shield,
  Clipboard,
  Eye,
  EyeOff,
  Box,
  Copy,
  Download,
  HelpCircle,
  Maximize2,
  Spline,
  Wand2,
  Glasses,
  Palette,
  Disc,
  X,
  Volume2,
  VolumeX,
  LayoutGrid,
  MousePointerClick,
  Smartphone,
  QrCode,
  Paintbrush,
  Pipette,
} from 'lucide-react';

interface HeaderBarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  gizmoMode: GizmoMode;
  onChangeGizmoMode: (mode: GizmoMode) => void;
  onOpenColorPicker: () => void;
  onOpenBrushPicker?: () => void;
  onOpenPaintPicker?: () => void;
  activeColor: string;
  onOpenModelLibrary: () => void;
  onOpenConverter: () => void;
  activeModelName: string;
  lightingPreset?: LightingPreset;
  onCycleLighting?: () => void;
  onOpenIllumination: () => void;
  onResetCamera: () => void;
  onOpenMenu: () => void;
  isMenuOpen: boolean;
  onOpenLayers: () => void;
  onTogglePlane?: () => void;
  onOpenExport: () => void;
  onOpenRenderSettings: () => void;
  onOpenRaycastSettings?: () => void;
  onOpenLiquify?: () => void;
  onOpenDecimate?: () => void;
  onOpenBentGuide?: () => void;
  onOpenCustomMirror?: () => void;
  onOpenARViewer?: () => void;
  onOpenScaffolding?: () => void;
  onOpenClipboard?: () => void;
  activeController?: ActiveControllerType;
  onChangeController?: (controller: ActiveControllerType) => void;
  disableContextMenu?: boolean;
  onToggleDisableContextMenu?: () => void;
  isSoundEnabled?: boolean;
  onToggleSound?: () => void;
  fps?: number;
  isModelVisible?: boolean;
  onToggleModelVisibility?: () => void;
  modelDisplayMode?: ModelDisplayMode;
  onToggleModelDisplayMode?: () => void;
  onCloneModel?: () => void;
  onOpenModelDisplay?: () => void;
  onOpenMobileConnect?: () => void;
  onOpenMatCapStudio?: () => void;
  onOpenSandbox?: () => void;
}

export const HeaderBarComponent: React.FC<HeaderBarProps> = ({
  onToggleTheme,
  showGrid,
  onToggleGrid,
  activeController = 'navigator',
  onChangeController,
  onOpenSandbox,
  onOpenColorPicker,
  onOpenBrushPicker,
  onOpenPaintPicker,
  activeColor,
  onOpenModelLibrary,
  onOpenConverter,
  onOpenIllumination,
  onResetCamera,
  onOpenMenu,
  isMenuOpen,
  onOpenLayers,
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
  onOpenMobileConnect,
  disableContextMenu,
  onToggleDisableContextMenu,
  isSoundEnabled = true,
  onToggleSound,
  fps = 60,
  isModelVisible = true,
  onToggleModelVisibility,
  modelDisplayMode = 'texture',
  onToggleModelDisplayMode,
  onCloneModel,
  onOpenModelDisplay,
  onOpenMatCapStudio,
}) => {
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <header className="fixed top-1.5 sm:top-3 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center select-none max-w-[calc(100vw-12px)] px-1 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Dark Header Capsule */}
      <div
        id="sketchbook-header-capsule"
        className="flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl bg-[#18191d]/95 backdrop-blur-xl border border-[#2b2c32] text-[#e2e4ea] shadow-2xl transition-all overflow-x-auto scrollbar-none max-w-full text-xs"
      >
        {/* 1. BRUSH PICKER */}
        {onOpenBrushPicker && (
          <button
            id="header-btn-brush-picker"
            onClick={onOpenBrushPicker}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 text-zinc-300 hover:text-white shrink-0"
            title="Open 3D Brush Picker & Stroke DNA"
          >
            <Paintbrush className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-[11px] font-medium hidden sm:inline">Brush</span>
          </button>
        )}

        {/* 2. PAINT PICKER */}
        {onOpenPaintPicker && (
          <button
            id="header-btn-paint-picker"
            onClick={onOpenPaintPicker}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 text-zinc-300 hover:text-white shrink-0"
            title="Open 3D Paint & Material Finish Picker"
          >
            <Palette className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-[11px] font-medium hidden sm:inline">Paint</span>
          </button>
        )}

        {/* 3. COLOR PALETTE */}
        <button
          id="header-btn-color"
          onClick={onOpenColorPicker}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 text-zinc-300 hover:text-white shrink-0"
          title="Open Color Studio & Palettes"
        >
          <div
            className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-inner shrink-0"
            style={{ backgroundColor: activeColor }}
          />
          <span className="text-[11px] font-medium hidden sm:inline">Color</span>
        </button>

        {/* 2. ASSETS LIBRARY */}
        <button
          id="header-btn-models"
          onClick={onOpenModelLibrary}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 text-zinc-300 hover:text-white shrink-0"
          title="Open 3D Assets & Models Library"
        >
          <FolderArchive className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="text-[11px] font-medium hidden md:inline">Assets</span>
        </button>

        {/* 2B. MODEL QUICK CONTROLS */}
        {onToggleModelDisplayMode && (
          <button
            id="header-btn-model-shading"
            onClick={onToggleModelDisplayMode}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all shrink-0 ${
              modelDisplayMode === 'clay' ? 'bg-white text-zinc-950 font-medium' : 'text-zinc-300 hover:text-white hover:bg-white/10'
            }`}
            title={modelDisplayMode === 'clay' ? 'Model in Plain White Canvas Mode (Click for Textures)' : 'Model in Textured Mode (Click for Plain White Canvas)'}
          >
            {modelDisplayMode === 'clay' ? (
              <Sparkles className="w-3.5 h-3.5 text-zinc-950 shrink-0" />
            ) : (
              <Palette className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            )}
            <span className="text-[11px] hidden lg:inline">
              {modelDisplayMode === 'clay' ? 'White' : 'Texture'}
            </span>
          </button>
        )}

        {onCloneModel && (
          <button
            id="header-btn-clone-model"
            onClick={onCloneModel}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 text-zinc-300 hover:text-white shrink-0"
            title="Clone / Duplicate Active 3D Model"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-[11px] font-medium hidden lg:inline">Clone</span>
          </button>
        )}

        {onToggleModelVisibility && (
          <button
            id="header-btn-model-visibility"
            onClick={onToggleModelVisibility}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all shrink-0 ${
              isModelVisible !== false ? 'text-zinc-300 hover:text-white hover:bg-white/10' : 'bg-zinc-800 text-zinc-400'
            }`}
            title={isModelVisible !== false ? 'Hide 3D Model' : 'Show 3D Model'}
          >
            {isModelVisible !== false ? (
              <Eye className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            )}
            <span className="text-[11px] font-medium hidden lg:inline">
              {isModelVisible !== false ? 'Hide' : 'Show'}
            </span>
          </button>
        )}

        {onOpenModelDisplay && (
          <button
            id="header-btn-model-display"
            onClick={onOpenModelDisplay}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 text-zinc-300 hover:text-white shrink-0"
            title="3D Model Shading, Opacity & Wireframe Settings"
          >
            <Box className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-[11px] font-medium hidden lg:inline">Model</span>
          </button>
        )}

        {/* 3. SKYBOX & LIGHTING */}
        <button
          id="header-btn-illumination"
          onClick={onOpenIllumination}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 text-zinc-300 hover:text-white shrink-0"
          title="Open Skybox & Atmosphere Studio"
        >
          <Sun className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="text-[11px] font-medium hidden md:inline">Skybox</span>
        </button>

        {/* 4. GRID TOGGLE */}
        <button
          id="header-btn-grid"
          onClick={onToggleGrid}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all shrink-0 ${
            showGrid ? 'bg-white text-zinc-950 font-medium' : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle Ground Grid Plane"
        >
          <Grid3x3 className={`w-3.5 h-3.5 shrink-0 ${showGrid ? 'text-zinc-950' : 'text-zinc-400'}`} />
          <span className="text-[11px] hidden sm:inline">Grid</span>
        </button>

        {/* Divider */}
        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5 shrink-0" />

        {/* 5. DRAWINGS / LAYERS */}
        <button
          id="header-btn-layers"
          onClick={onOpenLayers}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 text-zinc-300 hover:text-white shrink-0"
          title="Open Drawings & Hierarchy Layers Panel"
        >
          <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="text-[11px] font-medium hidden sm:inline">Drawings</span>
        </button>

        {/* 6. 3D NAVIGATOR TOGGLE */}
        {onChangeController && (
          <button
            id="header-btn-navigator"
            onClick={() => {
              if (activeController === 'hidden') {
                onChangeController('navigator');
              } else if (activeController === 'navigator') {
                onChangeController('tactile');
              } else if (activeController === 'tactile') {
                onChangeController('both');
              } else {
                onChangeController('hidden');
              }
            }}
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all shrink-0 ${
              activeController !== 'hidden'
                ? 'bg-white text-zinc-950 font-medium'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title={`Active 3D Controller: ${activeController}. Click to toggle Transform Navigator, Tactile Wheel, Both, or Hidden.`}
          >
            {activeController === 'both' ? (
              <LayoutGrid className="w-3.5 h-3.5 shrink-0 text-zinc-950" />
            ) : activeController === 'tactile' ? (
              <Disc className="w-3.5 h-3.5 shrink-0 text-zinc-950" />
            ) : (
              <Compass className={`w-3.5 h-3.5 shrink-0 ${activeController === 'navigator' ? 'text-zinc-950' : 'text-zinc-400'}`} />
            )}
            <span className="text-[11px] hidden md:inline">
              {activeController === 'both'
                ? 'Both Navs'
                : activeController === 'tactile'
                ? 'Tactile Wheel'
                : activeController === 'navigator'
                ? 'Navigator'
                : 'Nav: Off'}
            </span>
          </button>
        )}

        {/* 7. DRAWING PLANE TOGGLE */}
        {onTogglePlane && (
          <button
            id="header-btn-plane"
            onClick={onTogglePlane}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 text-zinc-300 hover:text-white shrink-0"
            title="Toggle Default Drawing Canvas Plane"
          >
            <Maximize2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-[11px] hidden lg:inline">Plane</span>
          </button>
        )}

        {/* 8. MOBILE CONNECT & QR */}
        {onOpenMobileConnect && (
          <button
            id="header-btn-mobile-connect"
            onClick={onOpenMobileConnect}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 text-zinc-300 hover:text-white shrink-0"
            title="Mobile Device Connect & QR Code"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[11px] font-medium hidden lg:inline">Mobile</span>
          </button>
        )}

        {/* 9. RESET CAMERA VIEW */}
        <button
          id="header-btn-reset-cam"
          onClick={onResetCamera}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 text-zinc-300 hover:text-white shrink-0"
          title="Reset Camera & Viewport to Isometric"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="text-[11px] hidden lg:inline">Reset</span>
        </button>

        {/* 9. MORE MENU */}
        <div className="relative shrink-0">
          <button
            id="header-btn-menu"
            onClick={onOpenMenu}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 text-zinc-300 hover:text-white"
            title="More Options & Tools"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[11px] font-medium hidden sm:inline">More</span>
          </button>

          {/* More Menu Dropdown */}
          {isMenuOpen && (
            <div
              className="absolute top-full mt-2 right-0 w-64 max-w-[calc(100vw-24px)] py-2 rounded-2xl shadow-2xl border border-zinc-800 bg-[#141519] text-[#e2e4ea] z-50 animate-in fade-in zoom-in-95 duration-100 text-xs"
            >
              {/* Skybox & Atmosphere Studio */}
              <button
                id="menu-btn-skybox"
                onClick={() => {
                  onOpenIllumination();
                  onOpenMenu();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
              >
                <Sun className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="font-medium">Skybox & Atmosphere Studio</span>
              </button>

              {/* Shaders & Render Settings */}
              <button
                id="menu-btn-render"
                onClick={() => {
                  onOpenRenderSettings();
                  onOpenMenu();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
              >
                <Sparkles className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="font-medium">Post-Processing & Shaders</span>
              </button>

              {/* Ingestion & Converter */}
              <button
                id="menu-btn-converter"
                onClick={() => {
                  onOpenConverter();
                  onOpenMenu();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
              >
                <Cpu className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="font-medium">Ingest 3D / Draco Converter</span>
              </button>

              {/* Volumetric Liquify */}
              {onOpenLiquify && (
                <button
                  id="menu-btn-liquify"
                  onClick={() => {
                    onOpenLiquify();
                    onOpenMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
                >
                  <Wand2 className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-medium">Volumetric Liquify & Deform</span>
                </button>
              )}

              {/* RDP Curve Decimation */}
              {onOpenDecimate && (
                <button
                  id="menu-btn-decimate"
                  onClick={() => {
                    onOpenDecimate();
                    onOpenMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
                >
                  <Scissors className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-medium">Curve Simplification (RDP)</span>
                </button>
              )}

              {/* 3D Collision Scaffolding */}
              {onOpenScaffolding && (
                <button
                  id="menu-btn-scaffolding"
                  onClick={() => {
                    onOpenScaffolding();
                    onOpenMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
                >
                  <Shield className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-medium">3D Collision Scaffolding</span>
                </button>
              )}

              {/* Floating Blueprint Clipboard */}
              {onOpenClipboard && (
                <button
                  id="menu-btn-clipboard"
                  onClick={() => {
                    onOpenClipboard();
                    onOpenMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
                >
                  <Clipboard className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-medium">Floating 2D Blueprint Clipboard</span>
                </button>
              )}

              {/* Bent 3D Manifold Guides */}
              {onOpenBentGuide && (
                <button
                  id="menu-btn-bent-guide"
                  onClick={() => {
                    onOpenBentGuide();
                    onOpenMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
                >
                  <Spline className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-medium">Lofting & Bent Manifold Guides</span>
                </button>
              )}

              {/* Arbitrary Mirror Plane */}
              {onOpenCustomMirror && (
                <button
                  id="menu-btn-custom-mirror"
                  onClick={() => {
                    onOpenCustomMirror();
                    onOpenMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
                >
                  <Maximize2 className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-medium">Arbitrary 3D Mirror Plane</span>
                </button>
              )}

              {/* Raycast & Snapping Settings */}
              {onOpenRaycastSettings && (
                <button
                  id="menu-btn-raycast"
                  onClick={() => {
                    onOpenRaycastSettings();
                    onOpenMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
                >
                  <Eye className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-medium">Surface Snapping & Raycast</span>
                </button>
              )}

              {/* WebXR AR Viewer */}
              {onOpenARViewer && (
                <button
                  id="menu-btn-ar-viewer"
                  onClick={() => {
                    onOpenARViewer();
                    onOpenMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
                >
                  <Glasses className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-medium">WebXR AR Spatial Viewport</span>
                </button>
              )}

              {/* Export 3D */}
              <button
                id="menu-btn-export"
                onClick={() => {
                  onOpenExport();
                  onOpenMenu();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
              >
                <Download className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="font-medium">Export GLTF / Textures</span>
              </button>

              {/* Mobile Connect & QR */}
              {onOpenMobileConnect && (
                <button
                  id="menu-btn-mobile-connect"
                  onClick={() => {
                    onOpenMobileConnect();
                    onOpenMenu();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-blue-500/10 text-blue-300"
                >
                  <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="font-medium">Mobile Device Connect & QR</span>
                </button>
              )}

              {/* 3D Navigation Controller Option Switcher */}
              {onChangeController && (
                <div className="px-3.5 py-2.5 border-t border-b border-zinc-800 flex flex-col gap-1.5 bg-[#101114]">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                    <span>3D Navigation Controller</span>
                    <span className="font-mono text-[10px] text-zinc-300 uppercase">
                      {activeController === 'both'
                        ? 'Both Active'
                        : activeController === 'tactile'
                        ? 'Tactile Wheel'
                        : activeController === 'navigator'
                        ? 'Navigator'
                        : 'Hidden'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    <button
                      id="menu-btn-controller-navigator"
                      type="button"
                      onClick={() => onChangeController('navigator')}
                      className={`py-1.5 px-0.5 rounded-lg text-[10px] font-medium transition-all text-center flex flex-col items-center gap-0.5 ${
                        activeController === 'navigator'
                          ? 'bg-white text-zinc-950 font-bold shadow-sm'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span className="truncate w-full text-[9px]">Navigator</span>
                    </button>
                    <button
                      id="menu-btn-controller-tactile"
                      type="button"
                      onClick={() => onChangeController('tactile')}
                      className={`py-1.5 px-0.5 rounded-lg text-[10px] font-medium transition-all text-center flex flex-col items-center gap-0.5 ${
                        activeController === 'tactile'
                          ? 'bg-white text-zinc-950 font-bold shadow-sm'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Disc className="w-3.5 h-3.5" />
                      <span className="truncate w-full text-[9px]">Tactile</span>
                    </button>
                    <button
                      id="menu-btn-controller-both"
                      type="button"
                      onClick={() => onChangeController('both')}
                      className={`py-1.5 px-0.5 rounded-lg text-[10px] font-medium transition-all text-center flex flex-col items-center gap-0.5 ${
                        activeController === 'both'
                          ? 'bg-white text-zinc-950 font-bold shadow-sm'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="truncate w-full text-[9px]">Both</span>
                    </button>
                    <button
                      id="menu-btn-controller-hidden"
                      type="button"
                      onClick={() => onChangeController('hidden')}
                      className={`py-1.5 px-0.5 rounded-lg text-[10px] font-medium transition-all text-center flex flex-col items-center gap-0.5 ${
                        activeController === 'hidden'
                          ? 'bg-white text-zinc-950 font-bold shadow-sm'
                          : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span className="truncate w-full text-[9px]">Hidden</span>
                    </button>
                  </div>

                  {onOpenSandbox && (
                    <button
                      id="menu-btn-open-sandbox"
                      type="button"
                      onClick={() => {
                        onOpenMenu();
                        onOpenSandbox();
                      }}
                      className="w-full mt-2 py-2 px-3 rounded-lg text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                        <span>Navigator Sandbox</span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200">6 Variations</span>
                    </button>
                  )}
                </div>
              )}

              {/* Sound Feedback Toggle Option */}
              {onToggleSound && (
                <button
                  id="menu-btn-toggle-sound"
                  onClick={() => onToggleSound()}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200"
                >
                  <div className="flex items-center gap-2.5">
                    {isSoundEnabled ? (
                      <Volume2 className="w-4 h-4 text-zinc-200 shrink-0" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}
                    <span className="font-medium">Sound Effects</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isSoundEnabled
                        ? 'bg-white text-zinc-950 font-medium'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {isSoundEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}

              {/* Right-Click Radial Menu Toggle */}
              {onToggleDisableContextMenu && (
                <button
                  id="menu-btn-toggle-context-menu"
                  type="button"
                  onClick={() => onToggleDisableContextMenu()}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-zinc-200 group"
                  title={
                    disableContextMenu
                      ? 'Right-Click Radial Menu: OFF (Click to turn ON)'
                      : 'Right-Click Radial Menu: ON (Click to turn OFF for desktop mouse orbit)'
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <MousePointerClick
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        !disableContextMenu ? 'text-zinc-200' : 'text-zinc-500'
                      }`}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-200">Right-Click Radial Menu</span>
                      <span className="text-[9px] text-zinc-400">
                        {!disableContextMenu ? 'Pops up on right-click' : 'Turned off (desktop orbit)'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                        !disableContextMenu
                          ? 'bg-white text-zinc-950'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {!disableContextMenu ? 'ON' : 'OFF'}
                    </span>
                    <div
                      className={`w-8 h-4.5 rounded-full p-0.5 transition-colors relative flex items-center ${
                        !disableContextMenu ? 'bg-zinc-200' : 'bg-zinc-700'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-zinc-950 shadow-sm transition-transform ${
                          !disableContextMenu ? 'translate-x-3.5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                </button>
              )}

              <div className="my-1 border-t border-[#25262c]" />

              {/* Help & Shortcuts */}
              <button
                onClick={() => {
                  setShowHelpModal(true);
                  onOpenMenu();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors hover:bg-white/10 text-neutral-400"
              >
                <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>Shortcuts & Help</span>
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-4 w-[1px] bg-[#2d2e35] mx-0.5 shrink-0" />

        {/* 10. FPS COUNTER (BUILT-IN) */}
        <div
          id="header-fps-counter"
          className="flex items-center gap-1 px-2 py-0.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono text-neutral-300 backdrop-blur-sm shrink-0 select-none"
          title={`Rendering Performance: ${fps} FPS`}
        >
          <span className="font-bold text-neutral-200">{fps}</span>
          <span className="text-neutral-500 font-sans text-[9px] uppercase tracking-wider hidden sm:inline">FPS</span>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[#141519] border border-[#2b2c32] rounded-2xl max-w-md w-full p-5 shadow-2xl text-[#e2e4ea] animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-[#2b2c32]">
              <h3 className="font-semibold text-sm">Keyboard Shortcuts & Navigation</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-neutral-400 hover:text-white text-xs px-2 py-1 rounded-lg hover:bg-white/10"
              >
                Close
              </button>
            </div>
            <div className="space-y-2.5 text-xs mt-4">
              <div className="flex justify-between py-1 border-b border-[#222328]">
                <span className="text-neutral-400">Left Click + Drag</span>
                <span className="font-medium">Draw 3D Conformal Ribbon / Paint</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222328]">
                <span className="text-neutral-400">Right Click + Drag / Two Fingers</span>
                <span className="font-medium">Orbit Camera 360</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222328]">
                <span className="text-neutral-400">Shift + Drag / Middle Click</span>
                <span className="font-medium">Pan Camera</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222328]">
                <span className="text-neutral-400">Scroll Wheel / Pinch</span>
                <span className="font-medium">Zoom In / Out</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222328]">
                <span className="text-neutral-400">Ctrl + Z / Ctrl + Y</span>
                <span className="font-medium">Undo / Redo</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222328]">
                <span className="text-neutral-400">[ / ] Keys</span>
                <span className="font-medium">Decrease / Increase Brush Size</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export const HeaderBar = React.memo(HeaderBarComponent);
