# Remix 3D Model Painting Studio & Draco Compression Suite
## Comprehensive User Guide & Workstation Manual

> **Version**: `v14.0.0`  
> **Workspace**: `e:\X\AiStudio Workflow`  
> **Primary Suite**: [v14](file:///e:/X/AiStudio%20Workflow/v14)  
> **Technology Stack**: React 19, Three.js (r185), WebGPU / WebGL2, `three-mesh-bvh`, Google Draco WASM, Web Audio API, Web Vibration API, Tailwind CSS v4

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [System Requirements & Quick Start](#2-system-requirements--quick-start)
   - [Hardware & Browser Support](#hardware--browser-support)
   - [Launching the Flagship Studio (v14)](#launching-the-flagship-studio-v14)
   - [Launching Mobile & Tablet LAN Sessions](#launching-mobile--tablet-lan-sessions)
   - [Running Companion Tools & Experiments](#running-companion-tools--experiments)
3. [Workstation Interface & Viewport Architecture](#3-workstation-interface--viewport-architecture)
   - [Viewport Navigation & Camera Controls](#viewport-navigation--camera-controls)
   - [Auto-Collapsing Left CAD Toolbar](#auto-collapsing-left-cad-toolbar)
   - [Top Header Bar & View Presets](#top-header-bar--view-presets)
   - [Dockable Transform Navigator](#dockable-transform-navigator)
4. [3D Drawing, Inking & Sculpting Tools](#4-3d-drawing-inking--sculpting-tools)
   - [Surface Pen & 3D Conformal Bead Generator](#surface-pen--3d-conformal-bead-generator)
   - [Free Spatial 3D Brush (Airbrush)](#free-spatial-3d-brush-airbrush)
   - [Dynamic UV Texture Atlas Brush](#dynamic-uv-texture-atlas-brush)
   - [3D Volumetric Mesh Liquify](#3d-volumetric-mesh-liquify)
   - [Spline-Based Swept Lofts (Bent Guides)](#spline-based-swept-lofts-bent-guides)
   - [Dual Eraser Modes: Cutout vs. Vacuum](#dual-eraser-modes-cutout-vs-vacuum)
   - [Algorithmic Shape Snapping & Recognition](#algorithmic-shape-snapping--recognition)
   - [3D Geometric Primitives Spawner](#3d-geometric-primitives-spawner)
5. [Stylus, Tablet & Precision Input Systems](#5-stylus-tablet--precision-input-systems)
   - [Stylus Dynamics & Pressure Sensitivity](#stylus-dynamics--pressure-sensitivity)
   - [Stylus Radial Menu](#stylus-radial-menu)
   - [Touch vs. Pen Rejection & Accessibility Modes](#touch-vs-pen-rejection--accessibility-modes)
   - [Touchpad Precision Numpad](#touchpad-precision-numpad)
   - [Single-Hand Dual Thumb Navigation](#single-hand-dual-thumb-navigation)
6. [Materials, Shaders & Visual Effects Engine](#6-materials-shaders--visual-effects-engine)
   - [Material Types](#material-types)
   - [27 Animated Procedural GLSL Shaders](#27-animated-procedural-glsl-shaders)
   - [OKLab / OKLCh Perceptual Color Studio](#oklab--oklch-perceptual-color-studio)
   - [Procedural Surface Patterns](#procedural-surface-patterns)
   - [Weighted Blended Order-Independent Transparency (WBOIT)](#weighted-blended-order-independent-transparency-wboit)
   - [Cinematic Post-Processing Suite](#cinematic-post-processing-suite)
   - [Holistic DNA Stroke Inspector](#holistic-dna-stroke-inspector)
7. [Procedural Skybox Studio & Atmosphere Engine](#7-procedural-skybox-studio--atmosphere-engine)
   - [Physical Rayleigh & Mie Scattering](#physical-rayleigh--mie-scattering)
   - [Interactive Celestial Dome & Sun/Moon Orbit](#interactive-celestial-dome--sunmoon-orbit)
   - [Multi-Layer Volumetric Clouds](#multi-layer-volumetric-clouds)
   - [Crepuscular God Rays & Weather Fog](#crepuscular-god-rays--weather-fog)
   - [Zenith-to-Horizon Gradient Curve Editor](#zenith-to-horizon-gradient-curve-editor)
   - [360° Equirectangular Panorama Exporter](#360-equirectangular-panorama-exporter)
8. [Layers, Scaffolding, Symmetry & Reference Overlays](#8-layers-scaffolding-symmetry--reference-overlays)
   - [Photoshop-Grade Layer Management](#photoshop-grade-layer-management)
   - [Anatomical & Geometric Scaffolding Guides](#anatomical--geometric-scaffolding-guides)
   - [Arbitrary 3D Plane Symmetry](#arbitrary-3d-plane-symmetry)
   - [Floating Reference Clipboard & Tracing Mode](#floating-reference-clipboard--tracing-mode)
9. [Universal 3D Model Conversion & Draco Compression](#9-universal-3d-model-conversion--draco-compression)
   - [Universal 8-Format Importer](#universal-8-format-importer)
   - [Bounding Box Normalization & Floor Snapping](#bounding-box-normalization--floor-snapping)
   - [Google Draco Quantization Suite](#google-draco-quantization-suite)
   - [In-App Local Model Library & IndexedDB Persistence](#in-app-local-model-library--indexeddb-persistence)
10. [Export Formats & Delivery Pipelines](#10-export-formats--delivery-pipelines)
11. [Master Keyboard Shortcuts & Gestures Matrix](#11-master-keyboard-shortcuts--gestures-matrix)
12. [Troubleshooting & Performance Optimization](#12-troubleshooting--performance-optimization)

---

## 1. Executive Overview

The **Remix 3D Model Painting Studio & Draco Compression Suite** is a state-of-the-art, client-side 3D workstation designed for digital artists, 3D modelers, game developers, and creative technologists. It unifies high-fidelity 3D freehand sketching, PBR surface painting, dynamic UV texturing, procedural mesh generation, volumetric deformation, and asset compression directly within the browser without requiring external heavy software like Blender, ZBrush, or Substance Painter.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               AI STUDIO WORKFLOW ECOSYSTEM                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [v14] Flagship Master Workstation                                                    │
│  ├── 3D Surface & Free-Air Drawing Engine (BVH accelerated)                           │
│  ├── Dynamic 2048x2048 UV Texture Atlas Painter                                       │
│  ├── 27 Animated Procedural GLSL Shaders                                              │
│  ├── Volumetric 3D Mesh Liquify Engine (KD-Tree Spatial Deformation)                  │
│  ├── Catmull-Rom Spline Swept Lofting & Bent Guides                                   │
│  ├── Multi-Layer Compositor with 6 Blend Modes & Folders                              │
│  ├── Procedural Skybox Studio (Preetham Scattering & Volumetric Clouds)               │
│  ├── Transform Navigator (2D Planar, 3D Gimbal, Tactile Rotary Dials)                 │
│  ├── Universal 8-Format Model Converter (GLB, OBJ, FBX, 3DS, STL, PLY, DAE)           │
│  └── Google Draco WASM Quantization Suite (Up to 90% file size reduction)             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Companion Standalone Modules & Experiments                                            │
│  ├── [Navigator V01] Standalone Transform Navigator Widget                            │
│  ├── [tactile-spatial-controller] Tactile Spatial UI & Haptic Controller              │
│  ├── [webgpu-skybox-studio] WebGPU Atmosphere & Skybox Studio                         │
│  ├── [3d-model-v02] Draco GLB Compressor & Mesh Inspector                             │
│  └── [Experiments/] Catalog of Cloned & Reconstructed 3D Web Experiences              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. System Requirements & Quick Start

### Hardware & Browser Support

- **Operating System**: Windows 10/11, macOS 12+, Linux, iPadOS 16+, Android 12+.
- **Graphics API**: Modern browser with **WebGL 2.0** support (Chrome 113+, Edge 113+, Firefox 115+, Safari 16.4+). WebGPU compute features activate automatically on supported hardware.
- **Input Devices**:
  - Mouse & Keyboard.
  - Graphics Tablets & Styluses (Wacom Intuos/Cintiq, Apple Pencil, Microsoft Surface Pen, Huion, XP-Pen) with native **PointerEvents** pressure and tilt support.
  - Multi-touch screens (iPads, Android tablets, touch monitors).

### Launching the Flagship Studio (v14)

The primary application is located in the [`v14/`](file:///e:/X/AiStudio%20Workflow/v14) directory.

#### Method A: Command Line
1. Open PowerShell or Terminal in the project folder:
   ```powershell
   cd "e:\X\AiStudio Workflow\v14"
   ```
2. Install dependencies (first time only):
   ```powershell
   npm install
   ```
3. Start the local Vite development server:
   ```powershell
   npm run dev
   ```
4. Open `http://localhost:3000` in your web browser.

#### Method B: One-Click Windows Batch Script
- Double-click [`start-server.bat`](file:///e:/X/AiStudio%20Workflow/v14/start-server.bat) in the `v14` directory to start the server and open the browser automatically.

### Launching Mobile & Tablet LAN Sessions

To paint on an iPad, Android tablet, or remote touchscreen device over your local Wi-Fi network:
1. Double-click [`start-mobile-server.bat`](file:///e:/X/AiStudio%20Workflow/v14/start-mobile-server.bat) or run:
   ```powershell
   npm run dev -- --host 0.0.0.0 --port 3000
   ```
2. The terminal displays your local network IP (e.g., `http://192.168.1.150:3000`).
3. Navigate to that address in Safari or Chrome on your tablet.

### Running Companion Tools & Experiments

| Directory | Type | How to Run |
| :--- | :--- | :--- |
| [`Navigator V01`](file:///e:/X/AiStudio%20Workflow/Navigator%20V01) | Standalone React Vite App | `cd "Navigator V01" && npm install && npm run dev` |
| [`tactile-spatial-controller`](file:///e:/X/AiStudio%20Workflow/tactile-spatial-controller) | Standalone React Vite App | `cd tactile-spatial-controller && npm install && npm run dev` |
| [`webgpu-skybox-studio`](file:///e:/X/AiStudio%20Workflow/webgpu-skybox-studio) | Standalone React Vite App | `cd webgpu-skybox-studio && npm install && npm run dev` |
| [`3d-model-v02`](file:///e:/X/AiStudio%20Workflow/3d-model-v02) | Standalone React Vite App | `cd 3d-model-v02 && npm install && npm run dev` |
| [`Experiments/julien-physics`](file:///e:/X/AiStudio%20Workflow/Experiments/julien-physics) | Zero-Config Standalone App | Open `Experiments/julien-physics/app/index.html` directly in any browser |
| [`Experiments/julien-papier-gratter`](file:///e:/X/AiStudio%20Workflow/Experiments/julien-papier-gratter) | Zero-Config Standalone App | Open `Experiments/julien-papier-gratter/app/index.html` directly in any browser |

---

## 3. Workstation Interface & Viewport Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP HEADER BAR: Cameras | Proj | Undo/Redo | Model | Illum | Sky | Layers | Export     │
├──────────────┬──────────────────────────────────────────────────────────┬──────────────┤
│ LEFT TOOLBAR │                                                          │ RIGHT DOCK   │
│              │                   3D WORKSPACE VIEWPORT                  │              │
│ • Select     │                                                          │ • Brush Dyn  │
│ • Primitives │                 [ Interactive 3D Model ]                 │ • Color Std  │
│ • Pen Tool   │                                                          │ • DNA Insp   │
│ • Curve Loft │                                                          │ • Post-Proc  │
│ • Eraser     │                                                          │ • Liquify    │
│ • Shape Snap │                                                          │ • Scaffolds  │
│ • Colors     │                                                          │ • Sky Studio │
│ • Quick Size ├──────────────────────────────────────────────────────────┤              │
│ [Pin/Unpin]  │ BOTTOM: Single-Hand Nav | Orientation Gizmo | Navigator  │              │
└──────────────┴──────────────────────────────────────────────────────────┴──────────────┘
```

### Viewport Navigation & Camera Controls

The central 3D viewport delivers responsive rendering with 60+ FPS performance:

- **Orbit / Rotate View**: Click and drag with **Left Mouse Button** (in selection mode) or **Right Mouse Button** (while painting). On touch devices, drag with **Two Fingers**.
- **Pan View**: Hold `Shift` + **Left Mouse Button** drag, or click and drag with **Middle Mouse Button / Scroll Wheel Drag**. On touch devices, swipe with **Three Fingers**.
- **Zoom / Dolly**: Scroll the **Mouse Wheel**, or pinch-to-zoom on touch screens.
- **Frame & Center Target**: Press `F` to focus and fit the active model and all drawn strokes into the camera view.
- **Orientation Gizmo**: Click the 3D View Cube in the corner or axes labels (`X`, `Y`, `Z`) to snap immediately to orthogonal perspectives.

### Auto-Collapsing Left CAD Toolbar

The left toolbar is designed with intelligent space-saving auto-collapse behavior:
- **Expanded 3-Column Dock**: Shows all primary drawing tools, selection modes (Pointer, Lasso, Marquee), 3D primitive spawners, brush profiles, size pills, color swatches, and quick undo/redo.
- **Auto-Collapse**: After selecting a tool or interacting with the canvas, the dock smoothly minimizes sideways into a slim, non-intrusive rail.
- **Pinning**: Click the **Pin** icon at the top of the toolbar to lock it permanently in open mode.
- **Hover Expand**: Move your cursor over the slim rail to reveal the full dock instantly.

### Top Header Bar & View Presets

- **Orthographic vs. Perspective**: Toggle between True 3D Perspective and CAD Orthographic projection with one click.
- **Camera Presets**: Fast-switch buttons for **Front**, **Back**, **Top**, **Bottom**, **Left**, **Right**, and **Isometric 45°** views.
- **Display Modes**:
  - `Texture`: Full PBR textured and vertex-painted display.
  - `Clay`: Neutral matte sculpting clay shader for evaluating surface silhouettes.
  - `Wireframe`: Polygon topology overlay.
  - `Normals`: Vertex normal orientation vector visualizer.
  - **Illumination & Lighting Presets**: Switch between `Studio 3-Point`, `Natural Daylight`, `Neon Cyberpunk`, `Sunset Warmth`, and `Neutral Clay`.

### Dockable Transform Navigator

Located at the bottom right, the **Transform Navigator** is a universal multi-modal spatial control center:
- **2D Planar Mode**: Precision X/Y screen-space translation, rotation disc, and uniform scaling.
- **3D Spatial Gimbal Mode**: Free-axis trackball, spherical pitch/yaw/roll rings, and 3-axis Cartesian movement handles.
- **Tactile Mode**: High-precision rotary dials with procedural Web Audio clicks and Web Vibration API haptics.
- **Target Scope**: Control **All Objects**, **Strokes Only**, the **Active Layer**, or the **Underlying 3D Model**.
- **Clipboard**: Copy and paste 3D transform matrices across objects with one tap.

---

## 4. 3D Drawing, Inking & Sculpting Tools

### Surface Pen & 3D Conformal Bead Generator

The primary drawing engine utilizes [`conformalBeadGenerator.ts`](file:///e:/X/AiStudio%20Workflow/v14/src/core/conformalBeadGenerator.ts) and sub-millisecond BVH raycasting from [`studioEngine.ts`](file:///e:/X/AiStudio%20Workflow/v14/src/core/studioEngine.ts).

```
        3D Conformal Arched Bead Cross-Section
                    ▲ Normal Vector
                    │
               .───' '───.      ◄ Arch Dome Height (domeFactor)
             .'     │     '.
           .'       │       '.
      ─────┴────────┼────────┴───── ◄ Underlying Mesh Surface
      ◄──────── Base Width ────────►
```

- **Bishop Parallel Transport Frame**: Continuous frame calculation eliminates gimbal twisting and flipping when drawing in 3D curves.
- **Silhouette Clamping**: Automatically detects when strokes approach grazing angles or sharp edges, cleanly clamping ribbon normals to prevent coplanar z-fighting.
- **Stroke Profiles**:
  - `Tube`: Full 3D cylindrical volumetric extrusion with circular cross-sections.
  - `Ribbon`: Thin, dual-sided planar ribbon oriented along surface normals.
  - `Marker`: Chisel-tip oriented ribbon with directional angle and aspect ratio control.
  - `Conformal`: Arched dome cross-section (5+ segments) that forms a tactile physical bead on the model.

### Free Spatial 3D Brush (Airbrush)

Switch from **Surface** mode to **Spatial 3D** mode to draw freely in three-dimensional space without requiring a surface mesh:
- Set the **Spatial Depth Plane** to control how far in front of the camera the strokes are generated.
- Lock drawing to horizontal or vertical billboard planes.
- Ideal for drawing floating ribbons, neon halos, spatial wireframes, and architectural sketches.

### Dynamic UV Texture Atlas Brush

The UV painting engine ([`uvPaintingEngine.ts`](file:///e:/X/AiStudio%20Workflow/v14/src/core/uvPaintingEngine.ts)) allows direct painting onto 2D texture maps wrapped around 3D geometry:
- Uses **barycentric triangle interpolation** to calculate exact UV coordinates on model hit points.
- Automatically maps 3D brush splats into a high-resolution 2048x2048 canvas atlas.
- Supports continuous brush strokes across polygon seams without boundary clipping.
- Export the painted UV atlas as a standalone PNG texture anytime.

### 3D Volumetric Mesh Liquify

The Liquify engine ([`liquifyEngine.ts`](file:///e:/X/AiStudio%20Workflow/v14/src/core/liquifyEngine.ts)) uses spatial KD-trees to deform and sculpt existing 3D stroke geometry in real time:

| Liquify Mode | Behavior & Application |
| :--- | :--- |
| **Push** | Displaces vertices in the direction of cursor drag; ideal for adjusting curves and reshaping contours. |
| **Pinch** | Pulls all vertices within the radius toward the brush center; useful for sharpening tips and narrowing waists. |
| **Inflate** | Expands vertices outward along their local normals; thickens strokes into bulky forms. |
| **Comb** | Re-aligns stroke tangents along the drag vector; straightens unruly curved fibers and hair strands. |

Adjust **Brush Radius**, **Falloff Curve**, **Influence Strength**, and **Smoothing Iterations** in the Liquify Panel.

### Spline-Based Swept Lofts (Bent Guides)

The Bent Guide generator ([`loftEngine.ts`](file:///e:/X/AiStudio%20Workflow/v14/src/core/loftEngine.ts)) extrudes smooth procedural 3D manifolds along Catmull-Rom spline control points:
- **Curve Profiles**: Extrude as `Ribbon`, `Arc`, `U-Channel`, or cylindrical `Pipe`.
- **Curve Tension**: Smoothly adjust tension from `0.0` (centripetal/relaxed) to `1.0` (chordal/taut).
- **Banking Twist**: Apply continuous rotational twist from `-180°` to `+180°` along the curve length.
- **Interactive Control Nodes**: Add, move, and delete 3D guide points with spatial transform gizmos.

### Dual Eraser Modes: Cutout vs. Vacuum

1. **Cutout Eraser**:
   - Acts as a negative-space volumetric cutter.
   - Carves away intersecting sections of strokes without deleting the whole curve.
2. **Vacuum Eraser**:
   - Continuously purges and deletes entire stroke entities upon raycast contact.
   - Features an eraser radius slider for bulk cleaning of complex sketches.

### Algorithmic Shape Snapping & Recognition

When **Shape Snapping** (`shapeSnapping: true`) is active in the toolbar:
- Freehand sketches are analyzed upon stroke completion.
- Automatically recognizes and perfects:
  - **Straight Lines**: Straightens hand-drawn lines with endpoint snapping.
  - **Circles & Ellipses**: Fits a geometric circle or ellipse with calculated radii and center.
  - **Arcs & Curves**: Fits smooth constant-radius circular arcs.
  - **Polygons**: Fits triangles, rectangles, and regular polygons.
- Adjust **Shape Snap Tolerance** to control fitting sensitivity.

### 3D Geometric Primitives Spawner

Spawn procedural, perfectly-proportioned geometric primitives directly onto your canvas:
- **Cube**, **Sphere**, **Cylinder**, **Torus**, **Capsule**, **Cone**, **Pyramid**, and **Disk**.
- Primitives automatically receive BVH spatial acceleration trees and are ready for surface painting immediately upon placement.

---

## 5. Stylus, Tablet & Precision Input Systems

### Stylus Dynamics & Pressure Sensitivity

The workstation natively captures high-resolution hardware events from graphics tablets:
- **Pressure-to-Width**: Dynamic brush size scaling from 0% to 100% based on tip pressure.
- **Pressure-to-Opacity**: Smooth transparency variation based on stylus pressure.
- **Tilt & Barrel Roll**: Calculates chisel tip orientation based on pen inclination angles.

### Stylus Radial Menu

Press the primary stylus barrel button or hold the quick-action shortcut to display the **Stylus Radial Menu**:
- Fast thumb/pen navigation wheel centered at your current cursor position.
- Instant access to: Brush, Eraser, Eyedropper, Color Wheel, Undo, Redo, Size Slider, and Layer Toggle.
- Release to select without taking your hand away from the drawing area.

### Touch vs. Pen Rejection & Accessibility Modes

In the Toolbar settings, customize your interaction mode:
- **Standard Mode**: Full mouse and tablet operation.
- **Finger-Pen Mode**: Strict palm rejection. Only active stylus tips produce drawing strokes; multi-touch fingers are reserved exclusively for orbiting, panning, and zooming.
- **Touch-Boost Mode**: Enhances touch hitboxes and increases UI button targets for finger navigation on smaller smartphone or tablet screens.

### Touchpad Precision Numpad

Tap any numeric dimension pill (brush size, layer opacity, transform angle, light intensity) to open the **Touchpad Precision Numpad**:
- Virtual numpad designed for fast stylus or finger entry.
- Enter exact values (e.g., `12.5mm`, `45°`, `0.75`).
- Quick +/- increment buttons and preset fraction buttons (`1/4`, `1/2`, `3/4`, `Max`).

### Single-Hand Dual Thumb Navigation

Enable the **Single-Hand Dual Nav** pads on tablets:
- Left thumbpad: Continuous translation and dolly zoom.
- Right thumbpad: Free-axis 3D camera orbit.
- Paint with your dominant hand while manipulating the 3D model orientation continuously with your secondary thumb.

---

## 6. Materials, Shaders & Visual Effects Engine

### Material Types

- **Shaded (PBR)**: Physically Based Rendering responding to directional sunlight, ambient fill, and HDR environment reflections with Roughness and Metalness sliders.
- **Shadeless (Unlit)**: Flat illustration ink unaffected by scene lighting; maintains pure vibrant color.
- **Glow (Emissive)**: Self-illuminating neon material that radiates light and triggers bloom effects.
- **Cutout**: Alpha-tested stencil mask material for sharp decal borders.
- **Animated FX**: Dynamically evaluated GLSL procedural shader materials.

### 27 Animated Procedural GLSL Shaders

The engine includes 27 animated GLSL shaders located in [`animatedShaders.ts`](file:///e:/X/AiStudio%20Workflow/v14/src/core/animatedShaders.ts):

| Shader Effect | Category | Visual Behavior |
| :--- | :--- | :--- |
| `fire` | Energy & Elements | Flickering volumetric flame gradient with upward heat convection. |
| `ocean_wave` | Liquids | Rolling oceanic crests with foaming wave peaks and specular highlights. |
| `waterfall` | Liquids | Downward cascading high-speed liquid streaks with mist falloff. |
| `caustic` | Liquids | Shimmering underwater refractive light web. |
| `foam` | Liquids | Bubbly aerated foam froth with organic cell breakdown. |
| `ripple` | Liquids | Concentric circular wave oscillations expanding outward from hit points. |
| `lava` | Energy & Elements | Glowing molten magma fissures pulsing between fiery orange and black crust. |
| `galaxy` | Cosmic & Sci-Fi | Swirling stellar dust, nebular arms, and twinkling star clusters. |
| `rainbow` | Optical & Light | Continuous chromatic spectrum wave traveling across stroke tangents. |
| `lightning` | Energy & Elements | Branching electric plasma arcs with erratic high-voltage discharge. |
| `glitter` | Optical & Light | Sparkly microscopic facets catching specular highlights as the camera moves. |
| `candy` | Stylized Art | Glossy rotating candy-cane helical swirls with specular lacquer. |
| `slime` | Organic & FX | Gooey visceral bubbling fluid with subsurface light scattering. |
| `sparkler` | Energy & Elements | Erupting pyrotechnic sparks and burning ember particles. |
| `foliage_leaf` | Nature & Plant | Wind-blown leaf venation and chlorophyll subsurface translucency. |
| `foliage_fir` | Nature & Plant | Layered pine needle tufts with procedural wind flutter. |
| `cloud` | Atmosphere | Soft billowing cumulus vapor with edge sunlight transmission. |
| `jelly` | Organic & FX | Translucent squishy gelatin with internal chromatic aberration. |
| `plasma` | Energy & Elements | High-energy ionized gas filaments swirling in electromagnetic fields. |
| `volumetric_plasma` | Energy & Elements | 3D multi-layered plasma density cloud with volumetric glow. |
| `rim_light` | Stylized Art | Fresnel grazing angle highlight that outlines stroke silhouettes. |
| `anime_cel` | Stylized Art | Crisp stepped 2-tone anime shading with ink outline borders. |
| `jelly_warp` | Organic & FX | Sinusoidal geometric vertex distortion wave pulsing through strokes. |
| `posterize_ink` | Stylized Art | Quantized graphic novel tonal bands with cross-hatch stippling. |
| `aurora` | Atmosphere | Shimmering curtain of polar light dancing across magnetic field lines. |
| `hologram` | Cosmic & Sci-Fi | Sci-Fi holographic scanlines with flickering glitch artifacts. |
| `electric_arc` | Cosmic & Sci-Fi | High-frequency Tesla coil arcs pulsing along ribbon boundaries. |

### OKLab / OKLCh Perceptual Color Studio

Built with [`colorMath.ts`](file:///e:/X/AiStudio%20Workflow/v14/src/core/colorMath.ts) to eliminate muddy gray interpolation zones:
- **Perceptually Uniform Color Mixing**: Blends colors in Cartesian OKLab space where lightness and chroma are decoupled.
- **Harmonic Color Schemes**: One-click generation of **Complementary**, **Analogous**, **Triadic**, **Split-Complementary**, and **Tetradic** color sets.
- **Temperature Scale**: Precision Kelvin warmth slider from icy cyan (`10,000K`) to candlelight amber (`1,800K`).
- **Color History & Swatches**: Stores recently used colors and custom user palette banks in IndexedDB.

### Procedural Surface Patterns

Apply procedural textures directly to stroke geometry:
- **Dots**: Polka-dot matrix with frequency, radius, and contrast controls.
- **Lines / Hatching**: Parallel hatching lines with variable rotation angle (`0°` to `360°`).
- **Cross-Hatch**: Dual-axis orthogonal cross-hatching for comic shading.
- **Terrazzo**: Organic stone mosaic flakes with randomized color variance.
- **Stipple**: Fine grain stipple spray with stochastic density.

### Weighted Blended Order-Independent Transparency (WBOIT)

The custom WBOIT render pass ([`wboitPipeline.ts`](file:///e:/X/AiStudio%20Workflow/v14/src/core/wboitPipeline.ts)) resolves overlapping transparent strokes, holographic shaders, and glass materials without sorting glitches or inverted back-face clipping.

### Cinematic Post-Processing Suite

Open the **Render Settings Panel** to customize your viewport aesthetics:
- **Cel / Toon Shading**: Quantizes scene lighting into 2 to 6 discrete steps with edge detection ink lines.
- **Bloom**: Real-time emissive glow with adjustable Intensity (`0.1`–`3.0`), Radius, and Threshold.
- **Depth of Field (DoF)**: Simulates physical camera lens blur with Focus Distance and Aperture controls.
- **Film Grain**: Adds organic 35mm photographic grain to reduce digital color banding.
- **Pixelation**: Retro 8-bit / 16-bit arcade pixel downscaler (`2px` to `16px`).

### Holistic DNA Stroke Inspector

The **DNA Inspector** ([`HolisticDNAInspector.tsx`](file:///e:/X/AiStudio%20Workflow/v14/src/components/HolisticDNAInspector.tsx)) provides real-time telemetry on any hovered or selected stroke:
- Linear RGB / sRGB Hex values.
- Roughness, Metalness, and Emissive intensity metrics.
- Surface Normal vector `(x, y, z)` and tangent direction.
- Recorded stylus pressure curves and timestamp metadata.

---

## 7. Procedural Skybox Studio & Atmosphere Engine

The Skybox Studio ([`SkyEnvironmentPanel.tsx`](file:///e:/X/AiStudio%20Workflow/v14/src/components/SkyEnvironmentPanel.tsx) & [`proceduralSky.ts`](file:///e:/X/AiStudio%20Workflow/v14/src/core/proceduralSky.ts)) renders a physically-based atmospheric dome around your 3D scene.

```
                      ZENITH (Top Sky Color)
                           ┌──────────┐
                       .───│  Zenith  │───.
                    .-'    └──────────┘    '-.
                  .'       Rayleigh / Mie     '.
                .'           Scattering         '.
               /                                  \
             .──────────────────────────────────────.
            │           HORIZON TRANSITION           │
             '──────────────────────────────────────'
               \          Distance / Height       /
                '.              Fog             .'
                  '.       ┌──────────┐       .'
                    '-.    │  Ground  │    .-'
                       '───│  Albedo  │───'
                           └──────────┘
```

### Physical Rayleigh & Mie Scattering

- **Rayleigh Scattering**: Controls molecular air scattering that creates deep blue zenith daylight.
- **Mie Scattering & Turbidity**: Controls haze, moisture, dust, and aerosol particles around the solar disk.
- **Ozone Absorption**: Simulates atmospheric ozone layer tinting during twilight and golden hours.

### Interactive Celestial Dome & Sun/Moon Orbit

Use the 2D **Celestial Dome Widget** to position solar and lunar light sources intuitively:
- Drag the sun marker across the azimuth compass circle (`0°` to `360°`).
- Adjust elevation from sunrise/sunset horizon (`0°`) to midday zenith (`90°`).
- Directional scene shadows and model illumination automatically sync in real time.

### Multi-Layer Volumetric Clouds

- **Cloud Coverage**: Adjust cloud cover from clear skies (`0%`) to overcast storm fronts (`100%`).
- **Altitude & Density**: Set base cloud ceiling height and optical absorption thickness.
- **Wind Vectors**: Set wind direction and travel velocity for dynamic drifting clouds.

### Crepuscular God Rays & Weather Fog

- **Sun God Rays**: Post-processing radial blur shader casting crepuscular volumetric light shafts through cloud gaps.
- **Distance Fog**: Soft linear fog blending distant geometry into the horizon.
- **Exponential Height Fog**: Ground-hugging valley mist that dissipates with elevation.

### Zenith-to-Horizon Gradient Curve Editor

Customize sky colors manually with the multi-stop gradient curve editor:
- Place color stops along the vertical altitude axis (Ground, Horizon, Mid-Sky, Zenith).
- Real-time cubic spline interpolation between color pins.
- Built-in atmospheric presets: `Clear Noon`, `Golden Sunset`, `Cyberpunk Neon Night`, `Overcast Dawn`, `Deep Space Nebula`.

### 360° Equirectangular Panorama Exporter

Export your custom atmosphere as a high-resolution 360° equirectangular cubemap or panorama image:
- Exports as standard PNG or HDR texture files.
- Fully compatible with Blender World Shaders, Unreal Engine SkyAtmosphere, Unity HDRI Sky, and Three.js environment maps.

---

## 8. Layers, Scaffolding, Symmetry & Reference Overlays

### Photoshop-Grade Layer Management

The **Layer Panel** ([`LayerPanel.tsx`](file:///e:/X/AiStudio%20Workflow/v14/src/components/LayerPanel.tsx)) organizes complex projects:
- **Layer Stacking**: Drag-and-drop to reorder stroke rendering hierarchy.
- **Folder Groups**: Nest related strokes into collapsible folder groups.
- **Opacity & Visibility**: Independent layer opacity sliders (`0%` to `100%`) and eye toggles.
- **Locking**: Lock layers to prevent accidental drawing or erasing.
- **6 Blend Modes**: `Normal`, `Multiply`, `Screen`, `Overlay`, `Add` (Linear Dodge), and `Subtract`.

### Anatomical & Geometric Scaffolding Guides

Generate collision scaffolding meshes ([`ScaffoldingModal.tsx`](file:///e:/X/AiStudio%20Workflow/v14/src/components/ScaffoldingModal.tsx)) to guide freehand character and product design:
- **Scaffold Types**:
  - `Mannequin Torso`: Anatomical human ribcage, spine, and pelvis proportions.
  - `Head Sphere`: Loomis method cranial sphere with jawline guidelines.
  - `Capsule / Limb`: Articulated cylindrical arm, leg, and finger proxies.
  - `Car Chassis`: Vehicle bounding proportions and wheel well curves.
- **Render Modes**:
  - `Ghost`: Semi-transparent tinted hologram.
  - `Wireframe`: Clean polygonal cage.
  - `Solid`: Opaque matte clay surface.
  - `Invisible (Collision Only)`: Acts as an invisible raycast collision surface for inking without being seen.

### Arbitrary 3D Plane Symmetry

Configure 3D symmetry planes ([`CustomMirrorModal.tsx`](file:///e:/X/AiStudio%20Workflow/v14/src/components/CustomMirrorModal.tsx)):
- **Standard Symmetry**: Instant mirror reflection across `X-Axis`, `Y-Axis`, or `Z-Axis`.
- **Radial Symmetry**: Multi-axis radial mirror (`4x` or `8x` rotational symmetry around origin).
- **Custom Plane**: Position the symmetry origin point `(x, y, z)`, set arbitrary normal vectors, and adjust Euler rotation angles with visual semi-transparent plane guides.

### Floating Reference Clipboard & Tracing Mode

The Reference Clipboard ([`FloatingReferenceClipboard.tsx`](file:///e:/X/AiStudio%20Workflow/v14/src/components/FloatingReferenceClipboard.tsx)) overlays concept art and photos directly into your workspace:
- **Drag-and-Drop Import**: Drop any PNG, JPG, or WebP image into the viewport.
- **Tracing Mode (`Click-Through`)**: Pointer clicks pass through the image directly into the 3D canvas, enabling 1:1 drawing over reference silhouettes.
- **Pin to Screen**: Toggle between screen-locked overlay and floating 3D spatial billboard.
- **Image Filters**: Invert colors, Grayscale conversion, Opacity slider, and Horizontal/Vertical mirror flipping.

---

## 9. Universal 3D Model Conversion & Draco Compression

### Universal 8-Format Importer

The converter engine ([`modelConverter.ts`](file:///e:/X/AiStudio%20Workflow/v14/src/core/modelConverter.ts) & [`modelLoader.ts`](file:///e:/X/AiStudio%20Workflow/v14/src/core/modelLoader.ts)) parses and standardizes 8 industry-standard 3D formats on the client:

```
[ .GLB / .GLTF ] ──┐
[ .OBJ + .MTL  ] ──┤
[ .FBX         ] ──┼──► Universal Model Parser ──► BVH Indexing ──► 3D Viewport
[ .3DS         ] ──┤    & Draco WASM Encoder       & Mesh Cache
[ .STL         ] ──┤
[ .PLY / .DAE  ] ──┘
```

- **GLB / GLTF**: Binary and JSON glTF 2.0 files with PBR materials.
- **OBJ + MTL**: Wavefront geometry with material libraries and texture maps.
- **FBX**: Autodesk Filmbox binary and ASCII models with skeletal hierarchies.
- **3DS**: Legacy 3D Studio meshes.
- **STL**: Stereolithography CAD and 3D print meshes.
- **PLY**: Stanford polygon point cloud and triangle models.
- **DAE**: Collada digital asset exchange files.

### Bounding Box Normalization & Floor Snapping

Imported models of erratic scales and misaligned orientations are sanitized automatically:
- **Center Origin**: Automatically centers the geometric mass at `(0, 0, 0)`.
- **Snap to Floor**: Shifts the lowest bounding box vertex to rest at `Y = 0.0`.
- **Uniform Scaling**: Scales models to fit within the standard studio viewport envelope (normalized bounding diameter of 2.0 units).
- **Up-Axis Conversion**: One-click toggle between `Y-Up` (standard Three.js/OpenGL) and `Z-Up` (Blender/CAD).

### Google Draco Quantization Suite

Integrated Google Draco WASM compression shrinks multi-megabyte 3D files by up to 90%:
- **Compression Level**: Configurable encoder effort from `1` (instant) to `10` (maximum reduction).
- **Position Quantization**: `8` to `16` bits (controls vertex coordinate precision).
- **Normal Quantization**: `6` to `12` bits (controls surface shading smoothness).
- **UV Quantization**: `6` to `12` bits (controls texture coordinate accuracy).
- **Color Quantization**: `6` to `10` bits (controls vertex color fidelity).

### In-App Local Model Library & IndexedDB Persistence

The **Model Library Modal** ([`ModelLibraryModal.tsx`](file:///e:/X/AiStudio%20Workflow/v14/src/components/ModelLibraryModal.tsx)) stores assets locally:
- Saves imported models, calibrations, custom strokes, and auto-generated thumbnail previews in browser **IndexedDB**.
- Zero upload to external cloud servers; 100% private and offline-capable.
- Pre-bundled templates include: *Capybara Bath*, *Chonky Axolotl*, *Pusheen Cat*, *Akira Bike*, and *Ash Character*.

---

## 10. Export Formats & Delivery Pipelines

Open the **Export Modal** ([`ExportModal.tsx`](file:///e:/X/AiStudio%20Workflow/v14/src/components/ExportModal.tsx)) from the top header bar to generate production deliverables:

| Export Option | Format / Extension | Output Contents & Target Use Case |
| :--- | :--- | :--- |
| **Draco-Compressed GLB** | `.glb` | Quantized binary glTF with embedded vertex colors, materials, and stroke meshes. Ideal for web apps and games. |
| **Standard GLB** | `.glb` | Uncompressed glTF 2.0 compatible with Blender, Unity, Unreal Engine, Substance 3D, and Godot. |
| **Wavefront OBJ + MTL** | `.obj` + `.mtl` | Universal geometry file with accompanying material definition text. Compatible with legacy CAD and DCC tools. |
| **UV Texture Map (2K/4K)** | `.png` | 2048x2048 (or 4096) high-resolution PNG image containing painted UV texture atlases. |
| **Studio Snapshot Render** | `.png` | Viewport frame capture rendered at canvas native resolution with transparent or solid background. |
| **Vector Stroke JSON** | `.json` | Raw 3D spline coordinate data, pressure curves, normals, and brush settings for programmatic replay or AI pipelines. |
| **WebXR AR Model** | `.usdz` / `.glb` | Augmented reality file ready for instant QuickLook on iOS (USDZ) and Scene Viewer on Android (GLB). |

---

## 11. Master Keyboard Shortcuts & Gestures Matrix

### Tool Selection & Drawing

| Action | Shortcut Key / Mouse Action | Description |
| :--- | :--- | :--- |
| **Surface Brush** | `B` or `1` | Selects standard 3D surface painting brush. |
| **Free Spatial Brush** | `Shift` + `B` | Activates free 3D air drawing mode. |
| **UV Atlas Brush** | `U` | Activates dynamic UV texture painting mode. |
| **Eraser Toggle** | `E` or `2` | Toggles between current brush and eraser. |
| **Eyedropper Tool** | `I` or `3` (or hold `Alt`) | Samples color and material DNA from any 3D hit point. |
| **Liquify Tool** | `L` or `4` | Activates 3D volumetric mesh deformation brush. |
| **Straight Line Lock** | Hold `Shift` while drawing | Constrains the active stroke to a straight 3D line. |
| **Undo Last Action** | `Ctrl` + `Z` (or `Cmd` + `Z`) | Reverts the last stroke, layer edit, or transform. |
| **Redo Action** | `Ctrl` + `Y` / `Ctrl` + `Shift` + `Z` | Re-applies the previously undone action. |
| **Brush Size Up** | `]` (Right Bracket) | Increases brush radius by 10%. |
| **Brush Size Down** | `[` (Left Bracket) | Decreases brush radius by 10%. |

### Viewport & Camera Navigation

| Action | Shortcut Key / Touch Gesture | Description |
| :--- | :--- | :--- |
| **Orbit Camera** | Right-Click Drag / Two-Finger Drag | Rotates camera around current focal point. |
| **Pan Camera** | Middle-Click Drag / Three-Finger Drag | Shifts camera position laterally. |
| **Zoom In / Out** | Scroll Wheel / Pinch Gesture | Moves camera closer or further from focal target. |
| **Frame & Center (Focus)** | `F` | Fits active 3D model and all strokes within camera view. |
| **Front View** | `Numpad 1` | Snaps camera to Orthogonal Front perspective. |
| **Side View (Right)** | `Numpad 3` | Snaps camera to Orthogonal Right side perspective. |
| **Top View** | `Numpad 7` | Snaps camera to Orthogonal Top perspective. |
| **Isometric View** | `Numpad 5` | Snaps camera to standard 45° isometric perspective. |
| **Toggle Projection** | `P` | Switches between Perspective and Orthographic cameras. |
| **Toggle Floor Grid** | `G` | Toggles visibility of the ground measurement grid. |
| **Reset View** | `Home` | Resets camera to default starting position and zoom. |

### Panels, Modals & Workflows

| Action | Shortcut Key | Description |
| :--- | :--- | :--- |
| **Color Studio** | `C` | Opens the OKLab / OKLCh Color Studio modal. |
| **Brush Settings** | `K` | Opens Brush Dynamics & Jitter settings. |
| **Layer Stack** | `Ctrl` + `L` | Toggles Layer Stack and blend mode panel. |
| **Model Library** | `M` | Opens in-app 3D Model Library and template browser. |
| **Model Converter** | `Ctrl` + `M` | Opens Universal 3D Format Converter & Draco Suite. |
| **Illumination Studio** | `H` | Opens Lighting & HDRI Environment editor. |
| **Skybox Studio** | `S` | Opens Procedural Sky, Cloud & Atmosphere panel. |
| **Scaffolding Guide** | `Ctrl` + `G` | Opens Anatomical & Geometric Scaffolding generator. |
| **Reference Clipboard** | `R` | Opens Floating Reference Image Overlay clipboard. |
| **Export Dialog** | `Ctrl` + `E` | Opens GLB, OBJ, UV, and Snapshot export modal. |
| **Stylus Radial Menu** | Stylus Barrel Button / `Spacebar` | Summons radial shortcut menu at cursor coordinates. |

---

## 12. Troubleshooting & Performance Optimization

### 1. Viewport FPS Drops on Dense Meshes
- **Cause**: Multi-million polygon raw meshes with unoptimized collision geometry.
- **Fix**: Open the **Raycast Settings Modal** (`RaycastSettingsModal.tsx`) and switch Raycast Sample Density from `Ultra (48)` to `Standard (16)`. Enable **Double-Sided Raycasting** only when painting thin two-sided sheets.

### 2. Coplanar Z-Fighting or Flickering Strokes
- **Cause**: Stroke geometry sharing exact coplanar depth with underlying mesh polygons.
- **Fix**: The studio automatically applies a base surface offset (`0.002` units). If flickering occurs on low-curvature surfaces, increase **Surface Offset** in the Brush Settings Panel to `0.004` or `0.006`.

### 3. Palm Touches Causing Stray Strokes on Tablets
- **Cause**: Simultaneous touch events and pen input registered by browser.
- **Fix**: Enable **Finger-Pen Mode** in the toolbar. This locks drawing strictly to hardware stylus pens and reserves finger touches exclusively for camera orbit, pan, and zoom.

### 4. Draco WASM Decoder Loading Error
- **Cause**: Missing static Draco decoder binaries in the public folder.
- **Fix**: Ensure the [`public/draco/`](file:///e:/X/AiStudio%20Workflow/v14/public/draco) directory contains `draco_decoder.wasm` and `draco_wasm_wrapper.js`. Vite automatically serves these assets at `/draco/`.

### 5. WebGPU Backend Not Activating
- **Cause**: Browser hardware acceleration disabled or outdated GPU drivers.
- **Fix**: In Chrome or Edge, navigate to `chrome://flags/#enable-unsafe-webgpu` and verify that Hardware Acceleration is enabled in browser system settings. The application automatically falls back to high-performance **WebGL2** if WebGPU is unavailable.

---

## Summary & Quick Links

- [Flagship Application Directory (`v14`)](file:///e:/X/AiStudio%20Workflow/v14)
- [Codebase Specification (`v14/CODEBASE.md`)](file:///e:/X/AiStudio%20Workflow/v14/CODEBASE.md)
- [Core Studio Engine (`studioEngine.ts`)](file:///e:/X/AiStudio%20Workflow/v14/src/core/studioEngine.ts)
- [27 Animated Shaders (`animatedShaders.ts`)](file:///e:/X/AiStudio%20Workflow/v14/src/core/animatedShaders.ts)
- [Universal Model Converter (`modelConverter.ts`)](file:///e:/X/AiStudio%20Workflow/v14/src/core/modelConverter.ts)
- [Transform Navigator Suite (`TransformNavigator.tsx`)](file:///e:/X/AiStudio%20Workflow/v14/src/components/TransformNavigator/TransformNavigator.tsx)
- [Procedural Skybox Engine (`proceduralSky.ts`)](file:///e:/X/AiStudio%20Workflow/v14/src/core/proceduralSky.ts)
- [Experiments Gallery Catalog (`Experiments/README.md`)](file:///e:/X/AiStudio%20Workflow/Experiments/README.md)
