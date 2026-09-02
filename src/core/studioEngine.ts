import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import {
  BrushSettings,
  Layer,
  LayerBlendMode,
  ModelMetadata,
  StrokeDescriptor,
  StrokePoint,
  SymmetryMode,
  ToolType,
  LightingPreset,
  PostProcessSettings,
  TransformJoystickMode,
  TransformTargetScope,
  PerfectViewInfo,
  PerfectViewType,
  GPUInfo,
  ModelDisplayMode,
  Guide3D,
  LiquifySettings,
  CustomMirrorPlane,
  BentGuideConfig,
  HolisticStrokeDNA,
  EraserMode,
  LoadedModelInfo,
  ProjectSaveData,
} from '../types';
import { ShapeSnappingEngine, ShapeSnapResult } from './shapeSnapping';
import { ConformalBeadGenerator } from './conformalBeadGenerator';
import { MaterialCache, normalizeHexColor } from './materialCache';
import { UVPaintingEngine } from './uvPaintingEngine';
import { PostProcessingEngine } from './postProcessingEngine';
import { SampleModelFactory } from './sampleModels';
import { StrokeSmoother } from './strokeSmoother';
import { globalShaderRegistry } from './animatedShaders';
import { ProceduralSkyEngine, SkyPresetName, SkySettings } from './proceduralSky';
import { ModelConverterEngine } from './modelConverter';
import { VolumetricLiquifyEngine } from './liquifyEngine';
import { LoftGuideEngine } from './loftEngine';
import { ScaffoldingEngine } from './scaffoldingEngine';
import {
  CollisionGuideMeshConfig,
  ScaffoldProxyType,
  ScaffoldRenderMode,
  PrimitiveTopologyConfig,
} from '../types';
import { PrimitiveGenerator } from './primitiveGenerator';
import { modelLoader, LoadResult } from './modelLoader';
import { webgpuPipeline } from './webgpuPipeline';
import { ensureGeometryLinearVertexColors, oklabMix } from './colorMath';
import { modelExporter } from './modelExporter';
import { modelNormalization } from './modelNormalization';
import { resolveAssetUrl } from '../utils/assetUrl';

