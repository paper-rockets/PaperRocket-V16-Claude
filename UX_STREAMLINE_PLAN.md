# V16 — "Play / Pro" UX Streamline Plan

**Status:** specification, not yet implemented
**Repo root:** `E:\X\AiStudio Workflow\V16` (clone of v14 at commit `7f700f7`)
**Audience:** implementing agents — assume no prior conversation context
**Companion docs:** `REMIX_3D_MASTER_SPECIFICATION.md` (feature catalog), `NAVIGATOR_REVAMP_PLAN.md` (motion physics — separate, still open)

---

## 0. Scope — read this first

The engine is good. The surface is not. This plan **adds a simplified default surface** and
**demotes the existing surface to an opt-in "Pro" mode**. It does not delete engine code.

**Hard rules for every phase below:**

1. **No engine deletion.** `src/core/studioEngine.ts`, `wboitPipeline.ts`, `conformalBeadGenerator.ts`,
   `colorMath.ts`, `modelConverter.ts` (Draco), the BVH spatial acceleration, `proceduralSky.ts` —
   untouched except where a phase explicitly says so. Everything keeps running underneath.
2. **No component deletion in phases 1–9.** Panels move behind the Pro flag. Deletion is a
   separate, later decision (see §8).
3. **Play mode is additive.** Turning Pro on must restore today's UI exactly. If a screenshot of
   Pro mode differs from today's build, that is a bug.
4. **Every visible string is plain language.** No "Catmull-Rom", "RDP", "OKLCh", "WBOIT",
   "conformal", "decimate", "manifold", "scaffolding" in Play-mode UI. Those words live in Pro
   mode and in `ARCHITECTURE_INTERNALS.md` only.
5. **Target device is a Galaxy Tab S6 Lite held in two hands.** Every Play-mode hit target is
   at least 44 px at `uiScale = 1.0`. Nothing critical sits in the top 10% or the middle 60% of the screen.

---

## 1. Audit — what is actually exposed today

Counted from the JSX, not from the spec doc:

| Surface | File | Interactive controls |
|---|---|---|
| Left tool dock (rail + header + 3x3 grid + footer + 4 flyout shelves) | `src/components/Toolbar.tsx` (2042 lines) | **83 buttons + 4 sliders** |
| Transform Navigator (header, dial, 2D dial, 3D dial, tactile dial) | `src/components/TransformNavigator/*` | **64 buttons** |
| Color Studio (HSV + OKLCh polar + harmony schemes) | `src/components/ColorStudioModal.tsx` (1320 lines) | 13 buttons + wheel + sliders |
| Navigator Sandbox — 6 alternative navigators | `src/components/Sandbox/*` (7 files) | 6 competing interaction models |
| Animated shader effects | `src/core/animatedShaders.ts` | **27** effects in one union type |
| Brush presets | `src/presets/brushPresets.ts` | **20** presets |
| Paint / material presets | `src/presets/paintPresets.ts` | 15 presets |
| Model catalog | `src/core/sampleModels.ts` + `public/models/` | **removed** — was 47 presets / 37 `.glb` (99 MB); people import their own now |
| Modals and panels mounted in App | `src/App.tsx` | **21** lazy-loaded panels |
| Top-level React state in App | `src/App.tsx` | **69** `useState` hooks |

Plus, in the bottom-right corner alone, three competing things can appear: `TransformNavigator`,
`PaperRocketTactileWheel`, and — when both are hidden — a row of three floating restore chips
(`App.tsx:1224-1259`) one of which opens the **Sandbox**, a developer testbench, from the shipping UI.

**Dead weight already in the tree** (imported by nothing, still compiled and shipped):
`HeaderBar.tsx` (827), `SingleHandDualNav.tsx` (761), `MatCapShaderStudioModal.tsx` (638),
`TransformJoystick.tsx` (601), `OrientationGizmo.tsx` (435), `AutoSaveToast.tsx` (64), plus
`src/presets/wayfinderShaders.js`. **About 3,300 lines of unreferenced UI.**

A 7th file, `FeatherTactileWheel.tsx` (1701 lines), was an exact duplicate of
`PaperRocketTactileWheel.tsx` and has already been deleted as part of the Feather -> PaperRockets
naming purge.

