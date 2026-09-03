# V16 UX Streamline — Antigravity Build Plan

**Companion to:** `UX_STREAMLINE_PLAN.md` (the *why* and the design) and `AGENTS.md` (the guardrails)
**This document is the *how*:** 11 phases, each a ready-to-paste agent brief with real file paths,
real engine API names, verification steps and a done-when checklist.

Every API name, line number and count below was read out of the V16 source at commit `7f700f7`.
Nothing here is inferred from the spec documents.

---

## 0. How to run this

### 0.1 Setup — do this once, before Phase 0

1. **`AGENTS.md` is already at the repo root.** Antigravity reads it automatically into every
   agent's context, as do most agentic IDEs. It carries the hard rules. Do not let an agent edit it.
2. **Fix the browser-preview config.** `.claude/launch.json` currently declares a server named
   `v14-app` on port **8000**, but `npm run dev` serves on port **3000**. Verification will fail
   silently against the wrong port. Update it:

   ```json
   {
     "version": "0.0.1",
     "configurations": [
       { "name": "v16-app", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 3000 }
     ]
   }
   ```

3. **Baseline the build — and know that it is not clean.** `npm run lint` currently reports
   **15 pre-existing type errors** in the working tree:

   - 10x `studioEngine.ts` — `Property 'postEngine' does not exist` (post-processing wiring mid-refactor)
   - 4x `Toolbar.tsx` — `Cannot find name 'triggerHaptic'` (missing import)
   - 1x `studioEngine.ts:3410` — dead `'camera'` comparison against `TransformTargetScope`

   Decide now which you want: either fix these first (recommended — a clean baseline means any new
   error is unambiguously the agent's), or record the count and hold every agent to
   "**15 in, 15 out, none in a file you touched**". Do not let agents discover this on their own;
   they will burn a whole task fixing `postEngine` and touching the engine, which rule 1 forbids.
4. **Take "before" screenshots** at 2000×1200 and 1024×768: the dock expanded, each of the four
   flyout shelves open, and the navigator. These are your regression reference for Pro mode.
5. **Branch:** `git checkout -b ux/streamline` off `main`. Each phase branches off that.

### 0.2 The working loop per phase

For each phase below:

1. Open a **new agent** in the Agent Manager. Fresh context per phase — do not continue one agent
   through several phases, because the guardrails erode as context fills.
2. Paste the phase's **Agent brief** block verbatim.
3. **Read the plan artifact the agent produces before letting it write code.** This is the single
   highest-value step in the whole process. Check specifically: is it about to touch
   `studioEngine.ts`? Is it about to "simplify" `Toolbar.tsx`? Those are the two failure modes.
4. Let it implement, then let it verify in the browser.
5. Review the walkthrough artifact + screenshots. Compare Pro mode against your baseline shots.
6. `npm run lint`, commit, merge into `ux/streamline`.

### 0.3 What can run in parallel

Phases touch different files, so several can run as concurrent agents. The dependency graph:

```
Phase 0 (scaffold)
   |
Phase 1 (zone shell)
   |
   +-- Phase 2 (four tools) -- Phase 3 (Super Zap)
   |          |
   |          +-- Phase 4 (three brushes) --+
   |                                        +-- Phase 6 (Magic FX)
   +-- Phase 5 (palette) ------------------+
   |
   +-- Phase 8 (Toybox) ---- Phase 9 (first run)

Phase 7 (one navigator)  -- independent of all the above,
                            but must land AFTER NAVIGATOR_REVAMP_PLAN.md

Phase 10 (docs) -- last, needs everything else finished
```

**Safe parallel batches:**

- After Phase 1: run **2**, **5** and **8** concurrently (dock / palette / toybox — disjoint files).
- After Phase 2 and 5: run **3**, **4** concurrently, then **6**.
- **Phase 7** can run in its own agent at any time once the navigator motion fix has landed.
- **Never** run two agents that both edit `src/App.tsx`. Phases 0, 1, 7 and 9 all touch it —
  serialise those. Phases 2–6 touch only `src/components/play/` and `src/presets/`.

---

## Phase 0 — Mode scaffold + dead-code quarantine

**Branch:** `ux/phase-0-mode-scaffold` · **Size:** S · **Depends on:** nothing

### Agent brief

```
Read AGENTS.md and UX_STREAMLINE_PLAN.md section 2 first.

Task: add a UI-mode flag and quarantine unreferenced components. No visible change yet.

1. Create src/core/uiModeStore.ts. Copy the pub/sub style of src/core/telemetryStore.ts exactly
   (module-level value + Set of listeners + subscribe returning an unsubscribe fn). Export:

     export type UiMode = 'play' | 'pro';
     getUiMode(): UiMode
     setUiMode(m: UiMode): void          // writes localStorage key 'remix3d.uiMode'
     subscribeUiMode(fn: () => void): () => void
     useUiMode(): UiMode                 // useSyncExternalStore(subscribeUiMode, getUiMode, getUiMode)
     getHasOnboarded(): boolean
     setHasOnboarded(v: boolean): void   // localStorage key 'remix3d.hasOnboarded'

   Default when localStorage is empty or unreadable: 'play'. Wrap every localStorage access in
   try/catch — this app runs inside a Tauri webview and in private-mode browsers.
   See src/components/FpsCounter.tsx:17 for the useSyncExternalStore call shape to copy.

2. In src/App.tsx, read the mode with useUiMode() and branch the <Toolbar /> render:
     {uiMode === 'pro' && <Toolbar ... /> }
     {uiMode === 'play' && <Toolbar ... /> }   // identical for now, on purpose
   Both branches render the same thing in this phase. This proves the branch is a no-op before
   any content lands in it. Do not change any Toolbar props.

3. Create src/components/_attic/ and git mv these 6 files into it. They are imported by nothing —
   verify that with grep before moving each one:
     HeaderBar.tsx, SingleHandDualNav.tsx, MatCapShaderStudioModal.tsx,
     TransformJoystick.tsx, OrientationGizmo.tsx, AutoSaveToast.tsx
   Also move src/presets/wayfinderShaders.js — it is imported by nothing and contains only
   commented-out GLSL.
   (A 7th file, FeatherTactileWheel.tsx, was an exact duplicate of PaperRocketTactileWheel.tsx and
   has already been deleted — see the naming rule in AGENTS.md.)
   Add src/components/_attic/README.md: one paragraph saying these are unreferenced legacy UI kept
   for salvage, that nothing may import from this folder, and that deletion is a later decision.

4. Run `npm run lint` (tsc --noEmit). It reports 15 PRE-EXISTING errors (see AGENTS.md) — your bar
   is that the count does not rise and none of them names a file you touched. Report before/after.
   Run `npm run build` and report the bundle size before and after the attic move.

Do not create any Play UI in this phase. Do not touch Toolbar.tsx internals.
```

### Done when

- `npm run lint` still reports 15 errors, none in a touched file; `npm run build` succeeds and
  reports a smaller bundle.
- `localStorage.setItem('remix3d.uiMode','pro')` + reload → app identical to before.
- No file outside `_attic/` imports anything inside `_attic/`.

---

## Phase 1 — Zone shell

**Branch:** `ux/phase-1-zone-shell` · **Size:** M · **Depends on:** 0

### Agent brief

```
Read AGENTS.md and UX_STREAMLINE_PLAN.md section 3 (the zone law) first.

Task: build the four Play-mode zones as positioned, empty shells. Geometry and touch targets only
— no tools, no colours, no content yet.

Create in src/components/play/:

  PlayTopStrip.tsx     Zone A. Fixed top, height 48px, full width. Left: project/model name button
                       (does nothing yet). Right: undo, redo, and a menu button. Nothing else.
  PlayDock.tsx         Zone B. Fixed left, vertically centred, 4 empty slots at 56x56px with 8px
                       gaps. Never collapses, never auto-hides, is not pinnable, does not move.
  PlayContextStrip.tsx Zone D. Fixed bottom-centre, 3 slots: colour dot, size, FX. Height 56px.
  PlaySheet.tsx        The single bottom-sheet primitive every Play popover uses.

PlaySheet contract:
  - anchored to the bottom edge, max-height 40vh, rounded top corners, safe-area padding
  - closes on pointerdown anywhere on the canvas
  - only one sheet open at a time: opening one closes any other. Implement this with a small
    module-level "which sheet is open" signal in src/components/play/sheetStore.ts, same pub/sub
    pattern as uiModeStore.ts. Do not use React context for this.
  - closes on Escape
  - animates in under 150ms, and respects prefers-reduced-motion

Wire all four into src/App.tsx inside the uiMode === 'play' branch, and make that branch stop
rendering <Toolbar />. The Pro branch keeps rendering <Toolbar /> exactly as today.
Also: render <FpsCounter /> only when uiMode === 'pro' (it is at App.tsx:1219).

Hard geometry rules:
  - every interactive element >= 44px on both axes at uiScale 1.0
  - no Play surface may use position:fixed outside these four rectangles
  - sheets rise from the bottom edge only; nothing expands horizontally over the canvas

Verify in the browser at 2000x1200 AND 1024x768 (Tab S6 Lite landscape): all four zones inside the
safe area, no overlap, canvas drawable everywhere outside them. Screenshot both viewports.
```

### Done when

- Both viewports screenshot cleanly with no overlap and no clipping.
- Dragging on the canvas between the zones still draws.
- Play mode no longer shows the old dock; Pro mode is unchanged from the Phase 0 baseline shots.

---

## Phase 2 — Four tools, not nine

**Branch:** `ux/phase-2-four-tools` · **Size:** M · **Depends on:** 1

Today's 3×3 grid is at `Toolbar.tsx:836–1001` and exposes nine things. Play exposes four.

### Agent brief

```
Read AGENTS.md first. Reference only — do not edit — src/components/Toolbar.tsx lines 836-1001 to
see how each tool currently sets engine state.

Task: fill Zone B (src/components/play/PlayDock.tsx) with exactly four tools.

  | Tool       | Icon (lucide-react) | Sets                                                    |
  |------------|---------------------|---------------------------------------------------------|
  | Draw       | Brush               | tool='brush'                                             |
  | Shape      | Shapes              | tool='brush', brushSettings.shapeSnapping=true           |
  | Super Zap  | Eraser              | tool='eraser', brushSettings.eraserMode='vacuum'         |
  | Move       | Move                | tool='select'                                            |

  Selecting Draw, Shape or Move must also set shapeSnapping=false unless it is the Shape tool.
  Types: ToolType and BrushSettings are in src/types.ts (ToolType at line 7, EraserMode at 49).

Long-press (500ms) on Draw opens a PlaySheet placeholder that says "Brushes" — Phase 4 fills it.
Long-press on Shape opens a sheet with four choices: Line, Circle, Square, Polygon. Wire these to
brushSettings.shapeSnapping plus shapeSnapTolerance; grep studioEngine.ts and
src/core/shapeSnapping.ts for how snapping picks a shape and follow that. If the engine cannot be
told which shape to snap to, say so in your output and ship the sheet with only an on/off toggle
rather than faking it.
Long-press on Super Zap and Move: nothing. They have one behaviour each.

Long-press must not fire on a quick tap, and must not fire while the user is drawing.
Give the active tool an unmistakable selected state — filled background, not a subtle outline.
Add haptic feedback on selection using the existing src/utils/haptics.ts.

Not in Play mode, deliberately: eyedropper, brush-picker modal, paint-picker modal, straight-line
toggle, liquify, pointer, and separate buttons for uv_brush / free_brush / spatial_brush.

Verify in the browser: select each tool, then actually draw or erase on the canvas and confirm the
behaviour changed. Screenshot the dock with each tool active.
```

### Done when

- Four buttons, correct engine state each, verified by drawing — not by reading code.
- Long-press opens in <150 ms after the 500 ms hold and never triggers on a tap.
- No tool selection leaves `shapeSnapping` stuck on from a previous tool.

---

## Phase 3 — Super Zap

**Branch:** `ux/phase-3-super-zap` · **Size:** S · **Depends on:** 2

### Agent brief

```
Read AGENTS.md first.

Background: EraserMode ('cutout' | 'vacuum') is at src/types.ts:49. Vacuum mode already purges
whole intersecting strokes — see studioEngine.ts:1585, :1657, :1841 and the purgeStrokesIntersecting
method at :1951. The unified undo/redo stack at :2247 and :2322 already claims to cover vacuum
erases.

Task, mostly verification rather than new code:

1. Confirm Play's Super Zap tool always writes eraserMode='vacuum' and that Play offers no way to
   reach 'cutout'. Cutout stays reachable in Pro via Toolbar.tsx:925 — do not remove it there.

2. VERIFY THE UNDO PATH BY HAND. This is the real work of this phase. In the browser:
     a. draw three separate strokes
     b. Super Zap across all three in one drag
     c. press undo ONCE
   All three strokes must come back in one step, and redo must remove them again. If undo restores
   them one at a time, or not at all, that is a bug in the vacuum/undo interaction — report it with
   the exact reproduction steps and stop. Do not fix studioEngine.ts yourself.

3. Give the zap visible feedback: strokes about to be purged should highlight or flash before they
   vanish, so a child can tell what is about to disappear. Keep it cheap — a material colour swap
   on hover is fine, do not add a post-processing pass.

Screenshot the before/after/undone states.
```

### Done when

- One drag purges every intersecting stroke; **one** undo restores all of them.
- No cutout/vacuum choice exists anywhere in Play.
- Feedback is visible before the purge commits.

---

## Phase 4 — Three brushes

**Branch:** `ux/phase-4-three-brushes` · **Size:** M · **Depends on:** 2

There are 20 presets in `src/presets/brushPresets.ts`. Play shows three.

### Agent brief

```
Read AGENTS.md first.

Task: fill the Draw long-press sheet with exactly three brushes.

1. Create src/presets/playTiers.ts — a tier marker, NOT a second preset list. There must stay
   exactly one source of truth for preset data (src/presets/brushPresets.ts).

     export const PLAY_BRUSHES = ['spatial_pipe', 'conformal_bead', 'stipple_texture'] as const;
     export const PLAY_BRUSH_LABELS: Record<(typeof PLAY_BRUSHES)[number], {label: string; blurb: string}> = {
       spatial_pipe:    { label: 'Tube',      blurb: 'Fat round line you can fly through the air' },
       conformal_bead:  { label: 'Ribbon',    blurb: 'Flat band that hugs whatever it lands on' },
       stipple_texture: { label: 'Star Dust', blurb: 'Sparkly scatter for glow and fur' },
     };

   Those three ids exist in brushPresets.ts at lines 59, 254 and 272. Confirm before using them.

2. Render them as three big cards in the sheet: label, blurb, and a preview. For the preview, draw
   a short sample stroke into a 2D canvas using the preset's colour/profile — do NOT instantiate a
   Three.js scene per card. The Tab S6 Lite cannot afford three extra WebGL contexts.

3. Selecting a card applies that preset to brushSettings. Reuse whatever apply function
   src/components/BrushPickerModal.tsx already uses so there is one code path, not two.

4. StrokeProfile is 'tube' | 'ribbon' | 'marker' | 'conformal' (src/types.ts:199). Sanity-check
   that each of the three presets sets a sensible profile and that Ribbon actually conforms to a
   surface when drawn onto a model.

5. Tuning check: draw with Star Dust. If stipple_texture reads as a printing halftone rather than
   sparkle, retune ONLY that preset's patternScale / patternIntensity / patternType in
   brushPresets.ts. Do not add a 21st preset. Report what you changed and why.

The other 17 presets stay Pro-only and stay in the file untouched.

Verify by drawing with all three onto both a flat plane and a loaded 3D model. Screenshot each.
```

### Done when

- Three cards, plain-language blurbs, cheap 2D previews.
- Each visibly changes stroke appearance when drawn.
- Ribbon hugs a model surface; Tube floats in air; Star Dust sparkles.

---

## Phase 5 — Palette instead of colour science

**Branch:** `ux/phase-5-palette` · **Size:** S · **Depends on:** 1

Replaces, in Play only: `ColorStudioModal` (1320 lines, OKLCh polar wheel + harmony schemes),
`MONO_QUICK_COLORS` and `TEMPERATURE_COLORS` (`Toolbar.tsx:167–204`).

### Agent brief

```
Read AGENTS.md first.

Task: one fixed 16-swatch palette in the Zone D colour sheet. No wheel, no sliders, no generator.

1. Create src/presets/playPalette.ts with exactly these values, in this order:

   Candy:      Hot Pink #FF4D9D, Tangerine #FF8A3D, Bubblegum #FFA8D5, Lime #A8E63D,
               Butter #FFE066, Grape #A855F7, Mint #5EEAD4, Cherry #EF2D56
   Cyber Neon: Cyan #22D3EE, Magenta #FF2BD1, Acid Green #39FF14, Electric Blue #3B82F6,
               Laser Purple #7C3AED, Hot Orange #FF6B00, Ultraviolet #B026FF, Chrome White #F8FAFC

   Export as a typed array of { name, hex, family: 'candy' | 'neon' }.

2. Render as an 8x2 grid inside a PlaySheet, opened by the colour dot in Zone D. Each swatch is a
   circle >= 48px with a clear selected ring. Tapping sets brushSettings.color and updates the dot.
   Show the swatch NAME on tap (a brief label), so the palette teaches colour words.

3. Do NOT touch src/core/colorMath.ts or the OKLAB_GLSL_CHUNK in src/core/animatedShaders.ts.
   The colour pipeline keeps running underneath; we are only removing the controls for it.

4. Add a 17th tile labelled "More colours..." that opens ColorStudioModal — but render that tile
   ONLY when getUiMode() === 'pro'. In Play the grid is exactly 16.

Verify: pick several swatches, draw with each, confirm the rendered stroke colour matches the
swatch on both a light and a dark theme. Screenshot the sheet in both themes.
```

### Done when

- Exactly 16 swatches in Play, 17 in Pro.
- Selected colour matches the drawn stroke in both themes.
- `ColorStudioModal` unreachable from Play, unchanged in Pro.

---

## Phase 6 — Six Magic FX

**Branch:** `ux/phase-6-magic-fx` · **Size:** M · **Depends on:** 4, 5

`AnimatedShaderEffect` has 27 members (`src/core/animatedShaders.ts:3–29`). Play shows six, plus
an off switch the app currently lacks.

### Agent brief

```
Read AGENTS.md first.

Task: map six one-tap looks onto the existing 27-effect union. Do not add a new effect, do not
modify any GLSL.

1. Create src/presets/magicFx.ts:

   | Tile       | shaderEffect | Also sets                                                  |
   |------------|--------------|------------------------------------------------------------|
   | Neon Glow  | rim_light    | materialType 'glow', emissiveIntensity 1.2                  |
   | Lava       | lava         | materialType 'animated_fx'                                  |
   | Slime      | slime        | materialType 'animated_fx'                                  |
   | Cartoon    | anime_cel    | materialType 'shaded', and postSettings.toonShading = true  |
   | Rainbow    | rainbow      | materialType 'animated_fx'                                  |
   | Sparkle    | glitter      | materialType 'animated_fx'                                  |
   | None       | undefined    | materialType 'shadeless', emissiveIntensity 0               |

   MaterialType is at src/types.ts:197. All six effect ids exist in the union — verify each.
   "None" matters: today there is no obvious way to get back to plain paint.

2. Render as 7 tiles in a PlaySheet from the FX button in Zone D. Each tile shows a live animated
   preview — but share ONE WebGL preview context across all tiles (render tiles sequentially into
   one canvas, or use a sprite sheet baked at build time). Do not create seven contexts.
   If a live preview costs more than ~4ms/frame on a mid-range device, fall back to a static image.

3. Tapping a tile applies to subsequent strokes, and to the current selection if one exists
   (studioEngine.ts:3031 getSelectedStroke, :2976 selectStroke).

4. Cartoon also flips postSettings.toonShading. That state lives in App.tsx (DEFAULT_POST_SETTINGS)
   — thread it in properly, do not reach into the engine behind React's back.

The other 21 effects and the PBR roughness/metalness/emissive sliders stay Pro-only in
BrushSettingsPanel and PaintPickerModal. Do not remove them there.

Verify: apply each of the 7, draw a stroke, screenshot. Then check the FPS counter in Pro mode with
several animated strokes on screen and report the frame cost.
```

### Done when

- 7 tiles; each produces a visibly different, immediately recognisable look.
- "None" fully clears back to flat paint.
- Frame cost of a canvas full of animated strokes is measured and reported, not assumed.

---

## Phase 7 — One navigator

**Branch:** `ux/phase-7-one-navigator` · **Size:** M · **Depends on:** `NAVIGATOR_REVAMP_PLAN.md`

> **Sequencing:** land the motion fix in `NAVIGATOR_REVAMP_PLAN.md` first. A simplified navigator
> that still moves the object at 5% of finger travel is not an improvement. That plan is a physics
> change with no layout impact, so this phase rebases cleanly on top of it.

### Agent brief

```
Read AGENTS.md and NAVIGATOR_REVAMP_PLAN.md first. Confirm the motion fix has landed before
starting — if move/turn/resize still feel wrong, stop and say so.

Task: in Play mode there is exactly one spatial controller, with two clearly named states.

1. In src/App.tsx, when uiMode === 'play':
     - lock activeController to 'navigator'
     - do not render PaperRocketTactileWheel
     - do not render the three floating restore chips at App.tsx:1224-1259
     - do not render NavigatorSandbox at all
   In Pro mode all of these behave exactly as today.

2. Gate the Sandbox behind (import.meta.env.DEV || getUiMode() === 'pro'). It is a developer
   testbench with 6 competing interaction models (src/components/Sandbox/) and must not be
   reachable from a shipping user's screen.

3. In the navigator itself (src/components/TransformNavigator/), Play mode shows two states only:
     "Flat Screen" - drag moves the object across the glass, pivoting on the screen-centre crosshair
     "3D World"    - chunky red/green/blue nodes for X/Y/Z, concentric rotation rings
   Use exactly those two labels. Red = X, Green = Y, Blue = Z, no exceptions.

4. Hide in Play (keep in Pro): numeric telemetry readouts, NavigatorFooter values, the sensitivity
   slider, the target-scope selector, and the layer/model dropdowns in NavigatorHeader.tsx (which
   has 24 buttons today — Play needs roughly 6). Sensitivity keeps its stored value; it is simply
   not adjustable from Play.

5. The orthographic depth guard already exists: snapping to Front/Top/Side collapses the depth
   axis. Today it is silent. Surface it as a one-line toast reading exactly:
     "Depth locked - you're drawing flat"
   Reuse the existing toast styling from the snapped-shape notice at App.tsx (search
   snappedShapeNotice).

Count the controls visible at rest when you are done and report the number. Target is 8 or fewer.

Verify: move, turn and resize an object in both states; snap to Front/Top/Side and confirm the
toast; confirm no second controller can ever appear.
```

### Done when

- Exactly one controller can ever be on screen in Play; Sandbox unreachable.
- Two labelled states; ≤ 8 controls at rest (report the count).
- Depth-guard toast appears on ortho snap.

---

## Phase 8 — The Toybox

**Branch:** `ux/phase-8-toybox` · **Size:** L · **Depends on:** 1, 4

The 49-entry catalog is the app's best "wow" moment and it is currently buried behind a menu
labelled "Model Library". Reframe it as a coloring book.

### Agent brief

```
Read AGENTS.md first.

Real APIs you will use (verified — do not invent alternatives):
  engine.loadPresetModel(presetId, displayMode?)  studioEngine.ts:665
      NOTE: this ALREADY calls clearModel() internally, and setModelObject (:712) already
      auto-frames the camera. Do not re-implement centring or framing.
  engine.clearAllStrokes()                        studioEngine.ts:2470
  engine.centerModelToOrigin()                    studioEngine.ts:4269
  engine.resetCamera()                            studioEngine.ts:3908
  engine.toggleMeshGuideCollider(meshId, true)    studioEngine.ts:5088
  SampleModelFactory.getPresets()                 src/core/sampleModels.ts
  Preset shape: { id, name, category, description, file?, remoteUrl?, createMesh? }

Task:

1. Create src/components/play/Toybox.tsx — a full-screen Play view, not a cramped modal. Opened by
   tapping the project name in Zone A. Big thumbnails, minimum 160px, in a scrollable grid.

2. Six category tabs, taken from the existing `category` field. Rename ONE label for display only
   — "Shapes & Benchmarks" shows as "Simple Shapes". Do not change the union type in
   sampleModels.ts; map the label at render time.

3. One tap on a tile does all of this, in this order, as one operation:
     a. if the canvas has strokes, confirm first: "Start a new page? Your drawing will be cleared."
        with buttons [Cancel] [Start fresh]. Check for strokes via engine.getLayersSnapshot()
        (studioEngine.ts:3063).
     b. engine.clearAllStrokes()
     c. await engine.loadPresetModel(preset.id)
     d. set the loaded model as the active collision surface so strokes land ON it
     e. set brushSettings.drawingMode = 'surface' (src/types.ts:67) and switch the brush preset to
        Ribbon / conformal_bead, so the very next stroke sticks to the model
     f. close the Toybox
   Show a loading state during (c) — some .glb files in public/models/ are large.

4. Thumbnails: generate them ONCE at build time into public/imported_templates/ as WebP at 256px,
   via a script in scripts/. Do NOT spin up a live Three.js preview per tile — 49 render targets
   will kill the Tab S6 Lite. Lazy-load per category tab. If a thumbnail is missing, fall back to
   a category icon, never to a live scene.
   NOTE: sampleModels.ts declares 49 presets but public/models/ contains only 37 .glb files. Some
   entries are procedural (createMesh) and some may be dead. Audit which is which and report any
   preset that can neither load a file nor build a mesh.

5. Keep ModelLibraryModal.tsx untouched for Pro mode.

Verify: from a cold reload, count the taps to a drawn stroke on a template. It must be 3 or fewer.
Then draw immediately after spawn WITHOUT touching any other control and confirm the stroke lands
on the model surface. Screenshot the grid and the first stroke.
```

### Done when

- ≤ 3 taps from cold start to a stroke on a template.
- First stroke after spawn sticks to the surface with no other input.
- Thumbnails are build-time assets; no per-tile WebGL context.
- The 49-vs-37 discrepancy is audited and reported.

---

## Phase 9 — First run, 15 seconds

**Branch:** `ux/phase-9-first-run` · **Size:** S · **Depends on:** 8

### Agent brief

```
Read AGENTS.md first, especially the input-model section — card 2 is that section, written for a
child.

Task: a three-card first-run overlay, shown once, skippable at any point.

Create src/components/play/FirstRunOverlay.tsx. Gate on getHasOnboarded() from uiModeStore.ts
(added in Phase 0); call setHasOnboarded(true) on finish OR skip.

Card 1 - "Your screen"
  A labelled map of the four zones matching UX_STREAMLINE_PLAN.md section 3. Draw it as inline SVG
  or styled divs. Do not screenshot the app.

Card 2 - "Fingers move. Pen draws."  <- the single most important card
  Big and visual:
     1 finger  = spin around
     2 fingers = slide and zoom
     3 fingers = flat / 3D view
     the pen   = draws
  Then one line: "No pen? Turn on Finger Draw in Settings and your finger draws instead."
  That maps to the existing fingerPenMode flag (App.tsx:294, default true).

Card 3 - "Pick something to colour"
  A [Open the Toybox] button that dismisses the overlay and opens Phase 8's Toybox directly.

Rules: no jargon at all, short sentences, high contrast, works in light and dark theme, every
button >= 44px, and a visible Skip on every card. Test with the reduced-motion setting on.

Verify: clear localStorage, reload, and walk the whole path from first paint to a drawn stroke on
a template. Time it. Report the number of taps and seconds.
```

### Done when

- Fresh `localStorage` → overlay appears; after finish or skip it never returns.
- Path from first paint to a stroke on a template is walked and timed end to end.

---

## Phase 10 — Documentation split

**Branch:** `ux/phase-10-docs` · **Size:** L · **Depends on:** all

### Agent brief

```
Read AGENTS.md and UX_STREAMLINE_PLAN.md section 4 Phase 10 first.

The current COMPLETE_USER_GUIDE.md is 12 sections that open with system requirements and
`npm run dev`, and it explains Bishop parallel transport frames before it explains how to make a
mark. Restructure it into five task-based parts.

1. Rewrite COMPLETE_USER_GUIDE.md to this outline:

   Part 1 - First Run & The 60-Second Sketch
     1.1 The four screen zones (visual map)
     1.2 The Finger-Pen Golden Rule (+ Finger Draw accessibility mode)
     1.3 Walkthrough: painting on a Toybox template
   Part 2 - Drawing & Shaping
     2.1 The three brushes: Tube, Ribbon, Star Dust   [Pro: Marker, Conformal, +17]
     2.2 Magic FX vs full PBR mode
     2.3 Shape snapping: lines, circles, polygons
     2.4 Fixing things: Super Zap                     [Pro: Cutout, Liquify]
   Part 3 - Moving Around & the Navigator
     3.1 Camera: orbit, pan, zoom, view snapping
     3.2 "Flat Screen" mode
     3.3 "3D World" mode - red/green/blue nodes, rotation rings
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

2. Three writing rules, applied throughout:
   a. RECIPES, NOT FEATURE LISTS. Every capability gets a numbered 3-step recipe whose title is a
      goal. Write at least these three:
        "Ink a character"  - Toybox -> Ribbon -> mirror on -> draw on the surface
        "Carve a window"   - [Pro] eraser -> Cutout -> drag across a ribbon
        "Sweep an arch"    - [Pro] guide curve -> U-channel profile -> tension -> bake
   b. LABEL THE TIER. Every heading marked [Play] or [Pro]. A reader must never hit a control the
      manual describes but their screen does not have.
   c. NO ALGORITHMS. Move every computational deep-dive out (see 3).

3. Create ARCHITECTURE_INTERNALS.md and move into it: Ottosson's OKLab math, WBOIT accumulation,
   WGSL compute shaders, Bishop parallel transport frames, Rayleigh/Mie scattering, RDP epsilon,
   Draco quantization levels, BVH construction. Add a section titled "What runs silently" listing
   everything that has no menu and must never be 'simplified' away. Link to it ONCE from Part 5 as
   "How it works under the hood".

4. Replace USER_GUIDE.md with a short stub pointing at COMPLETE_USER_GUIDE.md.

5. Leave REMIX_3D_MASTER_SPECIFICATION.md alone. It is the engineering catalog and that is a
   legitimate document. It is simply not the user's document.

Every screenshot and control name in the guide must match the shipped Play UI. Where you are not
sure a control still exists, check the source rather than copying the old text forward.
```

### Done when

- Guide opens with making a mark, not with installation.
- Every heading carries `[Play]` or `[Pro]`; at least 3 recipes exist.
- Zero banned jargon terms in Parts 1–4 (grep for them).
- `ARCHITECTURE_INTERNALS.md` exists and holds the maths.

---

## 11. Review checklist — apply to every merged phase

| Check | How |
|---|---|
| Pro mode is unchanged | Compare against the Phase 0 baseline screenshots, side by side |
| No engine edits | `git diff --stat main -- src/core/` should be empty except where a phase explicitly allowed it |
| Types clean | `npm run lint` |
| No new deps | `git diff main -- package.json` |
| Touch targets | Measure in devtools at `uiScale` 1.0, both viewports |
| Jargon | grep the diff for: OKLab, OKLCh, WBOIT, conformal, decimate, RDP, manifold, scaffolding, raycast, quantiz, telemetry |
| Real gesture tested | The walkthrough artifact shows a drag on the canvas, not just a button click |
| Attic untouched | Nothing imports from `src/components/_attic/` |

---

## 12. Known traps in this codebase

Tell agents about these up front; each has already cost time.

1. **`App.tsx` has 69 `useState` hooks and mounts 21 lazy panels.** Any agent editing it will be
   tempted to "clean it up". Do not let it. Phases 0, 1, 7 and 9 touch this file — serialise them.
2. **`Toolbar.tsx` takes ~70 props.** Do not add a 71st for `uiMode`. That is the entire reason
   Phase 0 builds a store instead.
3. **`loadPresetModel` already clears the model and frames the camera.** Agents reliably
   re-implement both and end up double-clearing. Read `studioEngine.ts:665` and `:712` first.
4. **Palm rejection and the S Pen lock in `Viewport.tsx` are hard-won.** Any change that makes a
   resting palm draw is an immediate revert.
5. **49 presets, 37 model files.** Do not assume the catalog is fully backed by assets.
6. **The Sandbox is reachable from the shipping UI today** via a floating chip at
   `App.tsx:1224–1259`. It is a testbench. Phase 7 closes that door.
7. **No test framework exists.** "It compiles" is not verification. Browser + screenshot, every time.
8. **`npm run lint` is already failing (15 errors).** See setup step 3. Agents that assume a clean
   baseline will chase someone else's bug into the engine.
9. **The word "Feather" is banned** (see AGENTS.md rule 8). The tactile wheel was ported from a
   Feather3D-inspired component; all `#feather-*` DOM ids are now `#paperrocket-*`, and those ids
   are cross-referenced by `closest()` hit-tests in `TactileSpatialController.tsx` and
   `TransformNavigator.tsx`. If you rename one, rename all three files together or touch handling
   breaks silently.

---

## 13. Appendix — copy deck

Exact user-facing strings, so they stay consistent across phases and match the guide.

| Where | String |
|---|---|
| Tools | `Draw` · `Shape` · `Super Zap` · `Move` |
| Brushes | `Tube` · `Ribbon` · `Star Dust` |
| Brush blurbs | "Fat round line you can fly through the air" · "Flat band that hugs whatever it lands on" · "Sparkly scatter for glow and fur" |
| FX | `Neon Glow` · `Lava` · `Slime` · `Cartoon` · `Rainbow` · `Sparkle` · `None` |
| Navigator states | `Flat Screen` · `3D World` |
| Depth guard toast | "Depth locked - you're drawing flat" |
| Toybox confirm | "Start a new page? Your drawing will be cleared." / `Cancel` / `Start fresh` |
| Toybox categories | `Animals` · `Anime` · `Characters` · `Houses` · `Vehicles` · `Simple Shapes` |
| Golden rule | "Fingers move the camera. The pen draws." |
| Finger draw | "No pen? Turn on Finger Draw in Settings and your finger draws instead." |
| Pro switch | `Advanced tools` — "Shows every control. For grown-up 3D work." |
