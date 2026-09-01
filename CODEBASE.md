# Remix 3D Model Painting Studio (v14.0.0) - Full Codebase Specification

> **Version**: `v14.0.0`  
> **Date**: `September 1, 2026`  
> **Project Name**: Remix 3D Model Painting Studio & Draco Compression Suite  
> **Repository Path**: `e:\X\AiStudio Workflow\v14`

---

## 1. System Architecture & Overview

**Remix 3D Model Painting Studio (v14.0.0)** is an advanced, high-performance client-side 3D drawing, procedural modeling, UV projection texturing, and universal asset conversion workstation.

The application architecture consists of:
- **Reactive UI Layer**: React 19, Motion, and Tailwind CSS v4.
- **3D Graphics Engine**: Three.js (r185) with custom WebGL/WebGPU shaders.
- **Spatial Partitioning & Raycasting**: `three-mesh-bvh` for sub-millisecond, zero-allocation raycasting across complex meshes.
- **Sensory Feedback**: Web Audio API procedural synthesizer (rotary clicks, snaps, ticks) and Web Vibration API haptics.
- **Geometry & Mesh Generators**: Catmull-Rom swept lofts, Bishop frame parallel transport, arched conformal 3D beads, and silhouette clamping.
- **Deformation & Snapping**: Real-time KD-tree 3D liquify mesh deformation and algorithmic geometric shape recognition.
- **Format Conversion & Compression**: Universal client-side parser supporting 8 3D formats with Google Draco WASM quantization and JSZip archiving.

---

## 2. Complete File Tree