### The three concrete UX failures

1. **No layout law.** The dock auto-collapses, can be pinned, can be minimised sideways, and its
   four shelves fly out over the canvas. The position of any given control is not learnable.
2. **Every choice is a technical choice.** Picking a colour opens a perceptual colour-space wheel.
   Picking an eraser asks "cutout or vacuum". Picking a brush offers 20 named presets, 6 material
   types and 27 shader effects — before the first mark is made.
3. **Three navigation paradigms compete.** Navigator vs Tactile Wheel vs Sandbox variants. Muscle
   memory never forms.

---

## 2. Architecture — one flag, two surfaces

### 2.1 The mode store

New file: `src/core/uiModeStore.ts`. Follow the existing pub/sub pattern in
`src/core/telemetryStore.ts` — **do not** thread a `uiMode` prop through `Toolbar`'s 70-prop
interface.

```ts
export type UiMode = 'play' | 'pro';
// getUiMode(): UiMode
// setUiMode(m: UiMode): void        // persists to localStorage 'remix3d.uiMode'
// subscribeUiMode(fn): () => void
// useUiMode(): UiMode               // useSyncExternalStore wrapper
```

- **Default on a fresh install: `play`.** Existing users with a stored value keep it.
- One switch, one place: the Settings sheet, bottom item, labelled **"Advanced tools"** with a
  one-line explainer ("Shows every control. For grown-up 3D work."). Not a header toggle, not a
  gesture — discoverable but not trippable.
- Switching modes never loses work: it only changes what is rendered.

### 2.2 Rendering rule

`App.tsx` branches once, near the top of the render:

```
uiMode === 'pro'  ->  <Toolbar {...allTheProps} />          // today's dock, unchanged
uiMode === 'play' ->  <PlayDock /> <PlayContextStrip /> ... // new zone components
```

Pro-only modals stay mounted-but-unreachable in Play: their trigger buttons do not render, so the
lazy chunks never load. **Bonus:** Play mode's initial bundle drops by everything behind
`ColorStudioModal`, `ModelConverterModal`, `ScaffoldingModal`, `BentGuideModal`,
`CurveDecimateModal`, `CustomMirrorModal`, `RaycastSettingsModal` and `NavigatorSandbox`.

---

## 3. The zone law (Play mode)

Four zones. Fixed positions. Nothing else may render chrome over the canvas.

```
+----------------------------------------------------------+
| [A] Project chip          canvas          [=] undo  redo |  <- A: top strip, 48px
|                                                          |
| [B]                                                      |
|  #  draw                                                 |
|  o  shape                     C A N V A S                |
|  x  super zap                                            |
|  +  move                                                 |
|                                                          |
|                                                    [C]   |
|         [D] * colour  --- size  FX                (dial) |
+----------------------------------------------------------+
```

- **Zone A — top strip (48 px).** Left: model/project name, tap opens the Toybox. Right: undo,
  redo, and a single menu button that opens the Settings sheet. Nothing else. No FPS counter, no
  GPU pod, no telemetry.
- **Zone B — left rail.** Exactly **4** tools, always in this order, never collapsing, never
  moving. Long-press a tool gives its one options popover (see §4).
- **Zone C — bottom-right.** Exactly **one** navigator, always present, never hidden by default.
- **Zone D — bottom-centre strip.** Current colour swatch, brush size, Magic FX button. Three
  controls. Tapping one raises a bottom sheet at most 40% of screen height that dismisses on canvas touch.

Rules that make it a law, not a suggestion:

- No Play-mode surface uses `position: fixed` outside these four rectangles.
- No flyout expands *over* the canvas horizontally; sheets rise from the bottom edge only.
- Auto-collapse, pinning, and sideways-minimise (`Toolbar.tsx:288-299` state) do **not** exist in
  Play. The rail is always there. Predictability beats screen area.
- `FpsCounter` (`App.tsx:1219`) renders in Pro only.

---

## 4. Phase plan

Each phase is independently shippable and independently revertible.

---

### Phase 0 — Mode scaffold + dead code quarantine

**Files:** new `src/core/uiModeStore.ts`; `src/App.tsx`; new `src/components/play/` directory.

