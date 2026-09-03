# AGENTS.md — Remix 3D Studio (V16)

Read this before touching anything. It applies to every agent, every task, every session.

## What this app is

A 3D painting tool for tablets. The user paints strokes with a stylus onto a 3D model or a flat
sheet, moves the model around, and keeps painting. Primary device: **Samsung Galaxy Tab S6 Lite**
with an S Pen. Secondary: Galaxy S-series phones, desktop Chrome.

React 19 + Three.js 0.185 + Vite 6 + Tailwind 4. TypeScript strict. No test framework is
installed — verification is done in the browser (see below).

## The current job

We are executing `UX_STREAMLINE_PLAN.md` via `ANTIGRAVITY_BUILD_PLAN.md`. The premise, in one
sentence: **the engine is excellent, the surface is overloaded, so we add a simple default
surface ("Play") and keep the entire existing surface behind a flag ("Pro").**

## Hard rules

1. **Never delete or rewrite engine code.** `src/core/studioEngine.ts` (5297 lines),
   `wboitPipeline.ts`, `conformalBeadGenerator.ts`, `colorMath.ts`, `modelConverter.ts`,
   `proceduralSky.ts`, `loftEngine.ts`, `liquifyEngine.ts`, `scaffoldingEngine.ts`. You may
   **call** them. You may not refactor, simplify, or "clean up" them. If a task seems to require
   an engine change, stop and say so instead.
2. **Never delete `src/components/Toolbar.tsx` or any existing panel.** Pro mode renders them
   unchanged. A change that alters Pro-mode appearance is a bug, not a cleanup.
3. **Never invent engine APIs.** Grep for the real method on `StudioEngine` before calling it.
   The plan documents the real names; if one is missing, search, do not guess.
4. **Plain language in all Play-mode UI strings.** Banned on screen: Catmull-Rom, RDP, OKLab,
   OKLCh, WBOIT, conformal, decimate, manifold, scaffolding, quantization, parallel transport,
   raycast, barycentric, telemetry. These words are fine in code comments and in Pro mode.
5. **One phase per branch, one phase per agent.** Do not bundle phases. Do not "while I'm here".
6. **Touch targets ≥ 44 px** at `uiScale = 1.0`. This is a tablet held in two hands.
7. **No new dependencies** without asking. The bundle already ships to a low-power tablet.
8. **Naming: this product is PaperRockets.** The word "Feather" (from Feather3D, the iPad app that
   inspired the tactile wheel) has been purged from the source and must not come back — not in
   component names, DOM ids, comments, or UI strings. Use `PaperRocket` / `paperrocket-`.
   **One exception:** `feather` as a *graphics* term meaning a soft edge falloff is fine
   (`uvPaintingEngine.ts:474` "round feathered stamp"). Brand, no; blur radius, yes.

## Where things live

| What | Where |
|---|---|
| App shell, all top-level state (69 hooks), all modal mounting | `src/App.tsx` |
| The current (Pro) tool dock — 83 buttons | `src/components/Toolbar.tsx` |
| New Play-mode UI | `src/components/play/` |
| Engine facade — everything the UI calls | `src/core/studioEngine.ts` |
| Shared types (`ToolType`, `BrushSettings`, `EraserMode`, `StrokeProfile`) | `src/types.ts` |
| Brush / paint presets | `src/presets/` |
| Model catalog (49 entries) | `src/core/sampleModels.ts`, files in `public/models/` |
| Pub/sub store pattern to copy | `src/core/telemetryStore.ts` |
| Unreferenced legacy components (do not import) | `src/components/_attic/` |

## Verification — there are no unit tests

Every task is verified in a real browser. Do not report a phase complete without doing this.

```bash
npm run dev
```

Serves on **port 3000**, host `0.0.0.0`. Then, in the browser:

1. Load `http://localhost:3000`.
2. Check the console for errors — the engine logs loudly, so a silent console is meaningful.
3. Emulate a tablet viewport (**2000×1200**, and **1024×768** for the Tab S6 Lite in landscape).
4. Exercise the actual gesture — click/drag on the canvas — not just the button that arms it.
5. Screenshot the result and attach it to the task.

Also run the type check before every commit:

```bash
npm run lint
```

That is `tsc --noEmit`. **The working tree currently has 15 pre-existing type errors** — do not
assume you caused them, and do not go fix them as a side quest:

- 10x `studioEngine.ts` — `Property 'postEngine' does not exist` (post-processing wiring is mid-refactor)
- 4x `Toolbar.tsx` — `Cannot find name 'triggerHaptic'` (missing import)
-  1x `studioEngine.ts:3410` — dead `'camera'` comparison against `TransformTargetScope`

Your bar: **the error count must not go up, and no error may appear in a file you touched.**
Report the before/after count in your task output.

## Input model — the single most important behaviour

Do not break this. It is in `src/components/Viewport.tsx`.

- **`pointerType === 'pen'`** → draws. Pressure-sensitive. Never orbits the camera.
- **`pointerType === 'touch'`** → moves the camera. 1 finger orbits, 2 fingers pan/zoom,
  3 fingers toggle flat/3D view. Never draws — **unless** `fingerPenMode` is on
  (`App.tsx:294`, default `true`), which redirects single-touch to drawing for users without a
  stylus.
- Palm rejection and the S Pen hardware lock are already implemented and were hard-won. If a
  change makes the palm draw, revert it.

## Commits

Branch per phase: `ux/phase-<n>-<slug>`. Conventional commits. End every commit message with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Do not push or open a PR unless asked.

## When you are unsure

Say so in the task output and stop. A wrong guess in a 54,000-line codebase costs more than a
question. In particular: if a phase's acceptance criteria cannot be met without breaking one of
the hard rules above, report that conflict rather than working around it.