```
v14/
├── package.json                          # Dependencies, scripts, and runtime engines
├── vite.config.ts                        # Vite build pipeline with Tailwind v4 & React plugins
├── tsconfig.json                         # TypeScript compiler configuration
├── index.html                            # Application HTML container & viewport configuration
├── metadata.json                         # App metadata & AI Studio capability definitions
├── start-server.bat                      # Local server launcher script
├── README.md                             # Quick-start run instructions
├── bun.lock                              # Bun lockfile
├── package-lock.json                     # NPM lockfile
│
├── public/                               # Static assets and runtime decoders
│   ├── draco/                            # Google Draco WASM decoders
│   │   ├── draco_decoder.js
│   │   ├── draco_decoder.wasm
│   │   ├── draco_wasm_wrapper.js
│   │   └── gltf/                         # Draco glTF decoder files
│   ├── imported_templates/               # Sample glTF/GLB models & textures
│   │   ├── capybara_bath/
│   │   ├── chonky_axolotl/
│   │   └── pusheen/
│   ├── models/                           # Bundled GLB models (Akira bike, Ash, Boxy, etc.)
│   ├── model_calibrations.json           # Model transform calibrations (scale, rotation, offset)
│   └── converted_model_strokes.json      # Stored vector stroke presets
│
└── src/
    ├── main.tsx                          # React DOM entry point
    ├── App.tsx                           # Master UI orchestration, state management & modal routing
    ├── index.css                         # Tailwind CSS base styles & canvas resets
    ├── types.ts                          # Comprehensive TypeScript interface definitions
    │
    ├── core/                             # Core 3D engine, pipelines & math engines
    │   ├── studioEngine.ts               # Primary Three.js & BVH raycasting engine (~4,059 lines)
    │   ├── animatedShaders.ts            # 27 custom animated procedural GLSL shader materials
    │   ├── conformalBeadGenerator.ts     # Arched 3D conformal bead & ribbon geometry generator
    │   ├── colorMath.ts                  # OKLab / OKLCh perceptual color mixing & vertex conversions
    │   ├── layerCompositor.ts            # Multi-layer blend modes (Multiply, Screen, Overlay, etc.)
    │   ├── liquifyEngine.ts              # 3D volumetric brush mesh deformation engine
    │   ├── loftEngine.ts                 # 3D Catmull-Rom spline swept lofting engine
    │   ├── materialCache.ts              # Material pooling and shader program sharing
    │   ├── modelConverter.ts             # Universal 3D format conversion (GLB, OBJ, FBX, STL, etc.)
    │   ├── modelExporter.ts              # GLB/OBJ/MTL/JSON stroke exporter with Draco & JSZip
    │   ├── modelLoader.ts                # Asynchronous multi-format model parser with BVH trees
    │   ├── modelNormalization.ts         # Bounding box normalization, floor snapping, and centering
    │   ├── modelStorage.ts               # IndexedDB storage for models, calibrations, and thumbnails
    │   ├── patternGenerator.ts           # Procedural surface patterns (Dots, Lines, Terrazzo, Stipple)
    │   ├── postProcessingEngine.ts       # Custom post-process pass (Toon, Bloom, DoF, Grain, Pixelation)
    │   ├── primitiveGenerator.ts         # Procedural geometric primitives & mannequins with subdivision
    │   ├── proceduralSky.ts              # Atmospheric sky dome engine (Preetham scattering, clouds)
    │   ├── sampleModels.ts               # Bundled sample 3D model catalog
    │   ├── scaffoldingEngine.ts          # Collision guide scaffolding & anatomical proxy meshes
    │   ├── shapeSnapping.ts              # Geometric shape recognition (Lines, Circles, Arcs, Polygons)
    │   ├── strokeSmoother.ts             # Streamline, exponential, and Kalman smoothing algorithms
    │   ├── uvPaintingEngine.ts           # Dynamic texture atlas unwrap & barycentric triangle painting
    │   ├── wboitPipeline.ts              # Weighted Blended Order-Independent Transparency pass
    │   └── webgpuPipeline.ts             # WebGPU compute & rendering pipeline
    │
    ├── components/                       # React UI modals, toolbars, and tactile controls
    │   ├── Viewport.tsx                  # Canvas viewport mounting Three.js scene & pointer events
    │   ├── Toolbar.tsx                   # Main tool selector (Brushes, Eraser, Eyedropper, Liquify)
    │   ├── HeaderBar.tsx                 # Top bar (Camera presets, Undo/Redo, Lighting, GPU badge)
    │   ├── LayerPanel.tsx                # Layer stack & folder groups, blend modes, opacity, lock
    │   ├── BrushSettingsPanel.tsx        # Brush size, profiles, spatial jitter, smoothing, patterns
    │   ├── RenderSettingsPanel.tsx       # Post-processing toggles (Cel Shading, Bloom, DoF, Grain)
    │   ├── ColorStudioModal.tsx          # OKLab/OKLCh color wheel, harmony generator, palette studio
    │   ├── HolisticDNAInspector.tsx      # Real-time stroke inspector (RGB, roughness, normals, pressure)
    │   ├── ModelConverterModal.tsx       # Universal 3D file conversion, orientation baking & Draco
    │   ├── ModelLibraryModal.tsx         # In-app 3D model browser and local storage manager
    │   ├── ModelDisplayPanel.tsx         # Display toggles (Clay mode, textured, wireframe, normals)
    │   ├── IlluminationStudioModal.tsx   # Studio lighting, HDR environment maps, shadow softness
    │   ├── LiquifyPanel.tsx              # 3D mesh liquify deformation controls and falloff sliders
    │   ├── BentGuideModal.tsx            # Spline-based 3D loft guides (Catmull-Rom curves, twist, tension)
    │   ├── ScaffoldingModal.tsx          # Anatomical collision guides (Mannequins, Head Spheres)
    │   ├── CustomMirrorModal.tsx         # Arbitrary 3D plane symmetry (Origin, normal vector, rotation)
    │   ├── CurveDecimateModal.tsx        # Douglas-Peucker stroke decimation & polygon optimization
    │   ├── ExportModal.tsx               # GLB, Draco GLB, OBJ, JSON, PNG, USDZ export dialog
    │   ├── RaycastSettingsModal.tsx      # Sub-step raycast density, double-sided hits, seam bridging
    │   ├── ARViewerModal.tsx             # WebXR augmented reality viewer with surface hit testing
    │   ├── NumpadModal.tsx               # Touch precision numpad for stylus/tablet inputs
    │   ├── FloatingReferenceClipboard.tsx# Reference image overlay with tracing mode and pin-to-screen
    │   ├── StylusRadialMenu.tsx          # Pressure-sensitive stylus radial shortcut menu
    │   ├── ScreenCenterCrosshair.tsx     # Center crosshair with perfect view alignment indicators
    │   ├── OrientationGizmo.tsx          # 3D view cube / camera orientation gizmo
    │   ├── SpatialNavGizmo.tsx           # 3D spatial transformation gizmo
    │   ├── SingleHandDualNav.tsx         # Dual-thumb floating navigation pads for tablets
    │   ├── TactileSpatialController.tsx  # Multi-modal spatial control pad (Joystick, Trackball, Dials)
    │   ├── FeatherTactileWheel.tsx       # Rotary wheel with tactile resistance simulation
    │   ├── ThreeTrackball.tsx            # Free-axis 3D virtual trackball controller
    │   ├── TransformJoystick.tsx         # Dual-axis floating navigation joystick
    │   ├── SkyEnvironmentPanel.tsx       # Atmosphere, sun, cloud, and fog environment panel
    │   │
    │   ├── skybox/                       # Specialized procedural skybox studio subcomponents
    │   │   ├── AtmospherePanel.tsx       # Rayleigh/Mie scattering & atmospheric turbidity controls
    │   │   ├── CelestialDomeWidget.tsx   # Interactive 2D celestial dome for sun/moon positioning
    │   │   ├── CloudsPanel.tsx           # Volumetric cloud coverage, altitude, and wind vectors
    │   │   ├── GradientCurvePanel.tsx    # Zenith-to-horizon multi-stop gradient curve editor
    │   │   ├── SunGodRaysPanel.tsx       # Sun flare & crepuscular god rays post-processing
    │   │   └── WeatherFogPanel.tsx       # Distance fog, height fog, and weather parameters
    │   │
    │   └── TransformNavigator/           # Modular transform navigation suite
    │       ├── TransformNavigator.tsx    # Main dockable transform hub with clipboard & telemetry
    │       ├── NavigatorHeader.tsx       # Mode selector (2D, 3D, Tactile) & target scope
    │       ├── NavigatorFooter.tsx       # Reset, copy/paste, and telemetry drawer toggle
    │       ├── TactileNavigatorDial.tsx  # Tactile dial with rotary audio/haptic clicks
    │       ├── TwoDimensionalDial.tsx    # 2D planar translation & rotation disc
    │       └── ThreeDimensionalDial.tsx  # 3D gimbal sphere & dual-ring axis controller
    │
    ├── engine/                           # Standalone renderers & shader pipelines
    │   ├── codeGenerator.ts              # Shader export and code generator
    │   ├── colorUtils.ts                 # Gradient and color calculation helpers
    │   ├── glslShaders.ts                # Standalone GLSL shader vertex and fragment collections
    │   ├── panoramaExporter.ts           # 360-degree equirectangular cubemap panorama exporter
    │   ├── webglRenderer.ts              # Standalone WebGL skybox renderer
    │   ├── webgpuRenderer.ts             # WebGPU compute shader pipeline for skies and particles
    │   └── wgslShaders.ts                # WebGPU Shading Language (WGSL) shaders
    │
    ├── utils/                            # Audio, haptics, and 3D math helpers
    │   ├── audio.ts                      # Procedural Web Audio API synthesizer (clicks, snaps, ticks)
    │   ├── haptics.ts                    # Web Vibration API tactile haptic feedback wrapper
    │   └── mathUtils.ts                  # Vector3, Quaternion, Matrix4, and Euler math utilities
    │
    ├── constants/                        # Presets and default configurations
    │   └── presets.ts                    # Lighting, brush, and skybox preset configs
    │
    └── types/                            # Specialized module type definitions
        └── skybox.ts                     # Skybox, atmosphere, and cloud interface types
```

