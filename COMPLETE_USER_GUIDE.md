# PaperRockets — 3D Painting Studio
## Complete User Guide

**Version:** V16  
**Last Updated:** September 2026  
**For:** Samsung Galaxy Tab S6 Lite, Galaxy phones, desktop Chrome

---

## Table of Contents

1. [Part 1 — First Run & The 60-Second Sketch](#part-1--first-run--the-60-second-sketch)
2. [Part 2 — Drawing & Shaping](#part-2--drawing--shaping)
3. [Part 3 — Moving Around & the Navigator](#part-3--moving-around--the-navigator)
4. [Part 4 — Stage, Light & Tracing](#part-4--stage-light--tracing)
5. [Part 5 — Pro Studio & Delivery](#part-5--pro-studio--delivery)

---

# Part 1 — First Run & The 60-Second Sketch

## 1.1 The Four Screen Zones [Play]

When you open PaperRockets in Play mode, the screen splits into four fixed zones. They never move, never overlap the canvas, and never change.

```
┌─────────────────────────────────────────────────┐
│  [Project] [Undo] [Redo] [Settings]   Zone A    │ ← Top strip (48 px)
├──────┬──────────────────────────────────┬───────┤
│      │                                  │       │
│ Zone │          CANVAS                  │ Zone C│
│  B   │     (your drawing space)         │ (dial)│
│      │                                  │       │
│ 4    │                                  │       │
│tools │                                  │       │
│      │                                  │       │
├──────┴──────────────────────────────────┴───────┤
│   Colour    Size    Magic FX     Zone D         │ ← Bottom (40% of screen)
└─────────────────────────────────────────────────┘
```

- **Zone A (top):** Project name · Undo & Redo · Settings menu
- **Zone B (left):** Four tools in a column: Draw, Shape, Super Zap, Move
- **Zone C (bottom-right):** The Navigator dial (for moving around your 3D space)
- **Zone D (bottom-centre):** Colour swatch, Brush size, Magic FX button

The rest of the screen is canvas. You can draw everywhere except these four zones.

## 1.2 The Finger-Pen Golden Rule [Play]

This is the most important thing to know:

> **Fingers move the camera. The pen draws.**

- **One finger tap or drag** → spin the view around
- **Two finger drag** → slide the whole model side to side, or zoom in and out by pinching
- **Three finger drag** → switch between Flat Screen and 3D World views (see §3.2–3.3)
- **Stylus / pen** → draws a stroke (when you have a pen). Pressure makes strokes wider.

If you are drawing on a phone or tablet **without** a stylus, enable **Finger Draw** in Settings (Zone A menu button) — then your finger draws instead. The three-finger camera switch still works, you just lose the camera orbit gesture.

## 1.3 Walkthrough: Painting on a Toybox Template [Play]

Your first painted stroke in 60 seconds:

1. **Pick a Toybox.** Tap the project name in Zone A. You'll see six categories (Animals, Anime, Characters, Houses, Vehicles, Simple Shapes). Tap one, pick a shape you like (a cat, a car, a house), and tap **Start fresh**. The model appears in the middle of the canvas and the brush is already set to Ribbon — the one that sticks to surfaces.

2. **Paint on it.** Hold your pen and drag a stripe across the model. You see a flat band follow your hand. If the stroke curves and hugs the bumps, great — you hit the surface. If it floats in space, you dragged where there is no model to stick to.

3. **Undo it.** Tap the Undo button in Zone A (the curved arrow). The stroke vanishes in one tap.

You just made a mark, undid it, and learned the flow. You're ready for Part 2.

> **Note:** The Toybox is being completed in parallel and may not be in your build yet. If you don't see it, load any model from the Pro mode Model Library first. You can still paint on it.

---

# Part 2 — Drawing & Shaping

## 2.1 The Three Brushes [Play]

Press and hold the **Draw** button (Zone B) to see your three brush choices. Tap one to switch.

### Tube [Play]

**Recipe: Ink a thick outline**

1. Tap **Draw** tool to make sure you are in draw mode.
2. Long-press the **Draw** button to open brushes, tap **Tube**.
3. Drag a line on your model. You get a fat round cylinder that you can see from every angle.

The Tube is solid, thick, and rolls wherever you go. It feels like drawing with a marker.

### Ribbon [Play]

**Recipe: Ink a character (Toybox template)**

1. Tap the project name, pick a template (e.g., a cat), tap **Start fresh**.
2. The brush is already **Ribbon** — the flat band that hugs surfaces.
3. Drag across the cat's face, body, paws. The strokes flatten and stick to the shape like you drew on paper.

Ribbon is best for drawing *on* 3D models because it clings to the surface. If you paint on a flat model, the strokes wrap around like tape.

### Star Dust [Play]

**Recipe: Add sparkle and glow**

1. Long-press **Draw**, tap **Star Dust**.
2. Drag across your model. You see a scatter of sparkly dots.
3. Go to Zone D, tap **Magic FX**, tap **Neon Glow** to light it up.

Star Dust is a spray texture. Combine it with Magic FX for supernatural effects.

### **Pro: Marker, Bead, and 17 others [Pro]**

Switch to Pro mode (Settings > Advanced tools) to unlock:
- **Marker:** Chisel-tip ribbon with rotation and aspect controls
- **Bead:** A rigid dome that wraps around curved surfaces
- **Plus 17 more presets** for specialized materials and surface textures.

## 2.2 Magic FX vs Full PBR Mode [Play] [Pro]

**Magic FX** is a simple button in Zone D. One tap picks a complete look:

| FX | What happens |
|---|---|
| **Neon Glow** | The stroke glows and lights up the scene |
| **Lava** | Glowing molten orange cracks |
| **Slime** | Gooey bubbling liquid texture |
| **Cartoon** | Crisp 2-tone anime shading with ink outlines |
| **Rainbow** | A spectrum wave travels down your stroke |
| **Sparkle** | Glittery microscopic facets |
| **None** | Plain paint, no effect |

When you tap one, the next stroke you draw gets that look immediately. You can mix effects — draw a Tube, add Neon Glow, draw a Ribbon without it, then add Lava to the next stroke.

### Full PBR (Pro only) [Pro]

In Pro mode, open **Settings > Brush Settings** to unlock the full material engine:
- **Roughness:** 0 = mirror polish, 1 = dull clay
- **Metalness:** 0 = paint, 1 = polished metal
- **Emissive Intensity:** 0 = off, 3 = blazing light
- **Plus 23 more effects** (Fire, Ocean Wave, Plasma, Aurora, etc.)

Each stroke stores these values individually. You paint with a complete PBR studio.

## 2.3 Shape Snapping: Lines, Circles, Polygons [Play]

Tap the **Shape** tool (Zone B) to lock drawing into perfect geometry.

**Recipe: Draw a perfect circle**

1. Tap **Shape** tool.
2. Drag a rough circle on your model. When you lift your pen, the app snaps it to a perfect circle.
3. If it snaps to the wrong shape, undo and try again with a clearer gesture.

Supported shapes:
- **Straight lines** — draw any line-like gesture
- **Circles & ellipses** — draw oval gestures
- **Rectangles** — draw four-sided shapes
- **Polygons** — draw multiple sides for triangles, pentagons, hexagons

The snap happens automatically when you finish the stroke. If you don't like the result, undo and redraw.

## 2.4 Fixing Things: Super Zap [Play]

Tap the **Super Zap** button (Zone B) — the eraser icon.

**Recipe: Delete a stroke**

1. Make a stroke on your model (any brush, any FX).
2. Tap **Super Zap**.
3. Drag across the stroke you want to delete. The whole stroke vanishes.

Super Zap erases in **vacuum** mode: one drag, whole stroke gone. A single undo brings it back.

> **Note:** Super Zap cannot erase *part* of a stroke — it is all-or-nothing. This keeps the model clean and the undo stack simple.

### **Pro: Cutout (sculpt away paint) [Pro]**

In Pro mode, switch the eraser to **Cutout** mode (long-press the Super Zap button, see the mode selector):

**Recipe: Carve a window**

1. Long-press **Super Zap**, toggle mode to **Cutout**.
2. Drag across a Ribbon stroke — a rectangular hole appears where you dragged.
3. You can carve away part of a stroke without deleting the whole thing.

Cutout is surgical — use it for detail work. Super Zap (Vacuum) is for quick cleanup.

---

# Part 3 — Moving Around & the Navigator

The **Navigator** is a dial in **Zone C** (bottom-right). It always sits there. It has two modes.

## 3.1 Camera: Orbit, Pan, Zoom, View Snapping [Play]

Even with the Navigator hidden, your fingers control the camera:

| Gesture | What happens |
|---|---|
| **One finger drag** | Spin around the model (orbit) |
| **Two finger drag** | Slide the model across the screen, or pinch to zoom |
| **Three finger drag** | Switch modes (see 3.2–3.3) |

To snap to a standard view (front, side, top), look for the view buttons inside the Navigator. Each one is labeled clearly.

## 3.2 "Flat Screen" Mode [Play]

Tap the **Flat Screen** label in the Navigator dial.

When you are in Flat Screen mode:
- **One finger** moves the model *across the glass* (no rotation)
- **Two finger** zooms in/out
- The model stays flat against the screen

This is useful when you want to reposition without accidentally spinning. Think of it like sliding a piece of paper around a table.

## 3.3 "3D World" Mode [Play]

Tap the **3D World** label in the Navigator dial.

You see three coloured nodes and rings:

- **Red X-axis** — points right
- **Green Y-axis** — points up  
- **Blue Z-axis** — points toward you

Drag the axis nodes to rotate that specific axis. Drag the rings to spin around each axis. It is more precise than one-finger orbit but takes practice.

## 3.4 The Depth Guard When You Snap to Front / Top / Side [Play]

When you snap the view to **Front** (looking straight at the model), the app disables depth — you cannot move forward or backward. This prevents accidental z-fighting (two strokes fighting over which is in front).

You'll see a brief toast: **"Depth locked — you're drawing flat"**

To move in depth again, switch back to a 3D view (Isometric, or manually rotate).

---

# Part 4 — Stage, Light & Tracing

## 4.1 One-Tap Sky and Lighting Presets [Play]

Tap the **Settings** button (Zone A, menu icon) to open the settings sheet. Look for **Sky & Lighting** or similar.

You see preset buttons:

| Preset | Mood |
|---|---|
| **Clear Noon** | Bright, shadowless, studio lighting |
| **Golden Sunset** | Warm, long shadows, atmospheric |
| **Neon Night** | Cyberpunk glow and dark ambiance |
| **Overcast** | Soft, diffuse, no shadows |
| **Warm Clay** | Neutral sculpting light |

Tap one and the whole scene changes immediately. The colours of your strokes stay the same, but the lighting changes how they reflect.

### **Pro: Full sky and atmosphere editor [Pro]**

In Pro mode, open **Settings > Sky & Atmosphere** to unlock the full editor:
- Adjust the sun position (azimuth and elevation)
- Control cloud coverage, wind, and altitude
- Customize zenith and horizon colours
- Add volumetric god rays
- Export 360° panoramas

## 4.2 Tracing Mode: Floating Reference Images [Play]

In the Settings sheet, look for **Reference Image** or **Floating Clipboard**.

1. Drag and drop a JPG, PNG, or WebP image from your computer onto the canvas.
2. The image appears as a semi-transparent overlay.
3. Tap the image and adjust its opacity, position, and scale.
4. Enable **Click-Through** (or **Tracing Mode**) — now you can draw through the image directly onto your 3D model. Useful for drawing over reference photos.

> **Note:** This feature is being wired up and may not be in your current build. If it is not in Settings, it will be in the next release.

## 4.3 Guides and Mirror/Symmetry [Play]

Look in the Settings sheet for **Mirror & Symmetry** options.

**Recipe: Paint a symmetric face**

1. Open **Mirror & Symmetry**.
2. Toggle **Mirror on X-Axis** (or Y-Axis, depending on your model orientation).
3. Draw a line on one side of the model. Instantly, the same line appears mirrored on the other side.

When mirroring is on, every stroke you draw is duplicated across the mirror plane. Useful for characters, vehicles, architecture.

### **Pro: Radial symmetry, custom planes [Pro]**

In Pro mode:
- **Radial symmetry:** 4x or 8x rotational copies
- **Custom mirror plane:** Position the plane anywhere with full 3D control

### **Pro: Bent Guides — Sweep an arch [Pro]**

**Recipe: Sweep an arch**

1. Open **Bent Guide** in the Pro toolbar.
2. Click the canvas to add control points along a curve (e.g., an arc from ground to sky).
3. In the Bent Guide panel, set **Profile** to **U-Channel** (the cross-section shape).
4. Adjust **Tension** (0 = relaxed curve, 1 = tight curve) to control how smooth the path is.
5. Adjust **Twist** to add rotational spin along the path if desired.
6. Tap **Bake** to convert the guide into a permanent painted surface.

Bent Guides are parametric — you draw a path and a cross-section, and the engine extrudes one along the other. Useful for arches, pipes, roads, and organic forms.

---

# Part 5 — Pro Studio & Delivery

When you switch to **Pro mode** (Settings > Advanced tools > toggle **Advanced tools** on), every control you see in Play stays the same, and additional panels appear:

## 5.1 Layers and Blend Modes [Pro]

The **Layer Panel** lets you organize strokes:

- **Stack order:** Drag layers to reorder which strokes appear in front
- **Opacity:** Fade a layer from invisible to opaque
- **Blend modes:** Normal, Multiply, Screen, Overlay, Add, Subtract
- **Folders:** Group related layers together

Each layer stores:
- All strokes drawn on that layer
- The layer's opacity and blend mode
- Which material settings were active

## 5.2 Converting and Compressing Models (8 Formats, Draco) [Pro]

Open **Export** (top menu in Zone A) to convert your painting to other formats.

Supported formats:
- **.glb / .gltf** — Standard 3D file, compatible with Blender, Unreal, Unity, web
- **.obj + .mtl** — Wavefront, loads in most CAD tools
- **.fbx** — Autodesk Filmbox, for game engines
- **.3ds** — Legacy 3D Studio format
- **.stl** — CAD and 3D printing
- **.ply** — Point cloud format
- **.dae** — Collada digital asset exchange

### Draco Compression [Pro]

When exporting to GLB or OBJ, choose **Draco compression** to shrink the file by up to 90%:

| Setting | Effect |
|---|---|
| **Compression Level** | 1 (fast) to 10 (tiny) |
| **Position Quantization** | 8–16 bits (vertex precision) |
| **Normal Quantization** | 6–12 bits (surface smoothness) |
| **UV Quantization** | 6–12 bits (texture accuracy) |
| **Color Quantization** | 6–10 bits (vertex color fidelity) |

Higher = smaller file, but a bit less detail. Start at level 7 for a good balance.

## 5.3 Viewing Your Work at Life Size (WebXR) [Pro]

Export your model as `.usdz` (iOS) or `.glb` (Android).

**On iPhone:** The model opens in QuickLook and can be placed in your room via AR.

**On Android:** The model opens in Scene Viewer and can be scaled to real-world size.

This lets you see your painting at life size on a wall or table.

## 5.4 Shortcuts & Troubleshooting [Pro]

### Keyboard Shortcuts (Desktop) [Pro]

| Key | Action |
|---|---|
| `B` | Switch to Brush tool |
| `E` | Switch to Eraser tool |
| `I` | Eyedropper (sample colour) |
| `L` | Liquify tool |
| `U` | UV painting mode |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` or `Ctrl+Shift+Z` | Redo |
| `[` / `]` | Decrease / increase brush size |
| `F` | Frame & center view |
| `Numpad 1` | Front view |
| `Numpad 3` | Side (right) view |
| `Numpad 7` | Top view |
| `Numpad 5` | Isometric view |
| `P` | Toggle perspective / orthographic |
| `G` | Show / hide grid |
| `C` | Open Colour Studio |
| `Ctrl+L` | Open Layer Panel |
| `M` | Open Model Library |
| `Ctrl+M` | Open Model Converter |
| `H` | Open Lighting Studio |
| `S` | Open Sky & Atmosphere |
| `R` | Open Reference Clipboard |
| `Ctrl+E` | Open Export |

### Performance & Troubleshooting [Pro]

**Canvas lags when you have many strokes:**
- Reduce the viewport resolution (Settings > Performance)
- Merge layers you are done with
- Export as compressed GLB and re-import the compressed version

**Strokes flicker or float above the surface:**
- Tap the offending stroke, then Undo
- In Brush Settings, increase "Surface Offset" to push strokes further from the mesh

**Palm is drawing when I don't want it to:**
- Enable **Finger-Pen Mode** in Play, or **Finger-Pen Strict Mode** in Pro Settings
- This locks drawing to the stylus only; fingers orbit the camera

**Draco export fails:**
- Check that your model is under 100 MB raw size
- Try a lower compression level (7 instead of 10)

---

## How It Works Under the Hood

For details on the mathematics and algorithms that make PaperRockets work — Bishop transport frames, OKLab colour maths, WBOIT rendering, Draco compression, BVH acceleration, and more — see **ARCHITECTURE_INTERNALS.md**.

---

## Appendix: Copy Deck (Exact UI Strings)

These are the exact strings you see on screen:

- **Tools:** Draw · Shape · Super Zap · Move
- **Brushes:** Tube · Ribbon · Star Dust
- **Brush blurbs:** "Fat round line you can fly through the air" · "Flat band that hugs whatever it lands on" · "Sparkly scatter for glow and fur"
- **FX:** Neon Glow · Lava · Slime · Cartoon · Rainbow · Sparkle · None
- **Navigator states:** Flat Screen · 3D World
- **Depth guard toast:** "Depth locked — you're drawing flat"
- **Toybox confirm:** "Start a new page? Your drawing will be cleared." / Cancel / Start fresh
- **Toybox categories:** Animals · Anime · Characters · Houses · Vehicles · Simple Shapes
- **Finger-Pen Golden Rule:** "Fingers move the camera. The pen draws." + "1 finger = spin around, 2 fingers = slide and zoom, 3 fingers = flat/3D view. No pen? Turn on Finger Draw in Settings and your finger draws instead."
- **Pro mode setting:** Advanced tools — "Shows every control. For grown-up 3D work."