1. Add the store per §2.1.
2. Branch `App.tsx` render on mode; in Play, render nothing new yet except today's `Toolbar`
   (so the branch is provably a no-op before content lands).
3. Move the 7 unreferenced components (§1) into `src/components/_attic/` and add a one-line README
   in that folder saying they are unreferenced and kept for salvage. **Do not delete yet.**
   Confirm `npm run lint` (`tsc --noEmit`) stays clean and the bundle shrinks.

**Acceptance:** app behaves identically; `localStorage.remix3d.uiMode` round-trips; the attic move
causes no import errors.

---

### Phase 1 — Zone shell

**Files:** new `src/components/play/PlayTopStrip.tsx`, `PlayDock.tsx`, `PlayContextStrip.tsx`,
`PlaySheet.tsx` (shared bottom-sheet container); `src/App.tsx`.

Build the four zones as empty-but-positioned shells with the real geometry and touch targets.
`PlaySheet` is the single sheet primitive — bottom-anchored, at most 40vh, dismisses on canvas
`pointerdown`, one at a time (a sheet opening closes any other).

**Acceptance:** on a 2000x1200 tablet viewport, all four zones sit inside the safe area, every
target measures at least 44 px, and the canvas is fully drawable everywhere outside them.

---

### Phase 2 — Four tools, not nine

**Files:** `src/components/play/PlayDock.tsx`; `src/types.ts` (no union change needed).

Today's 3x3 grid (`Toolbar.tsx:836-1001`) exposes: brush, wire/curve, ribbon profile, shape
snapping, eraser, brush picker, eyedropper, straight-line, colour studio.

Play maps them to four:

| Play tool | Sets | Long-press gives |
|---|---|---|
| **Draw** | `tool='brush'` | the 3 brush presets (Phase 4) |
| **Shape** | `tool='brush'` + `shapeSnapping=true` | line / circle / square / polygon |
| **Super Zap** | `tool='eraser'`, `eraserMode='vacuum'` | nothing — one behaviour (Phase 3) |
| **Move** | `tool='select'` | nothing — hands off to the dial in Zone C |

Not in Play: eyedropper, brush-picker modal, paint-picker modal, straight-line toggle,
`uv_brush` / `free_brush` / `spatial_brush` as *separate* buttons (they remain reachable as brush
presets), `liquify`, `pointer`.

**Acceptance:** four buttons; each sets the documented engine state; long-press popovers open in
under 150 ms and dismiss on canvas touch.

---

### Phase 3 — Super Zap

**Files:** `src/components/play/PlayDock.tsx`; `src/core/studioEngine.ts` (read-only check).

`EraserMode` (`types.ts:49`) stays `'cutout' | 'vacuum'`. Play never shows the choice: selecting
Super Zap writes `eraserMode: 'vacuum'` and the mode indicator dot at `Toolbar.tsx:925` has no Play
equivalent. Vacuum already purges whole intersecting strokes
(`studioEngine.ts:1585`, `:1657`, `:1841`) and is already covered by the unified undo stack
(`:2245`, `:2320`) — **verify** that undo restores a vacuumed stroke in one tap before closing this
phase.

Cutout ("punch a window through a ribbon") remains a Pro tool and a Recipe in the guide.

**Acceptance:** zap across a stroke, whole stroke is gone, a single undo restores it, no mode
toggle anywhere in Play.

---

### Phase 4 — Three brushes

**Files:** `src/presets/brushPresets.ts`; new `src/presets/playTiers.ts`.

Do not build a second preset list — add a tier marker so there is one source of truth:

```ts
// playTiers.ts
export const PLAY_BRUSHES = ['spatial_pipe', 'conformal_bead', 'stipple_texture'] as const;
export const PLAY_BRUSH_LABELS = {
  spatial_pipe:    { label: 'Tube',      blurb: 'Fat round line you can fly through the air' },
  conformal_bead:  { label: 'Ribbon',    blurb: 'Flat band that hugs whatever it lands on' },
  stipple_texture: { label: 'Star Dust', blurb: 'Sparkly scatter for glow and fur' },
};
```

The other 17 presets are Pro-only. `Star Dust` may need a tuning pass — if `stipple_texture` reads
as halftone rather than sparkle, retune that preset's `patternScale` / `patternIntensity` (do not
add a 21st preset).