---

## 3. Module & Subsystem Breakdown

### 3.1 Core 3D Engine (`src/core/`)

| Module | Description |
| :--- | :--- |
| `studioEngine.ts` | The central orchestration engine (~4,059 lines). Handles scene graph, camera frustum, BVH spatial indexing, stroke mesh construction, raycast hit testing, stylus pressure normalization, undo/redo state stacks, transform gizmos, and render loops. |
| `conformalBeadGenerator.ts` | Builds smooth 3D geometry along stroke paths using Bishop parallel transport frames, arched conformal bead cross-sections, silhouette edge clamping, and smooth end-cap tapers. |
| `animatedShaders.ts` | Defines 27 customizable animated GLSL shaders (Plasma, Neon Pulse, Holographic Foil, Fire, Water Shimmer, Rainbow Prism, Voronoi Energy, Matrix Rain, Cosmic Nebula, Electric Arc, Toon Outline, etc.). |
| `liquifyEngine.ts` | Volumetric KD-tree / spatial partition mesh deformation engine enabling real-time 3D stroke pushing, pinching, inflating, and combing with adjustable influence radii. |
| `loftEngine.ts` | 3D Catmull-Rom spline swept lofting engine generating procedural manifolds (Ribbon, Arc, U-Channel, Pipe) with banking twist and curve tension. |
| `modelConverter.ts` | Universal client-side 3D format conversion pipeline with Draco mesh compression, vertex normal generation, UV unwrap sanitization, and GLB packaging. |
| `modelLoader.ts` | Asynchronous model loader supporting GLB, GLTF, OBJ, FBX, STL, PLY, 3DS, and DAE formats with automatic BVH tree acceleration. |
| `uvPaintingEngine.ts` | Real-time dynamic texture atlas painting engine projecting 3D brush hits into 2D UV coordinate space using barycentric triangle interpolation. |
| `proceduralSky.ts` | Physically-based atmospheric sky dome engine featuring Preetham scattering, Rayleigh/Mie optical shaders, multi-layer volumetric clouds, and day/night transitions. |
| `wboitPipeline.ts` | Weighted Blended Order-Independent Transparency (WBOIT) pass for rendering overlapping transparent strokes and glass shaders without sorting artifacts. |
| `shapeSnapping.ts` | Real-time geometric fitting engine recognizing freehand strokes as straight lines, circles, ellipses, arcs, and regular polygons. |
| `colorMath.ts` | Color science utilities including OKLab / OKLCh perceptual color space conversions, W3C color interpolation, and linear vertex color conversions. |
| `modelExporter.ts` | Multi-format export engine supporting GLB (with Draco), OBJ + MTL, JSON stroke vectors, baked textures, and ZIP archiving via JSZip. |
| `modelStorage.ts` | IndexedDB storage layer for persisting imported 3D models, calibrations, thumbnails, and custom presets across sessions. |