// Patch Three.js geometry and mesh prototypes with BVH accelerated raycasting
try {
  (THREE.BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree;
  (THREE.BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
} catch (e) {
  console.warn('BVH raycast acceleration setup notice:', e);
}

// Reusable scratch objects for high-performance zero-allocation raycasting
const _pA = new THREE.Vector3();
const _pB = new THREE.Vector3();
const _pC = new THREE.Vector3();
const _nA = new THREE.Vector3();
const _nB = new THREE.Vector3();
const _nC = new THREE.Vector3();
const _localHit = new THREE.Vector3();
const _baryCoord = new THREE.Vector3();
const _interpolatedNorm = new THREE.Vector3();
const _invObjMatrix = new THREE.Matrix4();
const _camDirScratch = new THREE.Vector3();

declare global {
  interface Window {
    RayEngine?: {
      screenToWorld: (clientX: number, clientY: number, isSpatial?: boolean, depth?: number) => StrokePoint | null;
      checkHover: (clientX: number, clientY: number) => boolean;
      refreshRect: () => DOMRect;
      raycastModel: (screenX: number, screenY: number) => any;
      loadGLTF: (url: string, name?: string) => Promise<void>;
    };
  }
}

export class StudioEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private beadGenerator: ConformalBeadGenerator;
  private materialCache: MaterialCache;
  private strokeSmoother: StrokeSmoother = new StrokeSmoother();
  private lastHitMesh: THREE.Mesh | null = null;
  public uvEngine: UVPaintingEngine;
  public postEngine: PostProcessingEngine;
  public skyEngine: ProceduralSkyEngine;
  public liquifyEngine: VolumetricLiquifyEngine;
  public loftEngine: LoftGuideEngine;
  public scaffoldingEngine: ScaffoldingEngine;
  private customMirrorOrigin: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private customMirrorNormal: THREE.Vector3 = new THREE.Vector3(1, 0, 0);
  private customMirrorEnabled: boolean = false;
  private guideColliderMeshes: Map<string, THREE.Mesh> = new Map();
  private xrSession: any = null;
  private isSimulatedAR: boolean = false;
  private arFloorGrid: THREE.GridHelper | null = null;
  private dracoLoader: DRACOLoader | null = null;
  private modelDisplayMode: ModelDisplayMode = 'texture';
  private modelOpacity: number = 1.0;
  private modelWireframeOpacity: number = 0.0;
  private isModelVisible: boolean = true;

  // Groups
  private modelRoot: THREE.Group;
  private strokeRoot: THREE.Group;
  private helperRoot: THREE.Group;
  private lightsRoot: THREE.Group;

  // Model & Mesh references
  private targetMeshes: THREE.Mesh[] = [];
  private activeModelName: string = 'Drawing Canvas';
  private modelMetadata: ModelMetadata = {
    name: 'Drawing Canvas',
    vertexCount: 0,
    triangleCount: 0,
    meshCount: 0,
    dimensions: new THREE.Vector3(0, 0, 0),
    hasUVs: false,
  };

  // Camera Orbit State
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private cameraSpherical: THREE.Spherical = new THREE.Spherical(3.8, Math.PI / 2.3, Math.PI / 4);
  private targetSpherical: THREE.Spherical = new THREE.Spherical(3.8, Math.PI / 2.3, Math.PI / 4);
  private targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Active Stroke State
  private isDrawing: boolean = false;
  private activePoints: StrokePoint[] = [];
  private activeStrokeMeshes: THREE.Mesh[] = [];
  private activeLayerId: string = 'layer_base_1';
  private activeLayerOpacity: number = 1.0;
  private strokes: Map<string, { descriptor: StrokeDescriptor; meshes: THREE.Mesh[] }> = new Map();
  private undoStack: Array<{ type: 'create' | 'erase'; strokes: StrokeDescriptor[] }> = [];
  private redoStack: Array<{ type: 'create' | 'erase'; strokes: StrokeDescriptor[] }> = [];
  private activeStrokeBatch: StrokeDescriptor[] = [];
  private activeVacuumPurgedBatch: StrokeDescriptor[] = [];
  private lastScreenCoords: { x: number; y: number } | null = null;
  private lastCapturePoint: StrokePoint | null = null;
  private isOverAir: boolean = false;
  private symmetryPointsCache: StrokePoint[][] = [];

  // Brush Visual Projection Decal
  private cursorDecal: THREE.Mesh;

  // Grid & Lights
  private gridHelper: THREE.GridHelper;
  private hemiLight: THREE.HemisphereLight;
  private dirLight1: THREE.DirectionalLight;
  private dirLight2: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;

  // Animation & Rendering Loop Optimizations
  private animationFrameId: number | null = null;
  private lastTime: number = performance.now();
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private isDirty: boolean = true;
  private loopLightDir: THREE.Vector3 = new THREE.Vector3();
  private loopResolution: THREE.Vector2 = new THREE.Vector2();

  // Transform Joystick & Spatial State
  private transformActiveScope: TransformTargetScope = 'all';
  private currentTransformTotalMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private transformUndoStack: Array<{
    scope: TransformTargetScope;
    inverseMatrix: THREE.Matrix4;
    layerId?: string;
  }> = [];
  private transformRedoStack: Array<{
    scope: TransformTargetScope;
    forwardMatrix: THREE.Matrix4;
    layerId?: string;
  }> = [];
  private lastPerfectViewInfo: PerfectViewInfo = {
    isPerfect: false,
    view: null,
    depthAxis: null,
  };

  // GPU Hardware & WebGPU Telemetry
  public gpuInfo: GPUInfo = {
    backend: 'webgl2',
    adapterName: 'Hardware Accelerated WebGL2',
    vendor: 'Standard GPU Vendor',
    architecture: 'Universal High-Performance Pipeline',
    isWebGPUSupported: false,
    maxTextureDimension2D: 4096,
    computeSupport: false,
    powerPreference: 'high-performance',
  };

  // Callbacks
  public onFpsUpdate?: (fps: number) => void;
  public onMetadataUpdate?: (meta: ModelMetadata) => void;
  public onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  public onViewChange?: (viewInfo: PerfectViewInfo) => void;
  public onGPUInfoUpdate?: (info: GPUInfo) => void;
  public onCameraChange?: (spherical: { radius: number; theta: number; phi: number }) => void;
  public onAutoSaveTrigger?: (reason?: string) => void;
  public onShapeSnapped?: (result: ShapeSnapResult) => void;
  public onDNAInjected?: (dna: HolisticStrokeDNA) => void;
  public onModelsChanged?: (models: LoadedModelInfo[]) => void;
  public onStrokeSelected?: (stroke: StrokeDescriptor | null) => void;

  private selectedStrokeId: string | null = null;
  private selectionHighlightGroup: THREE.Group | null = null;
  private navigatorSensitivity: number = 0.35;
  private currentLayers: Layer[] = [];

  private activeSelectedModelId: string | null = null;
  private guideHelperMesh: THREE.Mesh | null = null;
  private cachedRect: DOMRect | null = null;
  private drawingPlaneMesh: THREE.Mesh | null = null;
  private clipboardStrokes: StrokeDescriptor[] = [];

  constructor(container: HTMLElement) {
    this.container = container;

    // 1. WebGL Renderer with Stencil Buffer & Depth Preservation
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      stencil: true, // Required for stencil masking pipeline
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.autoClear = true;
    this.renderer.autoClearStencil = true;
    container.appendChild(this.renderer.domElement);

    // Cache viewport bounding rect
    this.refreshRect();
    window.addEventListener('resize', () => this.refreshRect());
    window.addEventListener('scroll', () => this.refreshRect(), true);

    // Run asynchronous WebGPU and GPU hardware detection
    this.detectGPUHardware();

    // 2. Scene Hierarchy (Default Light Studio Theme)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf6f7f9);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.05,
      2000
    );
    this.updateCameraPosition();

    // 4. Groups with explicit render queue
    this.helperRoot = new THREE.Group();
    this.helperRoot.renderOrder = 1;

    this.modelRoot = new THREE.Group();
    this.modelRoot.renderOrder = 2; // Model renders first, writes depth and stencil

    this.strokeRoot = new THREE.Group();
    this.strokeRoot.renderOrder = 5; // Stroke geometry renders with depthTest=true, depthWrite=false

    // Attach strokes directly as child of modelRoot so all strokes stay locked to the model in 3D space
    this.modelRoot.add(this.strokeRoot);

    this.lightsRoot = new THREE.Group();

    this.scene.add(this.helperRoot);
    this.scene.add(this.modelRoot);
    this.scene.add(this.lightsRoot);

    // 5. Tooling & Engines
    this.raycaster = new THREE.Raycaster();
    this.beadGenerator = new ConformalBeadGenerator();
    this.materialCache = new MaterialCache();
    this.uvEngine = new UVPaintingEngine(2048);
    this.uvEngine.setRenderer(this.renderer);
    this.liquifyEngine = new VolumetricLiquifyEngine(this.beadGenerator);
    this.loftEngine = new LoftGuideEngine();
    this.scene.add(this.loftEngine.getGuideRoot());
    this.scaffoldingEngine = new ScaffoldingEngine();
    this.scene.add(this.scaffoldingEngine.getScaffoldRoot());
    this.postEngine = new PostProcessingEngine(
      this.renderer,
      this.scene,
      this.camera,
      container.clientWidth,
      container.clientHeight
    );

    // 6. Grid Helper (Light theme palette)
    this.gridHelper = new THREE.GridHelper(10, 20, 0xcbd5e1, 0xe2e8f0);
    this.gridHelper.position.y = -1.2;
    this.helperRoot.add(this.gridHelper);

    // 7. Lighting System (Light theme palette with rich three-point illumination)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 0.85);
    this.dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    this.dirLight1.position.set(6, 10, 6);
    this.dirLight2 = new THREE.DirectionalLight(0xe0f2fe, 0.9);
    this.dirLight2.position.set(-6, -2, -6);

    this.lightsRoot.add(this.ambientLight);
    this.lightsRoot.add(this.hemiLight);
    this.lightsRoot.add(this.dirLight1);
    this.lightsRoot.add(this.dirLight2);

    // Procedural Sky System with Atmospheric Scattering and Synced Lighting
    this.skyEngine = new ProceduralSkyEngine(this.scene);
    this.skyEngine.setLights(this.dirLight1, this.ambientLight, this.dirLight2);
    this.skyEngine.applyPreset('daylight');

    // Ensure baseline lighting and reflection environment are immediately ready
    this.ensureBaselineLighting();

    // 8. 3D Brush Cursor Decal Ring
    const cursorGeom = new THREE.RingGeometry(0.85, 1.0, 32);
    const cursorMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    this.cursorDecal = new THREE.Mesh(cursorGeom, cursorMat);
    this.cursorDecal.renderOrder = 10;
    this.cursorDecal.visible = false;
    this.scene.add(this.cursorDecal);

    // 9. Attach global RayEngine interface for 100% interoperability
    if (typeof window !== 'undefined') {
      (window as any).__STUDIO_ENGINE__ = this;
      window.RayEngine = {
        screenToWorld: (clientX: number, clientY: number, isSpatial: boolean = false, depth: number = 6.0) =>
          this.screenToWorld(clientX, clientY, isSpatial, depth),
        checkHover: (clientX: number, clientY: number) => this.checkHover(clientX, clientY),
        refreshRect: () => this.refreshRect(),
        raycastModel: (screenX: number, screenY: number) => this.raycastModel(screenX, screenY),
        loadGLTF: (url: string, name?: string) => this.loadGLTF(url, name || 'Custom Model'),
      };
    }

    // 10. Start with Default Drawing Plane on Canvas Load
    this.setupDefaultDrawingPlane();

    // 11. Start Render Loop
    this.startLoop();
  }

  /**
   * Refreshes and returns the cached viewport DOMRect
   */
  public refreshRect(): DOMRect {
    if (this.container) {
      this.cachedRect = this.container.getBoundingClientRect();
    } else {
      this.cachedRect = new DOMRect(0, 0, window.innerWidth, window.innerHeight);
    }
    return this.cachedRect;
  }

  /**
   * Screen-to-World Raycast Transformation:
   * Maps client mouse/stylus coordinates (px, py) to 3D world hit point and smooth interpolated normal.
   */
  public screenToWorld(
    clientX: number,
    clientY: number,
    isSpatial: boolean = false,
    spatialDepth: number = 6.0
  ): StrokePoint | null {
    const rect = this.cachedRect || this.refreshRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    if (isSpatial) {
      const res = this.raycastSpatialPlane(ndcX, ndcY, spatialDepth);
      if (!res) return null;
      return {
        position: res.worldPoint,
        normal: res.worldNormal,
        surfaceOffset: 0.002,
        pressure: 0.5,
        isSurfaceHit: false,
        time: performance.now(),
      };
    } else {
      const res = this.raycastModel(ndcX, ndcY);
      if (!res || !res.hit) return null;
      return {
        position: res.worldPoint,
        normal: res.worldNormal,
        surfaceOffset: 0.004,
        pressure: 0.5,
        uv: res.uv,
        hitMeshId: res.mesh?.uuid,
        isSurfaceHit: true,
        time: performance.now(),
      };
    }
  }

  /**
   * Fast Hover Detection:
   * Returns true if cursor is currently pointing over a valid 3D drawable mesh polygon
   */
  public checkHover(clientX: number, clientY: number): boolean {
    const rect = this.cachedRect || this.refreshRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    const res = this.raycastModel(ndcX, ndcY);
    return !!(res && res.hit);
  }

  private getDRACOLoader(): DRACOLoader {
    if (!this.dracoLoader) {
      this.dracoLoader = new DRACOLoader();
      this.dracoLoader.setDecoderPath('/draco/');
      this.dracoLoader.setDecoderConfig({ type: 'wasm' });
      this.dracoLoader.preload();
    }
    return this.dracoLoader;
  }

  /**
   * Loads a preset procedural or remote 3D model
   */
  public async loadPresetModel(presetId: string, initialDisplayMode?: ModelDisplayMode): Promise<void> {
    const presets = SampleModelFactory.getPresets();
    const found = presets.find((p) => p.id === presetId) || presets[0];

    // Clear current model & strokes (only recreate drawing plane if user selected the drawing plane preset)
    this.clearModel(presetId === 'drawing_plane');
    if (found.file || found.remoteUrl) {
      try {
        const rawUrl = found.file || found.remoteUrl!;
        const fileUrl = resolveAssetUrl(rawUrl);
        if (fileUrl.includes('models/')) {
          const checkRes = await fetch(fileUrl, { method: 'HEAD' }).catch(() => null);
          const contentLength = checkRes ? parseInt(checkRes.headers.get('content-length') || '-1', 10) : -1;
          if (contentLength === 0 || (checkRes && !checkRes.ok)) {
            throw new Error(`File ${fileUrl} is unavailable (HTTP ${checkRes?.status || 'error'}).`);
          }
        }
        await this.loadGLTF(fileUrl, found.name, found);
        if (initialDisplayMode) {
          this.setModelDisplayMode(initialDisplayMode);
        }
      } catch (err) {
        console.warn(`Direct model load notice for ${found.name}, switching to procedural generation fallback:`, err);
        const meshObj = found.createMesh ? found.createMesh() : SampleModelFactory.createFallbackModelForPreset(found);
        this.setModelObject(meshObj, found.name, found);
        if (initialDisplayMode) {
          this.setModelDisplayMode(initialDisplayMode);
        }
      }
    } else if (found.createMesh) {
      const meshObj = found.createMesh();
      this.setModelObject(meshObj, found.name, found);
      if (initialDisplayMode) {
        this.setModelDisplayMode(initialDisplayMode);
      }
    } else {
      const meshObj = SampleModelFactory.createFallbackModelForPreset(found);
      this.setModelObject(meshObj, found.name, found);
      if (initialDisplayMode) {
        this.setModelDisplayMode(initialDisplayMode);
      }
    }
  }

  /**
   * Sets the 3D model object, configures stencil writing and auto-frames camera
   */
  public setModelObject(obj: THREE.Object3D, name: string, modelDef?: any): void {
    this.ensureBaselineLighting();
    const isDrawingPlane = name === 'Drawing Canvas Plane' || obj.name === 'DrawingCanvasPlane' || obj.name === 'DrawingPlaneCanvas';
    this.clearModel(isDrawingPlane);
    this.activeModelName = name;

    // Ensure default drawing plane is detached when loading a 3D model
    if (!isDrawingPlane) {
      const existingPlane = this.modelRoot.getObjectByName('DrawingPlaneCanvas');
      if (existingPlane) {
        this.modelRoot.remove(existingPlane);
      }
      this.drawingPlaneMesh = null;
    }

    this.modelRoot.add(obj);

    // Apply rotation if defined in model calibration
    if (modelDef && modelDef.rotation) {
      obj.rotation.set(
        THREE.MathUtils.degToRad(modelDef.rotation.x || 0),
        THREE.MathUtils.degToRad(modelDef.rotation.y || 0),
        THREE.MathUtils.degToRad(modelDef.rotation.z || 0)
      );
      obj.updateMatrixWorld(true);
    }

    this.targetMeshes = [];
    let vertexCount = 0;
    let triangleCount = 0;
    let meshCount = 0;

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        this.targetMeshes.push(child);
        meshCount++;
        const geom = child.geometry;

        // Ensure vertex normals exist for lighting & raycasting
        if (!geom.attributes.normal) {
          geom.computeVertexNormals();
        }
        // Ensure bounding volumes are computed for raycaster intersection tests
        geom.computeBoundingBox();
        geom.computeBoundingSphere();

        // Compute Bounding Volume Hierarchy (BVH) for accelerated raycasting on complex meshes (e.g. Matilda, Bakery)
        try {
          if (typeof (geom as any).computeBoundsTree === 'function') {
            (geom as any).computeBoundsTree();
          }
        } catch (e) {
          console.warn('BVH computation notice for mesh:', e);
        }

        vertexCount += geom.attributes.position ? geom.attributes.position.count : 0;
        triangleCount += geom.index
          ? geom.index.count / 3
          : geom.attributes.position
          ? geom.attributes.position.count / 3
          : 0;

        // Verify if valid non-zero vertex colors exist
        let hasValidVertexColors = false;
        if (geom.attributes.color) {
          const colorAttr = geom.attributes.color;
          let maxComponent = 0;
          let sumComponent = 0;
          const sampleCount = Math.min(colorAttr.count, 60);
          for (let i = 0; i < sampleCount; i++) {
            const r = colorAttr.getX(i);
            const g = colorAttr.getY(i);
            const b = colorAttr.getZ(i);
            maxComponent = Math.max(maxComponent, r, g, b);
            sumComponent += r + g + b;
          }
          const avgComponent = sumComponent / (sampleCount * 3);
          if (maxComponent > 0.15 && avgComponent > 0.05) {
            hasValidVertexColors = true;
          }
        }

        const sanitizeMat = (mat: THREE.Material): THREE.Material => {
          let targetMat = mat;
          const isAlphaTransparent =
            mat.transparent ||
            (mat.opacity !== undefined && mat.opacity < 0.999) ||
            (mat as any).alphaTest > 0 ||
            (mat as any).alphaMode === 'BLEND' ||
            (mat as any).alphaMode === 'MASK';

          // Upgrade basic / unlit materials if needed
          if (
            mat instanceof THREE.MeshBasicMaterial ||
            mat instanceof THREE.MeshLambertMaterial ||
            mat instanceof THREE.MeshPhongMaterial
          ) {
            const basicCol = (mat as any).color;
            const hasTex = !!(mat as any).map;
            let resolvedColor = new THREE.Color(0xd8dee9);
            if (basicCol instanceof THREE.Color) {
              if (hasTex) {
                resolvedColor.setHex(0xffffff);
              } else if (basicCol.r > 0.05 || basicCol.g > 0.05 || basicCol.b > 0.05) {
                resolvedColor = basicCol.clone();
              }
            }
            targetMat = new THREE.MeshStandardMaterial({
              color: resolvedColor,
              map: (mat as any).map || null,
              roughness: 0.45,
              metalness: 0.08,
              side: THREE.DoubleSide,
              transparent: isAlphaTransparent,
              opacity: mat.opacity !== undefined ? mat.opacity : 1.0,
              alphaTest: (mat as any).alphaTest || (isAlphaTransparent ? 0.2 : 0),
              depthWrite: true,
            });
          }

          targetMat.side = THREE.DoubleSide;

          if (hasValidVertexColors) {
            targetMat.vertexColors = true;
            if ('color' in targetMat && (targetMat as any).color instanceof THREE.Color) {
              const c = (targetMat as any).color;
              if (c.r < 0.25 && c.g < 0.25 && c.b < 0.25) c.setHex(0xffffff);
            }
          } else {
            targetMat.vertexColors = false;
          }

          if (targetMat instanceof THREE.MeshStandardMaterial || targetMat instanceof THREE.MeshPhysicalMaterial) {
            // Force safe low metalness so models never render as pitch black silhouettes
            targetMat.metalness = 0.05;
            if (targetMat.roughness === undefined || targetMat.roughness < 0.25) {
              targetMat.roughness = 0.55;
            }
            // If base color is dark with a texture map, brighten to pure white so texture is 100% visible
            if (targetMat.map && targetMat.color) {
              if (targetMat.color.r < 0.8 || targetMat.color.g < 0.8 || targetMat.color.b < 0.8) {
                targetMat.color.setHex(0xffffff);
              }
            } else if (!hasValidVertexColors && !targetMat.map && targetMat.color) {
              // Only override if color is pitch black uninitialized (0x000000)
              if (targetMat.color.r === 0 && targetMat.color.g === 0 && targetMat.color.b === 0) {
                targetMat.color.setHex(0xd8dee9);
              }
            }
          }

          if ('map' in targetMat && (targetMat as any).map) {
            (targetMat as any).map.colorSpace = THREE.SRGBColorSpace;
            (targetMat as any).map.needsUpdate = true;
          }
          if ('emissiveMap' in targetMat && (targetMat as any).emissiveMap) {
            (targetMat as any).emissiveMap.colorSpace = THREE.SRGBColorSpace;
            (targetMat as any).emissiveMap.needsUpdate = true;
          }

          // Ensure proper alpha test and depth write for transparent textures & cards (stars, decals, etc.)
          if (
            isAlphaTransparent ||
            targetMat.transparent ||
            (targetMat.opacity !== undefined && targetMat.opacity < 0.999) ||
            ('map' in targetMat && (targetMat as any).map) ||
            (targetMat as any).alphaTest > 0
          ) {
            targetMat.depthWrite = true;
            targetMat.depthTest = true;
            if ((targetMat as any).alphaTest === 0 || (targetMat as any).alphaTest === undefined) {
              (targetMat as any).alphaTest = 0.2;
            }
            if (isAlphaTransparent || (targetMat as any).alphaTest > 0) {
              targetMat.transparent = true;
            }
          }

          MaterialCache.configureModelMaterial(targetMat);
          targetMat.needsUpdate = true;
          return targetMat;
        };

        if (Array.isArray(child.material)) {
          child.material = child.material.map(sanitizeMat);
        } else if (child.material) {
          child.material = sanitizeMat(child.material);
        }
        child.userData.originalMaterial = child.material;
      }
    });

    // Auto-center and normalize bounding box scale
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    // Normalize to standard ~2.6 units studio scale so all brush sizes & offsets align
    const targetScale = 2.6 / maxDim;
    obj.scale.setScalar(targetScale);

    // Recenter scaled model at origin
    const scaledBox = new THREE.Box3().setFromObject(obj);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);
    obj.position.sub(scaledCenter);
    obj.updateMatrixWorld(true);

    // Update metadata
    this.modelMetadata = {
      name,
      vertexCount: Math.round(vertexCount),
      triangleCount: Math.round(triangleCount),
      meshCount,
      dimensions: size,
      hasUVs: true,
    };

    if (this.onMetadataUpdate) {
      this.onMetadataUpdate(this.modelMetadata);
    }

    // Auto-frame camera comfortably around normalized model
    this.targetSpherical.radius = 5.2;
    this.targetPosition.set(0, 0, 0);

    // Attach UV Engine to new model
    this.uvEngine.attachToModel(this.modelRoot);

    // Dispatch MODEL_LOADED event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('MODEL_LOADED', {
          detail: {
            name,
            metadata: this.modelMetadata,
          },
        })
      );
    }
    this.notifyModelsChanged();
    this.onAutoSaveTrigger?.('model_loaded');
  }

  /**
   * Direct 3D mesh loader alias for procedural shapes & CAD primitives
   */
  public loadDirectObject3D(obj: THREE.Object3D, name: string): void {
    this.setModelObject(obj, name);
  }

  /**
   * Load external GLB/GLTF model from ArrayBuffer or URL (supporting Draco compression)
   */
  public async loadGLTF(bufferOrUrl: ArrayBuffer | string, name: string, modelDef?: any): Promise<void> {
    try {
      let loadRes: LoadResult;
      if (typeof bufferOrUrl === 'string') {
        let url = resolveAssetUrl(bufferOrUrl);
        if (url.includes('github.com') && url.includes('/blob/')) {
          url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
        }
        loadRes = await modelLoader.loadFromUrl(url, name);
      } else {
        loadRes = await modelLoader.loadFromArrayBuffer(bufferOrUrl, name);
      }
      this.setModelObject(loadRes.scene, name, modelDef);
    } catch (err) {
      console.warn(`modelLoader pipeline fallback for ${name}:`, err);
      // Fallback to standard GLTFLoader if direct load fails
      const loader = new GLTFLoader();
      loader.setDRACOLoader(this.getDRACOLoader());
      return new Promise((resolve, reject) => {
        const onLoad = (gltf: any) => {
          const scene = gltf.scene || gltf.scenes[0];
          ModelConverterEngine.normalizeMeshMaterials(scene, {
            fixAlpha: true,
            brightenMetals: true,
            doubleSided: true,
          });
          scene.traverse((child: any) => {
            if (child.isMesh) {
              child.userData.originalMaterial = child.material;
            }
          });
          this.setModelObject(scene, name, modelDef);
          resolve();
        };
        if (typeof bufferOrUrl === 'string') {
          let url = bufferOrUrl;
          if (url.includes('github.com') && url.includes('/blob/')) {
            url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
          }
          loader.load(url, onLoad, undefined, reject);
        } else {
          loader.parse(bufferOrUrl, '', onLoad, reject);
        }
      });
    }
  }

  /**
   * Load external OBJ model
   */
  public async loadOBJ(textOrUrl: string, name: string): Promise<void> {
    const loader = new OBJLoader();
    const handleObj = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (
            !child.material ||
            (child.material instanceof THREE.MeshBasicMaterial && !child.material.map)
          ) {
            // Assign a standard PBR material for untextured OBJ meshes
            child.material = new THREE.MeshStandardMaterial({
              color: 0xe2e8f0,
              roughness: 0.4,
              metalness: 0.1,
              side: THREE.DoubleSide,
              vertexColors: !!child.geometry?.attributes?.color,
            });
          }
        }
      });
      this.setModelObject(obj, name);
    };

    if (textOrUrl.startsWith('http') || textOrUrl.startsWith('blob:')) {
      return new Promise((resolve, reject) => {
        loader.load(
          textOrUrl,
          (obj) => {
            handleObj(obj);
            resolve();
          },
          undefined,
          reject
        );
      });
    } else {
      const obj = loader.parse(textOrUrl);
      handleObj(obj);
    }
  }

  /**
   * Universal 3D Model Converter & Ingestion Pipeline:
   * Supports GLB, GLTF, OBJ (+MTL/textures), FBX, 3DS, STL, PLY, DAE.
   * Converts, optimizes, Draco-compresses, saves into in-app storage, and mounts onto canvas.
   */
  public async loadUniversalFiles(
    files: FileList | File[],
    customName?: string
  ): Promise<{ name: string; bytes: number; reduction: number }> {
    try {
      const loadRes = await modelLoader.loadFromFiles(files);
      this.setModelObject(loadRes.scene, customName || loadRes.metadata.name);
      return {
        name: customName || loadRes.metadata.name,
        bytes: loadRes.metadata.originalSize,
        reduction: 0,
      };
    } catch {
      const result = await ModelConverterEngine.autoConvertAndSave(files, customName);
      await this.loadGLTF(result.glbArrayBuffer, result.name);
      return {
        name: result.name,
        bytes: result.convertedBytes,
        reduction: result.reductionPercentage,
      };
    }
  }

  /**
   * Raycasts onto a free 3D virtual construction plane in space (Air Draw mode)
   */
  public raycastSpatialPlane(screenX: number, screenY: number, depthOffset: number = 0): {
    hit: boolean;
    point: THREE.Vector3;
    worldPoint: THREE.Vector3;
    normal: THREE.Vector3;
    worldNormal: THREE.Vector3;
    uv?: THREE.Vector2;
    mesh?: THREE.Mesh;
  } {
    const coords = new THREE.Vector2(screenX, screenY);
    this.raycaster.setFromCamera(coords, this.camera);

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const planeNormal = camDir.clone().negate().normalize(); // Facing camera
    const planeCenter = new THREE.Vector3(0, 0, depthOffset);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, planeCenter);

    const worldHit = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(plane, worldHit);
    const rawPoint = hit ? hit.clone() : this.raycaster.ray.at(5.0, new THREE.Vector3());

    // Apply +0.002 plane elevation offset
    const worldPoint = rawPoint.clone().addScaledVector(planeNormal, 0.002);

    const invModelMatrix = this.modelRoot.matrixWorld.clone().invert();
    const localPoint = worldPoint.clone().applyMatrix4(invModelMatrix);
    const localNormal = planeNormal.clone().transformDirection(invModelMatrix).normalize();

    return {
      hit: true,
      point: localPoint,
      worldPoint,
      normal: localNormal,
      worldNormal: planeNormal,
      uv: new THREE.Vector2(0.5, 0.5),
    };
  }

  /**
   * Raycasts from screen coordinates (normalized -1 to 1) onto front-facing model polygons
   * with BVH acceleration and smooth barycentric normal interpolation.
   */
  public raycastModel(
    screenX: number,
    screenY: number,
    settings?: BrushSettings
  ): {
    hit: boolean;
    point: THREE.Vector3;
    worldPoint: THREE.Vector3;
    normal: THREE.Vector3;
    worldNormal: THREE.Vector3;
    uv?: THREE.Vector2;
    mesh?: THREE.Mesh;
  } | null {
    // Ensure targetMeshes has all active visible meshes
    if (!this.targetMeshes || this.targetMeshes.length === 0) {
      this.targetMeshes = [];
      this.modelRoot.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry && child.visible) {
          this.targetMeshes.push(child);
        }
      });
    }

    // Include active loft guides, scaffolding collision meshes, and guide collider meshes
    const allRaycastTargets = [...this.targetMeshes];
    if (this.loftEngine) {
      allRaycastTargets.push(...this.loftEngine.getActiveGuideMeshes());
    }
    if (this.scaffoldingEngine) {
      allRaycastTargets.push(...this.scaffoldingEngine.getActiveColliderMeshes());
    }
    for (const colliderMesh of this.guideColliderMeshes.values()) {
      if (colliderMesh.visible) {
        allRaycastTargets.push(colliderMesh);
      }
    }

    const coords = new THREE.Vector2(screenX, screenY);
    this.raycaster.setFromCamera(coords, this.camera);

    let intersects = this.raycaster.intersectObjects(allRaycastTargets, false);

    // Seam & Gap Bridging fallback: if direct ray misses, test a micro-cross jitter pattern
    if (intersects.length === 0 && settings?.raycastSeamBridging !== false) {
      const jitterD = 0.0018; // ~1-2 screen pixels
      const offsets = [
        [jitterD, 0],
        [-jitterD, 0],
        [0, jitterD],
        [0, -jitterD],
        [jitterD * 0.7, jitterD * 0.7],
        [-jitterD * 0.7, -jitterD * 0.7],
      ];
      for (const [ox, oy] of offsets) {
        coords.set(screenX + ox, screenY + oy);
        this.raycaster.setFromCamera(coords, this.camera);
        const subHits = this.raycaster.intersectObjects(allRaycastTargets, false);
        if (subHits.length > 0) {
          intersects = subHits;
          break;
        }
      }
    }

    if (intersects.length === 0) {
      return null;
    }

    const hit = intersects[0];
    if (!hit || !(hit.object instanceof THREE.Mesh)) {
      return null;
    }

    const mesh = hit.object as THREE.Mesh;
    const geom = mesh.geometry;
    let smoothNormal: THREE.Vector3 | null = null;

    // Smooth Barycentric Normal Interpolation from Mesh Attributes
    const useBarycentric = settings?.barycentricNormals !== false;
    if (useBarycentric && geom && geom.attributes && geom.attributes.normal && hit.faceIndex !== undefined) {
      const index = geom.index;
      const normalAttr = geom.attributes.normal;
      const posAttr = geom.attributes.position;
      const faceIdx = hit.faceIndex;

      let a: number, b: number, c: number;
      if (index) {
        a = index.getX(faceIdx * 3);
        b = index.getX(faceIdx * 3 + 1);
        c = index.getX(faceIdx * 3 + 2);
      } else {
        a = faceIdx * 3;
        b = faceIdx * 3 + 1;
        c = faceIdx * 3 + 2;
      }

      if (posAttr && normalAttr && a < posAttr.count && b < posAttr.count && c < posAttr.count) {
        _pA.fromBufferAttribute(posAttr, a);
        _pB.fromBufferAttribute(posAttr, b);
        _pC.fromBufferAttribute(posAttr, c);

        _nA.fromBufferAttribute(normalAttr, a);
        _nB.fromBufferAttribute(normalAttr, b);
        _nC.fromBufferAttribute(normalAttr, c);

        // Convert hit point into local object coordinates to compute barycentric coordinates
        _invObjMatrix.copy(mesh.matrixWorld).invert();
        _localHit.copy(hit.point).applyMatrix4(_invObjMatrix);

        THREE.Triangle.getBarycoord(_localHit, _pA, _pB, _pC, _baryCoord);

        // Clamp weights for numerical stability
        const bx = isNaN(_baryCoord.x) ? 0.3333 : Math.max(0, Math.min(1, _baryCoord.x));
        const by = isNaN(_baryCoord.y) ? 0.3333 : Math.max(0, Math.min(1, _baryCoord.y));
        const bz = isNaN(_baryCoord.z) ? 0.3333 : Math.max(0, Math.min(1, _baryCoord.z));
        const bSum = bx + by + bz || 1.0;

        _interpolatedNorm
          .set(0, 0, 0)
          .addScaledVector(_nA, bx / bSum)
          .addScaledVector(_nB, by / bSum)
          .addScaledVector(_nC, bz / bSum)
          .normalize();

        // Transform into world space
        smoothNormal = _interpolatedNorm.clone().transformDirection(mesh.matrixWorld).normalize();
        if (isNaN(smoothNormal.x) || isNaN(smoothNormal.y) || isNaN(smoothNormal.z)) {
          smoothNormal = null;
        }
      }
    }

    let worldNormal = smoothNormal || (hit.face
      ? hit.face.normal.clone().transformDirection(mesh.matrixWorld).normalize()
      : new THREE.Vector3(0, 1, 0));

    // Ensure normal points outward towards camera
    this.camera.getWorldPosition(_camDirScratch);
    _camDirScratch.sub(hit.point).normalize();
    if (worldNormal.dot(_camDirScratch) < 0) {
      worldNormal.negate();
    }

    // Apply surface elevation bias for 3D models to eradicate z-fighting
    const surfaceOffset = settings?.surfaceOffset ?? 0.002;
    const worldPoint = hit.point.clone().addScaledVector(worldNormal, surfaceOffset);

    // Transform into local modelRoot coordinate space
    const invModelMatrix = this.modelRoot.matrixWorld.clone().invert();
    const localPoint = worldPoint.clone().applyMatrix4(invModelMatrix);
    const localNormal = worldNormal.clone().transformDirection(invModelMatrix).normalize();

    let uv = hit.uv;
    if (!uv && hit.point) {
      const u = 0.5 + Math.atan2(localPoint.z, localPoint.x) / (2 * Math.PI);
      const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, localPoint.y / 2.0))) / Math.PI;
      uv = new THREE.Vector2(u, v);
    }

    const result = {
      hit: true,
      point: localPoint,
      worldPoint,
      normal: localNormal,
      worldNormal,
      uv,
      mesh,
    };

    // Dispatch RAY_HIT event for ecosystem telemetry
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('RAY_HIT', {
          detail: {
            point: worldPoint,
            normal: worldNormal,
            uv,
            meshName: mesh.name || mesh.uuid,
          },
        })
      );
    }

    return result;
  }

  /**
   * Updates the 3D Cursor Decal Ring
   */
  public updateCursor(screenX: number, screenY: number, brushSize: number, settings?: BrushSettings, tool?: ToolType): void {
    const isSpatial = settings?.drawingMode === 'spatial_3d' || tool === 'free_brush';
    const result = isSpatial
      ? this.raycastSpatialPlane(screenX, screenY, settings?.spatialDepth ?? 0)
      : this.raycastModel(screenX, screenY);

    if (result && result.worldPoint) {
      this.cursorDecal.visible = true;
      this.cursorDecal.position.copy(result.worldPoint).addScaledVector(result.worldNormal, 0.005);
      
      // Orient cursor ring along surface/plane normal
      const normal = result.worldNormal.clone().normalize();
      const up = new THREE.Vector3(0, 0, 1);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);
      this.cursorDecal.setRotationFromQuaternion(quat);

      const scale = brushSize;
      this.cursorDecal.scale.set(scale, scale, scale);
    } else {
      this.cursorDecal.visible = false;
    }
  }

  public hideCursor(): void {
    this.cursorDecal.visible = false;
  }

  /**
   * Start a new paint stroke with smoothing and predictive latency compensation
   */
  public startStroke(
    screenX: number,
    screenY: number,
    settings: BrushSettings,
    tool: ToolType,
    layer: Layer,
    pressure: number = 1.0,
    symmetry: SymmetryMode = 'none'
  ): void {
    if (layer.locked || !layer.visible) return;

    this.isDrawing = true;
    this.activePoints = [];
    this.activeStrokeMeshes = [];
    this.activeStrokeBatch = [];
    this.activeLayerId = layer.id;
    this.activeLayerOpacity = layer.opacity;

    // Reset smoothing filter state for clean stroke start
    this.strokeSmoother.reset();
    const smoothed = this.strokeSmoother.processPoint(
      screenX,
      screenY,
      pressure,
      settings.smoothingAlgorithm || 'streamline',
      settings.smoothingStrength ?? 0.55
    );

    this.lastScreenCoords = { x: smoothed.x, y: smoothed.y };
    this.lastCapturePoint = null;
    this.isOverAir = false;

    // Handle Vacuum Eraser Mode: purges whole continuous strokes upon intersection
    if (tool === 'eraser' && settings.eraserMode === 'vacuum') {
      this.activeVacuumPurgedBatch = [];
      this.purgeStrokesIntersecting(smoothed.x, smoothed.y, (settings.size || 0.035) * 1.5);
      return;
    }

    const isSpatial = settings.drawingMode === 'spatial_3d' || tool === 'free_brush';
    const rayResult = isSpatial
      ? this.raycastSpatialPlane(smoothed.x, smoothed.y, settings.spatialDepth ?? 0)
      : this.raycastModel(smoothed.x, smoothed.y, settings);

    if (!rayResult || !rayResult.hit) {
      this.isOverAir = true;
      return;
    }

    // UV Texture Brush Mode
    if (tool === 'uv_brush' && rayResult.hit && rayResult.uv) {
      this.uvEngine.beginStroke(rayResult.uv, settings);
      this.uvEngine.paintTo(rayResult.uv, settings, smoothed.pressure);
      return;
    }

    const firstPoint: StrokePoint = {
      position: rayResult.point.clone(),
      normal: rayResult.normal.clone(),
      surfaceOffset: settings.surfaceOffset || 0.002,
      pressure: smoothed.pressure,
      isSurfaceHit: !isSpatial,
      uv: rayResult.uv,
      time: performance.now(),
    };
    this.activePoints.push(firstPoint);
    this.lastCapturePoint = firstPoint;

    // Instantiate symmetry stroke meshes
    const symmetryCount = this.getSymmetryCount(symmetry);
    for (let s = 0; s < symmetryCount; s++) {
      const mat = this.materialCache.getStrokeMaterial(settings, !isSpatial, layer.opacity, layer.blendMode || 'normal');
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
      mesh.renderOrder = 5;
      this.strokeRoot.add(mesh);
      this.activeStrokeMeshes.push(mesh);
    }

    this.updateActiveStrokeGeometry(settings, symmetry);
  }

  /**
   * Continue painting stroke with smoothed screen coordinates, high-frequency raycasting interpolation,
   * predictive mesh contact compensation, & anti-air gap segment splitting
   */
  public addStrokePoint(
    screenX: number,
    screenY: number,
    settings: BrushSettings,
    tool: ToolType,
    pressure: number = 1.0,
    symmetry: SymmetryMode = 'none'
  ): void {
    if (!this.isDrawing) return;

    // Apply real-time smoothing for smooth surface drawing
    const smoothed = this.strokeSmoother.processPoint(
      screenX,
      screenY,
      pressure,
      settings.smoothingAlgorithm || 'streamline',
      settings.smoothingStrength ?? 0.55
    );

    // Vacuum Eraser continuous sweep
    if (tool === 'eraser' && settings.eraserMode === 'vacuum') {
      this.purgeStrokesIntersecting(smoothed.x, smoothed.y, (settings.size || 0.035) * 1.5);
      return;
    }

    const targetX = smoothed.x;
    const targetY = smoothed.y;
    const targetPressure = smoothed.pressure;

    if (!this.lastScreenCoords) {
      this.lastScreenCoords = { x: targetX, y: targetY };
    }

    const dx = targetX - this.lastScreenCoords.x;
    const dy = targetY - this.lastScreenCoords.y;
    const screenDist = Math.hypot(dx, dy);

    // Sub-sample screen movements so fast sweeps calculate surface contact points smoothly without skipping
    const sampleDensity = settings.raycastSampleDensity || 'high';
    const densityMaxSteps = sampleDensity === 'ultra' ? 48 : sampleDensity === 'standard' ? 16 : 32;
    const maxStepDist = sampleDensity === 'ultra' ? 0.003 : 0.005;
    const steps = Math.min(densityMaxSteps, Math.max(1, Math.ceil(screenDist / maxStepDist)));
    const isSpatial = settings.drawingMode === 'spatial_3d' || tool === 'free_brush';

    let missStreak = 0;

    for (let step = 1; step <= steps; step++) {
      const alpha = step / steps;
      const currX = this.lastScreenCoords.x + dx * alpha;
      const currY = this.lastScreenCoords.y + dy * alpha;
      const currPressure = targetPressure;

      const rayResult = isSpatial
        ? this.raycastSpatialPlane(currX, currY, settings.spatialDepth ?? 0)
        : this.raycastModel(currX, currY, settings);

      // UV Texture Brush Mode
      if (tool === 'uv_brush') {
        if (rayResult && rayResult.hit && rayResult.uv) {
          this.uvEngine.paintTo(rayResult.uv, settings, currPressure);
        }
        continue;
      }

      // AIR GAP DETECTION: Ray missed model in free air (only in surface mode)
      if (!rayResult || !rayResult.hit) {
        missStreak++;
        if (missStreak >= 2) {
          if (this.activePoints.length > 0) {
            // Commit active segment so stroke does NOT bridge through empty air
            this.commitActiveSegment(settings, tool);
          }
          this.isOverAir = true;
          this.lastCapturePoint = null;
        }
        continue;
      }

      missStreak = 0;

      // SURFACE / SPATIAL HIT
      const newPoint: StrokePoint = {
        position: rayResult.point.clone(),
        normal: rayResult.normal.clone(),
        surfaceOffset: settings.surfaceOffset || 0.002,
        pressure: currPressure,
        isSurfaceHit: !isSpatial,
        uv: rayResult.uv,
        time: performance.now(),
      };

      // Discontinuity detection:
      // 1. Returning from empty air
      // 2. Large 3D spatial jump across depth occlusion / silhouette
      // 3. Sharp normal flip (> 135° angle, dot < -0.7)
      if (this.lastCapturePoint) {
        const dist3D = this.lastCapturePoint.position.distanceTo(newPoint.position);
        const normalDot = this.lastCapturePoint.normal.dot(newPoint.normal);

        const gapToleranceMultiplier = settings.airGapTolerance ? settings.airGapTolerance * 2 : 1.0;
        const maxJump = Math.max(0.35, (settings.size || 0.035) * 8.0 * gapToleranceMultiplier);
        const isDiscontinuous = this.isOverAir || dist3D > maxJump || normalDot < -0.7;

        if (isDiscontinuous) {
          if (this.activePoints.length > 0) {
            this.commitActiveSegment(settings, tool);
          }
          this.isOverAir = false;
          this.lastCapturePoint = null;
        }
      }

      this.isOverAir = false;

      // Start new segment if currently empty
      if (this.activePoints.length === 0) {
        this.activePoints.push(newPoint);
        this.lastCapturePoint = newPoint;

        const symmetryCount = this.getSymmetryCount(symmetry);
        for (let s = 0; s < symmetryCount; s++) {
          const mat = this.materialCache.getStrokeMaterial(settings, true, this.activeLayerOpacity);
          const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
          mesh.renderOrder = 5;
          this.strokeRoot.add(mesh);
          this.activeStrokeMeshes.push(mesh);
        }
      } else {
        const distFromLast = this.lastCapturePoint!.position.distanceTo(newPoint.position);
        if (distFromLast > 0.0003) {
          this.activePoints.push(newPoint);
          this.lastCapturePoint = newPoint;
        }
      }
    }

    this.lastScreenCoords = { x: targetX, y: targetY };

    if (this.activePoints.length > 0) {
      this.updateActiveStrokeGeometry(settings, symmetry);
    }
  }

  /**
   * Commits the current active segment into the permanent stroke list and stroke batch
   */
  private commitActiveSegment(settings: BrushSettings, tool: ToolType): void {
    if (this.activePoints.length === 0 || this.activeStrokeMeshes.length === 0) return;

    const strokeId = 'stroke_' + Math.random().toString(36).substring(2, 9);
    const descriptor: StrokeDescriptor = {
      id: strokeId,
      layerId: this.activeLayerId,
      tool,
      points: [...this.activePoints],
      settings: { ...settings },
      createdAt: Date.now(),
    };

    this.strokes.set(strokeId, {
      descriptor,
      meshes: [...this.activeStrokeMeshes],
    });

    this.activeStrokeBatch.push(descriptor);

    // Auto-recalculate mesh normals after committing segment if enabled
    if (settings.autoRecalculateNormals !== false) {
      descriptor.points.length > 0 && this.recalculateMeshNormals(this.activeLayerId);
    }

    this.activePoints = [];
    this.activeStrokeMeshes = [];
  }

  /**
   * End current stroke and save batch into undo stack
   */
  public endStroke(
    settings: BrushSettings,
    tool: ToolType,
    layerId: string,
    symmetry: SymmetryMode = 'none'
  ): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.lastScreenCoords = null;
    this.lastCapturePoint = null;
    this.isOverAir = false;
    this.lastHitMesh = null;
    this.strokeSmoother.reset();

    // Vacuum Eraser finalize
    if (tool === 'eraser' && settings.eraserMode === 'vacuum') {
      if (this.activeVacuumPurgedBatch.length > 0) {
        this.undoStack.push({
          type: 'erase',
          strokes: [...this.activeVacuumPurgedBatch],
        });
        this.redoStack = [];
        this.activeVacuumPurgedBatch = [];
        this.notifyHistory();
      }
      return;
    }

    if (tool === 'uv_brush') {
      this.uvEngine.endStroke();
      this.notifyHistory();
      return;
    }

    // Algorithmic Geometric Shape Snapping
    if (settings.shapeSnapping && this.activePoints.length >= 5) {
      const snapResult = ShapeSnappingEngine.snapStroke(
        this.activePoints,
        settings.shapeSnapTolerance ?? 0.18
      );
      if (snapResult.detectedShape !== 'none' && snapResult.confidence >= 0.6) {
        this.activePoints = snapResult.snappedPoints;
        this.updateActiveStrokeGeometry(settings, symmetry);
        this.onShapeSnapped?.(snapResult);
      }
    }

    this.commitActiveSegment(settings, tool);

    if (this.activeStrokeBatch.length > 0) {
      this.undoStack.push({
        type: 'create',
        strokes: [...this.activeStrokeBatch],
      });
      this.redoStack = [];
      this.activeStrokeBatch = [];
      this.notifyHistory();
    }
  }

  /**
   * On-demand / Hold-to-Snap active drawing curve
   */
  public snapActiveStroke(
    settings: BrushSettings,
    symmetry: SymmetryMode = 'none'
  ): ShapeSnapResult | null {
    if (this.activePoints.length < 5) return null;
    const snapResult = ShapeSnappingEngine.snapStroke(
      this.activePoints,
      settings.shapeSnapTolerance ?? 0.18
    );
    if (snapResult.detectedShape !== 'none') {
      this.activePoints = snapResult.snappedPoints;
      this.updateActiveStrokeGeometry(settings, symmetry);
      this.onShapeSnapped?.(snapResult);
      return snapResult;
    }
    return null;
  }

  /**
   * Continuous Vacuum Stroke Purge
   * Raycasts / tests distance to all existing 3D stroke objects and purges intersected continuous strokes.
   */
  public purgeStrokesIntersecting(screenX: number, screenY: number, radiusWorld: number = 0.05): StrokeDescriptor[] {
    const purged: StrokeDescriptor[] = [];
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(screenX, screenY);
    raycaster.setFromCamera(mouse, this.camera);

    // Collect all stroke meshes
    const meshToStrokeId = new Map<THREE.Mesh, string>();
    const allMeshes: THREE.Mesh[] = [];
    for (const [id, data] of this.strokes.entries()) {
      for (const m of data.meshes) {
        meshToStrokeId.set(m, id);
        allMeshes.push(m);
      }
    }

    if (allMeshes.length === 0) return purged;

    // Raycast against all stroke meshes
    const intersects = raycaster.intersectObjects(allMeshes, false);
    const hitStrokeIds = new Set<string>();

    for (const hit of intersects) {
      const strokeId = meshToStrokeId.get(hit.object as THREE.Mesh);
      if (strokeId) {
        hitStrokeIds.add(strokeId);
      }
    }

    // Also check distance from ray to stroke points for thin / line strokes
    const ray = raycaster.ray;
    for (const [id, data] of this.strokes.entries()) {
      if (hitStrokeIds.has(id)) continue;
      for (const pt of data.descriptor.points) {
        const distSq = ray.distanceSqToPoint(pt.position);
        const hitRadius = Math.max(radiusWorld, (data.descriptor.settings.size || 0.03) * 1.5);
        if (distSq <= hitRadius * hitRadius) {
          hitStrokeIds.add(id);
          break;
        }
      }
    }

    // Delete all hit strokes
    for (const id of hitStrokeIds) {
      const entry = this.strokes.get(id);
      if (entry) {
        purged.push(entry.descriptor);
        this.activeVacuumPurgedBatch.push(entry.descriptor);
        for (const m of entry.meshes) {
          m.geometry.dispose();
          this.strokeRoot.remove(m);
        }
        this.strokes.delete(id);
      }
    }

    return purged;
  }

  /**
   * Samples complete holistic DNA (color, size, opacity, material, shader, profile, pattern, physics)
   * from 3D stroke, model surface, or WebGL framebuffer
   */
  public sampleHolisticDNA(
    screenX: number,
    screenY: number,
    clientX?: number,
    clientY?: number
  ): HolisticStrokeDNA {
    // 1. Raycast against strokes in scene
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(screenX, screenY), this.camera);

    const allStrokeMeshes: THREE.Mesh[] = [];
    const meshToStrokeMap = new Map<THREE.Mesh, StrokeDescriptor>();
    for (const data of this.strokes.values()) {
      for (const m of data.meshes) {
        allStrokeMeshes.push(m);
        meshToStrokeMap.set(m, data.descriptor);
      }
    }

    const strokeHits = raycaster.intersectObjects(allStrokeMeshes, false);
    if (strokeHits.length > 0) {
      const hitMesh = strokeHits[0].object as THREE.Mesh;
      const desc = meshToStrokeMap.get(hitMesh);
      if (desc) {
        const s = desc.settings;
        const colLinear = desc.points[0]?.colorLinear || [0.2, 0.7, 1.0];
        const hex = normalizeHexColor(s.color, '#38bdf8');
        const dna: HolisticStrokeDNA = {
          colorHex: hex,
          colorLinear: colLinear,
          size: s.size || 0.035,
          opacity: s.opacity ?? 1.0,
          materialType: s.materialType || 'shaded',
          shaderEffect: s.shaderEffect,
          roughness: s.roughness ?? 0.35,
          metalness: s.metalness ?? 0.15,
          emissiveIntensity: s.emissiveIntensity ?? 0,
          profile: s.profile || 'ribbon',
          patternType: s.patternType || 'none',
          patternScale: s.patternScale ?? 4.0,
          patternIntensity: s.patternIntensity ?? 1.0,
          pressure: desc.points[0]?.pressure ?? 0.8,
          strokeId: desc.id,
          layerId: desc.layerId,
          sourceType: 'stroke',
          timestamp: Date.now(),
        };
        this.onDNAInjected?.(dna);
        return dna;
      }
    }

    // 2. Read direct pixel from WebGL framebuffer
    const sampledHex = this.sampleColorAtScreen(screenX, screenY, clientX, clientY);
    const colObj = new THREE.Color(sampledHex);

    // 3. Check if 3D model mesh was hit
    const modelHit = this.raycastModel(screenX, screenY);
    let roughness = 0.5;
    let metalness = 0.1;
    let sourceType: 'model_mesh' | 'pixel_framebuffer' = 'pixel_framebuffer';

    if (modelHit && modelHit.hit && modelHit.mesh) {
      sourceType = 'model_mesh';
      const m = modelHit.mesh.material as any;
      if (m) {
        if (typeof m.roughness === 'number') roughness = m.roughness;
        if (typeof m.metalness === 'number') metalness = m.metalness;
      }
    }

    const dna: HolisticStrokeDNA = {
      colorHex: sampledHex,
      colorLinear: [colObj.r, colObj.g, colObj.b],
      size: 0.035,
      opacity: 1.0,
      materialType: sourceType === 'model_mesh' ? 'shaded' : 'shadeless',
      roughness,
      metalness,
      emissiveIntensity: 0,
      profile: 'ribbon',
      patternType: 'none',
      patternScale: 4.0,
      patternIntensity: 1.0,
      sourceType,
      timestamp: Date.now(),
    };

    this.onDNAInjected?.(dna);
    return dna;
  }

  /**
   * Cancel active stroke without committing to history (useful for multi-touch gesture handoff)
   */
  public cancelStroke(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.lastScreenCoords = null;
    this.lastCapturePoint = null;
    this.isOverAir = false;
    this.lastHitMesh = null;
    this.strokeSmoother.reset();

    // Clean up active stroke meshes
    for (const mesh of this.activeStrokeMeshes) {
      mesh.geometry.dispose();
      this.strokeRoot.remove(mesh);
    }
    this.activeStrokeMeshes = [];
    this.activePoints = [];

    // Clean up active batch if any segments were committed in this stroke
    for (const desc of this.activeStrokeBatch) {
      const entry = this.strokes.get(desc.id);
      if (entry) {
        for (const m of entry.meshes) {
          m.geometry.dispose();
          this.strokeRoot.remove(m);
        }
        this.strokes.delete(desc.id);
      }
    }
    this.activeStrokeBatch = [];
  }

  /**
   * Updates the geometry of all active symmetry stroke meshes in real-time
   */
  private updateActiveStrokeGeometry(settings: BrushSettings, symmetry: SymmetryMode): void {
    if (this.activePoints.length === 0 || this.activeStrokeMeshes.length === 0) return;

    const symmetryCount = this.getSymmetryCount(symmetry);
    for (let s = 0; s < symmetryCount; s++) {
      const mirroredPoints = this.applySymmetry(this.activePoints, symmetry, s);
      const mesh = this.activeStrokeMeshes[s];
      if (mesh && mesh.geometry) {
        this.beadGenerator.updateBufferGeometry(mesh.geometry, mirroredPoints, settings, this.targetMeshes);
      }
    }
    this.isDirty = true;
  }

  /**
   * Recomputes points according to symmetry mode with zero allocations
   */
  private applySymmetry(points: StrokePoint[], symmetry: SymmetryMode, index: number): StrokePoint[] {
    if (symmetry === 'none' || index === 0) {
      return points;
    }

    if (!this.symmetryPointsCache[index]) {
      this.symmetryPointsCache[index] = [];
    }
    const cache = this.symmetryPointsCache[index];
    while (cache.length < points.length) {
      cache.push({
        position: new THREE.Vector3(),
        normal: new THREE.Vector3(),
        surfaceOffset: 0.002,
        pressure: 1.0,
        time: 0,
        isSurfaceHit: true,
      });
    }
    cache.length = points.length;

    const total = symmetry === 'radial_4x' ? 4 : symmetry === 'radial_8x' ? 8 : 1;
    const angle = (index * Math.PI * 2) / total;
    const yAxis = _pA.set(0, 1, 0);

    for (let i = 0; i < points.length; i++) {
      const src = points[i];
      const dst = cache[i];
      dst.position.copy(src.position);
      dst.normal.copy(src.normal);
      dst.surfaceOffset = src.surfaceOffset;
      dst.pressure = src.pressure;
      dst.uv = src.uv;
      dst.hitMeshId = src.hitMeshId;
      dst.isSurfaceHit = src.isSurfaceHit;
      dst.time = src.time;

      if (symmetry === 'custom_plane' && index === 1) {
        const mirroredPos = LoftGuideEngine.mirrorPointAcrossPlane(
          dst.position,
          this.customMirrorOrigin,
          this.customMirrorNormal
        );
        const mirroredNorm = LoftGuideEngine.mirrorNormalAcrossPlane(
          dst.normal,
          this.customMirrorNormal
        );
        dst.position.copy(mirroredPos);
        dst.normal.copy(mirroredNorm);
      } else if (symmetry === 'mirror_x') {
        dst.position.x = -dst.position.x;
        dst.normal.x = -dst.normal.x;
      } else if (symmetry === 'mirror_y') {
        dst.position.y = -dst.position.y;
        dst.normal.y = -dst.normal.y;
      } else if (symmetry === 'mirror_z') {
        dst.position.z = -dst.position.z;
        dst.normal.z = -dst.normal.z;
      } else if (symmetry === 'radial_4x' || symmetry === 'radial_8x') {
        dst.position.applyAxisAngle(yAxis, angle);
        dst.normal.applyAxisAngle(yAxis, angle);
      }
    }

    return cache;
  }

  private getSymmetryCount(symmetry: SymmetryMode): number {
    switch (symmetry) {
      case 'custom_plane':
      case 'mirror_x':
      case 'mirror_y':
      case 'mirror_z':
        return 2;
      case 'radial_4x':
        return 4;
      case 'radial_8x':
        return 8;
      default:
        return 1;
    }
  }

  /**
   * Undo last stroke, vacuum erase, or transform operation
   */
  public undo(): boolean {
    if (this.transformUndoStack.length > 0) {
      const transformEntry = this.transformUndoStack.pop()!;
      this.applyTransformMatrix(transformEntry.inverseMatrix, transformEntry.scope);
      const fwd = transformEntry.inverseMatrix.clone().invert();
      this.transformRedoStack.push({
        scope: transformEntry.scope,
        forwardMatrix: fwd,
        layerId: transformEntry.layerId,
      });
      this.notifyHistory();
      return true;
    }

    if (this.undoStack.length === 0) {
      return this.uvEngine.undo();
    }

    const lastAction = this.undoStack.pop()!;
    this.redoStack.push(lastAction);

    if (lastAction.type === 'create') {
      // Undoing a create -> remove the meshes
      for (const desc of lastAction.strokes) {
        const entry = this.strokes.get(desc.id);
        if (entry) {
          entry.meshes.forEach((m) => {
            this.strokeRoot.remove(m);
            m.geometry.dispose();
          });
          this.strokes.delete(desc.id);
        }
      }
    } else if (lastAction.type === 'erase') {
      // Undoing an erase -> restore the purged strokes
      for (const strokeDesc of lastAction.strokes) {
        const meshes: THREE.Mesh[] = [];
        const mat = this.materialCache.getStrokeMaterial(strokeDesc.settings, true, 1.0);
        const geom = this.beadGenerator.generateGeometry(strokeDesc.points, strokeDesc.settings, this.targetMeshes);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.renderOrder = 5;
        this.strokeRoot.add(mesh);
        meshes.push(mesh);
        this.strokes.set(strokeDesc.id, { descriptor: strokeDesc, meshes });
      }
    }

    this.notifyHistory();
    return true;
  }

  /**
   * Redo undone stroke, vacuum erase, or transform operation
   */
  public redo(layers: Layer[]): boolean {
    if (this.transformRedoStack.length > 0) {
      const redoEntry = this.transformRedoStack.pop()!;
      this.applyTransformMatrix(redoEntry.forwardMatrix, redoEntry.scope);
      const inv = redoEntry.forwardMatrix.clone().invert();
      this.transformUndoStack.push({
        scope: redoEntry.scope,
        inverseMatrix: inv,
        layerId: redoEntry.layerId,
      });
      this.notifyHistory();
      return true;
    }

    if (this.redoStack.length === 0) {
      return this.uvEngine.redo();
    }

    const action = this.redoStack.pop()!;
    this.undoStack.push(action);

    if (action.type === 'create') {
      // Redoing a create -> reconstruct meshes
      for (const strokeDesc of action.strokes) {
        const layer = layers.find((l) => l.id === strokeDesc.layerId);
        const layerOpacity = layer ? layer.opacity : 1.0;
        const layerVisible = layer ? layer.visible : true;

        const meshes: THREE.Mesh[] = [];
        const layerBlendMode = layer ? layer.blendMode || 'normal' : 'normal';
        const mat = this.materialCache.getStrokeMaterial(strokeDesc.settings, true, layerOpacity, layerBlendMode);
        const geom = this.beadGenerator.generateGeometry(strokeDesc.points, strokeDesc.settings, this.targetMeshes);
        const mesh = new THREE.Mesh(geom, mat);
        mesh.visible = layerVisible;
        mesh.renderOrder = 5;
        this.strokeRoot.add(mesh);
        meshes.push(mesh);

        this.strokes.set(strokeDesc.id, { descriptor: strokeDesc, meshes });
      }
    } else if (action.type === 'erase') {
      // Redoing an erase -> remove meshes again
      for (const desc of action.strokes) {
        const entry = this.strokes.get(desc.id);
        if (entry) {
          entry.meshes.forEach((m) => {
            this.strokeRoot.remove(m);
            m.geometry.dispose();
          });
          this.strokes.delete(desc.id);
        }
      }
    }

    this.notifyHistory();
    return true;
  }

  /**
   * Sets the active layer for subsequent strokes
   */
  public setActiveLayer(layerId: string, opacity: number = 1.0): void {
    this.activeLayerId = layerId;
    this.activeLayerOpacity = opacity;
    this.uvEngine?.setActiveLayer(layerId);
  }

  public getActiveLayerId(): string {
    return this.activeLayerId;
  }

  /**
   * Re-renders all layers with recursive hierarchy inheritance for opacity, visibility, and GPU blend mode
   */
  public syncLayers(layers: Layer[]): void {
    this.currentLayers = [...layers];
    const layerMap = new Map(layers.map((l) => [l.id, l]));

    // Compute effective hierarchy properties (inheriting visibility and opacity from parent groups)
    const getEffectiveState = (layer: Layer): { visible: boolean; opacity: number; locked: boolean; blendMode: LayerBlendMode } => {
      let curr: Layer | undefined = layer;
      let effVisible = layer.visible;
      let effOpacity = layer.opacity;
      let effLocked = layer.locked;
      const effBlendMode = layer.blendMode || 'normal';

      const visited = new Set<string>();
      while (curr && curr.parentId && !visited.has(curr.parentId)) {
        visited.add(curr.parentId);
        const parent = layerMap.get(curr.parentId);
        if (!parent) break;
        effVisible = effVisible && parent.visible;
        effOpacity = effOpacity * parent.opacity;
        effLocked = effLocked || parent.locked;
        curr = parent;
      }

      return { visible: effVisible, opacity: effOpacity, locked: effLocked, blendMode: effBlendMode };
    };

    this.strokes.forEach(({ descriptor, meshes }) => {
      const layer = layerMap.get(descriptor.layerId);
      if (layer) {
        const state = getEffectiveState(layer);
        const mat = this.materialCache.getStrokeMaterial(
          descriptor.settings,
          true,
          state.opacity,
          state.blendMode
        );
        meshes.forEach((m) => {
          m.visible = state.visible;
          m.material = mat;
        });
      }
    });

    // Run GPU-accelerated layer compositor for UV textures
    if (this.uvEngine) {
      this.uvEngine.compositeLayers(layers);
    }
  }

  /**
   * Merges top layer into the layer below it across 3D strokes and GPU UV canvas
   */
  public mergeLayerDown(topLayerId: string, bottomLayerId: string, topOpacity: number, topBlendMode: LayerBlendMode = 'normal'): void {
    // Re-assign strokes belonging to top layer to bottom layer
    this.strokes.forEach(({ descriptor }) => {
      if (descriptor.layerId === topLayerId) {
        descriptor.layerId = bottomLayerId;
      }
    });

    // Merge UV painting textures
    if (this.uvEngine) {
      this.uvEngine.mergeLayerDown(topLayerId, bottomLayerId, topOpacity, topBlendMode);
    }
  }

  /**
   * Clear all strokes
   */
  public clearAllStrokes(): void {
    // 1. Cancel in-progress strokes & clear active arrays
    this.cancelStroke();
    this.activePoints = [];
    this.activeStrokeMeshes = [];
    this.activeStrokeBatch = [];
    this.isDrawing = false;
    this.lastCapturePoint = null;
    this.lastScreenCoords = null;
    this.lastHitMesh = null;
    this.strokeSmoother.reset();

    // 2. Dispose meshes tracked in strokes map
    this.strokes.forEach(({ meshes }) => {
      meshes.forEach((m) => {
        this.strokeRoot.remove(m);
        if (m.geometry) {
          try { m.geometry.dispose(); } catch (_) {}
        }
        if (m.material) {
          try {
            if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
            else m.material.dispose();
          } catch (_) {}
        }
      });
    });
    this.strokes.clear();

    // 3. Purge all child meshes from strokeRoot completely
    while (this.strokeRoot.children.length > 0) {
      const child = this.strokeRoot.children[0];
      this.strokeRoot.remove(child);
      if ((child as any).geometry) {
        try { (child as any).geometry.dispose(); } catch (_) {}
      }
      if ((child as any).material) {
        try {
          if (Array.isArray((child as any).material)) {
            (child as any).material.forEach((mat: any) => mat.dispose());
          } else {
            (child as any).material.dispose();
          }
        } catch (_) {}
      }
    }

    // 4. Reset history stacks
    this.undoStack = [];
    this.redoStack = [];
    this.transformUndoStack = [];
    this.transformRedoStack = [];

    // 5. Clear dynamic UV canvas & history
    if (this.uvEngine) {
      this.uvEngine.clearCanvas();
      this.uvEngine.resetHistory();
    }

    this.notifyHistory();
  }

  /**
   * Delete strokes belonging to a specific layer
   */
  public deleteLayerStrokes(layerId: string): void {
    const toDelete: string[] = [];
    this.strokes.forEach(({ descriptor, meshes }, id) => {
      if (descriptor.layerId === layerId) {
        meshes.forEach((m) => {
          this.strokeRoot.remove(m);
          m.geometry.dispose();
        });
        toDelete.push(id);
      }
    });
    toDelete.forEach((id) => this.strokes.delete(id));
    this.undoStack = this.undoStack.filter((batch) => !batch.strokes.some((s) => s.layerId === layerId));
    this.redoStack = this.redoStack.filter((batch) => !batch.strokes.some((s) => s.layerId === layerId));
    this.notifyHistory();
  }

  /**
   * Recalculates and smooths mesh normals across stroke geometries and 3D model meshes,
   * ensuring that shading looks smooth and uncreased even after heavy paint accumulation.
   */
  public recalculateMeshNormals(layerId?: string): number {
    let count = 0;

    // Recalculate and update normals on stroke meshes
    this.strokes.forEach(({ descriptor, meshes }) => {
      if (!layerId || descriptor.layerId === layerId) {
        meshes.forEach((mesh) => {
          if (mesh.geometry) {
            mesh.geometry.computeVertexNormals();
            if (mesh.geometry.attributes.normal) {
              mesh.geometry.attributes.normal.needsUpdate = true;
            }
            count++;
          }
        });
      }
    });

    // Ensure target 3D meshes have computed normals
    this.targetMeshes.forEach((mesh) => {
      if (mesh.geometry) {
        mesh.geometry.computeVertexNormals();
        if (mesh.geometry.attributes.normal) {
          mesh.geometry.attributes.normal.needsUpdate = true;
        }
      }
    });

    this.onAutoSaveTrigger?.('normals_recalculated');
    return count;
  }

  /**
   * Clear current 3D Model and all associated strokes, optionally restoring the drawing plane canvas
   */
  public clearModel(restoreDrawingPlane: boolean = false): void {
    // 1. Cancel in-progress strokes & purge all paint
    this.clearAllStrokes();

    // 2. Remove all model children from modelRoot except strokeRoot
    const toRemove: THREE.Object3D[] = [];
    this.modelRoot.children.forEach((child) => {
      if (child !== this.strokeRoot) {
        toRemove.push(child);
      }
    });

    toRemove.forEach((child) => {
      this.modelRoot.remove(child);
      child.traverse((c: any) => {
        if (c.geometry) {
          try { c.geometry.dispose(); } catch (_) {}
        }
        if (c.material) {
          try {
            if (Array.isArray(c.material)) c.material.forEach((m: any) => m.dispose());
            else c.material.dispose();
          } catch (_) {}
        }
      });
    });

    this.drawingPlaneMesh = null;
    this.targetMeshes = [];
    this.modelRoot.position.set(0, 0, 0);
    this.modelRoot.rotation.set(0, 0, 0);
    this.modelRoot.scale.set(1, 1, 1);
    this.modelRoot.updateMatrixWorld(true);

    // 3. Restore clean, well-lit default drawing plane canvas only if requested
    if (restoreDrawingPlane) {
      this.setupDefaultDrawingPlane();
    }

    // Dispatch MODEL_CLEARED event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('MODEL_CLEARED'));
    }
    this.activeSelectedModelId = null;
    this.notifyModelsChanged();
  }

  /**
   * Spawns a sleek, double-sided 3D drawing plane on canvas load,
   * allowing instant sketching and brush stroke adhesion without requiring imported meshes.
   */
  public setupDefaultDrawingPlane(
    width: number = 3.6,
    height: number = 3.6,
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  ): THREE.Mesh {
    this.ensureBaselineLighting();

    const existing = this.modelRoot.getObjectByName('DrawingPlaneCanvas');
    if (existing && existing instanceof THREE.Mesh) {
      this.drawingPlaneMesh = existing;
      if (!this.targetMeshes.includes(existing)) {
        this.targetMeshes = [existing];
      }
      this.notifyModelsChanged();
      return existing;
    }

    const planeGeom = new THREE.PlaneGeometry(width, height, 32, 32);
    planeGeom.computeVertexNormals();
    planeGeom.computeBoundingBox();
    planeGeom.computeBoundingSphere();
    try {
      if (typeof (planeGeom as any).computeBoundsTree === 'function') {
        (planeGeom as any).computeBoundsTree();
      }
    } catch (_) {}

    // Procedural hi-res grid canvas texture with clean slate-50 background
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Clean, bright white canvas surface with crisp grid lines
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1024, 1024);

      // Fine grid subdivisions
      ctx.strokeStyle = '#e2e8f0'; // slate-200
      ctx.lineWidth = 2;
      const step = 1024 / 32;
      for (let x = 0; x <= 1024; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
      }
      for (let y = 0; y <= 1024; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }

      // Major grid lines (every 4 divisions)
      ctx.strokeStyle = '#94a3b8'; // slate-400
      ctx.lineWidth = 3;
      const majorStep = step * 4;
      for (let x = 0; x <= 1024; x += majorStep) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
      }
      for (let y = 0; y <= 1024; y += majorStep) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }

      // Center Origin Crosshair (Amber)
      ctx.strokeStyle = '#f59e0b'; // amber-500
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(512 - 50, 512);
      ctx.lineTo(512 + 50, 512);
      ctx.moveTo(512, 512 - 50);
      ctx.lineTo(512, 512 + 50);
      ctx.stroke();

      // Outer bezel border
      ctx.strokeStyle = '#64748b'; // slate-500
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, 1016, 1016);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const planeMat = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: false,
      depthWrite: true,
    });
    MaterialCache.configureModelMaterial(planeMat);

    const planeMesh = new THREE.Mesh(planeGeom, planeMat);
    planeMesh.name = 'DrawingPlaneCanvas';
    planeMesh.userData.isDrawingPlane = true;
    planeMesh.userData.isDefaultCanvas = true;
    planeMesh.position.copy(position);
    planeMesh.rotation.x = -Math.PI / 2; // Lay flat on the ground
    planeMesh.receiveShadow = true;

    // Edge highlight border
    const edges = new THREE.EdgesGeometry(planeGeom);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.name = 'DrawingPlaneWireframe';
    planeMesh.add(wireframe);

    this.modelRoot.add(planeMesh);
    this.drawingPlaneMesh = planeMesh;
    this.targetMeshes = [planeMesh];

    const stats = PrimitiveGenerator.calculateStats(planeGeom);
    this.modelMetadata = {
      name: 'Drawing Canvas',
      vertexCount: stats.vertices,
      triangleCount: stats.triangles,
      meshCount: 1,
      dimensions: new THREE.Vector3(width, height, 0.01),
      hasUVs: true,
    };

    if (this.onMetadataUpdate) {
      this.onMetadataUpdate(this.modelMetadata);
    }

    this.notifyModelsChanged();
    return planeMesh;
  }

  public notifyModelsChanged(): void {
    const list = this.getLoadedModels();
    if (this.onModelsChanged) {
      this.onModelsChanged(list);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('MODELS_CHANGED', { detail: list }));
    }
  }

  public getLoadedModels(): LoadedModelInfo[] {
    const models: LoadedModelInfo[] = [];
    this.modelRoot.children.forEach((child, index) => {
      if (child === this.strokeRoot) return;
      let meshCount = 0;
      child.traverse((c) => {
        if (c instanceof THREE.Mesh) meshCount++;
      });
      const isDrawingPlane = child === this.drawingPlaneMesh || child.name === 'DrawingPlaneCanvas';
      const name = child.name || (isDrawingPlane ? 'Drawing Canvas' : `3D Model ${index + 1}`);
      models.push({
        id: child.uuid,
        name,
        meshCount: Math.max(1, meshCount),
        visible: child.visible,
        isDrawingPlane,
      });
    });
    return models;
  }

  public setActiveSelectedModel(modelId: string | null): void {
    this.activeSelectedModelId = modelId;
  }

  public getActiveSelectedModelId(): string | null {
    return this.activeSelectedModelId;
  }

  public getDrawingPlane(): THREE.Mesh | null {
    return this.drawingPlaneMesh;
  }

  public toggleDrawingPlane(visible?: boolean): boolean {
    if (!this.drawingPlaneMesh) {
      this.setupDefaultDrawingPlane();
      return true;
    }
    const nextVis = visible !== undefined ? visible : !this.drawingPlaneMesh.visible;
    this.drawingPlaneMesh.visible = nextVis;
    if (nextVis && !this.targetMeshes.includes(this.drawingPlaneMesh)) {
      this.targetMeshes.push(this.drawingPlaneMesh);
    } else if (!nextVis) {
      this.targetMeshes = this.targetMeshes.filter((m) => m !== this.drawingPlaneMesh);
    }
    return nextVis;
  }

  /**
   * Copies stroke curves belonging to the target layer (or all curves) to memory clipboard
   */
  public copyStrokes(layerId?: string): number {
    const targetId = layerId || this.activeLayerId;
    const copied: StrokeDescriptor[] = [];

    this.strokes.forEach(({ descriptor }) => {
      if (!targetId || descriptor.layerId === targetId) {
        copied.push({
          ...descriptor,
          points: descriptor.points.map((p) => ({
            position: p.position.clone(),
            normal: p.normal.clone(),
            pressure: p.pressure,
            tangent: p.tangent ? p.tangent.clone() : undefined,
            surfaceOffset: p.surfaceOffset,
            time: p.time,
            isSurfaceHit: p.isSurfaceHit,
            uv: p.uv ? p.uv.clone() : undefined,
            hitMeshId: p.hitMeshId,
          })),
          settings: { ...descriptor.settings },
        });
      }
    });

    this.clipboardStrokes = copied;
    return copied.length;
  }

  /**
   * Pastes copied curves with a subtle spatial offset into the scene and registers into Undo history
   */
  public pasteStrokes(
    targetLayerId?: string,
    offset: THREE.Vector3 = new THREE.Vector3(0.08, 0.08, 0.02)
  ): number {
    if (this.clipboardStrokes.length === 0) return 0;
    const layerId = targetLayerId || this.activeLayerId;
    const newBatch: StrokeDescriptor[] = [];

    for (const orig of this.clipboardStrokes) {
      const newId = 'stroke_copy_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newPoints = orig.points.map((p) => ({
        position: p.position.clone().add(offset),
        normal: p.normal.clone(),
        pressure: p.pressure,
        tangent: p.tangent ? p.tangent.clone() : undefined,
        surfaceOffset: p.surfaceOffset,
        time: performance.now(),
        isSurfaceHit: p.isSurfaceHit,
        uv: p.uv ? p.uv.clone() : undefined,
        hitMeshId: p.hitMeshId,
      }));

      const desc: StrokeDescriptor = {
        id: newId,
        layerId,
        tool: orig.tool,
        points: newPoints,
        settings: { ...orig.settings },
        createdAt: Date.now(),
      };

      const mat = this.materialCache.getStrokeMaterial(desc.settings, true, this.activeLayerOpacity);
      const geom = this.beadGenerator.generateGeometry(newPoints, desc.settings, this.targetMeshes);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.renderOrder = 5;
      this.strokeRoot.add(mesh);

      this.strokes.set(newId, { descriptor: desc, meshes: [mesh] });
      newBatch.push(desc);
    }

    if (newBatch.length > 0) {
      this.undoStack.push({
        type: 'create',
        strokes: newBatch,
      });
      this.redoStack = [];
      this.notifyHistory();
    }

    return newBatch.length;
  }

  public getClipboardCount(): number {
    return this.clipboardStrokes.length;
  }

  public setNavigatorSensitivity(s: number): void {
    this.navigatorSensitivity = Math.max(0.1, Math.min(3.0, s));
  }

  public getNavigatorSensitivity(): number {
    return this.navigatorSensitivity;
  }

  /**
   * Raycast against stroke meshes to select a stroke by pointer
   */
  public raycastStroke(screenX: number, screenY: number): string | null {
    const coords = new THREE.Vector2(screenX, screenY);
    this.raycaster.setFromCamera(coords, this.camera);

    const strokeMeshes: THREE.Mesh[] = [];
    const meshToStrokeId = new Map<THREE.Mesh, string>();

    this.strokes.forEach(({ meshes }, strokeId) => {
      for (const m of meshes) {
        strokeMeshes.push(m);
        meshToStrokeId.set(m, strokeId);
      }
    });

    if (strokeMeshes.length === 0) return null;

    const intersects = this.raycaster.intersectObjects(strokeMeshes, true);
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      return meshToStrokeId.get(hitMesh) || null;
    }
    return null;
  }

  /**
   * Set currently selected stroke and highlight it
   */
  public selectStroke(strokeId: string | null): StrokeDescriptor | null {
    this.selectedStrokeId = strokeId;

    // Clear old highlight
    if (this.selectionHighlightGroup) {
      this.helperRoot.remove(this.selectionHighlightGroup);
      this.selectionHighlightGroup.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
          else child.material.dispose();
        }
      });
      this.selectionHighlightGroup = null;
    }

    if (!strokeId) {
      this.onStrokeSelected?.(null);
      return null;
    }

    const stroke = this.strokes.get(strokeId);
    if (!stroke) {
      this.selectedStrokeId = null;
      this.onStrokeSelected?.(null);
      return null;
    }

    // Build bounding highlight box
    const group = new THREE.Group();
    const box = new THREE.Box3();
    for (const m of stroke.meshes) {
      m.geometry.computeBoundingBox();
      if (m.geometry.boundingBox) {
        const meshBox = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
        box.union(meshBox);
      }
    }

    if (!box.isEmpty()) {
      const helper = new THREE.Box3Helper(box, new THREE.Color(0x38bdf8));
      (helper.material as THREE.LineBasicMaterial).depthTest = false;
      group.add(helper);
      this.selectionHighlightGroup = group;
      this.helperRoot.add(group);
    }

    this.onStrokeSelected?.(stroke.descriptor);
    return stroke.descriptor;
  }

  public getSelectedStrokeId(): string | null {
    return this.selectedStrokeId;
  }

  public getSelectedStroke(): StrokeDescriptor | null {
    if (!this.selectedStrokeId) return null;
    const entry = this.strokes.get(this.selectedStrokeId);
    return entry ? entry.descriptor : null;
  }

  public deleteSelectedStroke(): boolean {
    if (!this.selectedStrokeId) return false;
    const stroke = this.strokes.get(this.selectedStrokeId);
    if (!stroke) return false;

    for (const m of stroke.meshes) {
      if (m.parent) m.parent.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach((mat: any) => mat.dispose());
        else m.material.dispose();
      }
    }

    this.undoStack.push({
      type: 'erase',
      strokes: [stroke.descriptor],
    });
    this.redoStack = [];

    this.strokes.delete(this.selectedStrokeId);
    this.selectStroke(null);
    this.notifyHistory();
    return true;
  }

  public getLayersSnapshot(): Layer[] {
    return this.currentLayers;
  }

  /**
   * Recreates a stroke mesh from its descriptor and registers it
   */
  public recreateStrokeFromDescriptor(desc: StrokeDescriptor): void {
    if (!desc || !desc.points || desc.points.length === 0) return;

    // Convert raw points to Three.js Vector3 instances if needed
    const parsedPoints: StrokePoint[] = desc.points.map((p) => {
      const pos = (p.position as any) instanceof THREE.Vector3
        ? (p.position as unknown as THREE.Vector3)
        : new THREE.Vector3((p.position as any)?.x ?? 0, (p.position as any)?.y ?? 0, (p.position as any)?.z ?? 0);
      const norm = (p.normal as any) instanceof THREE.Vector3
        ? (p.normal as unknown as THREE.Vector3)
        : new THREE.Vector3((p.normal as any)?.x ?? 0, (p.normal as any)?.y ?? 1, (p.normal as any)?.z ?? 0);
      const tan = p.tangent
        ? ((p.tangent as any) instanceof THREE.Vector3
          ? (p.tangent as unknown as THREE.Vector3)
          : new THREE.Vector3((p.tangent as any)?.x ?? 0, (p.tangent as any)?.y ?? 0, (p.tangent as any)?.z ?? 0))
        : undefined;

      return {
        ...p,
        position: pos,
        normal: norm,
        tangent: tan,
      };
    });

    const mat = this.materialCache.getStrokeMaterial(desc.settings, true, this.activeLayerOpacity);
    const geom = this.beadGenerator.generateGeometry(parsedPoints, desc.settings, this.targetMeshes);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.renderOrder = 5;
    this.strokeRoot.add(mesh);

    this.strokes.set(desc.id, {
      descriptor: {
        ...desc,
        points: parsedPoints,
      },
      meshes: [mesh],
    });
  }

  /**
   * Export all strokes, layers, scene environment and camera data as ProjectSaveData
   */
  public exportProjectData(projectName: string = 'Remix 3D Project', explicitLayers?: Layer[]): ProjectSaveData {
    const allStrokes: StrokeDescriptor[] = [];
    this.strokes.forEach(({ descriptor }) => {
      allStrokes.push({
        ...descriptor,
        points: descriptor.points.map((p) => ({
          ...p,
          position: { x: p.position.x, y: p.position.y, z: p.position.z } as any,
          normal: { x: p.normal.x, y: p.normal.y, z: p.normal.z } as any,
          tangent: p.tangent ? ({ x: p.tangent.x, y: p.tangent.y, z: p.tangent.z } as any) : undefined,
        })),
      });
    });

    const project: ProjectSaveData = {
      version: '14.0.0',
      name: projectName,
      timestamp: Date.now(),
      camera: {
        position: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
        target: [this.cameraTarget.x, this.cameraTarget.y, this.cameraTarget.z],
        fov: this.camera.fov,
        spherical: {
          radius: this.cameraSpherical.radius,
          theta: this.cameraSpherical.theta,
          phi: this.cameraSpherical.phi,
        },
      },
      layers: explicitLayers && explicitLayers.length > 0 ? explicitLayers : this.getLayersSnapshot(),
      strokes: allStrokes,
      activeModelName: this.activeModelName,
      showGrid: this.gridHelper?.visible ?? true,
      showWireframe: this.modelWireframeOpacity > 0,
    };
    return project;
  }

  /**
   * Export project to downloadable .remix3d JSON file
   */
  public exportProjectFile(filename: string = 'project.remix3d'): void {
    const data = this.exportProjectData(filename.replace('.remix3d', ''));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.remix3d') ? filename : `${filename}.remix3d`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import project from ProjectSaveData and recreate all strokes & layers
   */
  public importProjectData(project: ProjectSaveData): void {
    if (!project) return;

    // 1. Clear existing strokes
    this.strokes.forEach(({ meshes }) => {
      meshes.forEach((m) => {
        if (m.parent) m.parent.remove(m);
        m.geometry.dispose();
      });
    });
    this.strokes.clear();
    this.undoStack = [];
    this.redoStack = [];
    this.selectStroke(null);

    // 2. Restore camera if available
    if (project.camera) {
      if (project.camera.target) {
        this.cameraTarget.set(project.camera.target[0], project.camera.target[1], project.camera.target[2]);
      }
      if (project.camera.position) {
        this.camera.position.set(project.camera.position[0], project.camera.position[1], project.camera.position[2]);
        this.camera.lookAt(this.cameraTarget);
      }
      if (project.camera.fov) {
        this.camera.fov = project.camera.fov;
        this.camera.updateProjectionMatrix();
      }
      if (project.camera.spherical) {
        this.cameraSpherical.set(
          project.camera.spherical.radius,
          project.camera.spherical.phi,
          project.camera.spherical.theta
        );
        this.targetSpherical.copy(this.cameraSpherical);
      }
    }

    // 3. Rebuild strokes
    if (Array.isArray(project.strokes)) {
      for (const desc of project.strokes) {
        this.recreateStrokeFromDescriptor(desc);
      }
    }

    this.notifyHistory();
    this.onAutoSaveTrigger?.('project_loaded');
  }

  /**
   * Spherical Orbit Controls
   */
  public orbit(deltaX: number, deltaY: number): void {
    const rotSpeed = 0.006 * this.navigatorSensitivity;
    this.targetSpherical.theta -= deltaX * rotSpeed;
    this.targetSpherical.phi -= deltaY * rotSpeed;

    // Restrict polar angle to avoid flipping
    const eps = 0.01;
    this.targetSpherical.phi = Math.max(eps, Math.min(Math.PI - eps, this.targetSpherical.phi));
  }

  public pan(deltaX: number, deltaY: number): void {
    const panSpeed = 0.0025 * (this.cameraSpherical.radius / 3.0);
    const forward = this.camera.getWorldDirection(new THREE.Vector3());
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    this.targetPosition.addScaledVector(right, -deltaX * panSpeed);
    this.targetPosition.addScaledVector(up, deltaY * panSpeed);
  }

  public zoom(deltaDistance: number): void {
    const zoomSpeed = 0.0015;
    this.targetSpherical.radius += deltaDistance * zoomSpeed * this.targetSpherical.radius;
    this.targetSpherical.radius = Math.max(0.4, Math.min(25.0, this.targetSpherical.radius));
  }

  public getCameraSpherical(): { radius: number; theta: number; phi: number } {
    return {
      radius: this.cameraSpherical.radius,
      theta: this.cameraSpherical.theta,
      phi: this.cameraSpherical.phi,
    };
  }

  public orbitCamera(deltaTheta: number, deltaPhi: number): void {
    this.targetSpherical.theta += deltaTheta;
    this.targetSpherical.phi += deltaPhi;
    const eps = 0.001;
    this.targetSpherical.phi = Math.max(eps, Math.min(Math.PI - eps, this.targetSpherical.phi));
  }

  public setCameraView(theta: number, phi: number, radius?: number): void {
    this.targetSpherical.theta = theta;
    this.targetSpherical.phi = Math.max(0.001, Math.min(Math.PI - 0.001, phi));
    if (radius !== undefined) {
      this.targetSpherical.radius = radius;
    }
  }

  public zoomCamera(deltaRadius: number): void {
    this.targetSpherical.radius = Math.max(0.4, Math.min(25.0, this.targetSpherical.radius + deltaRadius));
  }

  public updateGuide(guide: Guide3D | null): void {
    if (!guide || guide.opacity <= 0) {
      if (this.guideHelperMesh) {
        this.guideHelperMesh.visible = false;
      }
      return;
    }

    if (!this.guideHelperMesh) {
      const geom = new THREE.PlaneGeometry(3, 3, 10, 10);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: guide.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.guideHelperMesh = new THREE.Mesh(geom, mat);
      this.helperRoot.add(this.guideHelperMesh);
    }

    this.guideHelperMesh.visible = guide.opacity > 0;
    (this.guideHelperMesh.material as THREE.MeshBasicMaterial).opacity = guide.opacity;

    if (guide.originPoint) {
      this.guideHelperMesh.position.set(guide.originPoint.x, guide.originPoint.y, guide.originPoint.z);
    }
    if (guide.rotation) {
      this.guideHelperMesh.rotation.set(guide.rotation.x, guide.rotation.y, guide.rotation.z);
    }
  }

  public resetView(): void {
    const maxDim = Math.max(this.modelMetadata.dimensions.x, this.modelMetadata.dimensions.y, this.modelMetadata.dimensions.z, 1.0);
    this.targetSpherical.radius = maxDim * 2.2;
    this.targetSpherical.theta = Math.PI / 4;
    this.targetSpherical.phi = Math.PI / 2.3;
    this.targetPosition.set(0, 0, 0);
  }

  // ==========================================
  // TRANSFORM JOYSTICK & SPATIAL ENGINE
  // ==========================================

  /**
   * Calculates the geometric bounding center of the targeted selection (model, strokes, or active layer)
   */
  public getSelectionCenter(scope: TransformTargetScope = 'all'): THREE.Vector3 {
    const box = new THREE.Box3();
    let hasContent = false;

    if (scope === 'model' || scope === 'all') {
      if (scope === 'model' && this.activeSelectedModelId) {
        const targetModel = this.modelRoot.children.find((c) => c.uuid === this.activeSelectedModelId);
        if (targetModel) {
          box.setFromObject(targetModel);
          if (!box.isEmpty()) hasContent = true;
        }
      } else if (this.targetMeshes.length > 0) {
        box.setFromObject(this.modelRoot);
        if (!box.isEmpty()) hasContent = true;
      }
    }

    if (scope === 'strokes' || scope === 'all') {
      if (this.strokes.size > 0) {
        const strokeBox = new THREE.Box3().setFromObject(this.strokeRoot);
        if (!strokeBox.isEmpty()) {
          if (hasContent) {
            box.union(strokeBox);
          } else {
            box.copy(strokeBox);
            hasContent = true;
          }
        }
      }
    }

    if (scope === 'active_layer') {
      const layerBox = new THREE.Box3();
      let layerFound = false;
      this.strokes.forEach(({ descriptor, meshes }) => {
        if (descriptor.layerId === this.activeLayerId) {
          meshes.forEach((m) => {
            layerBox.expandByObject(m);
            layerFound = true;
          });
        }
      });
      if (layerFound && !layerBox.isEmpty()) {
        box.copy(layerBox);
        hasContent = true;
      }
    }

    if (!hasContent || box.isEmpty()) {
      return this.cameraTarget.clone();
    }

    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }

  /**
   * Computes the 3D world anchor that corresponds precisely to the exact screen center crosshair
   */
  public getScreenCenterWorldAnchor(targetCenter?: THREE.Vector3): THREE.Vector3 {
    const center = targetCenter || this.getSelectionCenter(this.transformActiveScope);
    const camDir = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir, center);
    const ray = new THREE.Ray(this.camera.position, camDir);
    const anchor = new THREE.Vector3();
    const hit = ray.intersectPlane(plane, anchor);
    return hit ? anchor : center.clone();
  }

  /**
   * Begins a continuous transformation gesture, tracking undo state
   */
  public beginTransform(scope: TransformTargetScope = 'all'): void {
    this.transformActiveScope = scope;
    this.currentTransformTotalMatrix.identity();
  }

  /**
   * Concludes a transformation gesture and commits undo state
   */
  public endTransform(): void {
    if (!this.currentTransformTotalMatrix.equals(new THREE.Matrix4())) {
      const inv = this.currentTransformTotalMatrix.clone().invert();
      const fwd = this.currentTransformTotalMatrix.clone();
      this.transformUndoStack.push({
        scope: this.transformActiveScope,
        inverseMatrix: inv,
        layerId: this.activeLayerId,
      });
      this.transformRedoStack = [];
      this.notifyHistory();
    }
  }

  /**
   * Applies an arbitrary 4x4 matrix transformation across target meshes, strokes, and descriptors
   */
  public applyTransformMatrix(matrix: THREE.Matrix4, scope: TransformTargetScope = 'all'): void {
    this.currentTransformTotalMatrix.premultiply(matrix);

    if (scope === 'model') {
      if (this.activeSelectedModelId) {
        const targetModel = this.modelRoot.children.find((c) => c.uuid === this.activeSelectedModelId);
        if (targetModel) {
          targetModel.applyMatrix4(matrix);
          targetModel.updateMatrixWorld(true);
          targetModel.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
              child.geometry.computeBoundingSphere();
              child.geometry.computeBoundingBox();
            }
          });
        }
      } else {
        this.modelRoot.applyMatrix4(matrix);
        this.modelRoot.updateMatrixWorld(true);
        this.targetMeshes.forEach((mesh) => {
          if (mesh.geometry) {
            mesh.geometry.computeBoundingSphere();
            mesh.geometry.computeBoundingBox();
          }
        });
      }
    } else if (scope === 'all') {
      this.modelRoot.applyMatrix4(matrix);
      this.modelRoot.updateMatrixWorld(true);
      this.targetMeshes.forEach((mesh) => {
        if (mesh.geometry) {
          mesh.geometry.computeBoundingSphere();
          mesh.geometry.computeBoundingBox();
        }
      });
      // strokeRoot is already a child of modelRoot, so child meshes transform together.
      // Update descriptor points for geometry export / raycasting synchronization
      this.strokes.forEach(({ descriptor }) => {
        descriptor.points.forEach((p) => {
          p.position.applyMatrix4(matrix);
          p.normal.transformDirection(matrix).normalize();
        });
      });
    } else if (scope === 'strokes') {
      this.strokeRoot.applyMatrix4(matrix);
      this.strokeRoot.updateMatrixWorld(true);
      this.strokes.forEach(({ descriptor }) => {
        descriptor.points.forEach((p) => {
          p.position.applyMatrix4(matrix);
          p.normal.transformDirection(matrix).normalize();
        });
      });
    } else if (scope === 'active_layer') {
      let transformedAny = false;
      this.strokes.forEach(({ descriptor, meshes }) => {
        if (descriptor.layerId === this.activeLayerId) {
          transformedAny = true;
          meshes.forEach((mesh) => {
            mesh.applyMatrix4(matrix);
            mesh.updateMatrixWorld(true);
          });
          descriptor.points.forEach((p) => {
            p.position.applyMatrix4(matrix);
            p.normal.transformDirection(matrix).normalize();
          });
        }
      });
      // Fallback: If no strokes exist in the active layer, transform modelRoot so navigator remains fully functional
      if (!transformedAny) {
        this.modelRoot.applyMatrix4(matrix);
        this.modelRoot.updateMatrixWorld(true);
        this.targetMeshes.forEach((mesh) => {
          if (mesh.geometry) {
            mesh.geometry.computeBoundingSphere();
            mesh.geometry.computeBoundingBox();
          }
        });
      }
    }
  }

  /**
   * 2D Screen-Space Planar Translation:
   * Moves selection parallel to the current camera view plane with 1:1 screen-to-world mapping.
   */
  public translateScreenSpace(
    deltaScreenX: number,
    deltaScreenY: number,
    scope: TransformTargetScope = 'all',
    isLocked: boolean = false
  ): void {
    let dx = deltaScreenX;
    let dy = deltaScreenY;

    // Locked Constraints: Enforce strict orthogonal 4-way vector movement
    if (isLocked) {
      if (Math.abs(dx) > Math.abs(dy)) {
        dy = 0;
      } else {
        dx = 0;
      }
    }

    const targetCenter = this.getSelectionCenter(scope);
    const dist = Math.max(0.5, this.camera.position.distanceTo(targetCenter));
    const vHeight = 2 * dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const factor = (vHeight / (this.container?.clientHeight || 800)) * this.navigatorSensitivity;

    const forward = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const worldDelta = new THREE.Vector3()
      .addScaledVector(right, dx * factor)
      .addScaledVector(up, -dy * factor);

    const transMatrix = new THREE.Matrix4().makeTranslation(worldDelta.x, worldDelta.y, worldDelta.z);
    this.applyTransformMatrix(transMatrix, scope);
  }

  /**
   * 2D Screen-Space Scaling:
   * Anchored precisely to the exact center of the screen (crosshair).
   */
  public scaleScreenSpace(
    scaleFactorX: number,
    scaleFactorY: number,
    scope: TransformTargetScope = 'all',
    isLocked: boolean = false
  ): void {
    let sx = scaleFactorX;
    let sy = scaleFactorY;

    // Locked Constraints: Uniform proportions
    if (isLocked) {
      const avg = (sx + sy) / 2;
      sx = avg;
      sy = avg;
    }

    const sz = (sx + sy) / 2;
    const anchor = this.getScreenCenterWorldAnchor();

    const forward = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const rotMatrix = new THREE.Matrix4().makeBasis(right, up, forward.clone().negate());
    const rotInv = rotMatrix.clone().invert();

    const toAnchor = new THREE.Matrix4().makeTranslation(-anchor.x, -anchor.y, -anchor.z);
    const fromAnchor = new THREE.Matrix4().makeTranslation(anchor.x, anchor.y, anchor.z);
    const scaleMatrix = new THREE.Matrix4().makeScale(sx, sy, sz);

    const finalMat = new THREE.Matrix4()
      .multiply(fromAnchor)
      .multiply(rotMatrix)
      .multiply(scaleMatrix)
      .multiply(rotInv)
      .multiply(toAnchor);

    this.applyTransformMatrix(finalMat, scope);
  }

  /**
   * 2D Screen-Center Rotation:
   * Spins selection around the screen's center crosshair along the view axis.
   */
  public rotateScreenSpace(
    deltaAngleRad: number,
    scope: TransformTargetScope = 'all',
    isLocked: boolean = false
  ): void {
    let angle = deltaAngleRad * this.navigatorSensitivity;

    // Locked Constraints: Quantize into exact 15-degree increments (PI / 12)
    if (isLocked) {
      const step = Math.PI / 12;
      angle = Math.round(angle / step) * step;
      if (Math.abs(angle) < 0.0001) return;
    }

    const anchor = this.getScreenCenterWorldAnchor();
    const camDir = this.camera.getWorldDirection(new THREE.Vector3()).normalize();

    const toAnchor = new THREE.Matrix4().makeTranslation(-anchor.x, -anchor.y, -anchor.z);
    const fromAnchor = new THREE.Matrix4().makeTranslation(anchor.x, anchor.y, anchor.z);
    const rotMat = new THREE.Matrix4().makeRotationAxis(camDir, -angle);

    const finalMat = new THREE.Matrix4()
      .multiply(fromAnchor)
      .multiply(rotMat)
      .multiply(toAnchor);

    this.applyTransformMatrix(finalMat, scope);
  }

  /**
   * 3D Global Absolute Translation:
   * Dragging Red (X), Green (Y), or Blue (Z) moves object strictly along global axis.
   */
  public translateWorldAxis(
    axis: 'x' | 'y' | 'z',
    deltaWorld: number,
    scope: TransformTargetScope = 'all'
  ): void {
    const vec = new THREE.Vector3(
      axis === 'x' ? deltaWorld * this.navigatorSensitivity : 0,
      axis === 'y' ? deltaWorld * this.navigatorSensitivity : 0,
      axis === 'z' ? deltaWorld * this.navigatorSensitivity : 0
    );
    const transMat = new THREE.Matrix4().makeTranslation(vec.x, vec.y, vec.z);
    this.applyTransformMatrix(transMat, scope);
  }

  /**
   * 3D Global Axis Rotation:
   * Rotating Red (X), Green (Y), or Blue (Z) arcs spins around the object's geometric center.
   */
  public rotateWorldAxis(
    axis: 'x' | 'y' | 'z',
    deltaAngleRad: number,
    scope: TransformTargetScope = 'all',
    isLocked: boolean = false
  ): void {
    let angle = deltaAngleRad * this.navigatorSensitivity;
    if (isLocked) {
      const step = Math.PI / 12; // 15 degrees
      angle = Math.round(angle / step) * step;
      if (Math.abs(angle) < 0.0001) return;
    }

    const center = this.getSelectionCenter(scope);
    const axisVec = new THREE.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0
    );

    const toCenter = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
    const fromCenter = new THREE.Matrix4().makeTranslation(center.x, center.y, center.z);
    const rotMat = new THREE.Matrix4().makeRotationAxis(axisVec, angle);

    const finalMat = new THREE.Matrix4()
      .multiply(fromCenter)
      .multiply(rotMat)
      .multiply(toCenter);

    this.applyTransformMatrix(finalMat, scope);
  }

  /**
   * 3D Trackball Rotation:
   * Dragging central sphere enables freeform, non-linear rotation around object geometric center.
   */
  public rotateTrackball(
    deltaX: number,
    deltaY: number,
    scope: TransformTargetScope = 'all'
  ): void {
    const center = this.getSelectionCenter(scope);
    const rotSpeed = 0.005 * this.navigatorSensitivity;

    const forward = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    const qX = new THREE.Quaternion().setFromAxisAngle(up, deltaX * rotSpeed);
    const qY = new THREE.Quaternion().setFromAxisAngle(right, deltaY * rotSpeed);
    const deltaQ = qX.multiply(qY);

    const toCenter = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
    const fromCenter = new THREE.Matrix4().makeTranslation(center.x, center.y, center.z);
    const rotMat = new THREE.Matrix4().makeRotationFromQuaternion(deltaQ);

    const finalMat = new THREE.Matrix4()
      .multiply(fromCenter)
      .multiply(rotMat)
      .multiply(toCenter);

    this.applyTransformMatrix(finalMat, scope);
  }

  /**
   * Translates targeted objects along a specific 3D axis (wrapper for translateWorldAxis)
   */
  public translateAxis3D(
    axis: 'x' | 'y' | 'z',
    deltaWorld: number,
    scope: TransformTargetScope = 'all'
  ): void {
    this.translateWorldAxis(axis, deltaWorld, scope);
  }

  /**
   * Rotates targeted objects along a specific 3D axis (wrapper for rotateWorldAxis)
   */
  public rotateAxis3D(
    axis: 'x' | 'y' | 'z',
    deltaAngleRad: number,
    scope: TransformTargetScope = 'all',
    isLocked: boolean = false
  ): void {
    this.rotateWorldAxis(axis, deltaAngleRad, scope, isLocked);
  }

  /**
   * Scales targeted objects uniformly or along an axis around selection center
   */
  public scaleAxis3D(
    factor: number,
    scope: TransformTargetScope = 'all'
  ): void {
    const center = this.getSelectionCenter(scope);
    const toCenter = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
    const fromCenter = new THREE.Matrix4().makeTranslation(center.x, center.y, center.z);
    const scaleMat = new THREE.Matrix4().makeScale(factor, factor, factor);
    const finalMat = new THREE.Matrix4().multiply(fromCenter).multiply(scaleMat).multiply(toCenter);
    this.applyTransformMatrix(finalMat, scope);
  }

  /**
   * Snaps model bottom bounding box to ground plane (Y = 0)
   */
  public snapModelToGround(): void {
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    if (!box.isEmpty()) {
      const minY = box.min.y;
      this.modelRoot.position.y -= minY;
      this.modelRoot.updateMatrixWorld(true);
    }
  }

  /**
   * Detects if the current camera view has snapped to a "Perfect View" (orthographic elevation).
   * Identifies the depth axis to allow automatic UI collapse and prevent Z plotting errors.
   */
  public getPerfectView(): PerfectViewInfo {
    const dir = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const threshold = 0.985; // ~10 degrees tolerance

    // Front: looking along -Z
    if (dir.dot(new THREE.Vector3(0, 0, -1)) > threshold) {
      return { isPerfect: true, view: 'front', depthAxis: 'z' };
    }
    // Back: looking along +Z
    if (dir.dot(new THREE.Vector3(0, 0, 1)) > threshold) {
      return { isPerfect: true, view: 'back', depthAxis: 'z' };
    }
    // Top: looking along -Y
    if (dir.dot(new THREE.Vector3(0, -1, 0)) > threshold) {
      return { isPerfect: true, view: 'top', depthAxis: 'y' };
    }
    // Bottom: looking along +Y
    if (dir.dot(new THREE.Vector3(0, 1, 0)) > threshold) {
      return { isPerfect: true, view: 'bottom', depthAxis: 'y' };
    }
    // Right: looking along -X
    if (dir.dot(new THREE.Vector3(-1, 0, 0)) > threshold) {
      return { isPerfect: true, view: 'right', depthAxis: 'x' };
    }
    // Left: looking along +X
    if (dir.dot(new THREE.Vector3(1, 0, 0)) > threshold) {
      return { isPerfect: true, view: 'left', depthAxis: 'x' };
    }

    return { isPerfect: false, view: null, depthAxis: null };
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  private projectionMode: 'perspective' | 'orthographic' = 'perspective';
  private savedPerspectiveFov: number = 45;
  public onProjectionChange?: (mode: 'perspective' | 'orthographic', fov: number) => void;

  public getFov(): number {
    return this.camera.fov;
  }

  public setFov(fov: number): void {
    const clamped = Math.max(12, Math.min(105, fov));
    this.camera.fov = clamped;
    this.camera.updateProjectionMatrix();
    if (this.projectionMode === 'orthographic' && clamped > 22) {
      this.projectionMode = 'perspective';
    }
    this.onProjectionChange?.(this.projectionMode, clamped);
  }

  public adjustFov(delta: number): number {
    this.setFov(this.camera.fov + delta);
    return this.camera.fov;
  }

  public getProjectionMode(): 'perspective' | 'orthographic' {
    return this.projectionMode;
  }

  public setProjectionMode(mode: 'perspective' | 'orthographic'): void {
    this.projectionMode = mode;
    if (mode === 'orthographic') {
      this.savedPerspectiveFov = this.camera.fov;
      this.camera.fov = 15; // Low distortion isometric telephoto
    } else {
      this.camera.fov = this.savedPerspectiveFov || 45;
    }
    this.camera.updateProjectionMatrix();
    this.onProjectionChange?.(this.projectionMode, this.camera.fov);
  }

  public toggleProjectionMode(): 'perspective' | 'orthographic' {
    const nextMode = this.projectionMode === 'perspective' ? 'orthographic' : 'perspective';
    this.setProjectionMode(nextMode);
    return nextMode;
  }

  public resetCamera(): void {
    this.resetView();
  }

  /**
   * Snaps camera perspective smoothly to an exact orthographic elevation or isometric angle
   */
  public snapToView(view: PerfectViewType): void {
    const radius = Math.max(this.targetSpherical.radius, 2.0);
    switch (view) {
      case 'front':
        this.targetSpherical.set(radius, Math.PI / 2, 0);
        break;
      case 'back':
        this.targetSpherical.set(radius, Math.PI / 2, Math.PI);
        break;
      case 'top':
        this.targetSpherical.set(radius, 0.001, 0);
        break;
      case 'bottom':
        this.targetSpherical.set(radius, Math.PI - 0.001, 0);
        break;
      case 'right':
        this.targetSpherical.set(radius, Math.PI / 2, Math.PI / 2);
        break;
      case 'left':
        this.targetSpherical.set(radius, Math.PI / 2, -Math.PI / 2);
        break;
      case 'isometric':
        this.targetSpherical.set(radius, Math.PI / 2.3, Math.PI / 4);
        break;
    }
  }

  /**
   * Smoothly orients the actual 3D model or drawing canvas plane directly (WITHOUT moving camera)
   */
  public orientModelOrSurface(view: PerfectViewType, scope: TransformTargetScope = 'all'): void {
    switch (view) {
      case 'front':
        this.modelRoot.rotation.set(0, 0, 0);
        break;
      case 'back':
        this.modelRoot.rotation.set(0, Math.PI, 0);
        break;
      case 'top':
        this.modelRoot.rotation.set(Math.PI / 2, 0, 0);
        break;
      case 'bottom':
        this.modelRoot.rotation.set(-Math.PI / 2, 0, 0);
        break;
      case 'right':
        this.modelRoot.rotation.set(0, -Math.PI / 2, 0);
        break;
      case 'left':
        this.modelRoot.rotation.set(0, Math.PI / 2, 0);
        break;
      case 'isometric':
        this.modelRoot.rotation.set(-Math.PI * 0.15, Math.PI * 0.25, 0);
        break;
    }
    this.modelRoot.updateMatrixWorld(true);
  }

  /**
   * Rotates the 3D model or drawing surface smoothly (WITHOUT moving camera)
   */
  public rotateModelOrSurface(deltaX: number, deltaY: number, scope: TransformTargetScope = 'all'): void {
    this.rotateTrackball(deltaX, deltaY, scope);
  }

  /**
   * Scales the 3D model or drawing surface (WITHOUT moving camera)
   */
  public scaleModelOrSurface(scaleFactor: number, scope: TransformTargetScope = 'all'): void {
    const factor = Math.max(0.5, Math.min(2.0, scaleFactor));
    this.modelRoot.scale.multiplyScalar(factor);
    this.modelRoot.updateMatrixWorld(true);
  }

  /**
   * Resets model/surface transform without affecting camera
   */
  public resetModelOrSurface(scope: TransformTargetScope = 'all'): void {
    this.modelRoot.position.set(0, 0, 0);
    this.modelRoot.rotation.set(0, 0, 0);
    this.modelRoot.scale.set(1, 1, 1);
    this.modelRoot.updateMatrixWorld(true);
  }

  /**
   * Switch Lighting & Environment Presets
   */
  public setLightingPreset(preset: LightingPreset): void {
    this.ensureBaselineLighting();
    switch (preset) {
      case 'studio':
        this.ambientLight.intensity = 1.25;
        this.hemiLight.color.setHex(0xffffff);
        this.hemiLight.groundColor.setHex(0xe2e8f0);
        this.hemiLight.intensity = 0.9;
        this.dirLight1.color.setHex(0xffffff);
        this.dirLight1.intensity = 1.8;
        this.dirLight2.color.setHex(0xdbeafe);
        this.dirLight2.intensity = 0.8;
        if (this.skyEngine) this.skyEngine.applyPreset('clear-day');
        break;
      case 'daylight':
        if (this.skyEngine) this.skyEngine.applyPreset('clear-day');
        break;
      case 'neon':
        if (this.skyEngine) this.skyEngine.applyPreset('cyberpunk-neon');
        break;
      case 'sunset':
        if (this.skyEngine) this.skyEngine.applyPreset('sunset-dusk');
        break;
      case 'clay_neutral':
        this.ambientLight.intensity = 1.2;
        this.hemiLight.intensity = 0.85;
        this.dirLight1.intensity = 1.6;
        if (this.skyEngine) this.skyEngine.applyPreset('studio-neutral');
        break;
    }
  }

  public setTheme(theme: 'light' | 'dark'): void {
    const isSkyActive = this.skyEngine && this.skyEngine.getCurrentPreset() && this.skyEngine.getCurrentPreset().id !== 'off';
    if (theme === 'light') {
      if (!isSkyActive) {
        this.scene.background = new THREE.Color(0xf6f7f9);
      } else {
        this.scene.background = null;
      }
      if (this.gridHelper) {
        this.helperRoot.remove(this.gridHelper);
        this.gridHelper.geometry.dispose();
        this.gridHelper = new THREE.GridHelper(10, 20, 0xcbd5e1, 0xe2e8f0);
        this.gridHelper.position.y = -1.2;
        this.helperRoot.add(this.gridHelper);
      }
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.75;
      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0xe2e8f0);
      this.hemiLight.intensity = 0.6;
      this.dirLight1.color.setHex(0xffffff);
      this.dirLight1.intensity = 1.3;
      this.dirLight2.color.setHex(0xdbeafe);
      this.dirLight2.intensity = 0.5;
    } else {
      // Comfortable medium light-greyish slate dark theme
      if (!isSkyActive) {
        this.scene.background = new THREE.Color(0x2d323b);
      } else {
        this.scene.background = null;
      }
      if (this.gridHelper) {
        this.helperRoot.remove(this.gridHelper);
        this.gridHelper.geometry.dispose();
        this.gridHelper = new THREE.GridHelper(10, 20, 0x475569, 0x334155);
        this.gridHelper.position.y = -1.2;
        this.helperRoot.add(this.gridHelper);
      }
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 0.65;
      this.hemiLight.color.setHex(0xf1f5f9);
      this.hemiLight.groundColor.setHex(0x334155);
      this.hemiLight.intensity = 0.65;
      this.dirLight1.color.setHex(0xffffff);
      this.dirLight1.intensity = 1.25;
      this.dirLight2.color.setHex(0x94a3b8);
      this.dirLight2.intensity = 0.65;
    }
  }

  public toggleWireframe(show: boolean): void {
    this.targetMeshes.forEach((mesh) => {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => {
          if ('wireframe' in m) {
            (m as THREE.MeshStandardMaterial).wireframe = show;
          }
        });
      } else if (mesh.material && 'wireframe' in mesh.material) {
        (mesh.material as THREE.MeshStandardMaterial).wireframe = show;
      }
    });
  }

  public setWireframe(show: boolean): void {
    this.toggleWireframe(show);
  }

  public toggleGrid(show: boolean): void {
    this.gridHelper.visible = show;
  }

  public setGrid(show: boolean): void {
    this.toggleGrid(show);
  }

  public setModelDisplayMode(mode: ModelDisplayMode): void {
    this.modelDisplayMode = mode;
    this.targetMeshes.forEach((mesh) => {
      if (mode === 'clay') {
        if (!mesh.userData.originalMaterial) {
          mesh.userData.originalMaterial = mesh.material;
        }
        const clayMat = new THREE.MeshStandardMaterial({
          color: 0xf5f5f7,
          roughness: 0.85,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });
        MaterialCache.configureModelMaterial(clayMat);
        mesh.material = clayMat;
      } else {
        if (mesh.userData.originalMaterial) {
          mesh.material = mesh.userData.originalMaterial;
        }
      }
    });
  }

  /**
   * Directly skins the loaded 3D model with a custom ShaderMaterial or MatCap material
   */
  public setModelCustomMaterial(material: THREE.Material): void {
    this.targetMeshes.forEach((mesh) => {
      if (!mesh.userData.originalMaterial) {
        mesh.userData.originalMaterial = mesh.material;
      }
      MaterialCache.configureModelMaterial(material);
      mesh.material = material;
      mesh.material.needsUpdate = true;
    });
  }

  public setModelOpacity(opacity: number): void {
    this.modelOpacity = opacity;
    this.targetMeshes.forEach((mesh) => {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (m) {
          m.transparent = opacity < 0.999;
          m.opacity = opacity;
          m.needsUpdate = true;
        }
      });
    });
  }

  public setModelWireframeOpacity(opacity: number): void {
    this.modelWireframeOpacity = opacity;
    this.targetMeshes.forEach((mesh) => {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (m && 'wireframe' in m) {
          (m as any).wireframe = opacity > 0.05;
          m.needsUpdate = true;
        }
      });
    });
  }

  public getModelDisplayMode(): ModelDisplayMode {
    return this.modelDisplayMode;
  }

  public getIsModelVisible(): boolean {
    return this.isModelVisible;
  }

  public toggleModelVisibility(visible?: boolean): boolean {
    this.isModelVisible = visible !== undefined ? visible : !this.isModelVisible;
    this.modelRoot.children.forEach((child) => {
      if (child.name !== 'DrawingPlaneCanvas' && child !== this.strokeRoot) {
        child.visible = this.isModelVisible;
      }
    });
    this.targetMeshes.forEach((mesh) => {
      if (mesh.name !== 'DrawingPlaneCanvas') {
        mesh.visible = this.isModelVisible;
      }
    });
    return this.isModelVisible;
  }

  /**
   * Clones the currently active 3D model with an offset in the scene,
   * cloning its materials and computing raycast acceleration trees.
   */
  public cloneModel(offset: THREE.Vector3 = new THREE.Vector3(1.5, 0, 0)): THREE.Object3D | null {
    // Find either selected model or first loaded model in modelRoot
    let activeModel = this.activeSelectedModelId
      ? this.modelRoot.children.find((c) => c.uuid === this.activeSelectedModelId && c !== this.strokeRoot)
      : null;
    if (!activeModel) {
      activeModel = this.modelRoot.children.find(
        (c) => c !== this.strokeRoot && c.name !== 'DrawingPlaneCanvas'
      ) || this.modelRoot.children.find((c) => c !== this.strokeRoot);
    }
    if (!activeModel) return null;

    const cloned = activeModel.clone(true);
    const existingModelsCount = this.modelRoot.children.filter(
      (c) => c !== this.strokeRoot && c.name !== 'DrawingPlaneCanvas'
    ).length;
    cloned.name = `${activeModel.name || '3D Model'} (Copy ${existingModelsCount + 1})`;
    cloned.position.add(offset);
    this.modelRoot.add(cloned);

    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        this.targetMeshes.push(child);
        if (child.material) {
          child.material = Array.isArray(child.material)
            ? child.material.map((m) => m.clone())
            : child.material.clone();
          child.userData.originalMaterial = child.material;
        }
        try {
          if (typeof (child.geometry as any).computeBoundsTree === 'function') {
            (child.geometry as any).computeBoundsTree();
          }
        } catch (_) {}
      }
    });

    this.modelMetadata.meshCount = this.targetMeshes.length;
    if (this.onMetadataUpdate) {
      this.onMetadataUpdate(this.modelMetadata);
    }
    this.notifyModelsChanged();
    return cloned;
  }

  public centerModelToOrigin(): void {
    this.targetPosition.set(0, 0, 0);
    this.targetSpherical.radius = 5.2;
  }

  public setSkyPreset(preset: SkyPresetName): void {
    this.skyEngine.applyPreset(preset);
  }

  public setSunAngles(azimuthDeg: number, elevationDeg: number): void {
    this.skyEngine.setSunAngles(azimuthDeg, elevationDeg);
  }

  public setSunPositionVector(x: number, y: number, z: number): void {
    this.skyEngine.setSunPositionVector(x, y, z);
  }

  public setTimeOfDay(hours: number): void {
    this.skyEngine.setTimeOfDay(hours);
  }

  public getTimeOfDay(): number {
    return this.skyEngine.getTimeOfDay();
  }

  public setSunIntensity(intensity: number): void {
    this.skyEngine.setSunIntensity(intensity);
  }

  public setSunColor(colorHex: string): void {
    this.skyEngine.setSunColor(colorHex);
  }

  public setAmbientIntensity(intensity: number): void {
    this.skyEngine.setAmbientIntensity(intensity);
  }

  public setSunCoronaIntensity(val: number): void {
    this.skyEngine.setSunCoronaIntensity(val);
  }

  public getIlluminationState() {
    return this.skyEngine.getIlluminationState();
  }

  public setCloudCoverage(coverage: number): void {
    this.skyEngine.setCloudCoverage(coverage);
  }

  public setCloudDensity(density: number): void {
    this.skyEngine.setCloudDensity(density);
  }

  public setCloudSpeed(speed: number): void {
    this.skyEngine.setCloudSpeed(speed);
  }

  public setCloudWindAngle(degrees: number): void {
    this.skyEngine.setCloudWindAngle(degrees);
  }

  public setCloudScale(scale: number): void {
    this.skyEngine.setCloudScale(scale);
  }

  public setCloudTurbulence(turb: number): void {
    this.skyEngine.setCloudTurbulence(turb);
  }

  public setCloudOpacity(opacity: number): void {
    this.skyEngine.setCloudOpacity(opacity);
  }

  public setCloudColor(hex: string): void {
    this.skyEngine.setCloudColor(hex);
  }

  public setCloudShadow(hex: string): void {
    this.skyEngine.setCloudShadow(hex);
  }

  public setEnableClouds(enabled: boolean): void {
    this.skyEngine.setEnableClouds(enabled);
  }

  public setEnableGodRays(enabled: boolean): void {
    this.skyEngine.setEnableGodRays(enabled);
  }

  public setGodRaysIntensity(intensity: number): void {
    this.skyEngine.setGodRaysIntensity(intensity);
  }

  public setGodRaysDensity(density: number): void {
    this.skyEngine.setGodRaysDensity(density);
  }

  public setGodRaysDecay(decay: number): void {
    this.skyEngine.setGodRaysDecay(decay);
  }

  public setGodRaysColor(hex: string): void {
    this.skyEngine.setGodRaysColor(hex);
  }

  public getSkySettings(): SkySettings {
    return this.skyEngine.getSettings();
  }

  /**
   * Guarantees active environmental illumination and PBR reflection map,
   * preventing 3D imported models from rendering solid black.
   */
  public ensureBaselineLighting(): void {
    if (!this.lightsRoot) {
      this.lightsRoot = new THREE.Group();
      this.scene.add(this.lightsRoot);
    }

    if (!this.ambientLight || !this.ambientLight.parent) {
      if (!this.ambientLight) {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
      }
      this.lightsRoot.add(this.ambientLight);
    }
    if (this.ambientLight.intensity < 0.6) {
      this.ambientLight.intensity = 1.1;
    }

    if (!this.hemiLight || !this.hemiLight.parent) {
      if (!this.hemiLight) {
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 0.85);
      }
      this.lightsRoot.add(this.hemiLight);
    }

    if (!this.dirLight1 || !this.dirLight1.parent) {
      if (!this.dirLight1) {
        this.dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
        this.dirLight1.position.set(6, 10, 6);
      }
      this.lightsRoot.add(this.dirLight1);
    }
    if (this.dirLight1.intensity < 0.6) {
      this.dirLight1.intensity = 1.5;
    }

    if (!this.dirLight2 || !this.dirLight2.parent) {
      if (!this.dirLight2) {
        this.dirLight2 = new THREE.DirectionalLight(0xe0f2fe, 0.9);
        this.dirLight2.position.set(-6, -2, -6);
      }
      this.lightsRoot.add(this.dirLight2);
    }

    if (this.skyEngine) {
      this.skyEngine.setLights(this.dirLight1, this.ambientLight, this.dirLight2, this.hemiLight);
    }

    // Ensure environment map exists for MeshStandardMaterial PBR reflections
    if (!this.scene.environment && this.renderer) {
      try {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        const roomEnv = new RoomEnvironment();
        const envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
        this.scene.environment = envTexture;
        pmremGenerator.dispose();
      } catch (e) {
        console.warn('PMREM environment generation notice:', e);
      }
    }
  }

  /**
   * Export Combined Scene to GLB
   */
  public async exportGLB(): Promise<Blob> {
    const exportScene = new THREE.Scene();

    // Clone model
    const modelClone = this.modelRoot.clone(true);
    exportScene.add(modelClone);

    // Clone strokes
    const strokeClone = this.strokeRoot.clone(true);
    exportScene.add(strokeClone);

    const exporter = new GLTFExporter();
    return new Promise((resolve, reject) => {
      exporter.parse(
        exportScene,
        (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          resolve(blob);
        },
        reject,
        { binary: true }
      );
    });
  }

  /**
   * Export Combined Scene to OBJ
   */
  public exportOBJ(): string {
    const exportScene = new THREE.Scene();
    exportScene.add(this.modelRoot.clone(true));
    exportScene.add(this.strokeRoot.clone(true));

    const exporter = new OBJExporter();
    return exporter.parse(exportScene);
  }

  /**
   * Capture high-res screenshot
   */
  public captureSnapshot(): string {
    this.cursorDecal.visible = false;
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    this.cursorDecal.visible = true;
    return dataUrl;
  }

  public resize(width: number, height: number): void {
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.postEngine) {
      this.postEngine.setSize(width, height);
    }
  }

  public setPostProcessSettings(settings: Partial<PostProcessSettings>): void {
    if (this.postEngine) {
      this.postEngine.updateSettings(settings);
    }
  }

  public getPostProcessSettings(): PostProcessSettings {
    return this.postEngine ? this.postEngine.getSettings() : {
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
  }

  private updateCameraPosition(): void {
    // Smooth camera damping
    this.cameraSpherical.theta += (this.targetSpherical.theta - this.cameraSpherical.theta) * 0.15;
    this.cameraSpherical.phi += (this.targetSpherical.phi - this.cameraSpherical.phi) * 0.15;
    this.cameraSpherical.radius += (this.targetSpherical.radius - this.cameraSpherical.radius) * 0.15;

    this.cameraTarget.lerp(this.targetPosition, 0.15);

    const offset = new THREE.Vector3().setFromSpherical(this.cameraSpherical);
    this.camera.position.copy(this.cameraTarget).add(offset);
    this.camera.lookAt(this.cameraTarget);
  }

  private notifyHistory(): void {
    if (this.onHistoryChange) {
      const canUndo = this.undoStack.length > 0 || this.transformUndoStack.length > 0;
      const canRedo = this.redoStack.length > 0 || this.transformRedoStack.length > 0;
      this.onHistoryChange(canUndo, canRedo);
    }
    this.onAutoSaveTrigger?.('history');
  }

  private startLoop(): void {
    const loop = (time: number) => {
      this.animationFrameId = requestAnimationFrame(loop);

      // FPS tracking
      this.frameCount++;
      const dt = time - this.lastTime;
      this.fpsTimer += dt;
      if (this.fpsTimer >= 500) {
        this.fps = Math.round((this.frameCount * 1000) / this.fpsTimer);
        this.frameCount = 0;
        this.fpsTimer = 0;
        if (this.onFpsUpdate) {
          this.onFpsUpdate(this.fps);
        }
      }
      this.lastTime = time;

      this.updateCameraPosition();

      if (this.onCameraChange) {
        this.onCameraChange({
          radius: this.cameraSpherical.radius,
          theta: this.cameraSpherical.theta,
          phi: this.cameraSpherical.phi,
        });
      }

      // Check for Perfect View changes and notify subscribers
      const pvInfo = this.getPerfectView();
      if (
        pvInfo.isPerfect !== this.lastPerfectViewInfo.isPerfect ||
        pvInfo.view !== this.lastPerfectViewInfo.view ||
        pvInfo.depthAxis !== this.lastPerfectViewInfo.depthAxis
      ) {
        this.lastPerfectViewInfo = pvInfo;
        if (this.onViewChange) {
          this.onViewChange(pvInfo);
        }
      }

      // Update animated shader effect uniforms (uTime, uLightDirection, uResolution) without per-frame allocations
      let lightDir: THREE.Vector3 | undefined;
      if (this.dirLight1) {
        this.loopLightDir.copy(this.dirLight1.position).normalize();
        lightDir = this.loopLightDir;
      }
      let res: THREE.Vector2 | undefined;
      if (this.container) {
        this.loopResolution.set(this.container.clientWidth, this.container.clientHeight);
        res = this.loopResolution;
      }
      globalShaderRegistry.update(time * 0.001, lightDir, res);

      // Update procedural sky dome
      if (this.skyEngine) {
        this.skyEngine.update(dt * 0.001, this.camera);
      }

      if (this.postEngine) {
        this.postEngine.render(time * 0.001);
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Sample precise hex color from stroke, UV canvas texture, or screen framebuffer
   */
  public sampleColorAtScreen(screenX: number, screenY: number, clientX?: number, clientY?: number): string {
    // 1. Check direct 3D raycast hit
    const hit = this.raycastModel(screenX, screenY);
    if (hit && hit.hit) {
      if (hit.mesh) {
        // Match against recorded strokes
        for (const strokeData of this.strokes.values()) {
          if (strokeData.meshes.includes(hit.mesh)) {
            return normalizeHexColor(strokeData.descriptor.settings.color, '#38bdf8');
          }
        }
      }
      // Sample painted UV map
      if (hit.uv) {
        const uvSample = this.uvEngine.sampleColorAtUV(hit.uv);
        if (uvSample) return normalizeHexColor(uvSample, '#38bdf8');
      }
    }

    // 2. Read direct pixel from WebGL/WebGPU canvas framebuffer
    try {
      const gl = this.renderer.getContext();
      const dom = this.renderer.domElement;
      const rect = dom.getBoundingClientRect();
      const pixelRatio = this.renderer.getPixelRatio() || 1;

      let px = 0;
      let py = 0;

      if (typeof clientX === 'number' && typeof clientY === 'number') {
        px = Math.floor((clientX - rect.left) * pixelRatio);
        py = Math.floor((rect.height - (clientY - rect.top)) * pixelRatio); // Invert Y for WebGL
      } else {
        px = Math.floor(((screenX + 1) * 0.5) * dom.width);
        py = Math.floor(((screenY + 1) * 0.5) * dom.height);
      }

      px = Math.max(0, Math.min(dom.width - 1, px));
      py = Math.max(0, Math.min(dom.height - 1, py));

      const pixel = new Uint8Array(4);
      gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

      if (pixel[3] > 0) {
        const r = pixel[0].toString(16).padStart(2, '0');
        const g = pixel[1].toString(16).padStart(2, '0');
        const b = pixel[2].toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    } catch (_) {}

    return '#38bdf8';
  }

  /**
   * Hardware WebGPU & WebGL2 Graphics Pipeline Inspection
   */
  public async detectGPUHardware(): Promise<GPUInfo> {
    try {
      // First probe next-gen WebGPU hardware adapter & compute capabilities
      const webgpuInfo = await webgpuPipeline.getReadyInfo();
      if (webgpuInfo && webgpuInfo.isWebGPUSupported) {
        this.gpuInfo = { ...webgpuInfo };
        this.onGPUInfoUpdate?.(this.gpuInfo);
        return this.gpuInfo;
      }

      // Fallback: WebGL2 Driver & Capability Inspection
      const gl = this.renderer.getContext();
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const unmaskedRenderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
      const unmaskedVendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : '';
      const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
      const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;

      this.gpuInfo = {
        backend: isWebGL2 ? 'webgl2' : 'webgl',
        adapterName: unmaskedRenderer || 'High-Performance WebGL Hardware Accelerator',
        vendor: unmaskedVendor || 'GPU Device',
        architecture: isWebGL2 ? 'OpenGL ES 3.0 / WebGL 2.0 Pipeline' : 'OpenGL ES 2.0 / WebGL 1.0 Pipeline',
        isWebGPUSupported: false,
        maxTextureDimension2D: maxTex,
        computeSupport: false,
        powerPreference: 'high-performance',
        driverVersion: 'WebGL Hardware Driver',
        msaaTier: 4,
      };
      this.onGPUInfoUpdate?.(this.gpuInfo);
    } catch (e) {
      console.warn('GPU hardware detection fallback:', e);
    }

    return this.gpuInfo;
  }

  public getGPUInfo(): GPUInfo {
    return this.gpuInfo;
  }

  // ==========================================
  // SPRINT 2: VOLUMETRIC LIQUIFY & CURVE DECIMATION
  // ==========================================

  /**
   * Initializes non-destructive Liquify editing session on active layer strokes
   */
  public startLiquifySession(): void {
    this.liquifyEngine.beginSession(this.strokes, this.activeLayerId);
  }

  /**
   * Applies real-time 3D volumetric vertex deformation
   */
  public applyLiquifyAtScreen(
    screenX: number,
    screenY: number,
    deltaScreenX: number,
    deltaScreenY: number,
    settings: LiquifySettings
  ): void {
    this.liquifyEngine.applyDeformation(
      screenX,
      screenY,
      deltaScreenX,
      deltaScreenY,
      this.camera,
      this.strokes,
      settings,
      this.activeLayerId
    );
  }

  /**
   * Toggles Hold-to-Compare A/B view
   */
  public setLiquifyCompare(active: boolean): void {
    this.liquifyEngine.toggleCompare(active, this.strokes);
  }

  /**
   * Commits current deformed mesh geometry into permanent stroke points and history
   */
  public commitLiquify(): void {
    this.liquifyEngine.commit(this.strokes);
    this.notifyHistory();
  }

  /**
   * Discards live deformations and restores original base state
   */
  public discardLiquify(): void {
    this.liquifyEngine.discard(this.strokes);
  }

  /**
   * Simplifies dense stroke vertices using RDP 3D curve decimation & smooth Bishop frame spline recalculation
   */
  public decimateCurves(
    tolerance: number = 0.006,
    scope: 'layer' | 'all' = 'layer'
  ): { before: number; after: number } {
    const stats = this.liquifyEngine.decimateStrokes(
      this.strokes,
      tolerance,
      scope === 'layer' ? this.activeLayerId : undefined
    );
    this.notifyHistory();
    return stats;
  }

  // ==========================================
  // SPRINT 3: BENT 3D GUIDES & CUSTOM MIRROR PLANE
  // ==========================================

  /**
   * Updates arbitrary 3D mirror plane equation P' = P - 2((P - P0) . n)n
   */
  public setCustomMirrorPlane(
    origin: { x: number; y: number; z: number },
    normal: { x: number; y: number; z: number },
    enabled: boolean
  ): void {
    this.customMirrorOrigin.set(origin.x, origin.y, origin.z);
    this.customMirrorNormal.set(normal.x, normal.y, normal.z).normalize();
    this.customMirrorEnabled = enabled;

    this.loftEngine.createOrUpdateMirrorPlaneMesh(
      this.customMirrorOrigin,
      this.customMirrorNormal,
      enabled,
      0.4
    );
  }

  public toggleCustomMirrorPlane(enabled: boolean): void {
    this.customMirrorEnabled = enabled;
    this.loftEngine.createOrUpdateMirrorPlaneMesh(
      this.customMirrorOrigin,
      this.customMirrorNormal,
      enabled,
      0.4
    );
  }

  /**
   * Returns camera normal and target for mirror alignment
   */
  public getCameraOrientationForMirror(): {
    target: { x: number; y: number; z: number };
    normal: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
  } {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward).negate(); // View normal facing camera
    return {
      target: { x: this.cameraTarget.x, y: this.cameraTarget.y, z: this.cameraTarget.z },
      normal: { x: forward.x, y: forward.y, z: forward.z },
      rotation: { x: this.camera.rotation.x, y: this.camera.rotation.y, z: this.camera.rotation.z },
    };
  }

  /**
   * Creates preset curved manifold scaffold guide
   */
  public createPresetBentGuide(
    preset: 'wave' | 'arch' | 'spiral' | 'saddle',
    width: number = 0.35,
    opacity: number = 0.5
  ): BentGuideConfig {
    return this.loftEngine.createPresetGuide(preset, width, opacity);
  }

  /**
   * Creates swept manifold guide from the last drawn curve in the active layer
   */
  public createBentGuideFromSelectedStroke(
    width: number = 0.35,
    opacity: number = 0.5
  ): BentGuideConfig | null {
    // Find the latest stroke in active layer
    let latestStroke: StrokeDescriptor | null = null;
    for (const entry of this.strokes.values()) {
      if (entry.descriptor.layerId === this.activeLayerId) {
        if (!latestStroke || entry.descriptor.createdAt > latestStroke.createdAt) {
          latestStroke = entry.descriptor;
        }
      }
    }

    if (!latestStroke || latestStroke.points.length < 2) return null;
    const curvePoints = latestStroke.points.map((p) => p.position);
    return this.loftEngine.createBentGuideFromPoints(
      curvePoints,
      `Scaffold from ${latestStroke.id}`,
      width,
      opacity
    );
  }

  public removeBentGuide(id: string): void {
    this.loftEngine.removeBentGuide(id);
  }

  public updateBentGuideParameters(id: string, params: Partial<BentGuideConfig>): BentGuideConfig | null {
    return this.loftEngine.updateBentGuideParameters(id, params);
  }

  public toggleBentGuideVisibility(id: string, visible: boolean): void {
    this.loftEngine.toggleGuideVisibility(id, visible);
  }

  public getBentGuides(): BentGuideConfig[] {
    return this.loftEngine.getGuides();
  }

  // ==========================================
  // SCAFFOLDING & COLLISION MESH ENGINE
  // ==========================================

  public getScaffoldingEngine(): ScaffoldingEngine {
    return this.scaffoldingEngine;
  }

  public createProxyScaffold(type: ScaffoldProxyType, name?: string): CollisionGuideMeshConfig {
    return this.scaffoldingEngine.createProxyScaffold(type, name);
  }

  public loadCollisionMeshFromObject(object: THREE.Object3D, name: string = 'Collision Guide'): CollisionGuideMeshConfig {
    return this.scaffoldingEngine.loadCollisionMeshFromObject(object, name);
  }

  public removeScaffold(id: string): void {
    this.scaffoldingEngine.removeScaffold(id);
  }

  public updateScaffold(id: string, updates: Partial<CollisionGuideMeshConfig>): CollisionGuideMeshConfig | null {
    return this.scaffoldingEngine.updateScaffold(id, updates);
  }

  public getScaffolds(): CollisionGuideMeshConfig[] {
    return this.scaffoldingEngine.getScaffolds();
  }

  // ==========================================
  // SPRINT 4: REFERENCE BILLBOARD & MESH GUIDE COLLIDERS
  // ==========================================

  /**
   * Imports a reference 2D image into 3D stage space as a billboard plane
   */
  public importImageBillboardToStage(imageUrl: string, name: string = 'Reference Image'): void {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imageUrl, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const aspect = texture.image.width / Math.max(1, texture.image.height);
      const height = 1.6;
      const width = height * aspect;

      const geometry = new THREE.PlaneGeometry(width, height);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });

      const planeMesh = new THREE.Mesh(geometry, material);
      planeMesh.name = name;
      planeMesh.renderOrder = 2;

      // Position in front of camera at target distance
      const camPos = new THREE.Vector3();
      this.camera.getWorldPosition(camPos);
      const lookDir = new THREE.Vector3();
      this.camera.getWorldDirection(lookDir);

      planeMesh.position.copy(this.cameraTarget).addScaledVector(lookDir, -0.2);
      planeMesh.quaternion.copy(this.camera.quaternion);

      this.modelRoot.add(planeMesh);
      this.targetMeshes.push(planeMesh);

      // Compute BVH for raycasting contact
      try {
        if ((planeMesh.geometry as any).computeBoundsTree) {
          (planeMesh.geometry as any).computeBoundsTree();
        }
      } catch (_) {}
    });
  }

  /**
   * Toggles mesh collider guide state for shrink-wrap projection
   */
  public toggleMeshGuideCollider(meshId: string, isCollider: boolean): void {
    this.modelRoot.traverse((child) => {
      if (child instanceof THREE.Mesh && (child.uuid === meshId || child.name === meshId)) {
        if (isCollider) {
          this.guideColliderMeshes.set(meshId, child);
          try {
            if ((child.geometry as any).computeBoundsTree) {
              (child.geometry as any).computeBoundsTree();
            }
          } catch (_) {}
        } else {
          this.guideColliderMeshes.delete(meshId);
        }
      }
    });
  }

  // ==========================================
  // SPRINT 5: WEBXR AR BINDING & HIT-TESTING
  // ==========================================

  /**
   * Initializes WebXR immersive AR session with real-world hit-testing
   */
  public async startWebXRSession(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('xr' in navigator) || !(navigator as any).xr) {
      return false;
    }

    try {
      const isSupported = await (navigator as any).xr.isSessionSupported('immersive-ar');
      if (!isSupported) return false;

      const session = await (navigator as any).xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'light-estimation'],
      });

      this.xrSession = session;
      this.renderer.xr.enabled = true;
      await this.renderer.xr.setSession(session);

      session.addEventListener('end', () => {
        this.stopWebXRSession();
      });

      return true;
    } catch (e) {
      console.warn('WebXR start error:', e);
      return false;
    }
  }

  public stopWebXRSession(): void {
    if (this.xrSession) {
      try {
        this.xrSession.end();
      } catch (_) {}
      this.xrSession = null;
    }
    this.renderer.xr.enabled = false;
  }

  /**
   * Activates Realistic Simulated AR Floor Mode on Desktop / non-XR devices
   */
  public enableSimulatedARMode(enabled: boolean): void {
    this.isSimulatedAR = enabled;
    if (enabled) {
      if (!this.arFloorGrid) {
        this.arFloorGrid = new THREE.GridHelper(12, 24, 0x6366f1, 0x312e81);
        this.arFloorGrid.position.y = -1.2;
        this.helperRoot.add(this.arFloorGrid);
      }
      this.arFloorGrid.visible = true;
    } else if (this.arFloorGrid) {
      this.arFloorGrid.visible = false;
    }
  }

  /**
   * Adjusts Y-Axis Levitation (Floor Elevation Offset)
   */
  public setARSceneElevation(elevation: number): void {
    this.modelRoot.position.y = elevation;
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.postEngine) {
      this.postEngine.dispose();
    }
    this.materialCache.clear();
    this.uvEngine.dispose();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