**Acceptance:** three cards, each with a plain-language blurb and a live thumbnail; switching one
changes stroke appearance immediately.

---

### Phase 5 — Palette instead of colour science

**Files:** new `src/presets/playPalette.ts`; `src/components/play/PlayContextStrip.tsx`.

Ship a fixed **16-swatch "Candy & Cyber Neon"** palette: 8 candy (hot pink, tangerine, bubblegum,
lime, butter, grape, mint, cherry) and 8 cyber neon (cyan, magenta, acid green, electric blue,
laser purple, hot orange, ultraviolet, chrome white). Hard-coded hex, no generator.

Replaces in Play: `ColorStudioModal` (OKLCh polar wheel, temperature strip, harmony schemes),
`MONO_QUICK_COLORS` and `TEMPERATURE_COLORS` (`Toolbar.tsx:167-204`), and the 20-swatch shelf row.

`colorMath.ts` and the OKLab GLSL chunk keep running — the palette is authored *in* good colour
space, the user just never sees the machinery.

Escape hatch: one 17th tile, "More colours...", visible **only in Pro**, opening `ColorStudioModal`.

**Acceptance:** 16 tappable swatches in an 8x2 grid inside a bottom sheet; selection updates
`brushSettings.color` and the Zone D dot; no colour-space vocabulary on screen.

---

### Phase 6 — Six Magic FX

**Files:** new `src/presets/magicFx.ts`; `src/components/play/PlayContextStrip.tsx`.

Map 6 tiles onto the existing 27-member `AnimatedShaderEffect` union (`animatedShaders.ts:3-29`):

| Tile | `shaderEffect` | Also sets |
|---|---|---|
| **Neon Glow** | `rim_light` | `materialType: 'glow'`, `emissiveIntensity: 1.2` |
| **Lava** | `lava` | `materialType: 'animated_fx'` |
| **Slime** | `slime` | `materialType: 'animated_fx'` |
| **Cartoon** | `anime_cel` | `materialType: 'shaded'`, `toonShading: true` |
| **Rainbow** | `rainbow` | `materialType: 'animated_fx'` |
| **Sparkle** | `glitter` | `materialType: 'animated_fx'` |

Plus a 7th tile, **"None"**, to clear back to plain paint — the current UI has no obvious "off".

Each tile is one tap for one complete look. No sliders. The remaining 21 effects and the full PBR
roughness / metalness / emissive controls live in Pro (`BrushSettingsPanel`, `PaintPickerModal`).

**Acceptance:** 7 tiles, each showing a live animated swatch; tapping applies to the next stroke
and to the current selection if one exists.

---

### Phase 7 — One navigator

**Files:** `src/App.tsx`; `src/components/TransformNavigator/*`; `src/components/Sandbox/*`.

In Play:

- `activeController` is locked to `'navigator'`. The Tactile Wheel, the "hidden" state, and the
  three floating restore chips (`App.tsx:1224-1259`) do not render.
- The Sandbox is **removed from the shipping UI entirely** — Pro only, and gated behind a dev flag
  (`import.meta.env.DEV || uiMode === 'pro'`). It is a testbench, not a feature.
- The navigator shows **two states only**, with these labels:
  - **"Flat Screen"** — drag moves the object across the glass, anchored to the screen-centre
    crosshair.
  - **"3D World"** — chunky red/green/blue axis nodes (X/Y/Z), concentric rotation rings.
- Hidden in Play: numeric telemetry readouts, `NavigatorFooter` values, the sensitivity slider,
  the target-scope selector, and the layer/model dropdowns in `NavigatorHeader` (24 buttons — Play
  needs roughly 6). Sensitivity keeps its stored value; it just is not adjustable from Play.
- Orthographic guard: snapping to Front/Top/Side collapses the depth axis. This behaviour exists —
  **surface it as a one-line toast** ("Depth locked — you're drawing flat") rather than leaving it
  silent.

**Note:** the *feel* of move/turn/resize is a separate, already-specified fix in
`NAVIGATOR_REVAMP_PLAN.md`. Land that before or alongside this phase — a simplified navigator that
still moves at 5% of finger travel is not an improvement.

**Acceptance:** exactly one controller can ever be on screen; two clearly-labelled modes; at most 8
controls visible at rest.

