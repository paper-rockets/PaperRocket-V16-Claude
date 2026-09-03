# PaperRockets Architecture & Internals
## Deep Dives Into the Engine

This document explains the mathematics, rendering techniques, and data structures that make PaperRockets work. It is reference material for developers, not users. 

**For a beginner-friendly user guide, see [COMPLETE_USER_GUIDE.md](./COMPLETE_USER_GUIDE.md).**

---

## Table of Contents

1. [Stroke Geometry & Surface Projection](#stroke-geometry--surface-projection)
2. [Rendering & Transparency](#rendering--transparency)
3. [Colour Science](#colour-science)
4. [Atmosphere & Lighting](#atmosphere--lighting)
5. [3D Model Processing & Compression](#3d-model-processing--compression)
6. [Spatial Acceleration & Collision](#spatial-acceleration--collision)
7. [What Runs Silently](#what-runs-silently)

---

## Stroke Geometry & Surface Projection

### Bishop Parallel Transport Frames

Every stroke in PaperRockets is a spline curve with an orientation frame. As the pen moves through 3D space, the frame must rotate smoothly without gimbal lock (twist flipping).

The **Bishop frame** (also called rotation-minimizing frame, RMF) solves this by rotating the least amount necessary at each curve segment. Instead of computing a normal vector at each point (which can cause flipping at inflection points), Bishop frames use the previous frame's orientation and incrementally rotate only as much as needed to stay perpendicular to the curve tangent.

- **Implementation:** `conformalBeadGenerator.ts` computes Bishop frames by integrating the rotation-minimization condition along the spline.
- **Math:** At segment `i`, the frame rotates by the minimal amount that keeps it perpendicular to the tangent vector.
- **Visual result:** Ribbons and tubes follow curves without twisting or flipping, even when drawing complex 3D paths.

### Conformal Bead Surface Projection

The **conformal bead** is a 3D arc cross-section that hugs the mesh surface. Unlike a simple cylinder or ribbon, the bead adapts to the local surface curvature.

- **Dome factor:** Controls how tall the arc is (0.0 = flat ribbon, 1.0 = tall dome).
- **Surface normal projection:** At each stroke point, a raycast finds the nearest surface. The bead's base sits on that surface, and the dome arches outward along the local surface normal.
- **Silhouette clamping:** When a stroke approaches a sharp edge or grazes the surface at a shallow angle, the dome is automatically suppressed to prevent Z-fighting and visual artifacts.
- **Implementation:** `conformalBeadGenerator.ts` (`generateConformalBead`, `computeSegmentGeometry`)

### Ribbon Geometry with Barycentric Interpolation

Ribbons are dual-sided planar bands that wrap around 3D surfaces. To paint accurately onto UV texture maps, the engine computes barycentric coordinates.

- **Barycentric coordinate:** For any point inside a triangle, barycentric coordinates `(u, v, w)` describe the point's position as a weighted average of the triangle's three vertices. Since `u + v + w = 1`, they naturally interpolate UV coordinates and vertex attributes.
- **Raycast hit:** When the pen hits a mesh, the engine finds the triangle and computes barycentric coordinates for the hit point.
- **UV lookup:** Using barycentric coordinates, vertex attributes (colour, normal, UV coordinate) are smoothly interpolated across the triangle.
- **Implementation:** `uvPaintingEngine.ts` (`interpolateVertexAttributes`, `computeBarycentricCoordinates`)

---

## Rendering & Transparency

### Weighted Blended Order-Independent Transparency (WBOIT)

Painting transparent strokes on top of opaque geometry creates a sorting problem: if strokes overlap, the renderer must know which is in front. Traditional alpha blending sorts from back-to-front, but this is expensive with hundreds of strokes and breaks if strokes move.

**WBOIT** solves this by weighting the contribution of each fragment by its depth and opacity, allowing fragments to be rendered in any order and still blend correctly.

- **Accumulation pass:** Each stroke fragment writes to two textures: an accumulation buffer and a reveal buffer.
  - **Accumulation:** `fragment_color * fragment_alpha * weight`
  - **Reveal:** `fragment_alpha`
  - **Weight:** A function of depth that ensures closer, more opaque fragments contribute more.
- **Composite pass:** Final colour = `accumulation / reveal`
- **Mathematical property:** The order of multiplication doesn't matter (commutativity), so fragments can be blended in any order without sorting.
- **Implementation:** `wboitPipeline.ts` (`initWBOITPipeline`, `accumulationPass`, `compositePass`)
- **Trade-off:** WBOIT is not mathematically perfect for very deep stacks (20+ layers), but it avoids sorting glitches entirely.

### WGSL Compute Shaders & Post-Processing

Modern GPUs support **compute shaders** — tiny programs that run in parallel on thousands of threads. PaperRockets uses WebGPU compute shaders (when available) for:

- **Velocity field updates** (liquify deformation)
- **Depth of field blur** (kernel sampling)
- **Bloom extraction** (bright fragment isolation)
- **Particle simulation** (for some FX shaders)

When WebGPU is unavailable, these fall back to **WebGL 2.0 fragment shaders**, which are slower but produce identical results.

---

## Colour Science

### Oklab / OKLCh Colour Space

**sRGB** and **linear RGB** are device-centric colour spaces where equal distances in the numbers do not correspond to equal perceptual differences. Red is much brighter than blue, even when their sRGB values are equal.

**Oklab** (designed by Björn Ottosson) solves this by decoupling:
- **L** (lightness): 0–1, perceptually linear
- **a** (green–red axis)
- **b** (blue–yellow axis)

Colors interpolated in Oklab look natural and avoid muddy greys.

**OKLCh** is the polar form of Oklab:
- **L** (lightness): same as Oklab
- **C** (chroma): saturation (0 = greyscale, 1 = vivid)
- **h** (hue): angle in the chroma plane (0° = red, 120° = green, 240° = blue)

**PaperRockets use Oklab internally for all blending.** The colour picker shows OKLCh for intuitive hue/saturation selection, but the shader math happens in Oklab.

- **Implementation:** `colorMath.ts`
  - `srgbToOklab`, `oklabToSrgb`
  - `oklabToOklch`, `oklchToOklab`
  - `oklabMix` (perceptually smooth interpolation)

### Harmonic Colour Schemes

The Colour Studio in Pro mode generates colour harmony sets by rotating in OKLCh hue space:

| Scheme | Hue offsets |
|---|---|
| **Complementary** | 0°, 180° |
| **Analogous** | 0°, ±30° |
| **Triadic** | 0°, 120°, 240° |
| **Split-Complementary** | 0°, 150°, 210° |
| **Tetradic** | 0°, 90°, 180°, 270° |

Each hue is rotated while keeping lightness and chroma fixed.

---

## Atmosphere & Lighting

### Rayleigh and Mie Scattering

The sky dome simulates realistic atmospheric scattering using the **Preetham atmospheric model**.

**Rayleigh scattering** (molecular air):
- Dominates short wavelengths (blue light scatters more)
- Creates the deep blue zenith sky
- Falls off as `1 / λ⁴` (lambda to the fourth power)

**Mie scattering** (aerosols, dust, moisture):
- Dominates longer wavelengths (yellows and reds)
- Creates haze and glow around the sun
- Controlled by turbidity (0 = clear, 1 = hazy)

**Ozone absorption:**
- Removes UV and blue light at the horizon
- Creates golden and red sunsets

The sky colour at any point is computed as:

```
sky_colour = zenith_colour + horizon_fade(elevation) + scattering_term(sun_direction)
```

- **Implementation:** `proceduralSky.ts` (`computeAtmosphericScattering`)

---

## 3D Model Processing & Compression

### Universal 8-Format Importer

PaperRockets accepts:
1. **GLB/GLTF 2.0** (via Three.js `GLTFLoader`)
2. **OBJ/MTL** (via `OBJLoader`)
3. **FBX** (via `FBXLoader`)
4. **3DS** (via `TDSLoader`)
5. **STL** (via `STLLoader`)
6. **PLY** (via `PLYLoader`)
7. **DAE/Collada** (via `ColladaLoader`)

All formats are normalized to a common internal representation:
- **Vertex positions** (X, Y, Z)
- **Vertex normals** (for shading)
- **UV coordinates** (texture mapping)
- **Vertex colours** (if present)
- **Material definitions** (colour, roughness, metalness)

- **Implementation:** `modelLoader.ts`, `modelConverter.ts`

### Bounding Box Normalization

Imported models come in at arbitrary scales and positions. PaperRockets normalizes them:

1. **Compute AABB** (axis-aligned bounding box)
2. **Center at origin:** Translate so the box centre is at (0, 0, 0)
3. **Snap to floor:** Shift vertically so the lowest point is at Y = 0
4. **Uniform scale:** Scale so the bounding box diagonal is 2.0 units
5. **Up-axis detection:** Optionally flip Y and Z if the model was modeled with Z-up (Blender convention) instead of Y-up (Three.js convention)

Result: Every model is positioned the same way and fits the standard viewport.

- **Implementation:** `modelNormalization.ts` (`normalizeModel`)

### Google Draco Quantization

**Draco** is a WASM library that compresses 3D mesh data by:

1. **Quantizing vertex positions:** Instead of 32-bit floats (4 bytes per coordinate), store 8–16 bit integers. This loses sub-millimetre precision but shrinks file size dramatically.

2. **Quantizing normals:** 8–12 bits preserves surface shading quality while compressing 3 floats to ~1 byte.

3. **Quantizing UVs:** Texture coordinates rarely need full precision; 8–12 bits is enough.

4. **Entropy encoding:** The quantized data is then LZ77-compressed (like ZIP).

**Settings:**
- **Compression level** 1–10 (higher = slower encode, smaller file)
- **Position quantization** 8–16 bits
- **Normal quantization** 6–12 bits
- **UV quantization** 6–12 bits
- **Color quantization** 6–10 bits

A typical model shrinks by 70–90%. A 10 MB GLB becomes 1 MB. The visual difference is imperceptible unless you zoom in on fine detail.

- **Implementation:** `modelConverter.ts` (`encodeWithDraco`)

---

## Spatial Acceleration & Collision

### BVH (Bounding Volume Hierarchy)

When you draw a stroke, the engine must find where the pen hit the 3D mesh — potentially millions of triangles. Brute-force checking every triangle is too slow.

**BVH** builds a tree of bounding boxes:

```
        Root (entire mesh)
       /           \
    Left           Right
   /   \          /   \
  ...  ...      ...   ...
```

- **Top level:** One box around the entire model
- **Recursive split:** Each box is split into two smaller boxes
- **Leaf level:** Each leaf box contains a small number of triangles (e.g., 8)

**Raycast:** To find a hit, test the ray against the root box first. If it hits, recursively test the two children. If it misses, skip that entire branch. This reduces millions of triangle tests to roughly log(N) box tests.

- **Implementation:** `three-mesh-bvh` library, integrated into `studioEngine.ts`

### Sphere Casting for Collisions

**Sphere casting** is used for eraser collision detection and liquify deformation:

- Instead of a ray, use a sphere (radius = brush size)
- Find all triangles the sphere overlaps
- For **vacuum erase:** delete all strokes touching the sphere
- For **liquify:** displace mesh vertices within the sphere

Sphere casting is implemented via the BVH's `shapecast` method, which is more efficient than testing the sphere against every triangle.

---

## What Runs Silently

**These systems have no menu. They run automatically and must never be "simplified" away.**

1. **WBOIT order-independent transparency:** Every stroke blend is computed correctly regardless of draw order. Disabling this breaks stroke layering.

2. **Bishop parallel-transport frames:** Strokes follow curves without twisting. Removing this causes gimbal lock and visual glitches.

3. **Oklab colour interpolation:** All colour blending (including Magic FX animations) happens in Oklab. Switching to sRGB makes colours muddy.

4. **BVH spatial acceleration:** Raycasting and eraser collision detection depend on BVH. Without it, painting on dense meshes becomes unusable (millisecond delays).

5. **Barycentric interpolation for UV painting:** Texture coordinates are interpolated accurately at the triangle level. Without this, UV strokes appear pixelated.

6. **Conformal surface projection:** Ribbons and beads adapt to surface curvature. Removing this makes them look flat and artificial.

7. **Draco WASM decoder:** Models are shipped pre-compressed. Without the decoder, the compressed files cannot load.

8. **Unified undo stack:** Every action (stroke, erase, layer edit, transform) is recorded. The undo system is real-time and reversible. Breaking this loses user work.

9. **Tauri / Android bridge:** Native OS integration for file I/O, haptics, and lifecycle. Without this, the app cannot save or load files.

10. **Service worker offline cache:** App and models are cached locally. Users can work offline and sync later.

11. **WebGPU / WebGL fallback:** The app detects GPU capabilities and uses WebGPU when available (faster compute), falling back to WebGL 2.0 (compatible). Removing either breaks on newer or older devices.

12. **Procedural sky with Rayleigh/Mie scattering:** The sky is rendered procedurally, not as a texture. This allows dynamic sun position and real-time light synchronization. Baking the sky to a texture would break time-of-day changes.

---

## Engine Code Files — Read-Only Reference

These files implement the systems above and are not modified by UI phases:

| File | Purpose | Lines |
|---|---|---|
| `studioEngine.ts` | Main drawing and collision engine | 5297 |
| `conformalBeadGenerator.ts` | Bishop frames and ribbon geometry | ~800 |
| `wboitPipeline.ts` | Transparency accumulation | ~500 |
| `colorMath.ts` | Oklab/OKLCh colour conversions | ~400 |
| `modelConverter.ts` | 8-format importer and Draco encoder | ~700 |
| `proceduralSky.ts` | Atmospheric scattering | ~600 |
| `liquifyEngine.ts` | Mesh deformation | ~400 |
| `loftEngine.ts` | Spline-based geometry generation | ~500 |
| `uvPaintingEngine.ts` | Barycentric UV texture painting | ~600 |
| `modelNormalization.ts` | Import-time bounding box normalization | ~200 |

All remain untouched across Play-mode development.
