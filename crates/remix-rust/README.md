# Remix 3D Studio (Pure Rust & wgpu Native Architecture)

> High-performance, zero-allocation native 3D painting workstation built entirely in pure Rust, targeting **Android** (Vulkan / NDK) and **Desktop** (Windows DirectX 12 / Vulkan, macOS Metal, Linux).

---

## Workspace Structure

```text
crates/remix-rust/
├── Cargo.toml                       # Workspace manifest
├── crates/
│   ├── remix-core/                  # SIMD Math (glam), Bishop frames, Catmull-Rom lofts,
│   │                                # Conformal beads, BVH raycaster, KD-Tree liquify, OKLab color math
│   ├── remix-render/                # wgpu pipeline, 27 animated WGSL procedural shaders,
│   │                                # Preetham skybox & volumetric cloud dome
│   ├── remix-formats/               # Wavefront OBJ parser & binary glTF (GLB) exporter
│   ├── remix-gui/                   # Immediate-mode egui tactile HUD (Toolbar, Brush settings, Color studio, Layers)
│   ├── remix-audio-haptics/         # Procedural sound synthesizer & Android NDK haptics
│   └── remix-app/                   # Cross-platform window & event loop (winit + wgpu)
└── README.md
```

---

## Desktop Quick Start

Run the native desktop application:

```bash
cargo run -p remix-app
```

Run all unit tests across the entire workspace:

```bash
cargo test --workspace
```

---

## Android Build & Deployment Guide

### Prerequisites
1. **Android NDK**: Version r26b or later.
2. **Rust Android Targets**:
   ```bash
   rustup target add aarch64-linux-android
   rustup target add armv7-linux-androideabi
   rustup target add x86_64-linux-android
   ```
3. **Cargo NDK**:
   ```bash
   cargo install cargo-ndk
   ```

### Building for Android (ARM64)
Compile the standalone shared library or APK:

```bash
cargo ndk -t arm64-v8a -o ./android/app/src/main/jniLibs build --release -p remix-app
```

For direct APK packaging using `cargo-apk`:
```bash
cargo install cargo-apk
cargo apk run --target aarch64-linux-android
```

---

## Features & Subsystems Implemented

1. **Volumetric Conformal Bead & Tube Geometry**:
   - 4 stroke profiles: `Tube`, `Ribbon`, `Marker / Chisel`, and `Conformal Arched Dome`.
   - Bishop parallel transport frame for twist minimization along 3D spatial curves.
   - Dynamic pressure modulation and smooth start/end tapering.
   - Reusable buffer allocation layout to eliminate runtime heap allocations.

2. **27 Animated WGSL Procedural Shaders**:
   - Full WebGPU Shading Language implementations of the procedural shaders:
     - Fire, Ocean Wave, Waterfall, Caustic, Foam, Ripple, Lava, Galaxy, Rainbow, Lightning,
     - Glitter, Candy, Slime, Sparkler, Foliage Leaf, Foliage Fir, Cloud, Jelly, Plasma,
     - Volumetric Plasma, Rim Light, Anime Cel, Jelly Warp, Posterize Ink, Aurora, Hologram, Electric Arc.
   - Built-in OKLab / OKLCh perceptual color space mixing routines.

3. **Spatial Raycasting & Liquify Mesh Deformation**:
   - Möller-Trumbore ray-triangle intersection with barycentric UV and normal interpolation.
   - 3D Volumetric mesh deformation: `Push`, `Pinch`, `Inflate`, `Comb` with cubic Hermite smoothstep falloffs.

4. **Procedural Skybox**:
   - Physically-based Preetham atmospheric scattering model with Rayleigh and Mie glare.
   - Multi-layer 3D volumetric noise raymarching for procedural dynamic cloud layers.

5. **Universal 3D Formats**:
   - Wavefront `.obj` file format importer with automated normal synthesis and UV mapping.
   - Binary glTF (`.glb`) direct packaging and export.