---

### 3.2 UI & Modal Components (`src/components/`)

| Component | Description |
| :--- | :--- |
| `App.tsx` | Root UI component managing global app state, active tool selections, layer hierarchy, post-processing settings, and modal visibility. |
| `Viewport.tsx` | Three.js canvas container handling stylus pointer events (pressure, tilt, buttons), touch gestures, hover highlights, and canvas resizing. |
| `Toolbar.tsx` | Primary tool selector (Surface Brush, Free Spatial Brush, UV Brush, Eraser Cutout/Vacuum, Eyedropper, Liquify, Symmetry modes). |
| `HeaderBar.tsx` | Top application bar with project title, camera alignment shortcuts (Front/Top/Side/Iso), Undo/Redo, lighting presets, render mode, and GPU telemetry. |
| `LayerPanel.tsx` | Photoshop-grade layer management stack supporting folder groups, opacity sliders, visibility toggles, layer locks, and 6 blend modes. |
| `BrushSettingsPanel.tsx` | Brush parameter inspector (Size, Opacity, Roughness, Metalness, Spatial Jitter, Streamline Smoothing, Patterns, Chisel Angle). |
| `ColorStudioModal.tsx` | Comprehensive Color Studio supporting RGB, HSL, OKLab/OKLCh color spaces, dynamic palettes, and harmonic schemes. |
| `HolisticDNAInspector.tsx` | Real-time stroke inspector displaying linear RGB values, roughness, metalness, normal orientations, and pressure graphs. |
| `ModelConverterModal.tsx` | Universal 3D format converter with Draco compression level controls, axis re-orientation, scale normalization, and model inspection. |
| `ModelLibraryModal.tsx` | In-app 3D model library with local IndexedDB storage, sample templates, and thumbnail previews. |
| `IlluminationStudioModal.tsx` | Advanced lighting controls (Directional sun, Ambient, HDRI environment maps, shadow softness, floor grid reflections). |
| `LiquifyPanel.tsx` | 3D volumetric brush mesh deformation controls (Push, Pinch, Inflate, Comb) with falloff radii and iterative smoothing. |
| `ScaffoldingModal.tsx` | Anatomical & geometric collision scaffolding generator (Mannequins, Head Spheres, Chassis, Capsules, Primitives). |
| `CustomMirrorModal.tsx` | Arbitrary 3D plane symmetry configuration (Origin, normal vector, Euler rotation) with visual guide helpers. |
| `CurveDecimateModal.tsx` | Douglas-Peucker stroke curve decimation and mesh polygon reduction controls. |
| `ExportModal.tsx` | Model and stroke export dialog (GLB with Draco, OBJ + MTL, JSON vector strokes, PNG renders, baked textures, USDZ). |
| `RaycastSettingsModal.tsx` | Sub-step raycasting density, double-sided polygon hits, air-gap splitting, and seam bridging. |
| `ARViewerModal.tsx` | WebXR Augmented Reality viewer with real-world surface hit testing, elevation, and scale controls. |
| `FloatingReferenceClipboard.tsx` | Reference image overlay clipboard with tracing mode, pin-to-screen, opacity, blend modes, grayscale, and horizontal/vertical flips. |

