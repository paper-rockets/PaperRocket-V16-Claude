import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import * as THREE from 'three';
import {
  ToolType,
  BrushSettings,
  SymmetryMode,
  Layer,
  LightingPreset,
  PostProcessSettings,
  PerfectViewInfo,
  PerfectViewType,
  GPUInfo,
  SkyPresetName,
  ModelDisplayMode,
  ModelMetadata,
  GizmoMode,
  Guide3D,
  ActiveControllerType,
  ProjectSaveData,
} from './types';
import { StudioEngine } from './core/studioEngine';
import { Viewport } from './components/Viewport';
import { Toolbar } from './components/Toolbar';
import { LayerPanel } from './components/LayerPanel';
import { BrushSettingsPanel } from './components/BrushSettingsPanel';
import { ModelDisplayPanel } from './components/ModelDisplayPanel';
import { SpatialNavGizmo } from './components/SpatialNavGizmo';
import { TransformNavigator } from './components/TransformNavigator/TransformNavigator';
import { PaperRocketTactileWheel } from './components/PaperRocketTactileWheel';
import { TactileSpatialController } from './components/TactileSpatialController';
import { ScreenCenterCrosshair } from './components/ScreenCenterCrosshair';
import { FpsCounter } from './components/FpsCounter';
import { DeferredPanel } from './components/DeferredPanel';
import { publishCameraPose, publishFps } from './core/telemetryStore';
import { useUiMode } from './core/uiModeStore';
import { useOpenSheet } from './components/play/sheetStore';
import { PlayTopStrip } from './components/play/PlayTopStrip';
import { PlayDock, PlayToolId, playToolSettings } from './components/play/PlayDock';
import { PlayContextStrip } from './components/play/PlayContextStrip';
import { Spline, Compass, Disc, LayoutGrid } from 'lucide-react';

/**
 * Deferred UI.
 *
 * These panels and modals are closed on load, but eagerly importing them pulled
 * their entire dependency graph (extra Three.js scenes, jszip, QR encoding, the
 * shader preset tables) into the initial bundle. Parsing that costs real time on
 * a mobile CPU before the first frame can render. Each now loads the first time
 * the user opens it, and stays cached afterwards.
 */
const RenderSettingsPanel = lazy(() =>
  import('./components/RenderSettingsPanel').then((m) => ({ default: m.RenderSettingsPanel }))
);
const ModelLibraryModal = lazy(() =>
  import('./components/ModelLibraryModal').then((m) => ({ default: m.ModelLibraryModal }))
);
const ExportModal = lazy(() => import('./components/ExportModal').then((m) => ({ default: m.ExportModal })));
const RaycastSettingsModal = lazy(() =>
  import('./components/RaycastSettingsModal').then((m) => ({ default: m.RaycastSettingsModal }))
);
const ModelConverterModal = lazy(() =>
  import('./components/ModelConverterModal').then((m) => ({ default: m.ModelConverterModal }))
);
const SkyEnvironmentPanel = lazy(() =>
  import('./components/SkyEnvironmentPanel').then((m) => ({ default: m.SkyEnvironmentPanel }))
);
const IlluminationStudioModal = lazy(() =>
  import('./components/IlluminationStudioModal').then((m) => ({ default: m.IlluminationStudioModal }))
);
const LiquifyPanel = lazy(() => import('./components/LiquifyPanel').then((m) => ({ default: m.LiquifyPanel })));
const CurveDecimateModal = lazy(() =>
  import('./components/CurveDecimateModal').then((m) => ({ default: m.CurveDecimateModal }))
);
const CustomMirrorModal = lazy(() =>
  import('./components/CustomMirrorModal').then((m) => ({ default: m.CustomMirrorModal }))
);
const BentGuideModal = lazy(() => import('./components/BentGuideModal').then((m) => ({ default: m.BentGuideModal })));
const ARViewerModal = lazy(() => import('./components/ARViewerModal').then((m) => ({ default: m.ARViewerModal })));
const NumpadModal = lazy(() => import('./components/NumpadModal').then((m) => ({ default: m.NumpadModal })));
const ColorStudioModal = lazy(() =>
  import('./components/ColorStudioModal').then((m) => ({ default: m.ColorStudioModal }))
);
const HolisticDNAInspector = lazy(() =>
  import('./components/HolisticDNAInspector').then((m) => ({ default: m.HolisticDNAInspector }))
);
const FloatingReferenceClipboard = lazy(() =>
  import('./components/FloatingReferenceClipboard').then((m) => ({ default: m.FloatingReferenceClipboard }))
);
const ScaffoldingModal = lazy(() =>
  import('./components/ScaffoldingModal').then((m) => ({ default: m.ScaffoldingModal }))
);
const MobileConnectModal = lazy(() =>
  import('./components/MobileConnectModal').then((m) => ({ default: m.MobileConnectModal }))
);
const NavigatorSandbox = lazy(() =>
  import('./components/Sandbox/NavigatorSandbox').then((m) => ({ default: m.NavigatorSandbox }))
);
import { haptics } from './utils/haptics';
import { setGlobalSoundEnabled } from './utils/audio';
import { TauriBridge } from './core/tauriBridge';
import {
  LiquifySettings,
  CustomMirrorConfig,
  TranslationEventPayload,
  RotationEventPayload,
  ScaleEventPayload,
  NumpadTarget,
  HolisticStrokeDNA,
  ReferenceImageItem,
  LoadedModelInfo,
  TransformTargetScope,
} from './types';

const DEFAULT_BRUSH_SETTINGS: BrushSettings = {
  size: 0.035,
  opacity: 1.0,
  color: '#38bdf8',
  roughness: 0.8,
  metalness: 0.0,
  emissiveIntensity: 0.0,
  pressureSensitivity: true,
  archSegments: 3,
  domeFactor: 0.0,
  surfaceOffset: 0.002,
  taperLength: 0.05,
  silhouetteClamping: true,
  stencilMasking: false,
  autoRecalculateNormals: true,
  smoothingAlgorithm: 'streamline',
  smoothingStrength: 0.55,
  materialType: 'shadeless',
  profile: 'ribbon',
  patternType: 'none',
  patternScale: 4.0,
  patternIntensity: 1.0,
  patternAngle: 45,
  patternContrast: 1.0,
  chiselAngle: 45,
  aspectRatio: 3.5,
};

