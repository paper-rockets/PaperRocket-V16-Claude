# Object Navigator — Motion Fix

**Status:** specification, not yet implemented
**Audience:** implementing agents (no prior conversation context assumed)
**Repo root:** `E:\X\AiStudio Workflow\v14`

---

## 0. Scope — read this first

This app is a Feather3D-style painting tool: the user paints with a stylus onto a 3D model or a
flat sheet, then repositions it and keeps painting. Runs on Galaxy S25 Ultra, Galaxy S-series,
and Tab S6 Lite.

**The existing visual design is approved and must not be redesigned.** The dial, the layout, the
colours, the spring-back stick, the camera controller (`PaperRocketTactileWheel.tsx`) are all
staying exactly as they are.

**The only problem is how the object moves, turns and resizes.** All three feel wrong. This is a
physics and calibration fix inside the current UI.

> **Do not** create new components, rename tabs, change layout, restyle anything, or touch the
> camera controller. If a change would be visible as a *design* difference in a screenshot, it is
> out of scope.

---

## 1. Why it feels wrong

Measured end-to-end through the real call chain.

| Control | Chain | Net result |
|---|---|---|
| **Move** | `stepDx` → `×0.15` (`App.tsx:480`) → `×(vHeight/clientH)×0.35` (`studioEngine.ts:3035`) | object moves **5.25%** of finger travel |
| **Turn** (trackball) | `×0.35` (`mathUtils.ts:37`) → `×0.005×0.35` (`studioEngine.ts:3192`) | **0.035°/px** → a 200px drag turns it 7° |
| **Turn** (2D handle) | finger angle `×0.35` (`studioEngine.ts:3156`) | a full 360° finger swirl = 126° |
| **Size** | `exp(0.01 × px)` compounding, **no sensitivity term** | 100px = **2.7×**, 200px = **7.4×** |

Three separate defects:

### 1.1 Move is a joystick that does nothing when held — the main complaint

`TwoDimensionalDial.tsx` draws a stick that displaces and springs back. That is the universal
"hold it and I keep moving" metaphor. But it emits **per-event pixel deltas** (`deltaX: stepDx`,
lines 124–138) and `App.tsx:480` consumes only those. Hold the stick at full deflection and the
model stops dead — you have to keep swirling your finger forever, and each swirl only delivers
5% of its travel.

It already computes `normalizedX` / `normalizedY` — the stick displacement a velocity joystick
needs — at lines 120–122, and **never uses them.** The required value exists and is discarded.

### 1.2 Size is explosive, speed-dependent, and unreachable by the slider

`scaleAxis` (`studioEngine.ts:3242`) never multiplies by `navigatorSensitivity`, so **the
sensitivity control cannot affect Size at all.**

Worse, `scaleAxis(1 + deltaScale)` compounds *per pointer event*. The same 100px drag yields
`1.01^100 = 2.70×` dragged slowly (many small events) but `1.5² = 2.25×` dragged fast (few large
events). Identical gesture, different result.

### 1.3 Turn is numb

Both rotation paths are multiplied by the `0.35` default sensitivity, so the model rotates about
a third as far as the finger does. Dragging feels like pushing through treacle.

### 1.4 Haptic buzz makes all of it feel worse

`ThreeDimensionalDial.tsx:112` fires a vibration on *every* pointermove over 2px, throttled to
~15/second. That is a continuous rattle rather than feedback, and it drains phone battery.
`haptics.checkAngleDetent` (`haptics.ts:237`) already shows the correct pattern: fire once per
step boundary crossed.

---

## 2. The decision

**Move becomes a true velocity joystick: hold a direction and the model keeps gliding, faster
the further you push. Release and it stops; the stick springs back.**

This was chosen deliberately over 1:1 finger tracking because it matches the camera controller,
which already feels right, and because a small phone pad never runs out of room. It also makes
the existing spring-back visual honest — holding the stick will finally do something.