---

### 3.3 Tactile Navigation & Spatial Controllers

| Component | Description |
| :--- | :--- |
| `TransformNavigator/` | Modular, dockable transform navigation suite supporting 2D planar, 3D gimbal, and Tactile rotary dial control modes with clipboard copy/paste and telemetry logging. |
| `TactileNavigatorDial.tsx` | High-precision rotary dial with synthesized procedural Web Audio clicks and haptic pulses. |
| `FeatherTactileWheel.tsx` | Rotary control wheel simulating physical resistance and inertia for micro-adjustments. |
| `ThreeTrackball.tsx` | Virtual 3D trackball controller for free-axis rotational manipulation. |
| `SingleHandDualNav.tsx` | Dual-thumb floating navigation pads optimized for one-handed tablet interaction. |
| `TransformJoystick.tsx` | Dual-axis floating navigation joystick for continuous translation and rotation. |

---

### 3.4 Procedural Skybox Studio (`src/components/skybox/` & `src/engine/`)

| Component / Module | Description |
| :--- | :--- |
| `AtmospherePanel.tsx` | Rayleigh/Mie optical scattering, ozone absorption, and atmospheric turbidity controls. |
| `CelestialDomeWidget.tsx` | Interactive 2D celestial dome widget for intuitive sun and moon azimuth/elevation positioning. |
| `CloudsPanel.tsx` | Volumetric cloud layer controls (Coverage, density, altitude, speed, wind vector). |
| `GradientCurvePanel.tsx` | Multi-stop zenith-to-horizon gradient curve editor. |
| `SunGodRaysPanel.tsx` | Volumetric sun flare and crepuscular god ray post-process controls. |
| `WeatherFogPanel.tsx` | Distance fog, exponential height fog, and precipitation weather parameters. |
| `panoramaExporter.ts` | 360-degree equirectangular cubemap panorama renderer and exporter. |

---

## 4. Key Technical Capabilities

1. **BVH-Accelerated Zero-Allocation Raycasting**: Integrates `three-mesh-bvh` into Three.js geometries for sub-millisecond continuous raycast collision on multi-million polygon meshes.
2. **3D Conformal Bead & Ribbon Meshing**: Computes smooth 3D geometry using Bishop parallel transport frames, arched conformal cross-sections, and silhouette clamping to eliminate coplanar z-fighting.
3. **27 Animated GLSL Shaders**: Procedural shader materials evaluated dynamically per frame with uniform time stepping.
4. **Weighted Blended Order-Independent Transparency (WBOIT)**: Accurately renders overlapping transparent ribbons and glowing strokes without depth sorting artifacts.
5. **OKLab / OKLCh Perceptual Color Mixing**: Eliminates muddy intermediate hues during gradient generation and vertex color blending.
6. **Universal 3D Model Conversion & Draco Compression**: Client-side conversion across GLB, GLTF, OBJ, FBX, 3DS, STL, PLY, and DAE with up to 90% file size reduction.
7. **3D Volumetric Mesh Liquify**: Spatial deformation engine for pushing, pinching, inflating, and combing existing 3D stroke geometry.
8. **Catmull-Rom Swept Lofting**: Procedural 3D tube and ribbon extrusion along arbitrary 3D guide curves.
9. **Multi-Sensory Tactile Feedback**: Procedural Web Audio synthesis and Web Vibration API haptics for rotary dials, sliders, and navigation gizmos.

---

## 5. Technology Stack & Dependencies

```json
{
  "name": "react-example",
  "version": "0.0.0",
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "jszip": "^3.10.1",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "three": "^0.185.1",
    "three-mesh-bvh": "^0.9.14",
    "vite": "^6.2.3"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jszip": "^3.4.1",
    "@types/node": "^22.14.0",
    "@types/three": "^0.185.4",
    "@webgpu/types": "^0.1.72",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2"
  }
}
```