const DEFAULT_POST_SETTINGS: PostProcessSettings = {
  renderMode: 'draft',
  toonShading: false,
  toonSteps: 3,
  bloom: true,
  bloomIntensity: 1.2,
  bloomRadius: 0.8,
  bloomThreshold: 0.85,
  dof: false,
  dofFocusDistance: 2.5,
  dofAperture: 0.015,
  grain: false,
  grainIntensity: 0.08,
  pixelation: false,
  pixelSize: 4,
};

const DEFAULT_LAYERS: Layer[] = [
  {
    id: 'layer_base_1',
    name: 'Layer 1',
    visible: true,
    locked: false,
    opacity: 1.0,
    blendMode: 'normal',
    strokeIds: [],
  },
];

export default function App() {
  const [engine, setEngine] = useState<StudioEngine | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('mody_studio_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (_) {}
    return 'light';
  });
  const uiMode = useUiMode();
  const openSheet = useOpenSheet();
  const [tool, setTool] = useState<ToolType>('brush');
  const [brushSettings, setBrushSettings] = useState<BrushSettings>(DEFAULT_BRUSH_SETTINGS);
  const [postSettings, setPostSettings] = useState<PostProcessSettings>(DEFAULT_POST_SETTINGS);
  const [symmetry, setSymmetry] = useState<SymmetryMode>('none');
  const [layers, setLayers] = useState<Layer[]>(DEFAULT_LAYERS);
  const [activeLayerId, setActiveLayerId] = useState<string>(DEFAULT_LAYERS[0].id);

  // Model & Sky Environment State
  const [activeModelName, setActiveModelName] = useState<string>('Drawing Canvas');
  const [modelMetadata, setModelMetadata] = useState<ModelMetadata | null>(null);
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('studio');
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('Standard');
  const [activeController, setActiveController] = useState<ActiveControllerType>(() => {
    try {
      const saved = localStorage.getItem('mody_active_controller');
      if (saved === 'navigator' || saved === 'tactile' || saved === 'both' || saved === 'hidden') {
        return saved as ActiveControllerType;
      }
    } catch (_) {}
    return 'tactile';
  });

  const handleControllerChange = (ctrl: ActiveControllerType) => {
    setActiveController(ctrl);
    try {
      localStorage.setItem('mody_active_controller', ctrl);
    } catch (_) {}
    if (ctrl === 'hidden') {
      setGizmoMode('Hidden');
    } else {
      setGizmoMode('Standard');
    }
  };

  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mody_sound_enabled');
      if (saved !== null) return saved === 'true';
    } catch (_) {}
    return true;
  });

  const handleToggleSound = () => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mody_sound_enabled', String(next));
      } catch (_) {}
      haptics.setAudioFeedbackEnabled(next);
      setGlobalSoundEnabled(next);
      return next;
    });
  };

  // Global UI Scale state with persistence
  const [uiScale, setUiScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mody_global_ui_scale');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0.65 && parsed <= 1.8) {
          return parsed;
        }
      }
    } catch (_) {}
    return 1.0;
  });

  const handleUiScaleChange = useCallback((newScale: number) => {
    const clamped = Math.max(0.65, Math.min(1.6, Math.round(newScale * 100) / 100));
    setUiScale(clamped);
    try {
      localStorage.setItem('mody_global_ui_scale', clamped.toString());
    } catch (_) {}
  }, []);

  const [perfectView, setPerfectView] = useState<PerfectViewInfo>({
    isPerfect: false,
    view: null,
    depthAxis: null,
  });

  const [crosshairActive, setCrosshairActive] = useState<boolean>(false);
  const [crosshairAction, setCrosshairAction] = useState<string>('');
  const [crosshairValue, setCrosshairValue] = useState<string>('');

  const [showWireframe, setShowWireframe] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [cameraInteracting, setCameraInteracting] = useState<boolean>(false);
  const [gpuInfo, setGpuInfo] = useState<GPUInfo>({
    backend: 'webgl2',
    adapterName: 'Universal GPU Device',
    vendor: 'Universal GPU Device',
    architecture: 'Universal Raster Pipeline',
    isWebGPUSupported: false,
    maxTextureDimension2D: 4096,
    computeSupport: false,
    powerPreference: 'high-performance',
  });

  // Modals & Panels
  const [isLayersOpen, setIsLayersOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRenderSettingsOpen, setIsRenderSettingsOpen] = useState<boolean>(false);
  const [isModelsOpen, setIsModelsOpen] = useState<boolean>(false);
  const [isModelDisplayOpen, setIsModelDisplayOpen] = useState<boolean>(false);
  const [modelDisplayMode, setModelDisplayMode] = useState<ModelDisplayMode>('texture');
  const [isModelVisible, setIsModelVisible] = useState<boolean>(true);
  const [isConverterOpen, setIsConverterOpen] = useState<boolean>(false);
  const [droppedFilesForConverter, setDroppedFilesForConverter] = useState<FileList | File[] | null>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isRaycastSettingsOpen, setIsRaycastSettingsOpen] = useState<boolean>(false);
  const [isIlluminationOpen, setIsIlluminationOpen] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [windowDragOver, setWindowDragOver] = useState<boolean>(false);

  // Sprint 1-5 Spatial Editing & Hardware States
  const [fingerPenMode, setFingerPenMode] = useState<boolean>(true);
  const [navigatorSensitivity, setNavigatorSensitivity] = useState<number>(0.5);
  const [projectionMode, setProjectionMode] = useState<'perspective' | 'orthographic'>('perspective');
  const [isStylusDetected, setIsStylusDetected] = useState<boolean>(false);
  const [isLiquifyOpen, setIsLiquifyOpen] = useState<boolean>(false);
  const [isCompareActive, setIsCompareActive] = useState<boolean>(false);
  const [liquifySettings, setLiquifySettings] = useState<LiquifySettings>({
    mode: 'push',
    brushRadius: 0.25,
    influenceStrength: 0.6,
    iterations: 1,
  });
  const [isDecimateOpen, setIsDecimateOpen] = useState<boolean>(false);
  const [isBentGuideOpen, setIsBentGuideOpen] = useState<boolean>(false);
  const [isCustomMirrorOpen, setIsCustomMirrorOpen] = useState<boolean>(false);
  const [customMirrorConfig, setCustomMirrorConfig] = useState<CustomMirrorConfig>({
    planeOrigin: [0, 0, 0],
    planeNormal: [1, 0, 0],
    visible: true,
  });
  const [isARViewerOpen, setIsARViewerOpen] = useState<boolean>(false);
  const [numpadTarget, setNumpadTarget] = useState<NumpadTarget | null>(null);

  // Phase 4 Stage Assets, Scaffolding Hierarchy & Reference Clipboard States
  const [isScaffoldingOpen, setIsScaffoldingOpen] = useState<boolean>(false);
  const [isClipboardOpen, setIsClipboardOpen] = useState<boolean>(false);
  const [isMobileConnectOpen, setIsMobileConnectOpen] = useState<boolean>(false);
  const [referenceImages, setReferenceImages] = useState<ReferenceImageItem[]>([]);
  const [showSandbox, setShowSandbox] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('sandbox') === 'true' || params.has('sandbox');
    }
    return false;
  });

  // Dev Settings: Disable Right-Click Radial Menu
  const [disableContextMenu, setDisableContextMenu] = useState<boolean>(() => {
    try {
      return localStorage.getItem('remix3d_disable_context_menu') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleDisableContextMenu = useCallback(() => {
    setDisableContextMenu((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('remix3d_disable_context_menu', String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleToggleProjection = useCallback(() => {
    if (!engine) return;
    const nextMode = engine.toggleProjectionMode();
    setProjectionMode(nextMode);
  }, [engine]);

  // Phase 3 Color Studio, Holistic DNA & Shape Snapping States
  const [isColorStudioOpen, setIsColorStudioOpen] = useState<boolean>(false);
  const [activeDNA, setActiveDNA] = useState<HolisticStrokeDNA | null>(null);
  const [snappedShapeNotice, setSnappedShapeNotice] = useState<string | null>(null);

  // Global on-screen Numpad event listener
  useEffect(() => {
    const handleOpenNumpad = (e: any) => {
      if (e && e.detail) {
        setNumpadTarget(e.detail);
      }
    };
    window.addEventListener('OPEN_NUMPAD', handleOpenNumpad);
    return () => {
      window.removeEventListener('OPEN_NUMPAD', handleOpenNumpad);
    };
  }, []);

  const [activeGuide, setActiveGuide] = useState<Guide3D | null>(null);

  // Silent Background Auto-Save Persistence
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = React.useRef<boolean>(true);

  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Debounce save execution quietly
    autoSaveTimerRef.current = setTimeout(() => {
      try {
        const metaState = {
          timestamp: Date.now(),
          layerCount: layers.length,
          modelName: activeModelName,
          lightingPreset,
          brushSettingsSummary: {
            color: brushSettings.color,
            size: brushSettings.size,
            tool,
          },
        };
        localStorage.setItem('mody_autosave_meta', JSON.stringify(metaState));
      } catch (err) {
        console.warn('Auto-save storage:', err);
      }
    }, 650);
  }, [layers.length, activeModelName, lightingPreset, brushSettings, tool]);

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  // Multi-Model & Target Scope State
  const [loadedModels, setLoadedModels] = useState<LoadedModelInfo[]>([]);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [targetScope, setTargetScope] = useState<TransformTargetScope>('all');

  useEffect(() => {
    const handleModelsChanged = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setLoadedModels(e.detail);
      }
    };
    window.addEventListener('MODELS_CHANGED', handleModelsChanged);
    return () => window.removeEventListener('MODELS_CHANGED', handleModelsChanged);
  }, []);

  const handleSelectModel = useCallback((modelId: string | null) => {
    setActiveModelId(modelId);
    if (engine) {
      engine.setActiveSelectedModel(modelId);
    }
  }, [engine]);

  const handleSelectLayer = useCallback((layerId: string) => {
    setActiveLayerId(layerId);
    if (engine) {
      engine.setActiveLayer(layerId);
    }
  }, [engine]);

  const handleSelectTargetScope = useCallback((scope: TransformTargetScope) => {
    setTargetScope(scope);
  }, []);

  const handleEngineReady = useCallback((inst: StudioEngine) => {
    setEngine(inst);
    inst.setTheme(theme);
    inst.setLightingPreset('studio');
    inst.setupDefaultDrawingPlane();
    inst.setPostProcessSettings(DEFAULT_POST_SETTINGS);
    setGpuInfo(inst.getGPUInfo());
    setLoadedModels(inst.getLoadedModels());
    inst.onModelsChanged = (models) => {
      setLoadedModels(models);
      if (models.length > 0 && !activeModelId) {
        setActiveModelId(models[0].id);
      }
    };
    inst.onGPUInfoUpdate = (info) => {
      setGpuInfo(info);
    };
    // FPS and camera pose arrive every frame. They go to the telemetry store, not
    // React state - FpsCounter and any pose consumer subscribe as leaves, so a
    // 60 fps stream never re-renders this component tree.
    inst.onFpsUpdate = (f) => {
      publishFps(f);
    };
    inst.onProjectionChange = (mode) => {
      setProjectionMode(mode);
    };
    inst.onHistoryChange = (u, r) => {
      setCanUndo(u);
      setCanRedo(r);
    };
    inst.onMetadataUpdate = (meta) => {
      setModelMetadata(meta);
      setActiveModelName(meta.name);
    };
    inst.onViewChange = (pv) => {
      setPerfectView(pv);
    };
    inst.onCameraChange = (sph) => {
      // sph is a pooled object owned by the engine; only its numbers are read.
      publishCameraPose(sph.radius, sph.theta, sph.phi);
    };
    inst.onAutoSaveTrigger = (reason) => {
      triggerAutoSave(reason === 'model_loaded' ? 'model' : 'changes');
    };
    inst.onDNAInjected = (dna: HolisticStrokeDNA) => {
      setActiveDNA(dna);
      setBrushSettings((prev) => ({
        ...prev,
        color: dna.colorHex,
        size: dna.size,
        opacity: dna.opacity,
        roughness: dna.roughness,
        metalness: dna.metalness,
        emissiveIntensity: dna.emissiveIntensity,
        materialType: dna.materialType,
        profile: dna.profile,
        patternType: dna.patternType,
        patternScale: dna.patternScale,
        patternIntensity: dna.patternIntensity,
        shaderEffect: dna.shaderEffect,
      }));
    };
    inst.onShapeSnapped = (result) => {
      const typeLabels: Record<string, string> = {
        line: 'Straight Line',
        circle: 'Perfect Circle',
        arc: 'Circular Arc',
        polygon: 'Closed Polygon',
      };
      const shapeType = result.detectedShape;
      const label = typeLabels[shapeType] || shapeType;
      setSnappedShapeNotice(`Snapped to ${label} (${Math.round(result.confidence * 100)}% fit)`);
      setTimeout(() => {
        setSnappedShapeNotice((cur) => (cur?.includes(label) ? null : cur));
      }, 2400);
    };
  }, [triggerAutoSave, activeModelId]);

  // Transform Navigator Gizmo Handlers
  const [isGizmoLocked, setIsGizmoLocked] = useState<boolean>(false);

  const handleGizmoTranslate = useCallback(
    (payload: TranslationEventPayload) => {
      if (!engine) return;
      if (payload.source.startsWith('2d-move-stick')) {
        // Dial emits screen px for this frame already (time-based glide) - do not rescale
        engine.translateScreenSpace(payload.deltaX, payload.deltaY, targetScope, isGizmoLocked);
      } else if (payload.source.startsWith('3d-node')) {
        // Dial emits world units already (time-based glide) - do not rescale here
        if (payload.x !== 0) engine.translateAxis3D('x', payload.x, targetScope);
        if (payload.y !== 0) engine.translateAxis3D('y', payload.y, targetScope);
        if (payload.z !== 0) engine.translateAxis3D('z', payload.z, targetScope);
      }
    },
    [engine, isGizmoLocked, targetScope]
  );

  const handleGizmoRotate = useCallback(
    (payload: RotationEventPayload) => {
      if (!engine) return;
      if (payload.source === '2d-rotate-handle') {
        engine.rotateAxis3D('z', (payload.deltaAngle * Math.PI) / 180, targetScope, isGizmoLocked);
      } else if (payload.source === '3d-trackball-sphere') {
        engine.rotateTrackball(payload.ry, payload.rx, targetScope);
      } else if (payload.axis === 'x' || payload.axis === 'y' || payload.axis === 'z') {
        engine.rotateAxis3D(payload.axis, (payload.deltaAngle * Math.PI) / 180, targetScope, isGizmoLocked);
      }
    },
    [engine, isGizmoLocked, targetScope]
  );

  const handleGizmoScale = useCallback(
    (payload: ScaleEventPayload) => {
      if (!engine) return;
      if (payload.handle === 'scale-y') {
        engine.scaleAxis('y', 1 + payload.deltaScale, targetScope, isGizmoLocked);
      } else if (payload.handle === 'scale-x') {
        engine.scaleAxis('x', 1 + payload.deltaScale, targetScope, isGizmoLocked);
      } else if (payload.handle === 'scale-uniform') {
        engine.scaleAxis('uniform', 1 + payload.deltaScale, targetScope, isGizmoLocked);
      } else if (payload.deltaScale) {
        engine.scaleAxis('uniform', 1 + payload.deltaScale, targetScope, isGizmoLocked);
      }
    },
    [engine, isGizmoLocked, targetScope]
  );

  const handleGizmoReset = useCallback(() => {
    if (!engine) return;
    engine.resetTransform(targetScope);
    engine.snapToView('isometric');
  }, [engine, targetScope]);

  const handleGizmoInteractionStart = useCallback(
    (handleName: string) => {
      if (!engine) return;
      engine.beginTransform(targetScope);
    },
    [engine, targetScope]
  );

  const handleGizmoInteractionEnd = useCallback(
    (handleName: string) => {
      if (!engine) return;
      engine.endTransform();
    },
    [engine]
  );

  // Watch layer modifications for auto-save
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    triggerAutoSave('layers');
  }, [layers, triggerAutoSave]);

  // Sync theme to engine & persist
  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    try {
      localStorage.setItem('mody_studio_theme', nextTheme);
    } catch (_) {}
    engine?.setTheme(nextTheme);
  };

  const handleSetTheme = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    try {
      localStorage.setItem('mody_studio_theme', newTheme);
    } catch (_) {}
    engine?.setTheme(newTheme);
  };

  // Full Project State Save (.remix3d JSON file)
  const handleSaveProject = useCallback(async () => {
    if (!engine) return;
    const projectData = engine.exportProjectData('Remix 3D Project', layers);
    const jsonStr = JSON.stringify(projectData, null, 2);
    const filename = `${(projectData.name || 'Remix3D_Project').replace(/\s+/g, '_')}_${Date.now()}.remix3d`;
    await TauriBridge.saveModelFile(filename, jsonStr, [
      { name: 'Remix 3D Project', extensions: ['remix3d', 'json'] },
    ]);
    TauriBridge.triggerHaptic('success');
  }, [engine, layers]);

  // Full Project State Load (.remix3d JSON file)
  const handleLoadProject = useCallback((file: File) => {
    if (!engine) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const projectData: ProjectSaveData = JSON.parse(content);
        engine.importProjectData(projectData);
        if (projectData.layers && projectData.layers.length > 0) {
          setLayers(projectData.layers);
          setActiveLayerId(projectData.layers[0].id);
        }
        if (projectData.lightingPreset) {
          setLightingPreset(projectData.lightingPreset);
        }
        if (projectData.showGrid !== undefined) {
          setShowGrid(projectData.showGrid);
        }
        if (projectData.showWireframe !== undefined) {
          setShowWireframe(projectData.showWireframe);
        }
        haptics.trigger('success');
      } catch (err) {
        console.error('Failed to parse .remix3d project file:', err);
        alert('Invalid or corrupted .remix3d project file.');
      }
    };
    reader.readAsText(file);
  }, [engine]);

  // Sync grid toggle
  const handleToggleGrid = () => {
    const next = !showGrid;
    setShowGrid(next);
    engine?.toggleGrid(next);
  };

  // Cycle lighting presets
  const handleCycleLighting = () => {
    const presets: LightingPreset[] = ['studio', 'daylight', 'neon', 'sunset', 'clay_neutral'];
    const idx = presets.indexOf(lightingPreset);
    const next = presets[(idx + 1) % presets.length];
    setLightingPreset(next);
    engine?.setLightingPreset(next);
  };

  /**
   * Play mode's four tools each map to one engine state. The mapping lives in
   * PlayDock so the dock and this handler cannot drift apart.
   */
  const handlePlayToolSelect = useCallback((id: PlayToolId) => {
    const { tool: nextTool, patch } = playToolSettings(id);
    setTool(nextTool);
    setBrushSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleResetCamera = () => {
    engine?.snapToView('isometric');
  };

  const handleUndo = useCallback(() => {
    engine?.undo();
  }, [engine]);

  const handleRedo = useCallback(() => {
    engine?.redo(layers);
  }, [engine, layers]);

  const [clipboardCount, setClipboardCount] = useState(0);

  const handleCopyStrokes = useCallback(() => {
    if (!engine) return;
    const count = engine.copyStrokes(activeLayerId);
    setClipboardCount(count);
    triggerAutoSave('curves_copied');
  }, [engine, activeLayerId, triggerAutoSave]);

  const handlePasteStrokes = useCallback(() => {
    if (!engine) return;
    const pasted = engine.pasteStrokes(activeLayerId);
    if (pasted > 0) {
      triggerAutoSave('curves_pasted');
    }
  }, [engine, activeLayerId, triggerAutoSave]);

  const handleClearLayerStrokes = useCallback(
    (layerId: string) => {
      engine?.deleteLayerStrokes(layerId);
    },
    [engine]
  );

  const handleMergeLayerDown = useCallback(
    (topLayerId: string) => {
      const topIdx = layers.findIndex((l) => l.id === topLayerId);
      if (topIdx < 0 || topIdx >= layers.length - 1) return;
      const bottomLayer = layers[topIdx + 1];
      const topLayer = layers[topIdx];

      engine?.mergeLayerDown(topLayer.id, bottomLayer.id, topLayer.opacity, topLayer.blendMode || 'normal');

      // Remove merged top layer from state
      setLayers((prev) => prev.filter((l) => l.id !== topLayerId));

      if (activeLayerId === topLayerId) {
        setActiveLayerId(bottomLayer.id);
      }
    },
    [engine, layers, activeLayerId]
  );

  // Sync layers state (opacities, visibility, GPU blend modes) to engine
  useEffect(() => {
    if (!engine) return;
    engine.syncLayers(layers);
    const active = layers.find((l) => l.id === activeLayerId);
    if (active) {
      engine.setActiveLayer(activeLayerId, active.opacity);
    }
  }, [engine, layers, activeLayerId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopyStrokes();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePasteStrokes();
      } else if (e.key.toLowerCase() === 'b') {
        setTool('brush');
      } else if (e.key.toLowerCase() === 'u') {
        setTool('spatial_brush');
      } else if (e.key.toLowerCase() === 'i') {
        setTool((prev) => (prev === 'paint_picker' || prev === 'eyedropper' ? 'brush' : 'paint_picker'));
      } else if (e.key.toLowerCase() === 'j') {
        setTool((prev) => (prev === 'brush_picker' ? 'brush' : 'brush_picker'));
      } else if (e.key === '[') {
        setBrushSettings((prev) => ({
          ...prev,
          size: Math.max(0.01, prev.size - 0.005),
        }));
      } else if (e.key === ']') {
        setBrushSettings((prev) => ({
          ...prev,
          size: Math.min(0.25, prev.size + 0.005),
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCopyStrokes, handlePasteStrokes]);

  // Global Drag & Drop for 3D Models
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setWindowDragOver(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      // Check if left window
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setWindowDragOver(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setWindowDragOver(false);
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        setDroppedFilesForConverter(e.dataTransfer.files);
        setIsConverterOpen(true);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none transition-colors duration-200 ${
        theme === 'light' ? 'bg-[#ffffff] text-neutral-800' : 'bg-[#0c0e14] text-neutral-100'
      }`}
    >
      {/* Main 3D Viewport */}
      <Viewport
        tool={tool}
        onSelectTool={setTool}
        brushSettings={brushSettings}
        onUpdateBrushSettings={(newSettings) =>
          setBrushSettings((prev) => ({ ...prev, ...newSettings }))
        }
        activeLayer={activeLayer}
        layers={layers}
        symmetry={symmetry}
        onSelectSymmetry={setSymmetry}
        lightingPreset={lightingPreset}
        showWireframe={showWireframe}
        showGrid={showGrid}
        onEngineReady={handleEngineReady}
        onColorPick={(hex) => setBrushSettings((prev) => ({ ...prev, color: hex }))}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        cameraInteracting={cameraInteracting}
        setCameraInteracting={setCameraInteracting}
        fingerPenMode={fingerPenMode}
        onToggleFingerPenMode={setFingerPenMode}
        liquifySettings={liquifySettings}
        onOpenColorPanel={() => setIsSettingsOpen(true)}
        onOpenNumpad={(t) => setNumpadTarget(t)}
        disableContextMenu={disableContextMenu}
        onToggleDisableContextMenu={handleToggleDisableContextMenu}
        theme={theme}
        onStylusDetected={setIsStylusDetected}
      />

      {/* ================= PLAY MODE (default surface) ================= */}
      {uiMode === 'play' && (
        <>
          <PlayTopStrip
            projectName={activeModelName}
            onOpenToybox={() => setIsModelsOpen(true)}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            theme={theme}
          />
          <PlayDock
            tool={tool}
            shapeSnapping={brushSettings.shapeSnapping ?? false}
            onSelect={handlePlayToolSelect}
            theme={theme}
          />
          <PlayContextStrip
            brushSettings={brushSettings}
            setBrushSettings={setBrushSettings}
            theme={theme}
          />
        </>
      )}

      {/* ================= PRO MODE (the full studio) ================= */}
      {/* Vertical Tool Dock & Navigation Rail (With Integrated Studio Menu Actions) */}
      {uiMode === 'pro' && (
      <Toolbar
        tool={tool}
        setTool={setTool}
        brushSettings={brushSettings}
        setBrushSettings={setBrushSettings}
        symmetry={symmetry}
        setSymmetry={setSymmetry}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        theme={theme}
        engine={engine}
        onSelectPrimitiveName={(name) => setActiveModelName(name)}
        isGizmoActive={gizmoMode !== 'Hidden'}
        onToggleGizmo={() => setGizmoMode(gizmoMode === 'Hidden' ? 'Standard' : 'Hidden')}
        isGizmoLocked={isGizmoLocked}
        onToggleLock={() => setIsGizmoLocked((prev) => !prev)}
        onCopyStrokes={handleCopyStrokes}
        onPasteStrokes={handlePasteStrokes}
        clipboardCount={clipboardCount}
        navigatorSensitivity={navigatorSensitivity}
        onSensitivityChange={(s) => {
          setNavigatorSensitivity(s);
          engine?.setNavigatorSensitivity(s);
        }}
        onOpenLayers={() => {
          setIsLayersOpen((prev) => {
            if (!prev) setIsSettingsOpen(false);
            return !prev;
          });
        }}
        onToggleNavigator={() => handleControllerChange(activeController === 'navigator' ? 'tactile' : activeController === 'tactile' ? 'hidden' : 'navigator')}
        activeController={activeController}
        onChangeController={handleControllerChange}
        soundEnabled={isSoundEnabled}
        onToggleSound={handleToggleSound}
        fingerPenMode={fingerPenMode}
        onToggleFingerPenMode={setFingerPenMode}
        projectionMode={projectionMode}
        onToggleProjection={handleToggleProjection}
        disableContextMenu={disableContextMenu}
        onToggleDisableContextMenu={handleToggleDisableContextMenu}
        isStylusDetected={isStylusDetected}
        uiScale={uiScale}
        onUiScaleChange={handleUiScaleChange}
        showGrid={showGrid}
        onToggleGrid={handleToggleGrid}
        onOpenModelLibrary={() => setIsModelsOpen(true)}
        activeModelName={activeModelName}
        isModelVisible={isModelVisible}
        onToggleModelVisibility={() => {
          if (engine) {
            const next = engine.toggleModelVisibility();
            setIsModelVisible(next);
          }
        }}
        modelDisplayMode={modelDisplayMode}
        onToggleModelDisplayMode={() => {
          const next = modelDisplayMode === 'texture' ? 'clay' : 'texture';
          setModelDisplayMode(next);
          engine?.setModelDisplayMode(next);
        }}
        onCloneModel={() => {
          engine?.cloneModel();
        }}
        onOpenIllumination={() => setIsIlluminationOpen(true)}
        onResetCamera={handleResetCamera}
        onTogglePlane={() => engine?.toggleDrawingPlane()}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenRenderSettings={() => setIsRenderSettingsOpen(true)}
        onOpenRaycastSettings={() => setIsRaycastSettingsOpen(true)}
        onOpenLiquify={() => {
          setTool('liquify');
          setIsLiquifyOpen(true);
          engine?.startLiquifySession();
        }}
        onOpenDecimate={() => setIsDecimateOpen(true)}
        onOpenBentGuide={() => setIsBentGuideOpen(true)}
        onOpenCustomMirror={() => setIsCustomMirrorOpen(true)}
        onOpenARViewer={() => setIsARViewerOpen(true)}
        onOpenScaffolding={() => setIsScaffoldingOpen(true)}
        onOpenClipboard={() => setIsClipboardOpen(true)}
        onOpenMobileConnect={() => setIsMobileConnectOpen(true)}
        onOpenBrushSettings={() => {
          setIsSettingsOpen((prev) => {
            if (!prev) setIsLayersOpen(false);
            return !prev;
          });
        }}
        onOpenColorStudio={() => setIsColorStudioOpen(true)}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onToggleTheme={handleToggleTheme}
        onSetTheme={handleSetTheme}
        onOpenSandbox={() => setShowSandbox(true)}
      />
      )}

      {/* Frame-Per-Second Counter. Pro only — Play mode shows no telemetry. */}
      {uiMode === 'pro' && <FpsCounter uiScale={uiScale} />}

      {/* Floating Restore Buttons when Controllers are Hidden */}
      {activeController === 'hidden' && (
        <div
          style={{
            transform: uiScale !== 1.0 ? `scale(${uiScale})` : undefined,
            transformOrigin: 'bottom right',
          }}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <button
            id="btn-restore-navigator-floating"
            onClick={() => handleControllerChange('navigator')}
            className="px-3 py-1.5 rounded-full bg-[#18191d]/90 hover:bg-[#22242c] backdrop-blur-md border border-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white shadow-xl flex items-center gap-1.5 transition-all hover:scale-105"
            title="Restore Transform Navigator Dial"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Navigator</span>
          </button>
          <button
            id="btn-restore-tactile-floating"
            onClick={() => handleControllerChange('tactile')}
            className="px-3 py-1.5 rounded-full bg-[#18191d]/90 hover:bg-[#22242c] backdrop-blur-md border border-neutral-700 text-xs font-semibold text-neutral-300 hover:text-white shadow-xl flex items-center gap-1.5 transition-all hover:scale-105"
            title="Restore Tactile Spatial Wheel"
          >
            <Disc className="w-3.5 h-3.5 text-sky-400" />
            <span>Tactile Wheel</span>
          </button>
          <button
            id="btn-open-sandbox-floating"
            onClick={() => setShowSandbox(true)}
            className="px-3 py-1.5 rounded-full bg-[#18191d]/90 hover:bg-[#22242c] backdrop-blur-md border border-amber-500/40 text-xs font-semibold text-amber-300 hover:text-white shadow-xl flex items-center gap-1.5 transition-all hover:scale-105"
            title="Open Navigator Sandbox (6 Variations)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
            <span>Sandbox</span>
          </button>
        </div>
      )}

      {/* 3D Navigation Controllers: Strictly ONE controller at a time (Never stack both) */}
      {/* Zone C. In Play a raised sheet owns the bottom of the screen, so the
          navigator steps aside rather than fighting it for the same corner. */}
      {gizmoMode !== 'Hidden' && activeController === 'navigator' && !(uiMode === 'play' && openSheet !== null) && (
        <TransformNavigator
          initialMode="2d"
          theme={theme}
          onTranslate={handleGizmoTranslate}
          onRotate={handleGizmoRotate}
          onScale={handleGizmoScale}
          onReset={handleGizmoReset}
          isLocked={isGizmoLocked}
          onLockChange={setIsGizmoLocked}
          sensitivity={navigatorSensitivity}
          onSensitivityChange={(s) => {
            setNavigatorSensitivity(s);
            engine?.setNavigatorSensitivity(s);
          }}
          onClose={() => handleControllerChange('hidden')}
          onCopy={handleCopyStrokes}
          onPaste={handlePasteStrokes}
          clipboardCount={clipboardCount}
          onInteractionStart={handleGizmoInteractionStart}
          onInteractionEnd={handleGizmoInteractionEnd}
          activeTargetName={activeLayer?.name || 'Main Curves'}
          layers={layers}
          activeLayerId={activeLayerId}
          onSelectLayer={handleSelectLayer}
          models={loadedModels}
          activeModelId={activeModelId}
          onSelectModel={handleSelectModel}
          targetScope={targetScope}
          onSelectTargetScope={handleSelectTargetScope}
          accessibilityMode={fingerPenMode ? 'finger-pen' : 'standard'}
          onAccessibilityModeChange={(accMode) => setFingerPenMode(accMode === 'finger-pen')}
          soundEnabled={isSoundEnabled}
          onToggleSound={handleToggleSound}
          uiScale={uiScale}
          engine={engine}
        />
      )}

      {gizmoMode !== 'Hidden' && activeController === 'tactile' && (
        <PaperRocketTactileWheel
          engine={engine}
          theme={theme}
          brushSettings={brushSettings}
          onUpdateBrushSettings={setBrushSettings}
          onReset={() => {
            handleGizmoReset();
            handleResetCamera();
          }}
          onClose={() => handleControllerChange('hidden')}
          soundEnabled={isSoundEnabled}
          onToggleSound={handleToggleSound}
          isLocked={isGizmoLocked}
          onLockChange={setIsGizmoLocked}
          sensitivity={navigatorSensitivity}
          onSensitivityChange={(s) => {
            setNavigatorSensitivity(s);
            engine?.setNavigatorSensitivity(s);
          }}
          activeTargetName={activeLayer?.name || 'Main Curves'}
          layers={layers}
          activeLayerId={activeLayerId}
          onSelectLayer={handleSelectLayer}
          models={loadedModels}
          activeModelId={activeModelId}
          onSelectModel={handleSelectModel}
          targetScope={targetScope}
          onSelectTargetScope={handleSelectTargetScope}
          accessibilityMode={fingerPenMode ? 'finger-pen' : 'standard'}
          onAccessibilityModeChange={(accMode) => setFingerPenMode(accMode === 'finger-pen')}
          onCopy={handleCopyStrokes}
          onPaste={handlePasteStrokes}
          clipboardCount={clipboardCount}
          uiScale={uiScale}
        />
      )}

      {/* Dynamic Screen Center Crosshair Reticle */}
      <ScreenCenterCrosshair
        active={crosshairActive}
        mode="3d"
        actionLabel={crosshairAction}
        valueLabel={crosshairValue}
      />

      {/* Layer Panel */}
      {isLayersOpen && (
        <LayerPanel
          layers={layers}
          setLayers={setLayers}
          activeLayerId={activeLayerId}
          setActiveLayerId={setActiveLayerId}
          onClose={() => setIsLayersOpen(false)}
          onClearLayerStrokes={handleClearLayerStrokes}
          onMergeLayerDown={handleMergeLayerDown}
        />
      )}

      {/* 3D Model Display & Material Settings Panel */}
      {isModelDisplayOpen && (
        <div className="fixed top-16 right-4 z-40">
          <ModelDisplayPanel
            engine={engine}
            activeModelName={activeModelName}
            metadata={modelMetadata}
            displayMode={modelDisplayMode}
            onDisplayModeChange={(mode) => {
              setModelDisplayMode(mode);
              engine?.setModelDisplayMode(mode);
            }}
            onOpenLibrary={() => setIsModelsOpen(true)}
            onClose={() => setIsModelDisplayOpen(false)}
          />
        </div>
      )}

      {/* Brush Settings / Color Panel */}
      {isSettingsOpen && (
        <BrushSettingsPanel
          brushSettings={brushSettings}
          setBrushSettings={setBrushSettings}
          onClose={() => setIsSettingsOpen(false)}
          onRecalculateNormals={() => engine?.recalculateMeshNormals()}
          onOpenRaycastSettings={() => setIsRaycastSettingsOpen(true)}
          onOpenColorStudio={() => setIsColorStudioOpen(true)}
          theme={theme}
        />
      )}

      {/* Render Mode & Post-Processing Shaders Modal */}
      {isRenderSettingsOpen && (
        <Suspense fallback={null}>
          <RenderSettingsPanel
            settings={postSettings}
            setSettings={setPostSettings}
            onClose={() => setIsRenderSettingsOpen(false)}
            onRecalculateNormals={() => engine?.recalculateMeshNormals()}
            gpuInfo={gpuInfo}
          />
        </Suspense>
      )}

      {/* 3D Model Ingestion / Presets Modal (37+ Models with Draco compression) */}
      {isModelsOpen && (
        <Suspense fallback={null}>
          <ModelLibraryModal
            engine={engine}
            onClose={() => setIsModelsOpen(false)}
            activeModelName={activeModelName}
            onOpenConverter={() => {
              setIsModelsOpen(false);
              setDroppedFilesForConverter(null);
              setIsConverterOpen(true);
            }}
          />
        </Suspense>
      )}

      {/* 3D Model Converter, Draco Compressor & In-App Storage Suite */}
      {isConverterOpen && (
        <Suspense fallback={null}>
          <ModelConverterModal
            isOpen={isConverterOpen}
            onClose={() => {
              setIsConverterOpen(false);
              setDroppedFilesForConverter(null);
            }}
            engine={engine}
            initialFiles={droppedFilesForConverter}
            theme={theme}
            onModelLoadedToCanvas={(name) => {
              setActiveModelName(name);
            }}
          />
        </Suspense>
      )}

      {/* Export 3D / Textures Modal */}
      {isExportOpen && (
        <Suspense fallback={null}>
          <ExportModal
            engine={engine}
            onClose={() => setIsExportOpen(false)}
            activeModelName={activeModelName}
          />
        </Suspense>
      )}

      {/* 3D Surface Raycasting & Snapping Parameters Modal */}
      {isRaycastSettingsOpen && (
        <Suspense fallback={null}>
          <RaycastSettingsModal
            brushSettings={brushSettings}
            setBrushSettings={setBrushSettings}
            onClose={() => setIsRaycastSettingsOpen(false)}
            onRecalculateNormals={() => engine?.recalculateMeshNormals()}
            theme={theme}
          />
        </Suspense>
      )}

      {/* Skybox & Atmosphere Environment Studio (from webgpu-skybox-studio) */}
      <DeferredPanel active={isIlluminationOpen}>
        <SkyEnvironmentPanel
          engine={engine}
          isOpen={isIlluminationOpen}
          onClose={() => setIsIlluminationOpen(false)}
          theme={theme}
        />
      </DeferredPanel>

      {/* Volumetric Liquify Panel (Sprint 2) */}
      {(isLiquifyOpen || tool === 'liquify') && (
        <Suspense fallback={null}>
          <LiquifyPanel
            settings={liquifySettings}
            onSettingsChange={setLiquifySettings}
            isCompareActive={isCompareActive}
            onToggleCompare={(active) => {
              setIsCompareActive(active);
              engine?.toggleLiquifyCompare(active);
            }}
            onApply={() => {
              engine?.commitLiquify();
              setIsLiquifyOpen(false);
              setTool('brush');
            }}
            onCancel={() => {
              engine?.cancelLiquify();
              setIsLiquifyOpen(false);
              setTool('brush');
            }}
            onReset={() => {
              engine?.cancelLiquify();
              engine?.startLiquifySession();
            }}
            theme={theme}
          />
        </Suspense>
      )}

      {/* RDP Curve Decimation Modal (Sprint 2) */}
      <DeferredPanel active={isDecimateOpen}>
        <CurveDecimateModal
          isOpen={isDecimateOpen}
          onClose={() => setIsDecimateOpen(false)}
          onApplyDecimation={(epsilon, preserveTopology) => {
            if (engine) {
              const count = engine.decimateActiveLayerCurves(epsilon, preserveTopology);
              console.log(`Simplified curves with RDP (epsilon: ${epsilon}), remaining points: ${count}`);
            }
          }}
          theme={theme}
        />
      </DeferredPanel>

      {/* Bent 3D Manifold Guide & Lofting Modal */}
      <DeferredPanel active={isBentGuideOpen}>
        <BentGuideModal
          isOpen={isBentGuideOpen}
          onClose={() => setIsBentGuideOpen(false)}
          engine={engine}
          onOpenNumpad={(t) => setNumpadTarget(t)}
          theme={theme}
        />
      </DeferredPanel>

      {/* 3D Collision Scaffolding & Procedural Armatures Modal (Phase 4) */}
      <DeferredPanel active={isScaffoldingOpen}>
        <ScaffoldingModal
          isOpen={isScaffoldingOpen}
          onClose={() => setIsScaffoldingOpen(false)}
          engine={engine}
          onOpenNumpad={(t) => setNumpadTarget(t)}
          theme={theme}
        />
      </DeferredPanel>

      {/* Floating 2D Blueprint Clipboard & Reference Moodboard (Phase 4) */}
      <DeferredPanel active={isClipboardOpen}>
        <FloatingReferenceClipboard
          isOpen={isClipboardOpen}
          onClose={() => setIsClipboardOpen(false)}
          referenceImages={referenceImages}
          setReferenceImages={setReferenceImages}
          theme={theme}
        />
      </DeferredPanel>

      {/* Arbitrary 3D Mirror Plane Modal (Sprint 4) */}
      <DeferredPanel active={isCustomMirrorOpen}>
        <CustomMirrorModal
          isOpen={isCustomMirrorOpen}
          onClose={() => setIsCustomMirrorOpen(false)}
          config={customMirrorConfig}
          onConfigChange={(newCfg) => {
            setCustomMirrorConfig(newCfg);
            if (engine) {
              engine.updateCustomMirrorPlane(newCfg.planeOrigin, newCfg.planeNormal);
              setSymmetry('custom_plane');
            }
          }}
          onAlignToCamera={() => {
            if (engine) {
              const viewDir = engine.camera.getWorldDirection(new THREE.Vector3()).negate();
              const camPos = engine.camera.position.clone().add(viewDir.clone().multiplyScalar(-1.5));
              const newCfg = {
                planeOrigin: [camPos.x, camPos.y, camPos.z] as [number, number, number],
                planeNormal: [viewDir.x, viewDir.y, viewDir.z] as [number, number, number],
                visible: true,
              };
              setCustomMirrorConfig(newCfg);
              engine.updateCustomMirrorPlane(newCfg.planeOrigin, newCfg.planeNormal);
              setSymmetry('custom_plane');
            }
          }}
          theme={theme}
        />
      </DeferredPanel>

      {/* WebXR AR Viewer Modal (Sprint 5) */}
      <DeferredPanel active={isARViewerOpen}>
        <ARViewerModal
          isOpen={isARViewerOpen}
          onClose={() => setIsARViewerOpen(false)}
          engine={engine}
          theme={theme}
        />
      </DeferredPanel>

      {/* Local Mobile Device Testing Modal */}
      <DeferredPanel active={isMobileConnectOpen}>
        <MobileConnectModal
          isOpen={isMobileConnectOpen}
          onClose={() => setIsMobileConnectOpen(false)}
        />
      </DeferredPanel>

      {/* Floating On-Screen Numpad Modal */}
      <DeferredPanel active={numpadTarget !== null}>
        <NumpadModal
          target={numpadTarget}
          onClose={() => setNumpadTarget(null)}
          theme={theme}
        />
      </DeferredPanel>

      {/* Advanced Color Studio Modal (HSV + OKLCh Polar + 1-Click Shaders) */}
      <DeferredPanel active={isColorStudioOpen}>
        <ColorStudioModal
          isOpen={isColorStudioOpen}
          onClose={() => setIsColorStudioOpen(false)}
          currentColor={brushSettings.color || '#38bdf8'}
          onChangeColor={(hex) => setBrushSettings((prev) => ({ ...prev, color: hex }))}
          onApplyBrushSettings={(newSettings) =>
            setBrushSettings((prev) => ({ ...prev, ...newSettings }))
          }
          onApplyToModel={(mat) => engine?.setModelCustomMaterial(mat)}
          onSampleFromScreen={() => {
            setIsColorStudioOpen(false);
            setTool('eyedropper');
          }}
          theme={theme}
        />
      </DeferredPanel>

      {/* Holistic DNA Inspector & Injector Popup */}
      <DeferredPanel active={activeDNA !== null}>
        <HolisticDNAInspector
          dna={activeDNA}
          onClose={() => setActiveDNA(null)}
          onInjectDNA={(dna) => {
            setBrushSettings((prev) => ({
              ...prev,
              color: dna.colorHex,
              size: dna.size,
              opacity: dna.opacity,
              roughness: dna.roughness,
              metalness: dna.metalness,
              emissiveIntensity: dna.emissiveIntensity,
              materialType: dna.materialType,
              profile: dna.profile,
              patternType: dna.patternType,
              patternScale: dna.patternScale,
              patternIntensity: dna.patternIntensity,
              shaderEffect: dna.shaderEffect,
            }));
          }}
          theme={theme}
        />
      </DeferredPanel>

      {/* Snapped Shape Notice Toast */}
      {snappedShapeNotice && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/90 text-neutral-950 font-semibold text-xs shadow-xl backdrop-blur-md border border-amber-300/40">
            <span className="w-2 h-2 rounded-full bg-neutral-950 animate-ping" />
            <span>{snappedShapeNotice}</span>
          </div>
        </div>
      )}

      {/* Drag & Drop Overlay Indicator */}
      {windowDragOver && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-indigo-500/20 backdrop-blur-sm border-4 border-dashed border-indigo-500 flex items-center justify-center animate-in fade-in duration-100">
          <div className="px-6 py-4 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl text-center space-y-2 border border-slate-200 dark:border-slate-800">
            <div className="text-base font-bold text-indigo-600 dark:text-indigo-400">
              Drop 3D Model to Ingest & Convert
            </div>
            <div className="text-xs text-slate-500">
              Supports GLB, GLTF, OBJ (+MTL), FBX, 3DS, STL, PLY, DAE
            </div>
          </div>
        </div>
      )}

      {/* Navigator Sandbox with 6 Interaction Variations */}
      {showSandbox && (
        <Suspense fallback={null}>
          <NavigatorSandbox onClose={() => setShowSandbox(false)} />
        </Suspense>
      )}
    </div>
  );
}