---

### Phase 8 — The Toybox

**Files:** `src/components/ModelLibraryModal.tsx` -> new Play view `src/components/play/Toybox.tsx`;
`src/core/sampleModels.ts`; `src/core/studioEngine.ts` (spawn path).

Reframe the 49-entry catalog as a **coloring book**, since that is what it is — and it is the
app's best "wow" moment, currently buried three menus deep behind "Model Library".

- Entry point: tap the project name in **Zone A**. First run also opens straight into it (Phase 9).
- Big thumbnail grid, 6 category tabs already defined in `sampleModels.ts`
  (Animals & Creatures, Anime & Manga, Characters & Figures, Houses & Architecture,
  Vehicles & Tech, Shapes & Benchmarks). Rename "Shapes & Benchmarks" to **"Simple Shapes"**.
- **One-tap spawn does all five steps atomically:**
  1. confirm-if-dirty ("Start a new page? Your drawing will be cleared." — Cancel / Start fresh),
  2. clear canvas,
  3. load, centre and normalise scale (`modelNormalization.ts` already does this),
  4. frame the camera on it,
  5. set it as the active collision surface and switch the brush to **Ribbon** so the very next
     stroke lands *on* the model.
- Generate missing thumbnails once at build time into `public/imported_templates/` rather than
  spinning up a live preview scene per tile — the Tab S6 Lite cannot afford 49 render targets.

**Acceptance:** from a cold start, template on screen and drawable in **3 taps or fewer**; the
first stroke after spawn sticks to the surface without touching any other control.

---

### Phase 9 — First run, 15 seconds

**Files:** new `src/components/play/FirstRunOverlay.tsx`; `src/core/uiModeStore.ts` (a
`hasOnboarded` flag).

Three cards, skippable, shown once:

1. **The four zones** — a labelled map matching §3.
2. **The Finger-Pen Golden Rule** — the single most important thing in the app:
   > **Fingers move the camera. The pen draws.**
   > 1 finger = spin around, 2 fingers = slide and zoom, 3 fingers = flat/3D view.
   > No pen? Turn on **Finger Draw** in Settings and your finger draws instead.

   (This is the existing `fingerPenMode`, `App.tsx:294`, default `true`.)
3. **Pick a toybox** — drops the user directly into the Toybox (Phase 8).

**Acceptance:** a first-time user reaches a drawn stroke on a template in under 60 seconds
without help. Test this with an actual person, not a checklist.

---

### Phase 10 — Documentation split

**Files:** `COMPLETE_USER_GUIDE.md` (rewrite), new `ARCHITECTURE_INTERNALS.md`,
`USER_GUIDE.md` (retire, leave a redirect stub).

The current guide is 12 sections that open with system requirements and `npm run dev`, and it
teaches Bishop parallel transport frames before it teaches how to make a mark. Restructure into
five task-based parts:

```
Part 1 - First Run & The 60-Second Sketch
  1.1 The four screen zones (visual map)
  1.2 The Finger-Pen Golden Rule (+ Finger Draw accessibility mode)
  1.3 Walkthrough: painting on a Toybox template
Part 2 - Drawing & Shaping
  2.1 The three brushes: Tube, Ribbon, Star Dust  (Pro: Marker, Conformal, +17)
  2.2 Magic FX vs full PBR mode
  2.3 Shape snapping: lines, circles, polygons
  2.4 Fixing things: Super Zap  (Pro: Cutout, Liquify)
Part 3 - Moving Around & the Navigator
  3.1 Camera: orbit, pan, zoom, view snapping
  3.2 "Flat Screen" mode - screen-space move, centre-crosshair pivot
  3.3 "3D World" mode - red/green/blue axis nodes, rotation rings
  3.4 The depth guard when you snap to Front / Top / Side
Part 4 - Stage, Light & Tracing
  4.1 One-tap sky and lighting presets
  4.2 Tracing mode: floating reference images
  4.3 Guides and mirror/symmetry
Part 5 - Pro Studio & Delivery
  5.1 Layers and blend modes
  5.2 Converting and compressing models (8 formats, Draco)
  5.3 Viewing your work at life size (WebXR)
  5.4 Shortcuts & troubleshooting
```

**Three writing rules for the rewrite:**