Turn and Size stay **positional** (the gesture maps directly to an amount), because circular
drag-to-rotate and drag-up-to-grow are already the right metaphors. They are simply mis-scaled.

---

## 3. Calibration targets

Objective, checkable, no taste required.

| Control | Target |
|---|---|
| **Move** | At full stick deflection the model crosses the viewport in **~1 second**. |
| **Turn** (2D handle) | **1:1 angular** — drag 90° around the dial, model turns 90°. |
| **Turn** (trackball) | One pad width (~220px) = **180°**. |
| **Size** | Drag up 110px = **2×**; down 110px = **0.5×**. Exactly reversible. |

```ts
// src/config/navigatorTuning.ts — new file, single source of truth

// Move: velocity joystick. Full deflection crosses ~1 viewport height per second.
export const MOVE_SCREENS_PER_SEC = 0.9;
export const MOVE_DEADZONE        = 0.08;   // ignore tiny resting displacement
export const MOVE_CURVE           = 2;      // response exponent; see §4.2

// Turn: positional.
export const TURN_HANDLE_RATIO    = 1.0;             // 1:1 angular
export const TURN_RAD_PER_PX      = Math.PI / 220;   // 180° per pad width

// Size: positional, log-linear, reversible.
export const SIZE_LOG_PER_PX      = Math.LN2 / 110;  // 2× per 110px
export const SIZE_MIN             = 0.1;
export const SIZE_MAX             = 10;
```

---

## 4. Implementation

### 4.1 Engine and wiring fixes *(do first — everything depends on these)*

- `App.tsx:480` — **delete the `× 0.15`.** It is one of two multipliers silently crushing Move.
- `studioEngine.ts:231` — change the `navigatorSensitivity` default from `0.35` to `1.0`, and
  make the UI default match. Today the engine says `0.35` and the UI says `0.5`; they disagree.
- `studioEngine.ts:3242` `scaleAxis` — **apply `navigatorSensitivity`** (currently missing) and
  clamp cumulative scale to `[SIZE_MIN, SIZE_MAX]`.
- Verify `translateWorldAxis` applies sensitivity consistently with `rotateWorldAxis` (3156),
  `rotateTrackball` (3192) and `translateScreenSpace` (3035), which all do.

`translateScreenSpace` already computes `factor = (vHeight / clientHeight) × sensitivity`, where
`vHeight/clientHeight` is exactly *world units per screen pixel at the object's depth*. That
means it converts screen pixels to world units correctly on its own — **feed it screen-pixel
amounts and do not add any new multiplier.**

### 4.2 Move → velocity loop

In `TwoDimensionalDial.tsx`, stop emitting per-event deltas for the centre stick. Instead keep
the stick's current normalized displacement in a ref, and run a `requestAnimationFrame` loop
while the stick is held.

```ts
const velRef  = useRef({ nx: 0, ny: 0 });
const rafRef  = useRef<number | null>(null);
const lastRef = useRef(0);

// pointermove: no longer emits. It only records where the stick is.
velRef.current = { nx: normalizedX, ny: normalizedY };

// pointerdown: start the loop.
lastRef.current = performance.now();
const tick = (t: number) => {
  const dt = Math.min(0.05, (t - lastRef.current) / 1000);  // clamp after a stall
  lastRef.current = t;

  let { nx, ny } = velRef.current;
  const mag = Math.hypot(nx, ny);

  if (mag > MOVE_DEADZONE) {
    // Response curve: fine control near centre, speed at the rim.
    const curved = Math.pow(mag, MOVE_CURVE) / mag;
    onTranslate({
      vx: nx * curved,
      vy: ny * curved,
      dt,
      source: '2d-move-velocity',
      timestamp: Date.now(),
    });
  }
  rafRef.current = requestAnimationFrame(tick);
};
rafRef.current = requestAnimationFrame(tick);

// pointerup / pointercancel: cancelAnimationFrame(rafRef.current), reset velRef to zero.
```

