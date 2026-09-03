# Remix 3D Model Painting Studio & Draco Compression Suite (v14.0.0)
## Master Architectural Specification: Menu Structure, Functions & Feature Catalog

> **Version**: `v14.0.0`  
> **Workspace Path**: `e:\X\AiStudio Workflow\v14`  
> **Full File Path**: `e:\X\AiStudio Workflow\v14\REMIX_3D_MASTER_SPECIFICATION.md`  
> **Technology Stack**: React 19, Three.js (r185), WebGPU / WebGL 2.0, `three-mesh-bvh`, Google Draco WASM, Web Audio API, Web Vibration API, Tailwind CSS v4  
> **Generated**: `September 2, 2026`

---

## Table of Contents

1. [Workstation Interface & Complete Menu Hierarchy](#1-workstation-interface--complete-menu-hierarchy)
   - [1.1 Primary CAD Toolbar Dock (Toolbar.tsx)](#11-primary-cad-toolbar-dock-toolbartsx)
   - [1.2 Horizontal Flyout Shelves](#12-horizontal-flyout-shelves)
   - [1.3 Viewport HUD & Dynamic Reticles (Viewport.tsx)](#13-viewport-hud--dynamic-reticles-viewporttsx)
   - [1.4 Stylus Hardware Radial Context Menu (StylusRadialMenu.tsx)](#14-stylus-hardware-radial-context-menu-stylusradialmenutsx)
   - [1.5 Spatial Navigation & Transform Suite](#15-spatial-navigation--transform-suite)
   - [1.6 Dedicated Workstation Modals & Panels](#16-dedicated-workstation-modals--panels)
2. [Complete Function & Method Index](#2-complete-function--method-index)
   - [2.1 Core 3D Engine Methods (StudioEngine)](#21-core-3d-engine-methods-studioengine)
   - [2.2 Color Science & Perceptual Math (colorMath.ts)](#22-color-science--perceptual-math-colormathts)
   - [2.3 3D Conformal Bead & Bishop Geometry (conformalBeadGenerator.ts)](#23-3d-conformal-bead--bishop-geometry-conformalbeadgeneratorts)
   - [2.4 Volumetric Mesh Liquify Engine (liquifyEngine.ts)](#24-volumetric-mesh-liquify-engine-liquifyenginets)
   - [2.5 Spline Swept Lofting Engine (loftEngine.ts)](#25-spline-swept-lofting-engine-loftenginets)
   - [2.6 Dynamic UV Texture Atlas Painting Engine (uvPaintingEngine.ts)](#26-dynamic-uv-texture-atlas-painting-engine-uvpaintingenginets)
   - [2.7 Algorithmic Shape Snapping Engine (shapeSnapping.ts)](#27-algorithmic-shape-snapping-engine-shapesnappingts)
   - [2.8 Stylus Streamline & Kalman Smoothing (strokeSmoother.ts)](#28-stylus-streamline--kalman-smoothing-strokesmootherts)
   - [2.9 Universal 8-Format Converter & Draco Suite (modelConverter.ts)](#29-universal-8-format-converter--draco-suite-modelconverterts)
   - [2.10 Multi-Format Export Service (modelExporter.ts)](#210-multi-format-export-service-modelexporterts)
   - [2.11 Asynchronous Model Loader (modelLoader.ts)](#211-asynchronous-model-loader-modelloaderts)
   - [2.12 Model Normalization & Floor Snapping (modelNormalization.ts)](#212-model-normalization--floor-snapping-modelnormalizationts)
   - [2.13 In-App Model Storage & IndexedDB (modelStorage.ts)](#213-in-app-model-storage--indexeddb-modelstoragets)
   - [2.14 Procedural Atmosphere & Skybox Engine (proceduralSky.ts)](#214-procedural-atmosphere--skybox-engine-proceduralskyts)
   - [2.15 Scaffolding & Collision Guide Engine (scaffoldingEngine.ts)](#215-scaffolding--collision-guide-engine-scaffoldingenginets)
   - [2.16 Cinematic Post-Processing Engine (postProcessingEngine.ts)](#216-cinematic-post-processing-engine-postprocessingenginets)
   - [2.17 Order-Independent Transparency Pipeline (wboitPipeline.ts)](#217-order-independent-transparency-pipeline-wboitpipelinets)
   - [2.18 WebGPU Compute & Render Manager (webgpuPipeline.ts)](#218-webgpu-compute--render-manager-webgpupipelinets)
   - [2.19 Multi-Sensory Audio & Tactile Haptics (audio.ts & haptics.ts)](#219-multi-sensory-audio--tactile-haptics-audiots--hapticsts)
   - [2.20 Native Desktop & Hardware Bridge (tauriBridge.ts & telemetryStore.ts)](#220-native-desktop--hardware-bridge-tauribridgets--telemetrystorets)
3. [Comprehensive Feature Catalog](#3-comprehensive-feature-catalog)
   - [3.1 3D Surface Inking, Free-Air Drawing & Meshing](#31-3d-surface-inking-free-air-drawing--meshing)
   - [3.2 27 Animated Procedural GLSL Shader Library](#32-27-animated-procedural-glsl-shader-library)
   - [3.3 Dynamic 2048×2048 UV Texture Atlas Painter](#33-dynamic-20482048-uv-texture-atlas-painter)
   - [3.4 3D Volumetric Mesh Liquify Deformation](#34-3d-volumetric-mesh-liquify-deformation)
   - [3.5 Catmull-Rom Spline Swept Lofts & Bent Guides](#35-catmull-rom-spline-swept-lofts--bent-guides)
   - [3.6 Algorithmic Geometric Shape Snapping](#36-algorithmic-geometric-shape-snapping)
   - [3.7 Dual-Mode Eraser: Cutout vs Vacuum](#37-dual-mode-eraser-cutout-vs-vacuum)
   - [3.8 3D Collision Scaffolding & Anatomical Guides](#38-3d-collision-scaffolding--anatomical-guides)
   - [3.9 Arbitrary 3D Plane Symmetry](#39-arbitrary-3d-plane-symmetry)
   - [3.10 Holistic Stroke DNA Inspection & Injection](#310-holistic-stroke-dna-inspection--injection)
   - [3.11 Perceptual OKLab / OKLCh Color Studio](#311-perceptual-oklab--oklch-color-studio)
   - [3.12 Procedural Skybox Studio & Scattering Engine](#312-procedural-skybox-studio--scattering-engine)
   - [3.13 Universal 8-Format Converter & Google Draco WASM](#313-universal-8-format-converter--google-draco-wasm)
   - [3.14 Bundled 3D Model Catalog (47 Models across 6 Categories)](#314-bundled-3d-model-catalog-47-models-across-6-categories)
   - [3.15 Photoshop-Grade Multi-Layer Compositing](#315-photoshop-grade-multi-layer-compositing)
   - [3.16 Cinematic Post-Processing Suite](#316-cinematic-post-processing-suite)
   - [3.17 Dual Spatial Transformation Controllers](#317-dual-spatial-transformation-controllers)
   - [3.18 Hardware-Isolated Stylus & Tablet Input](#318-hardware-isolated-stylus--tablet-input)
   - [3.19 WebXR Augmented Reality Suite](#319-webxr-augmented-reality-suite)
   - [3.20 Full Project State Persistence (.remix3d)](#320-full-project-state-persistence-remix3d)
   - [3.21 Multi-Format Export Delivery Pipeline](#321-multi-format-export-delivery-pipeline)

---

## 1. Workstation Interface & Complete Menu Hierarchy

### 1.1 Primary CAD Toolbar Dock (Toolbar.tsx)

The primary CAD workstation dock floats on the left edge of the viewport with dual operational states:

```
Workstation Toolbar Hierarchy
├── Minimized Rail Mode (id="mody-left-toolbar-minimized")
│   ├── Expand Sideways Button (ChevronRight)
│   ├── Active Tool Quick Toggle (Brush / Eraser)
│   ├── Brush Size Numeric Pill (Expands Brush Setup Shelf)
│   ├── Color Swatch Circle (Opens Color Studio Modal)
│   ├── Advanced Dynamics & Curves Trigger (Opens BrushSettingsPanel)
│   ├── Delete Active Selection (Del)
│   ├── Snap Active Model to Ground Grid
│   ├── Undo (Ctrl+Z)
│   └── Redo (Ctrl+Y)
└── Expanded Dock Mode (id="mody-left-toolbar-dock")
    ├── 1. Top Header & Selection Bar
    │   ├── Pointer / Stroke Selection Mode
    │   ├── Lasso Selection Mode
    │   ├── 3D Primitives Box Trigger (Expands Primitives Shelf)
    │   ├── Auto-Snap Active Model to Ground Grid
    │   ├── Delete Selected Stroke / Model (Del)
    │   ├── Fullscreen Toggle (Maximize / Minimize)
    │   ├── Pin Toolbar Open Toggle (Pin / PinOff)
    │   └── Minimize Sideways Button (ChevronLeft)
    ├── 2. Core 3×3 Sculpting & Drawing Tool Grid
    │   ├── Direct 3D Pen (Surface Pen)
    │   ├── 3D Curve Sketch (Spline Ink)
    │   ├── Stroke Profile Toggle (Ribbon / Tube)
    │   ├── Algorithmic Shape Snapping (ON / OFF)
    │   ├── Cutout / Vacuum Eraser Mode Toggle
    │   ├── 3D Brush Presets & DNA Studio (Opens BrushPickerModal)
    │   ├── Eyedropper Surface Finish Sampler
    │   ├── Straight Line Constraint Toggle (Ruler)
    │   └── Color & Material Studio Trigger (Opens ColorStudioModal)
    ├── 3. Horizontal Flyout Shelf Triggers (Expand to Right)
    │   ├── Brush & Stroke Setup Shelf Trigger
    │   ├── Scene & Studio Actions Shelf Trigger
    │   └── Viewport & Hardware Settings Shelf Trigger
    └── 4. Footer Bar
        ├── Undo Action (Ctrl+Z)
        ├── Web Audio Procedural Sound Toggle (Mute / Unmute)
        ├── Light / Dark Visual Theme Toggle
        └── Redo Action (Ctrl+Y)
```

---

### 1.2 Horizontal Flyout Shelves

#### A. 3D Primitives Flyout Shelf (`id="mody-primitives-flyout-menu"`)
- **Header**: `3D PRIMITIVES` title with close button (`X`).
- **2×4 Spawner Grid**:
  1. `Cube`: Procedural 3D box with rounded bevels.
  2. `Sphere`: UV sphere with geodesic subdivision.
  3. `Cylinder`: Capped circular extrusion column.
  4. `Torus`: Mathematical donut manifold with radius control.
  5. `Capsule`: Dual hemispherical capped capsule.
  6. `Cone`: Radial cone with adjustable tip sharpness.
  7. `Pyramid`: 4-sided polygonal pyramid.
  8. `Disk`: Planar circular drafting coin.

#### B. Brush & Stroke Setup Shelf (`id="mody-brush-shelf-flyout"`)
- **1. Drawing Space**: Toggle between **Surface Conformal** (snaps to underlying 3D model) and **3D Free Air** (draws on arbitrary spatial depth planes).
- **2. Finish Shaders**: 4 one-click shader material presets:
  - `Flat` (`shadeless`): Pure albedo unlit ink.
  - `PBR` (`shaded`): Physically-based rendering with roughness and metalness.
  - `Glow` (`glow`): Emissive bloom neon core.
  - `Mask` (`cutout`): Negative-space stencil cutter.
- **3. Brush Size Slider & Quick Presets**:
  - Slider: Continuous scale `0.005` to `0.25` world units.
  - Quick Multiplier Pills: `0.5px`, `1px`, `2px`, `3px`, `5px`, `8px`.
- **4. Stroke Opacity Slider**: Range `5%` to `100%`.
- **5. Quick Swatches**: 8 rapid-access palette chips (`#000000`, `#ffffff`, `#38bdf8`, `#818cf8`, `#c084fc`, `#f472b6`, `#34d399`, `#facc15`) + link to Full Color Studio.
- **6. Advanced Dynamics Button**: Opens BrushSettingsPanel.

#### C. Scene & Studio Shelf (`id="mody-scene-shelf-flyout"`)
- **3×3 Scene Action Grid**:
  1. `Models`: Opens 3D Model Library browser.
  2. `Texture / Clay`: Toggles model surface between PBR textures and neutral clay.
  3. `Clone`: Clones active 3D model instance with offset.
  4. `Show / Hide`: Toggles visibility of base 3D model.
  5. `Skybox`: Opens Procedural Skybox & Atmosphere Studio.
  6. `Grid`: Toggles 3D infinite ground grid with unit subdivision.
  7. `Layers`: Opens Photoshop-grade Layer Management Panel.
  8. `Plane`: Toggles 3D sketch canvas plane.
  9. `Reset`: Resets camera orientation to default isometric perspective.
  10. `Fullscreen`: Toggles browser hardware fullscreen mode.
- **Project File Operations**:
  - `Save Project`: Packages strokes, layers, lighting, and models into `.remix3d` JSON format.
  - `Load Project`: Parses and restores `.remix3d` project files.
- **Additional Studio Tools Extended Dropdown**:
  - `Export 3D / Textures`: Opens ExportModal.
  - `Post-Processing Shaders`: Opens RenderSettingsPanel.
  - `Volumetric Liquify`: Opens LiquifyPanel.
  - `RDP Curve Decimator`: Opens CurveDecimateModal.
  - `Collision Scaffolding`: Opens ScaffoldingModal.
  - `Reference Moodboard`: Opens FloatingReferenceClipboard.
  - `Bent Manifold Guides`: Opens BentGuideModal.
  - `Arbitrary Mirror Plane`: Opens CustomMirrorModal.
  - `WebXR AR Spatial View`: Opens ARViewerModal.

#### D. Viewport & Hardware Settings Shelf (`id="mody-settings-shelf-flyout"`)
- **Stylus Hardware Status**: Real-time indicator displaying active/proximity state of connected stylus pen.
- **Camera Projection**: Toggles **Perspective** (standard focal depth) vs **Orthographic** (parallel isometric rays).
- **Finger Touch Draw**: Toggles touch rejection mode (drawing vs navigation).
- **Radial Menu**: Toggles stylus barrel button / right-click radial context menu.
- **Appearance & Theme**: Light Mode vs Dark Mode.
- **3D Spatial Controller**: Toggles **Card Navigator**, **Circular Wheel**, **Both**, or **Hidden**.
- **Navigator Sandbox**: Launches the 6-variation interactive interaction testbench.
- **Navigator Sensitivity Slider**: Range `0.10x` to `2.00x` with presets (`0.25x`, `0.5x`, `1.0x`, `2.0x`).
- **Global UI Scale**: Step controls (`-`, `100%`, `+`) from `65%` to `160%` scaling.

---

### 1.3 Viewport HUD & Dynamic Reticles (Viewport.tsx)

- **Floating Viewport Camera Pod** (`#viewport-camera-control-pod`): Auto-hiding control cluster in bottom-right corner:
  - `Zoom In (+)`: Step camera dolly forward.
  - `Zoom Out (-)`: Step camera dolly backward.
  - `Reset View`: Snaps camera to default perspective viewpoint.
  - `Pan Mode`: Locks pointer events into planar camera translation.
- **Screen Center Crosshair Reticle** (ScreenCenterCrosshair.tsx): Displays active transformation telemetry and perfect view lock alignment.
- **Live FPS & Frame Delta Counter** (FpsCounter.tsx): Real-time performance readout rendered via zero-rerender telemetry bus.
- **Geometric Shape Snapping Toast**: Live toast indicating shape match and confidence percentage (e.g. `Snapped to Perfect Circle (98% fit)`).
- **3-Finger Gesture HUD Notification**: Floating pill confirming gesture commands (Camera Reset, Orthographic/Perspective, Zoom).
- **Drag-and-Drop Model Ingestion Overlay**: Visual drop target for GLB, OBJ, FBX, 3DS, STL, PLY, and DAE files.
- **Floating Restore Buttons**: Bottom-right pills appearing when spatial controllers are minimized (`Navigator`, `Tactile Wheel`, `Sandbox`).

---

### 1.4 Stylus Hardware Radial Context Menu (StylusRadialMenu.tsx)

Triggered at the pen tip via stylus button or right-click:

| Angle | Action | Label | Description |
| :--- | :--- | :--- | :--- |
| **-90° (Top)** | Tool | `Brush` | Activates standard 3D inking pen. |
| **-45° (Top-Right)** | Tool | `Eraser` | Activates cutout/vacuum eraser. |
| **0° (Right)** | Submenu | `Palette` | Expands quick color swatches & Color Studio link. |
| **45° (Bottom-Right)** | Submenu | `Size` | Expands continuous brush size slider & direct numpad entry. |
| **90° (Bottom)** | Action | `Undo` | Reverts last drawn stroke or transform. |
| **135° (Bottom-Left)** | Action | `Redo` | Steps forward in history stack. |
| **180° (Left)** | Submenu | `Symmetry` | Expands symmetry mode options (`None`, `X`, `Y`, `Z`, `Radial 4x`, `Radial 8x`, `Custom Plane`). |
| **-135° (Top-Left)** | Tool | `Sampler` | Activates surface Eyedropper DNA sampler. |
| **Center Ring** | Menu | `Center Button` | Resets camera view, recalculates vertex normals, or dismisses hub. |

---

### 1.5 Spatial Navigation & Transform Suite

#### Option A: Transform Navigator Hub (TransformNavigator.tsx)
- **Mode Selector Header**:
  - `2D Planar Dial` (TwoDimensionalDial.tsx): Velocity joystick disc for continuous camera plane translation, outer rotation ring, uniform/axis scaling handles.
  - `3D Gimbal Dial` (ThreeDimensionalDial.tsx): Virtual trackball sphere, Pitch (X), Yaw (Y), Roll (Z) gimbal rings, axis translation arrows.
  - `Tactile Rotary Dial` (TactileNavigatorDial.tsx): Tactile rotary dial with Web Audio clicks and haptic angle detents.
- **Target Scope Selector**: Applies transforms to `All Scene Content`, `Active 3D Model`, or `Active Layer Curves`.
- **Quick View Snapping Bar**: Instant camera snapping to `Front`, `Back`, `Top`, `Bottom`, `Left`, `Right`, and `Isometric`.
- **Curve Clipboard Bar**: `Copy Selection`, `Paste Selection`, and clipboard count badge.
- **Lock Transform Toggle**: Prevents accidental transformation inputs during drawing.
- **Real-time Telemetry Drawer**: Live readouts of Position `(X, Y, Z)`, Euler Rotation `(X, Y, Z)`, Scale `(X, Y, Z)`, and Camera Spherical Polar coordinates `(r, θ, φ)`.

#### Option B: Paper Rocket Tactile Spatial Wheel (PaperRocketTactileWheel.tsx)
- **Inertial Rotary Controller**: Simulates mechanical resistance and physical inertia for precision adjustments.
- **Mode Dial**: Switches wheel target between `Translate`, `Rotate`, `Scale`, `Brush Size`, and `Opacity`.
- **Sensory Feedback**: Web Audio synthesized mechanical clicks and Web Vibration API angle detents.

---

### 1.6 Dedicated Workstation Modals & Panels

| Component | Description |
| :--- | :--- |
| `LayerPanel.tsx` | Layer management stack supporting folders, visibility, locks, opacity, merge down, clear, and 6 GPU blend modes (`Normal`, `Multiply`, `Screen`, `Overlay`, `Add`, `Subtract`). |
| `BrushSettingsPanel.tsx` | Brush size, opacity, roughness, metalness, emissive intensity, smoothing algorithms, spatial jitter, arch segments, dome factor, taper length, silhouette clamping, patterns, and chisel angles. |
| `ColorStudioModal.tsx` | Color studio supporting RGB, HSL, OKLab, and polar OKLCh color models, harmonic scheme generator, perceptual gradients, toon posterization, and 1-click shader applications. |
| `HolisticDNAInspector.tsx` | Stroke DNA inspector displaying hex, linear RGB, opacity, roughness, metalness, normal orientation, and pressure graph, with 1-click parameter injection. |
| `ModelLibraryModal.tsx` | 3D model browser with 47 bundled presets across 6 categories, IndexedDB local storage, search, filter, and 1-click canvas loading. |
| `ModelConverterModal.tsx` | Universal 8-format converter (GLB, GLTF, OBJ, FBX, 3DS, STL, PLY, DAE) with Google Draco WASM quantization, axis reorientation, bounding box normalization, and floor grid snapping. |
| `ModelDisplayPanel.tsx` | Surface display inspector (Textured PBR vs Neutral Clay), model opacity, wireframe opacity, and model metadata. |
| `SkyEnvironmentPanel.tsx` | Atmospheric scattering (Rayleigh/Mie), 2D celestial dome widget, 24-hour diurnal cycle, volumetric clouds, crepuscular god rays, distance/height fog, gradient curves, and 360° panorama exporter. |
| `LiquifyPanel.tsx` | 3D volumetric mesh deformation (Push, Pinch, Inflate, Comb) with KD-tree acceleration, influence radius, falloff curves, smoothing iterations, and A/B compare toggle. |
| `BentGuideModal.tsx` | Catmull-Rom spline swept lofts (Arch, S-Curve, Loop, Spiral, Custom from Stroke) with Ribbon, Arc, U-Channel, and Pipe cross-section profiles, banking twist, and curve tension. |
| `ScaffoldingModal.tsx` | Anatomical mannequins (torso, limbs), Loomis head spheres, vehicle chassis, capsules, and primitive collision guides with Solid, Ghost, and Invisible collision render modes. |
| `CustomMirrorModal.tsx` | Arbitrary 3D plane symmetry configuration (origin point, normal vector) with camera view alignment and semi-transparent planar guide helpers. |
| `CurveDecimateModal.tsx` | Douglas-Peucker (RDP) 3D curve decimation and mesh polygon reduction with epsilon tolerance control and live point reduction telemetry. |
| `RaycastSettingsModal.tsx` | Sub-step raycasting density (`Standard`, `High`, `Ultra`), double-sided polygon hits, air-gap splitting, barycentric normal interpolation, and seam bridging. |
| `ARViewerModal.tsx` | WebXR augmented reality viewer with surface hit testing, 1:1 real-world scale placement, elevation sliders, and desktop simulation mode. |
| `FloatingReferenceClipboard.tsx` | Reference image moodboard with tracing mode (pointer-event pass-through), pin-to-screen HUD, opacity, blend modes, grayscale, inversion, and horizontal/vertical flips. |
| `NumpadModal.tsx` | On-screen touch-precision numpad for stylus and tablet users with min/max clamping and unit indicators. |
| `MobileConnectModal.tsx` | LAN session QR code generator and local network IP address display for remote tablet painting. |
| `NavigatorSandbox.tsx` | Interactive testbench featuring 6 navigation controller variations (Minimal Planar, Dual-Ring Gimbal, Tactile Wheel, Mobile Gamepad, Vernier Slider, Dockable Widget). |

---

## 2. Complete Function & Method Index

### 2.1 Core 3D Engine Methods (StudioEngine in studioEngine.ts)

#### Scene Lifecycle & Render Loop
- `constructor(container: HTMLElement)`: Mounts Three.js scene, camera, renderer, post-processing pipeline, and spatial acceleration trees.
- `refreshRect(): DOMRect`: Computes canvas client bounding box and offset matrices.
- `screenToWorld(screenX: number, screenY: number, targetZ?: number): THREE.Vector3`: Unprojects 2D screen coordinates into 3D world space.
- `checkHover(clientX: number, clientY: number): boolean`: Performs hit-testing to detect pointer hover over interactive 3D meshes.
- `resize(width: number, height: number): void`: Resizes viewport buffer and recalculates projection matrices for perspective and orthographic cameras.
- `markDirty(): void`: Notifies the render loop to redraw dirty frames on static scenes.
- `setHasAnimatedContent(active: boolean): void`: Activates continuous 60fps frame stepping for animated GLSL shaders.
- `dispose(): void`: Safely releases WebGL/WebGPU contexts, geometries, textures, materials, and BVH structures.

#### Model Ingestion, Parsing & Normalization
- `loadPresetModel(presetId: string, initialDisplayMode?: ModelDisplayMode): Promise<void>`: Loads bundled assets with Draco decompression.
- `setModelObject(obj: THREE.Object3D, name: string, modelDef?: any): void`: Ingests a Three.js hierarchy into the scene graph and generates BVH acceleration trees.
- `loadDirectObject3D(obj: THREE.Object3D, name: string): void`: Directly injects arbitrary 3D geometry into active workspace.
- `addPrimitiveToScene(obj: THREE.Object3D, name: string): void`: Spawns procedural primitive geometries.
- `loadGLTF(bufferOrUrl: ArrayBuffer | string, name: string, modelDef?: any): Promise<void>`: Parses binary GLB or JSON glTF buffers.
- `loadOBJ(textOrUrl: string, name: string): Promise<void>`: Parses Wavefront OBJ and MTL structures.
- `loadUniversalFiles(files: FileList | File[]): Promise<void>`: Auto-routes multi-format archives (GLB, OBJ, FBX, STL, PLY, 3DS, DAE).
- `clearModel(restoreDrawingPlane?: boolean): void`: Cleans model hierarchies and restores default sketch canvas.
- `setupDefaultDrawingPlane(center?: THREE.Vector3, normal?: THREE.Vector3, width?: number, height?: number): void`: Creates a double-sided sketch canvas.
- `cloneModel(offset?: THREE.Vector3): THREE.Object3D | null`: Duplicates active model with cloned material instances.
- `centerModelToOrigin(): void`: Translates model center of mass to `(0, 0, 0)`.
- `snapActiveToGround(targetScope?: TransformTargetScope): void`: Aligns lowest bounding box coordinate to floor grid `(Y=0)`.
- `deleteActiveSelection(): boolean`: Removes currently highlighted curve, stroke, or model entity.
- `notifyModelsChanged(): void`: Dispatches scene hierarchy updates to UI subscribers.
- `getLoadedModels(): LoadedModelInfo[]`: Returns catalog of loaded model instances.
- `setActiveSelectedModel(modelId: string | null): void`: Sets active transformation target model.
- `getActiveSelectedModelId(): string | null`: Retrieves active model identifier.
- `getDrawingPlane(): THREE.Mesh | null`: Retrieves reference to sketch plane canvas.
- `toggleDrawingPlane(visible?: boolean): boolean`: Shows or hides the 3D drawing plane canvas.

#### Surface Collision & Raycasting
- `raycastModel(screenX: number, screenY: number, settings?: BrushSettings): RaycastResult`: Computes sub-millisecond BVH accelerated ray-triangle intersections.
- `raycastSpatialPlane(screenX: number, screenY: number, depthOffset?: number): RaycastResult`: Intersects free spatial air-drawing planes.
- `raycastSelection(screenX: number, screenY: number): { type: 'stroke' | 'model' | 'none'; id?: string; name?: string }`: Performs hit tests to select existing strokes or mesh parts.
- `raycastStroke(screenX: number, screenY: number): string | null`: Identifies nearest vector stroke descriptor.
- `purgeStrokesIntersecting(screenX: number, screenY: number, radiusWorld?: number): StrokeDescriptor[]`: Evaluates intersection spheres for vacuum eraser.
- `updateCursor(screenX: number, screenY: number, brushSize: number, settings?: BrushSettings, tool?: ToolType): void`: Updates 3D visual brush cursor, normal ring, and tangent guides.
- `hideCursor(): void`: Hides 3D cursor on viewport exit.

#### Inking, Painting & Stroke Synthesis
- `startStroke(point: StrokePoint, settings: BrushSettings, layerId: string, tool: ToolType): void`: Initializes a new stroke chain.
- `addStrokePoint(point: StrokePoint, settings: BrushSettings, layerId: string): void`: Appends points, calculates Bishop parallel transport frames, and builds conformal ribbon/tube mesh segments.
- `endStroke(simplify?: boolean, settings?: BrushSettings): void`: Finalizes stroke geometry, closes caps, and registers undo commands.
- `cancelStroke(): void`: Discards incomplete stroke geometry.
- `snapActiveStroke(shapeType: DetectedShapeType): void`: Replaces freehand point array with fitted geometric primitive.
- `sampleHolisticDNA(screenX: number, screenY: number): HolisticStrokeDNA | null`: Reads surface color, roughness, metalness, normal orientation, and shader properties.
- `sampleColorAtScreen(screenX: number, screenY: number, clientX?: number, clientY?: number): string`: Samples pixel color from framebuffer.
- `recalculateMeshNormals(layerId?: string): number`: Re-indexes and re-averages vertex normal vectors across drawn geometry.
- `recreateStrokeFromDescriptor(desc: StrokeDescriptor): void`: Reconstructs a full 3D mesh from saved vector data.

#### Multi-Layer Compositing & State
- `setActiveLayer(layerId: string, opacity?: number): void`: Sets active drawing layer.
- `getActiveLayerId(): string`: Returns active layer identifier.
- `syncLayers(layers: Layer[]): void`: Synchronizes visibility, opacity, and blend modes across all layers.
- `mergeLayerDown(topLayerId: string, bottomLayerId: string, topOpacity: number, topBlendMode?: LayerBlendMode): void`: Merges layer geometry into lower target.
- `clearAllStrokes(): void`: Flushes all stroke meshes across all layers.
- `deleteLayerStrokes(layerId: string): void`: Deletes strokes associated with specific layer ID.
- `getLayersSnapshot(): Layer[]`: Returns clone of layer state hierarchy.

#### History & Undo / Redo
- `undo(): boolean`: Steps backward through unified stroke/model history stack.
- `redo(layers: Layer[]): boolean`: Steps forward through redo history stack.

#### Clipboard Operations
- `copyStrokes(layerId?: string): number`: Copies vector stroke descriptors to in-memory clipboard.
- `pasteStrokes(targetLayerId?: string, offset?: THREE.Vector3): number`: Duplicates clipboard strokes into active workspace.
- `getClipboardCount(): number`: Returns number of copied vector curves.

#### Camera, View & Projection
- `orbit(deltaX: number, deltaY: number): void`: Smooth polar spherical camera rotation.
- `pan(deltaX: number, deltaY: number): void`: Camera translation along screen-space axes.
- `zoom(deltaDistance: number): void`: Camera dolly / zoom adjustment.
- `getCameraSpherical(): { radius: number; theta: number; phi: number }`: Returns camera polar coordinates `(radius, theta, phi)`.
- `orbitCamera(deltaTheta: number, deltaPhi: number): void`: Explicit spherical delta rotation.
- `setCameraView(theta: number, phi: number, radius?: number): void`: Sets camera coordinates.
- `zoomCamera(deltaRadius: number): void`: Adjusts camera distance.
- `resetView(): void`: Resets camera to default perspective viewpoint.
- `resetCamera(): void`: Resets camera orientation and zoom.
- `snapToView(view: PerfectViewType): void`: Snaps camera to Front, Back, Top, Bottom, Left, Right, or Isometric views.
- `getPerfectView(): PerfectViewInfo`: Evaluates camera angle against standard orthographic view axes.
- `getCamera(): THREE.PerspectiveCamera`: Returns Three.js PerspectiveCamera instance.
- `getScene(): THREE.Scene`: Returns Three.js Scene instance.
- `getRenderer(): THREE.WebGLRenderer`: Returns Three.js WebGLRenderer instance.
- `getFov(): number` / `setFov(fov: number): void` / `adjustFov(delta: number): number`: Field-of-view inspection and adjustment.
- `getProjectionMode(): 'perspective' | 'orthographic'` / `setProjectionMode(mode: 'perspective' | 'orthographic'): void` / `toggleProjectionMode(): 'perspective' | 'orthographic'`: Toggles perspective vs orthographic projection.

#### Spatial Transformation & Gizmos
- `beginTransform(scope?: TransformTargetScope): void`: Captures pre-transform matrix states.
- `endTransform(): void`: Commits transform actions to history stack.
- `applyTransformMatrix(matrix: THREE.Matrix4, scope?: TransformTargetScope): void`: Applies arbitrary 4×4 affine matrix.
- `translateScreenSpace(deltaX: number, deltaY: number, scope?: TransformTargetScope, locked?: boolean): void`: Translates targets relative to camera view plane.
- `scaleScreenSpace(deltaScale: number, scope?: TransformTargetScope, locked?: boolean): void`: Uniformly scales targets from screen input.
- `rotateScreenSpace(deltaAngle: number, scope?: TransformTargetScope, locked?: boolean): void`: Rotates targets around camera viewing axis.
- `translateWorldAxis(axis: 'x' | 'y' | 'z', delta: number, scope?: TransformTargetScope): void`: Translates targets along world X, Y, or Z.
- `rotateWorldAxis(axis: 'x' | 'y' | 'z', radians: number, scope?: TransformTargetScope): void`: Rotates targets around world axes.
- `rotateTrackball(rx: number, ry: number, scope?: TransformTargetScope): void`: Free-axis 3D virtual trackball rotation.
- `translateAxis3D(axis: 'x' | 'y' | 'z', delta: number, scope?: TransformTargetScope): void`: Translates targets along local axes.
- `rotateAxis3D(axis: 'x' | 'y' | 'z', radians: number, scope?: TransformTargetScope, locked?: boolean): void`: Rotates targets along local axes.
- `scaleAxis(axis: 'x' | 'y' | 'z' | 'uniform', factor: number, scope?: TransformTargetScope, locked?: boolean): void`: Scales targets along specified axis or uniformly.
- `scaleAxis3D(axis: 'x' | 'y' | 'z' | 'uniform', factor: number, scope?: TransformTargetScope): void`: Dedicated 3D axis scaling.
- `resetTransform(scope?: TransformTargetScope): void`: Restores identity transform matrix.
- `getSelectionCenter(scope?: TransformTargetScope): THREE.Vector3`: Computes bounding box center of target selection.
- `getScreenCenterWorldAnchor(targetCenter?: THREE.Vector3): THREE.Vector3`: Calculates screen center projection point in world space.
- `setNavigatorSensitivity(s: number): void` / `getNavigatorSensitivity(): number`: Sets velocity and movement scaling.

#### Model Display & Shading Modes
- `setModelDisplayMode(mode: ModelDisplayMode): void`: Switches between PBR textured and Clay neutral shaders.
- `getModelDisplayMode(): ModelDisplayMode`: Returns active display mode.
- `setModelCustomMaterial(material: THREE.Material): void`: Applies custom shader material to 3D model.
- `setModelOpacity(opacity: number): void`: Controls base model transparency.
- `setModelWireframeOpacity(opacity: number): void`: Adjusts wireframe overlay opacity.
- `getIsModelVisible(): boolean` / `toggleModelVisibility(visible?: boolean): boolean`: Controls model visibility.
- `toggleWireframe(show: boolean): void` / `setWireframe(show: boolean): void`: Controls wireframe rendering.
- `toggleGrid(show: boolean): void` / `setGrid(show: boolean): void`: Controls ground grid visibility.
- `setTheme(theme: 'light' | 'dark'): void`: Synchronizes viewport background color to UI theme.

#### Illumination & Procedural Skybox Integration
- `setLightingPreset(preset: LightingPreset): void`: Applies Studio, Daylight, Neon, Sunset, or Clay lighting setups.
- `setSkyPreset(preset: SkyPresetName): void`: Applies atmospheric sky presets.
- `setSunAngles(azimuthDeg: number, elevationDeg: number): void` / `setSunPositionVector(x: number, y: number, z: number): void`: Controls celestial sun orientation.
- `setTimeOfDay(hours: number): void` / `getTimeOfDay(): number`: Controls 24-hour diurnal cycle.
- `setSunIntensity(intensity: number): void` / `setSunColor(colorHex: string): void`: Adjusts direct solar illuminant.
- `setAmbientIntensity(intensity: number): void` / `setSunCoronaIntensity(val: number): void`: Adjusts ambient fill and solar bloom.
- `getIlluminationState(): any`: Queries lighting parameters.
- `setCloudCoverage(coverage: number): void` / `setCloudDensity(density: number): void` / `setCloudSpeed(speed: number): void` / `setCloudWindAngle(degrees: number): void` / `setCloudScale(scale: number): void` / `setCloudTurbulence(turb: number): void` / `setCloudOpacity(opacity: number): void` / `setCloudColor(hex: string): void` / `setCloudShadow(hex: string): void` / `setEnableClouds(enabled: boolean): void`: Configures volumetric clouds.
- `setEnableGodRays(enabled: boolean): void` / `setGodRaysIntensity(intensity: number): void` / `setGodRaysDensity(density: number): void` / `setGodRaysDecay(decay: number): void` / `setGodRaysColor(hex: string): void`: Configures crepuscular god rays.
- `getSkySettings(): SkySettings`: Returns sky parameter structure.
- `ensureBaselineLighting(): void`: Validates that scene is illuminated.

#### Post-Processing & Hardware Profiling
- `setPostProcessSettings(settings: Partial<PostProcessSettings>): void` / `getPostProcessSettings(): PostProcessSettings`: Configures toon shading, bloom, DoF, grain, and pixelation.
- `detectGPUHardware(): Promise<GPUInfo>` / `getGPUInfo(): GPUInfo`: Probes WebGL 2.0 / WebGPU hardware limits.
- `getQualityProfile(): QualityProfile`: Returns performance tier optimizations.

#### Volumetric Liquify Engine Integration
- `startLiquifySession(): void`: Builds spatial KD-tree across existing stroke geometry.
- `applyLiquifyAtScreen(screenX: number, screenY: number, settings: LiquifySettings): void`: Deforms mesh vertices inside brush influence radius.
- `setLiquifyCompare(active: boolean): void`: Toggles A/B comparison against original un-deformed geometry.
- `commitLiquify(): void`: Bakes deformed vertex coordinates into permanent geometry.
- `discardLiquify(): void`: Reverts geometry to pre-deformation state.

#### Bent Guides & Lofting Integration
- `createPresetBentGuide(type: 'arch' | 'scurve' | 'loop' | 'spiral', origin?: THREE.Vector3): BentGuideConfig`: Spawns Catmull-Rom spline guide curves.
- `createBentGuideFromSelectedStroke(): BentGuideConfig | null`: Converts drawn stroke into an editable guide curve.
- `removeBentGuide(id: string): void`: Deletes bent guide instance.
- `updateBentGuideParameters(id: string, params: Partial<BentGuideConfig>): BentGuideConfig | null`: Updates spline tension, divisions, profile, twist, and radius.
- `toggleBentGuideVisibility(id: string, visible: boolean): void`: Toggles visibility of bent guide wireframe.
- `getBentGuides(): BentGuideConfig[]`: Returns active bent guide instances.

#### Scaffolding & Collision Guides Integration
- `getScaffoldingEngine(): ScaffoldingEngine`: Returns reference to scaffolding engine.
- `createProxyScaffold(type: ScaffoldProxyType, name?: string): CollisionGuideMeshConfig`: Spawns mannequin, head sphere, chassis, or primitive scaffolding.
- `loadCollisionMeshFromObject(object: THREE.Object3D, name?: string): CollisionGuideMeshConfig`: Converts loaded mesh into a collision guide.
- `removeScaffold(id: string): void`: Deletes scaffolding guide.
- `updateScaffold(id: string, updates: Partial<CollisionGuideMeshConfig>): CollisionGuideMeshConfig | null`: Updates position, rotation, scale, or render mode of scaffolding.
- `getScaffolds(): CollisionGuideMeshConfig[]`: Returns catalog of scaffolding guides.
- `importImageBillboardToStage(imageUrl: string, name?: string): void`: Creates 3D image plane billboard in scene.
- `toggleMeshGuideCollider(meshId: string, isCollider: boolean): void`: Toggles whether a mesh acts as a raycast surface.

#### Arbitrary 3D Mirror Symmetry
- `setCustomMirrorPlane(origin: THREE.Vector3, normal: THREE.Vector3, visible: boolean): void`: Sets arbitrary 3D plane symmetry orientation.
- `toggleCustomMirrorPlane(enabled: boolean): void`: Toggles custom plane mirror calculation.
- `getCameraOrientationForMirror(): { origin: THREE.Vector3; normal: THREE.Vector3 }`: Calculates mirror plane aligned with camera view direction.

#### Curve Decimation
- `decimateCurves(epsilon: number, preserveTopology?: boolean): number`: Runs Douglas-Peucker simplification on active strokes.

#### WebXR Augmented Reality Suite
- `startWebXRSession(): Promise<boolean>`: Initiates WebXR AR session with surface hit testing.
- `stopWebXRSession(): void`: Exits WebXR session.
- `enableSimulatedARMode(enabled: boolean): void`: Activates camera-pass-through simulation.
- `setARSceneElevation(elevation: number): void`: Adjusts real-world model elevation.

#### Project Export & Snapshot
- `exportGLB(): Promise<Blob>`: Generates binary glTF buffer containing models and strokes.
- `exportOBJ(): string`: Generates Wavefront OBJ text representation.
- `captureSnapshot(): string`: Renders high-resolution image to base64 Data URL.
- `exportProjectData(projectName?: string, explicitLayers?: Layer[]): ProjectSaveData`: Packages full scene state into `.remix3d` JSON format.
- `exportProjectFile(filename?: string): void`: Triggers download of `.remix3d` project file.
- `importProjectData(project: ProjectSaveData): void`: Restores scene from `.remix3d` structure.

---

### 2.2 Color Science & Perceptual Math (colorMath.ts)

- `srgbToLinear(c: number): number` / `linearToSrgb(c: number): number`: Standard sRGB gamma compression and decompression curves.
- `linearRgbToOklab(r: number, g: number, b: number): OKLabColor` / `oklabToLinearRgb(L: number, a: number, b: number): { r: number; g: number; b: number }`: Transformations to and from Björn Ottosson's perceptual OKLab color space.
- `hexToOKLab(hex: string): OKLabColor` / `oklabToHex(lab: OKLabColor): string`: Converts hexadecimal web color strings directly to and from OKLab Cartesian coordinates.
- `oklabToOKLCH(lab: OKLabColor): OKLCHColor` / `oklchToOKLab(lch: OKLCHColor): OKLabColor`: Converts OKLab Cartesian coordinates `(L, a, b)` to Polar cylindrical coordinates `(L, C, h)`.
- `hexToOKLCH(hex: string): OKLCHColor` / `oklchToHex(lch: OKLCHColor): string`: Direct hexadecimal to polar OKLCh transformations.
- `hsvToRgb(h: number, s: number, v: number)` / `rgbToHsv(r: number, g: number, b: number)`: HSV to RGB color conversions.
- `hexToHsv(hex: string)` / `hsvToHex(h: number, s: number, v: number)`: Hexadecimal to HSV conversions.
- `hexToRgb(hex: string)` / `rgbToHex(r: number, g: number, b: number)`: Standard Hex-RGB conversions.
- `oklabMix(hexA: string, hexB: string, t: number): string`: Blends two hex colors along the perceptual OKLab straight line, preventing dark or muddy intermediate hues.
- `oklchMix(hexA: string, hexB: string, t: number, hueInterpolation?: 'shorter' | 'longer' | 'increasing' | 'decreasing'): string`: Polar color interpolation with customizable cylindrical hue trajectory.
- `generateOKLabGradient(hexA: string, hexB: string, steps?: number): string[]`: Generates multi-stop linear color gradients evaluated in OKLab space.
- `generateOKLCHGradient(hexA: string, hexB: string, steps?: number, direction?: 'cw' | 'ccw' | 'shortest'): string[]`: Generates polar gradients without muddy midtones.
- `generateHarmonies(hex: string): ColorHarmonies`: Computes `complementary`, `monochromatic`, `analogous`, `splitComplementary`, `triadic`, and `tetradic` harmonic color sets in OKLCh polar space.
- `posterizeOKLCH(hex: string, levels?: number): string`: Quantizes color lightness into discrete cartoon shading bands.
- `computeLinearIllumination(baseColor: string, normal: THREE.Vector3, lightDir: THREE.Vector3, ambientIntensity: number, lightIntensity: number): Float32Array`: Computes physically linear vertex shading.
- `convertColorArrayToLinearGLTF(srgbColors: Float32Array | number[]): Float32Array`: Sanitizes vertex color buffers for glTF compliance.
- `ensureGeometryLinearVertexColors(geometry: THREE.BufferGeometry): void`: In-place buffer normalization to linear color space.

---

### 2.3 3D Conformal Bead & Bishop Geometry (conformalBeadGenerator.ts)

- `ConformalBeadGenerator.generateBeadGeometry(points: StrokePoint[], settings: BrushSettings): THREE.BufferGeometry`: Constructs smooth 3D geometry using Bishop parallel transport frames, arched cross-sections, silhouette edge clamping, and tapered end-caps.
- `computeBishopFrames(points: StrokePoint[]): { tangents: THREE.Vector3[]; normals: THREE.Vector3[]; binormals: THREE.Vector3[] }`: Calculates torsion-free orthonormal normal and binormal vectors along 3D trajectories.
- `buildConformalCrossSection(radius: number, segments: number, domeFactor: number): THREE.Vector2[]`: Generates arched conformal vertex rings.
- `applySilhouetteClamping(vertices: Float32Array, normals: Float32Array, camera: THREE.Camera): void`: Eliminates coplanar z-fighting along grazing angles.

---

### 2.4 Volumetric Mesh Liquify Engine (liquifyEngine.ts)

- `VolumetricLiquifyEngine.initialize(meshes: THREE.Mesh[]): void`: Builds spatial KD-tree indices over vertex positions.
- `applyDeformation(worldOrigin: THREE.Vector3, direction: THREE.Vector3, radius: number, strength: number, mode: LiquifyMode): void`: Applies Push, Pinch, Inflate, or Comb deformation vectors within falloff radius.
- `smoothMesh(iterations: number): void`: Performs Laplacian smoothing across deformed vertices.
- `commit(): void` / `revert(): void`: Applies or cancels changes to underlying Three.js buffer attributes.

---

### 2.5 Spline Swept Lofting Engine (loftEngine.ts)

- `LoftGuideEngine.generateSweptLoft(curvePoints: THREE.Vector3[], profile: 'ribbon' | 'arc' | 'uchannel' | 'pipe', radius: number, twist: number, tension: number): THREE.BufferGeometry`: Sweeps Ribbon, Arc, U-Channel, or Pipe cross-sections along 3D Catmull-Rom splines.
- `evaluateCatmullRomSpline(controlPoints: THREE.Vector3[], divisions: number, tension: number): THREE.Vector3[]`: Computes smooth C1-continuous 3D splines.

---

### 2.6 Dynamic UV Texture Atlas Painting Engine (uvPaintingEngine.ts)

- `UVPaintingEngine.attachToModel(root: THREE.Object3D): void`: Generates dynamic 2048×2048 texture atlas overlay meshes.
- `beginStroke(uv: THREE.Vector2, settings: BrushSettings, layerId?: string): void` / `paintTo(uv: THREE.Vector2, settings: BrushSettings, pressure?: number): void` / `endStroke(): void`: Binds 3D raycast hits into 2D UV texture space using barycentric triangle interpolation.
- `sampleColorAtUV(uv: THREE.Vector2): string | null`: Reads diffuse color directly from UV coordinate on texture map.
- `compositeLayers(layers?: Layer[]): THREE.Texture`: Flattens multi-layer texture stack into active WebGL texture.
- `exportPNG(): string`: Exports dynamic painted texture atlas to PNG format.

---

### 2.7 Algorithmic Shape Snapping Engine (shapeSnapping.ts)

- `ShapeSnappingEngine.recognizeShape(points: StrokePoint[], tolerance?: number): ShapeSnapResult`: Recognizes freehand 3D strokes as lines, circles, ellipses, arcs, or regular polygons.
- `fitLine(points: THREE.Vector3[]): { p1: THREE.Vector3; p2: THREE.Vector3; confidence: number }`: Fits best-fit 3D line segment.
- `fitCircle(points: THREE.Vector3[]): { center: THREE.Vector3; radius: number; normal: THREE.Vector3; confidence: number }`: Fits best-fit 3D circular ring with calculated plane normal.
- `fitArc(points: THREE.Vector3[]): { center: THREE.Vector3; radius: number; startAngle: number; endAngle: number; normal: THREE.Vector3; confidence: number }`: Fits partial 3D circular arc.
- `fitPolygon(points: THREE.Vector3[]): { corners: THREE.Vector3[]; sides: number; confidence: number }`: Detects corner angle discontinuities to fit regular triangles, rectangles, and polygons.

---

### 2.8 Stylus Streamline & Kalman Smoothing (strokeSmoother.ts)

- `StrokeSmoother.smoothPoint(point: THREE.Vector3, algorithm: SmoothingAlgorithm, strength: number): THREE.Vector3`: Applies Streamline, Exponential, or Kalman filter smoothing to raw stylus inputs.
- `reset(): void`: Resets historical sample windows on pen lift.

---

### 2.9 Universal 8-Format Converter & Draco Suite (modelConverter.ts)

- `ModelConverterEngine.convert(file: File, config: ModelTransformConfig): Promise<{ gltf: ArrayBuffer; metadata: ModelMetadata }>`: Ingests GLB, GLTF, OBJ, FBX, 3DS, STL, PLY, and DAE, sanitizing coordinate axes, normal vectors, and materials.
- `compressDraco(gltfData: ArrayBuffer, dracoConfig: DracoCompressionConfig): Promise<ArrayBuffer>`: Quantizes positions, normals, texture coordinates, and colors with Google Draco WASM.
- `inspectModel(object: THREE.Object3D): DeepModelMetadata`: Analyzes mesh hierarchy, triangle counts, vertex counts, and file savings.

---

### 2.10 Multi-Format Export Service (modelExporter.ts)

- `ModelExporterService.export(scene: THREE.Scene, settings: ModelExportSettings): Promise<ModelExportResult>`: Packages GLB (with Draco option), OBJ + MTL, JSON vector strokes, and PNG snapshots into a unified `.zip` archive via JSZip.

---

### 2.11 Asynchronous Model Loader (modelLoader.ts)

- `ModelLoaderService.loadModel(file: File | string, tier?: LoadingTier): Promise<LoadResult>`: Loads 3D formats with 4-tier error-recovery fallbacks and automatic BVH spatial acceleration indexing.

---

### 2.12 Model Normalization & Floor Snapping (modelNormalization.ts)

- `ModelNormalizationService.normalizeModel(object: THREE.Object3D, targetRadius?: number, snapFloor?: boolean): ScaleAnalysis`: Scales bounding box to fit standard unit sphere, centers object mass to origin, and translates lowest geometry vertex to `(Y=0)`.

---

### 2.13 In-App Model Storage & IndexedDB (modelStorage.ts)

- `ModelStorageManager.saveModel(id: string, name: string, blob: Blob, thumbnail: string, metadata: ModelMetadata): Promise<void>`: Saves 3D model blobs and metadata to browser IndexedDB.
- `getModel(id: string): Promise<SavedModelRecord | null>` / `getAllModels(): Promise<SavedModelRecord[]>` / `deleteModel(id: string): Promise<void>` / `renameModel(id: string, name: string): Promise<void>`: CRUD operations for locally stored 3D assets.

---

### 2.14 Procedural Atmosphere & Skybox Engine (proceduralSky.ts & src/engine/)

- `ProceduralSkyEngine.applyPreset(preset: string | EnvironmentPreset): void`: Sets Rayleigh/Mie optical scattering parameters.
- `exportEquirectangularPanorama(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, resolution?: number): Promise<string>`: Renders full 360° spherical cubemap panorama textures.
- `generateWebGPUBareboneCode(preset: EnvironmentPreset, camera: CameraSettings): string`: Exports standalone WGSL shader code.

---

### 2.15 Scaffolding & Collision Guide Engine (scaffoldingEngine.ts)

- `ScaffoldingEngine.createProxyScaffold(type: ScaffoldProxyType, name?: string): CollisionGuideMeshConfig`: Spawns anatomical mannequins, Loomis head spheres, vehicle chassis, or capsules.
- `getActiveColliderMeshes(): THREE.Mesh[]`: Returns BVH collision meshes for drawing in air.

---

### 2.16 Cinematic Post-Processing Engine (postProcessingEngine.ts)

- `PostProcessingEngine.render(scene: THREE.Scene, camera: THREE.Camera): void`: Evaluates multi-pass compositing passes (Cel Shading, Bloom, Depth of Field, Film Grain, Pixelation).

---

### 2.17 Order-Independent Transparency Pipeline (wboitPipeline.ts)

- `WBOITPipeline.renderComposite(destinationTarget: THREE.WebGLRenderTarget | null): void`: Evaluates accumulation and revealage framebuffer targets to render overlapping translucent strokes without depth sorting artifacts.

---

### 2.18 WebGPU Compute & Render Manager (webgpuPipeline.ts)

- `WebGPUPipelineManager.initWebGPU(): Promise<GPUInfo>`: Initializes WebGPU compute device, queries adapter capabilities, and manages WGSL compute pipelines for particle systems and procedural atmosphere.

---

### 2.19 Multi-Sensory Audio & Tactile Haptics (audio.ts & haptics.ts)

- `playHapticSound(type: 'click' | 'snap' | 'tick' | 'detent' | 'spring' | 'pop' | 'success', pitchMultiplier?: number): void`: Synthesizes rotary clicks, detent snaps, ticks, and confirmation sounds using the Web Audio API.
- `haptics.trigger(pattern: HapticType): void`: Dispatches single pulses, double pulses, success sequences, or error buzzes via the Web Vibration API.
- `haptics.checkAngleDetent(currentAngle: number, lastAngle: number, stepDegrees?: number): boolean`: Fires tactile pulses at fixed angular intervals during dial rotation.

---

### 2.20 Native Desktop & Hardware Bridge (tauriBridge.ts & telemetryStore.ts)

- `TauriBridge.saveModelFile(filename: string, data: Uint8Array | string | Blob, filters?: FileFilterOption[]): Promise<string | null>`: Native desktop OS file save dialog.
- `TauriBridge.openModelFile(filters?: FileFilterOption[]): Promise<{ name: string; data: Uint8Array } | null>`: Native desktop OS file open dialog.
- `publishCameraPose(radius: number, theta: number, phi: number): void` / `subscribeCameraPose(listener: Listener): () => void`: Zero-rerender camera telemetry bus.
- `publishFps(value: number): void` / `subscribeFps(listener: Listener): () => void`: Zero-rerender frame rate telemetry bus.

---

## 3. Comprehensive Feature Catalog

### 3.1 3D Surface Inking, Free-Air Drawing & Meshing
1. **BVH-Accelerated Continuous Collision**: Integrates `three-mesh-bvh` into Three.js geometries for sub-millisecond continuous raycast collision on multi-million polygon meshes.
2. **Arched Conformal 3D Beads**: Uses Bishop parallel transport frames and arched cross-sections to generate smooth geometry along arbitrary 3D surface paths.
3. **Silhouette Edge Clamping**: Clamps stroke edges along grazing angles to eliminate coplanar z-fighting.
4. **Smooth End-Cap Tapers**: Automatically tapers stroke start and end caps based on stylus pressure.
5. **Free Spatial 3D Drawing (Air Inking)**: Supports drawing on 3D spatial planes unconstrained by underlying model meshes.
6. **Double-Sided Polygon Raycasting**: Allows drawing on single-sided and back-facing polygon surfaces.
7. **Air-Gap Occlusion Splitting**: Splits strokes across geometry gaps when tolerance thresholds are exceeded.
8. **Raycast Seam Bridging**: Micro-jitter fallback passes to bridge raycast seams across UV seams and adjacent polygons.
9. **Mesh Normal Recalculation**: Recomputes vertex normals across drawn meshes to ensure correct lighting reflections.

---

### 3.2 27 Animated Procedural GLSL Shader Library

Dynamic shaders with per-frame uniform time updates:

| Shader Name | Visual Effect & Physical Model |
| :--- | :--- |
| `fire` | Volumetric flame turbulence with thermal color ramps. |
| `ocean_wave` | Perlin crest displacement with foam borders. |
| `waterfall` | Directional downward flow with velocity vectors. |
| `caustic` | Sub-surface light refraction patterns. |
| `foam` | Aerated bubble noise clusters. |
| `ripple` | Radial wave disturbances. |
| `lava` | Glowing incandescent magma flow. |
| `galaxy` | Spiral galactic core with rotating stellar dust. |
| `rainbow` | Polar chromatic dispersion. |
| `lightning` | Branching electrical discharge arcs. |
| `glitter` | View-dependent specular sparkling. |
| `candy` | Iridescent sweet confection wraps. |
| `slime` | Organic viscous flow with surface tension. |
| `sparkler` | Pyrotechnic particle embers. |
| `foliage_leaf` | Stylized organic leaf venation. |
| `foliage_fir` | Crystalline pine needle structures. |
| `cloud` | Volumetric billow noise. |
| `jelly` | Translucent subsurface bounce. |
| `plasma` | High-energy electric wave fields. |
| `volumetric_plasma` | 3D multi-frequency plasma noise. |
| `rim_light` | Grazing Fresnel highlights. |
| `anime_cel` | Banded stepped cartoon shading. |
| `jelly_warp` | Harmonic vertex displacement oscillations. |
| `posterize_ink` | High-contrast ink contour lines. |
| `aurora` | Atmospheric polar light bands. |
| `hologram` | Scanlines, chromatic aberration, and holographic jitter. |
| `electric_arc` | Oscillating electrical arcs between stroke points. |

---

### 3.3 Dynamic 2048×2048 UV Texture Atlas Painter
1. **Dynamic Texture Atlas Generation**: Automatically generates a 2048×2048 texture overlay for any imported 3D model.
2. **Barycentric Hit Projection**: Converts 3D intersection points into 2D UV space using barycentric coordinate interpolation.
3. **Multi-Layer UV Stacks**: Supports independent UV layers with separate opacity and blend mode evaluations.
4. **UV Stamp Shapes**: Supports round, wide-flat, chisel, square, and line stamp shapes with rotation angles.
5. **Direct UV Color Sampling**: Samples underlying texture map colors directly through the Eyedropper tool.
6. **Texture Atlas PNG Export**: Exports combined diffuse maps to high-resolution PNG format.

---

### 3.4 3D Volumetric Mesh Liquify Deformation
1. **KD-Tree Vertex Acceleration**: Uses a spatial KD-tree index to isolate vertices within the brush radius.
2. **Push (Smear) Mode**: Pushes stroke vertices in the direction of pointer drag.
3. **Pinch (Contract) Mode**: Draws vertices toward the brush center.
4. **Inflate (Expand) Mode**: Displaces vertices outward along their normal vectors.
5. **Comb (Flow) Mode**: Aligns surface vertices with the directional brush trajectory.
6. **Interactive A/B Comparison**: Toggles between pre- and post-deformation geometry states.
7. **Iterative Smoothing**: Applies Laplacian smoothing passes over deformed regions.

---

### 3.5 Catmull-Rom Spline Swept Lofts & Bent Guides
1. **Spline-Based Swept Manifolds**: Sweeps 3D geometric cross-sections along Catmull-Rom spline curves.
2. **Preset Curves**: Built-in Arch, S-Curve, Loop, and Spiral guide presets.
3. **Convert Stroke to Guide**: Converts any drawn freehand stroke into a guide curve.
4. **Cross-Section Profiles**: Sweeps Ribbon, Arc, U-Channel, or Pipe profiles.
5. **Twist & Banking Control**: Applies swept bank twist angles up to ±180°.
6. **Spline Tension & Divisions**: Adjusts Catmull-Rom curve tension from uniform (0.0) to chordal (1.0).

---

### 3.6 Algorithmic Geometric Shape Snapping
1. **Real-Time Recognition**: Detects straight lines, circles, ellipses, arcs, and regular polygons from freehand input.
2. **Confidence-Threshold Fitting**: Replaces freehand points with clean geometric curves when confidence exceeds thresholds.
3. **Visual Toast Feedback**: Displays the detected shape type and fit confidence percentage on snap.

---

### 3.7 Dual-Mode Eraser: Cutout vs Vacuum
1. **Cutout Mode (Negative-Space Mask)**: Cuts geometry away from existing strokes without deleting whole paths.
2. **Vacuum Mode (Continuous Purge)**: Deletes entire stroke descriptors whose bounding spheres intersect the eraser radius.

---

### 3.8 3D Collision Scaffolding & Anatomical Guides
1. **Anatomical Proxy Guides**: Built-in human mannequins (torso, limbs), Loomis head spheres, and vehicle chassis.
2. **Geometric Primitive Scaffolding**: Cylinders, capsules, boxes, and domes.
3. **Render Modes**: Displays scaffolding as Solid, Ghost (translucent wireframe), or Invisible (collision only).
4. **Direct Surface Sketching**: Uses scaffolding as a temporary raycast surface to paint in air, then hides or deletes the guide.

---

### 3.9 Arbitrary 3D Plane Symmetry
1. **Standard Axial Symmetry**: Mirrored stroke generation along X, Y, or Z axes.
2. **Radial Symmetry**: Multi-axis radial symmetry in 4x or 8x configurations.
3. **Arbitrary Plane Symmetry**: Custom plane defined by an origin point `(X, Y, Z)` and normal vector `(Nx, Ny, Nz)`.
4. **Align to Camera**: Aligns the symmetry plane with the current camera view direction.
5. **Interactive 3D Plane Helper**: Displays a semi-transparent planar guide showing the active mirror boundary.

---

### 3.10 Holistic Stroke DNA Inspection & Injection
1. **Complete Property Extraction**: Samples color hex, linear RGB, opacity, roughness, metalness, emissive intensity, material type, profile, pattern, and shader effects.
2. **1-Click DNA Injection**: Injects all sampled parameters back into active brush settings with a single click.

---

### 3.11 Perceptual OKLab / OKLCh Color Studio
1. **Perceptual Color Blending**: Uses the OKLab color model to eliminate muddy grey/brown intermediate hues.
2. **Polar OKLCh Color Wheel**: Chroma and hue controls based on human visual perception.
3. **Harmonic Palette Generator**: Generates Complementary, Monochromatic, Analogous, Split-Complementary, Triadic, and Tetradic schemes.
4. **Perceptual Gradient Generation**: Creates smooth multi-stop color ramps in OKLab or OKLCh space.
5. **Toon Lightness Posterization**: Quantizes lightness values into discrete cartoon steps.

---

### 3.12 Procedural Skybox Studio & Scattering Engine
1. **Preetham Atmospheric Scattering**: Physical optical simulation with Rayleigh and Mie scattering and ozone absorption.
2. **Interactive Celestial Dome**: 2D dome widget for positioning sun and moon azimuth and elevation.
3. **24-Hour Diurnal Cycle**: Simulates transitions across dawn, noon, dusk, and midnight.
4. **Volumetric Multi-Layer Clouds**: Controls cloud coverage, density, altitude, wind speed, wind angle, scale, and turbulence.
5. **Crepuscular God Rays**: Post-processing pass for volumetric solar flares and god rays.
6. **Weather & Fog Simulation**: Distance fog, exponential height fog, and precipitation (rain, snow, mist).
7. **Zenith-to-Horizon Gradient Editor**: Multi-stop gradient curve editor for custom sky gradients.
8. **360° Equirectangular Cubemap Export**: Renders skybox scenes to 360° equirectangular panoramas.

---

### 3.13 Universal 8-Format Converter & Google Draco WASM
1. **Universal 3D Ingestion**: Supports `.glb`, `.gltf`, `.obj` (+`.mtl`), `.fbx`, `.3ds`, `.stl`, `.ply`, and `.dae`.
2. **Google Draco WASM Quantization**: Compresses position, normal, color, and UV data, reducing file sizes by up to 90%.
3. **Coordinate Normalization**: Normalizes bounding boxes, centers mass to origin, and snaps models to the floor grid `(Y=0)`.
4. **Orientation Baking**: Converts between coordinate systems (e.g. Y-up to Z-up) and applies rotation offsets.
5. **Compression Telemetry**: Reports uncompressed vs compressed file sizes and compression savings ratios.

---

### 3.14 Bundled 3D Model Catalog (47 Models across 6 Categories)

1. **Anime & Manga (15 Models)**:
   - `pusheen_classic`: Pusheen Cat
   - `pusheen_busy`: Pusheen at Laptop
   - `pusheen_vs_noodle`: Pusheen vs Ramen Bowl
   - `pompompurin`: Pompompurin Dog
   - `son_goku_and_kintoun_nimbus`: Goku & Flying Nimbus
   - `sailormoon_casual_bun`: Sailor Moon (Casual)
   - `shinobu_oshino`: Shinobu Oshino
   - `krillin`: Krillin (Dragon Ball)
   - `made_in_abyss_trio`: Made in Abyss Trio
   - `ash_ketchum`: Ash Ketchum (Pokémon)
   - `bulbasaur`: Bulbasaur
   - `charmander`: Charmander
   - `charizard`: Charizard
   - `ninetales`: Ninetales
   - `cherubi`: Cherubi (Low-Poly)
2. **Characters & Figures (5 Models)**:
   - `matilda`: Matilda Character
   - `boxy_1`: Boxy 1 (LankyBox)
   - `boxy_2`: Boxy 2 (LankyBox)
   - `foxy`: Foxy (LankyBox)
   - `foxy_plush`: Foxy Plush (LankyBox)
3. **Houses & Architecture (9 Models)**:
   - `korean_bakery`: Korean Bakery Cafe
   - `pawtisserie`: Pawtisserie Pastry Shop
   - `storybook_house`: Storybook House
   - `isometric_castle`: Isometric Fantasy Castle
   - `medieval_timber`: Medieval Timber House
   - `camper_van`: Camper Van Cottage
   - `village_cottage`: Modern Village Cottage
   - `spooky_manor`: Halloween Spooky Manor
   - `arcade_cabinet`: Neon Arcade Cabinet
4. **Vehicles & Tech (8 Models)**:
   - `akira_bike`: Kaneda Akira Bike
   - `akira_bike_classic`: Kaneda Akira Bike (Classic Edition)
   - `akira_bike_alt`: Akira Motorcycle (Alt)
   - `seaplane_s21`: PSX Seaplane S-21
   - `cyber_visor`: Cyber Visor Helmet
   - `recon_drone`: Recon Drone
   - `cyber_drone`: Cyber Sentry Drone
   - `robotic_arm`: Industrial Robot Arm
   - `quantum_matrix`: Quantum Core Reactor
5. **Animals & Creatures (5 Models)**:
   - `capybara_bath`: Capybara Onsen Bath
   - `capybara_cute`: Cute Capybara
   - `chonky_axolotl`: Chonky Axolotl
   - `kawaii_cat_plush`: Kawaii Cat Plush
   - `kawaii_friend`: Kawaii Friend
6. **Shapes & Benchmarks (4 Models)**:
   - `classical_bust`: Classical Sculpted Bust
   - `ceramic_amphora`: Ceramic Amphora
   - `torus_knot`: Torus Knot Benchmark
   - `drawing_plane`: Drawing Canvas Plane

---

### 3.15 Photoshop-Grade Multi-Layer Compositing
1. **Layer Management**: Create, duplicate, reorder, group, hide, lock, and delete drawing layers.
2. **Layer Blend Modes**: Supports Normal, Multiply, Screen, Overlay, Add, and Subtract blend modes.
3. **Per-Layer Opacity**: Independent opacity adjustment per layer.
4. **Merge Down**: Bakes upper layer stroke geometry into the layer below.
5. **Clear Layer**: Flushes strokes from a target layer while keeping the layer active.

---

### 3.16 Cinematic Post-Processing Suite
1. **Cel / Toon Shading**: Configurable toon bands (2–6 steps) with ink outline edge detection.
2. **Unreal-Style Bloom**: Threshold, radius, and intensity sliders for glowing materials and lasers.
3. **Depth of Field (DoF)**: Focus distance and lens aperture sliders for photographic bokeh blur.
4. **Film Grain**: Dynamic procedural noise overlay with adjustable intensity.
5. **Pixelation / Retro Shading**: Downsamples viewport rendering for retro video game aesthetics.

---

### 3.17 Dual Spatial Transformation Controllers
1. **Transform Navigator (Dockable Card)**:
   - 2D Planar Dial: Velocity joystick disc for screen-space translation, outer ring for rotation, and scale handles.
   - 3D Gimbal Dial: Virtual trackball sphere with Pitch (X), Yaw (Y), and Roll (Z) gimbal rings and translation arrows.
   - Tactile Audio Dial: High-precision rotary dial with procedural Web Audio feedback.
   - Target Scope: Applies transforms to All Scene Content, Active Model, or Active Layer Curves.
   - Quick View Snapping: Snaps to Front, Back, Top, Bottom, Left, Right, or Isometric views.
   - Live Telemetry Drawer: Displays real-time position, Euler rotation, scale, and camera spherical coordinates.
2. **Paper Rocket Tactile Spatial Wheel**:
   - Rotary wheel simulating physical resistance and inertia.
   - Multi-mode dial controlling Translation, Rotation, Scale, Brush Size, or Opacity.
   - Haptic detent feedback and synthesized mechanical clicks.

---

### 3.18 Hardware-Isolated Stylus & Tablet Input
1. **PointerEvents Integration**: Reads stylus pressure (0.0 to 1.0) and tilt angles natively.
2. **Hardware Palm Rejection**: Isolates pen input from touch events, allowing comfortable hand resting.
3. **Stylus Hardware Radial Menu**: Context menu triggered at the pen tip via stylus button or right-click.
4. **Touchpad Precision Numpad**: Floating on-screen numeric keypad for stylus and touch users.
5. **Single-Hand Dual Thumb Navigation**: Floating on-screen joystick and trackball for tablet navigation.

---

### 3.19 WebXR Augmented Reality Suite
1. **Real-World Surface Hit Testing**: Detects horizontal and vertical surfaces using WebXR raycasting.
2. **1:1 Scale Placement**: Projects 3D painted assets into real-world physical dimensions.
3. **Elevation & Rotation Sliders**: Fine-tunes model placement in augmented reality.
4. **Desktop AR Simulation**: Fallback preview mode when running on non-XR browsers.

---

### 3.20 Full Project State Persistence (.remix3d)
1. **Proprietary Project Format**: Saves strokes, layer configurations, lighting presets, camera angles, and model states into a single `.remix3d` JSON file.
2. **Silent Background Auto-Save**: Debounced background persistence to `localStorage` prevents data loss during browser crashes.
3. **1-Click Save & Load**: Native file dialogs for loading and saving project files.

---

### 3.21 Multi-Format Export Delivery Pipeline
Exports production-ready 3D assets in multiple formats:
- **GLB (Binary glTF)**: Standard glTF 2.0 delivery format.
- **Draco GLB**: Compressed glTF with up to 90% size reduction.
- **Wavefront OBJ + MTL**: Universal geometry format with material libraries.
- **JSON Vector Strokes**: Clean vector paths with per-point normals, tangents, pressure, and color data.
- **High-Res PNG Snapshot**: Viewport render with transparent or custom background.
- **Apple USDZ**: Augmented reality format for iOS Quick Look.
- **ZIP Packaging**: Packages model files, textures, and stroke data into a single `.zip` archive via JSZip.