1. **Recipes, not feature lists.** Every capability gets a numbered 3-step recipe with a goal in
   the title. Seeds: *"Ink a character"* (Toybox, Ribbon, mirror on, draw on the surface);
   *"Carve a window"* (Pro: eraser, Cutout, drag across a ribbon); *"Sweep an arch"*
   (Pro: guide curve, U-channel profile, tension, bake).
2. **Label the tier.** Every heading is marked **[Play]** or **[Pro]**. A reader must never hit a
   control the manual describes but their screen does not have.
3. **Algorithms move out.** Ottosson's OKLab math, WBOIT accumulation, WGSL compute shaders,
   Bishop transport frames, Rayleigh/Mie scattering, RDP epsilon, Draco quantization levels go to
   `ARCHITECTURE_INTERNALS.md`, linked once from Part 5 as "How it works under the hood".

`REMIX_3D_MASTER_SPECIFICATION.md` stays as it is: it is the engineering catalog and that is a
legitimate document. It just is not the user's document.

---

## 5. What silently keeps running

State this in `ARCHITECTURE_INTERNALS.md` so nobody "simplifies" it away later. Untouched by every
phase above:

WBOIT order-independent transparency; Draco WASM decode and quantization; BVH spatial
acceleration for raycast and vacuum-erase hit tests; Bishop parallel-transport frames for stroke
ribbons; OKLab/OKLCh colour blending in the shader chunk; procedural sky with Rayleigh/Mie
scattering; conformal bead surface projection; the unified undo stack; the Tauri/Android bridge;
the service-worker offline cache; the WebGPU pipeline with WebGL fallback.

**None of this has a menu. All of it stays.**

---

## 6. Success measures

Check these against the build, not against intent:

| Measure | Today | Target (Play) |
|---|---|---|
| Controls visible at rest | ~30 (dock + navigator + pods) | **12 or fewer** |
| Taps from cold start to first stroke on a template | 6+ | **3 or fewer** |
| Colour choices offered before first stroke | 20 swatches + polar wheel + temperature strip | **16 swatches** |
| Shader / FX choices offered | 27 + 6 material types + PBR sliders | **6 + None** |
| Navigation paradigms reachable | 3 (Navigator, Tactile Wheel, Sandbox x6) | **1** |
| Words in Play UI requiring a 3D background | many | **0** |
| Unreferenced UI lines compiled | ~5,000 | **0** |

---

## 7. Risks

- **Play mode feels like a downgrade to the author.** Mitigation: Pro is one tap away and is
  byte-identical to today. Nothing is lost, only defaulted differently.
- **The mode branch forks the codebase in two.** Mitigation: Play components consume the *same*
  `brushSettings` and engine calls — they are thin views, not a parallel implementation. Any Play
  component containing engine logic is a review failure.
- **Phase 7 collides with `NAVIGATOR_REVAMP_PLAN.md`.** Both touch `TransformNavigator`. Land the
  motion fix first; it is a physics change with no layout impact, so Phase 7 rebases cleanly.
- **Toybox thumbnails bloat the bundle.** Mitigation: build-time WebP at 256 px or smaller,
  lazy-loaded per category tab, not eagerly.

---

## 8. Order of work

| # | Phase | Depends on | Rough size |
|---|---|---|---|
| 1 | Phase 0 — mode scaffold + attic | — | S |
| 2 | Phase 1 — zone shell | 0 | M |
| 3 | Phase 2 — four tools | 1 | M |
| 4 | Phase 3 — Super Zap | 2 | S |
| 5 | Phase 5 — palette | 1 | S |
| 6 | Phase 4 — three brushes | 2 | M |
| 7 | Phase 6 — Magic FX | 4, 5 | M |
| 8 | Phase 8 — Toybox | 1, 4 | L |
| 9 | Phase 7 — one navigator | *NAVIGATOR_REVAMP_PLAN* | M |
| 10 | Phase 9 — first run | 8 | S |
| 11 | Phase 10 — docs | all | L |

**Deferred to after Phase 10, as its own decision:** deleting the `_attic/` components and pruning
the 17 non-Play brush presets and 21 non-Play shader effects. Do not fold that into any phase
above — this plan's entire premise is that the hard work stays and only the *surface* changes.