Then in `App.tsx`, handle the new source:

```ts
if (payload.source === '2d-move-velocity') {
  const px = MOVE_SCREENS_PER_SEC * (container.clientHeight) * payload.dt;
  engine.translateScreenSpace(payload.vx * px, -payload.vy * px, targetScope, isGizmoLocked);
}
```

**Three things that will bite:**

1. **Must be `dt`-based.** A per-frame constant runs twice as fast on the 120Hz S25 Ultra as on
   the 60Hz Tab S6 Lite. Clamp `dt` so a stalled tab doesn't teleport the model.
2. **The deadzone is not optional.** Without it the model drifts whenever the stick rests
   a pixel off centre.
3. **`MOVE_CURVE = 2`** is what makes this feel good — linear response is twitchy near centre and
   too slow at the rim. This single constant carries most of the "feel".

Keep `beginTransform` / `endTransform` bracketing the whole hold, so undo restores one gesture
rather than 120 per-frame fragments.

### 4.3 Size → reversible, speed-independent

Stop compounding per event. Track total displacement from gesture start, derive the absolute
scale that displacement implies, and emit only the correction needed:

```ts
// gesture start
appliedRef.current = 1;

// pointermove
const desired = Math.min(SIZE_MAX, Math.max(SIZE_MIN,
  Math.exp(-totalDy * SIZE_LOG_PER_PX)));
const factor  = desired / appliedRef.current;   // incremental correction only
appliedRef.current = desired;
onScale({ ...payload, deltaScale: factor - 1, handle: 'scale-uniform' });
```

Because `desired` is a pure function of total displacement, dragging up then back down returns
to exactly 1.0, and dragging fast gives the same result as dragging slowly.

### 4.4 Turn → correct the scale

With `navigatorSensitivity` defaulting to `1.0` (§4.1), the 2D handle becomes 1:1 automatically.
For the trackball, replace the `0.35` in `computeTrackballRotation` (`mathUtils.ts:37`) and the
`0.005` in `rotateTrackball` (`studioEngine.ts:3192`) with `TURN_RAD_PER_PX` so one pad width is
180°.

### 4.5 Haptics

Delete the per-move `haptics.trigger('light', 65)` at `ThreeDimensionalDial.tsx:112` and `:202`.
Replace with a distance-based detent — fire once per N pixels travelled — mirroring
`checkAngleDetent`. Add the helper next to it in `haptics.ts`.

---

## 5. Acceptance

- [ ] Holding the Move stick makes the model glide continuously; it stops on release.
- [ ] At full deflection the model crosses the viewport in roughly one second.
- [ ] Move feels identical on a 60Hz and a 120Hz screen.
- [ ] The stick at rest causes no drift.
- [ ] Small stick displacements give fine control; the rim is fast.
- [ ] Turn with the 2D handle is 1:1 — drag 90°, model turns 90°.
- [ ] Trackball: one pad width = 180°.
- [ ] Size: up 110px = 2×, down 110px = 0.5×; up-then-down returns exactly to 100%.
- [ ] Size gives the same result dragged fast or slow.
- [ ] The sensitivity control visibly affects **all three** of Move, Turn and Size.
- [ ] A continuous drag gives discrete haptic ticks, never a buzz.
- [ ] Undo restores a whole gesture, not per-frame fragments.
- [ ] **No visual change.** Screenshots before and after are identical.
- [ ] `npx tsc --noEmit` clean.

---

## 6. Out of scope

Not part of this work; do not do these:

- Any redesign of the navigator, its dial, layout, colours, or tab names
- Any change to `PaperRocketTactileWheel.tsx` (the camera controller)
- New components, new controller modes, phone-specific layouts
- Renaming axis labels or other vocabulary changes

*(A separate note: the `feather3d` entry in `launch.json` points at `E:\Z Feather3D II\Version 01`,
which no longer exists, so browser preview for this project fails to start. Unrelated to this
work, but worth fixing.)*
