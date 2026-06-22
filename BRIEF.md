# Design Brief — Plant Tracker "Cozy Plants" Reskin

## 1. Summary
Reskin the existing Plant Tracker PWA into a **full kawaii** aesthetic inspired by hand-drawn
"cozy plants" stickers (chunky outlines, soft botanical greens, blush-pink delight, plump
rounded forms). The app's structure, flows, and copy stay as-is — this is a **visual layer**,
not an IA or feature change.

**Hard constraint that shapes everything:** there are **no custom illustrations**. Plant icons
and decorative cuteness come from **emoji**. That means the kawaii feeling has to be carried
entirely by **color, typography, shape/outline treatment, soft shadows, motion, and emoji** —
not by drawn characters. Design the system around that.

**Ask:** present **two concept options** (distinct takes on "full kawaii"), not a single
finished comp. Pick one to refine after review.

## 2. Audience & platform
- Mobile-first PWA, fixed **480px max-width** container (phone-shaped).
- Daily-use utility: people open it to see what's thirsty and tap "water." Charm must never
  slow the core loop.
- **Light mode only.** No dark mode — out of scope.

## 3. Mood & aesthetic
**Keywords:** cozy, hand-drawn, kawaii, soft, friendly, tactile, plump.

Because there's no illustration budget, lean on these levers:
- **Chunky outlines** as the signature move — dark, slightly irregular strokes on cards,
  buttons, chips, and the FAB. This is what most reads as "sticker" without any drawn art.
- **Plump rounded forms** — generous radii, pill buttons, soft bubble cards.
- **Blush-pink as the one delight color** — hearts, "watered!" success, taps. Used sparingly.
- **Soft paper background + gentle shadows** — avoid flat-material crispness.
- **Motion as cuteness** — bouncy press states, a little wiggle/pop on "water," gentle
  transitions. With no characters, micro-interactions carry a lot of the personality.
- Optional drawn-in-CSS flourishes (dashed "stitched" borders, tiny faces, wobble) are fair
  game since they cost no assets.

## 4. Color
Cooler/greener than the app's current earthy palette. Designer to refine into tokens:
- **Greens:** a fresh leaf green + a deeper cactus green for depth.
- **Pots/neutrals:** warm white, soft tan, terracotta/brown.
- **Accent:** blush pink — the one pop color, reserved for delight.
- **Background:** warm cream / off-white paper.
- **Keep the semantic roles:** muted/desaturated "resting/graveyard" treatment, and a clear
  destructive/danger color.

> Implementation note: the app themes off **~16 CSS variables** in one file (`src/styles/global.css`,
> tokens at the top). Deliver colors as a token set mapped to the existing variable names so the
> swap is low-effort. Current values include sage `#5c7c5a`, terracotta `#c47a5a`, cream `#faf6f0`.

## 5. Typography
Going full kawaii means **dropping the current "ledger" identity** — no more serif headlines,
no monospace timestamps.
- **Headers:** a soft, rounded, friendly sans (slightly hand-drawn feel welcome).
- **Body:** a clean, highly readable sans.
- Keep it legible — cuteness comes from shape/color/motion, never from a hard-to-read display font.

## 6. Iconography — emoji-driven
- **Keep the 24 plant emojis** in the icon picker; designer curates the set for a cohesive,
  cute lineup and specifies sizing/treatment (e.g. sit them in outlined "pots," add soft
  shadow, consistent scale).
- Keep functional emoji (🪦 resting, 🌿 empty states, ⏳ processing, ❤️ delight) but style
  their containers consistently.
- **Known tradeoff to design around:** emoji render differently per OS (iOS vs Android vs
  Windows), so we don't fully control their look. Don't let the design depend on a specific
  emoji rendering — the surrounding UI (outlines, pots, color) must carry the style so the app
  still feels cohesive whatever the emoji look like.

## 7. Surfaces to design (priority order)
1. **Home / dashboard** — week-ahead strip (7 day cells), Thirsty / Care log / All plants tabs,
   status counts, "+" FAB. *Highest traffic — nail this first.*
2. **PlantRow** — the repeated list card (emoji + name + type + status + water button). Workhorse.
3. **Plant Detail** — header with large plant emoji, Water Now button, care-log timeline,
   watering-cadence chart, note input.
4. **Add/Edit Plant** — form + emoji icon picker.
5. **Empty / resting / loading states** — where charm pays off most (sleepy plant for empty,
   gravestone treatment for resting, etc.).
6. **Settings** — lowest priority, mostly inherits tokens.

## 8. States to cover
- Empty (per list), loading, photo "processing," **resting/graveyard** (desaturated, kept in
  history), success / "watered!" delight moment, danger/destructive.
- Tap feedback: app currently uses a playful `scale(0.9)` press — keep something tactile/bouncy.

## 9. Constraints
- 480px width ceiling; design at phone scale.
- Light mode only.
- Emoji only — no custom illustrations.
- No icon library, no component library. Theming is **one CSS file, ~16 variables**. Keep the
  token contract; don't assume a framework.
- PWA — keep assets light; prefer CSS/SVG for any decorative flourishes.

## 10. Deliverables
- **Two concept directions** for "full kawaii," presented for selection. The chunky outline is
  the load-bearing element here — it's what makes flat, emoji-based UI read as "sticker" rather
  than generic-cute. Push it differently across the two concepts so we get a real choice, e.g.
  **Concept A — "outlined everything"** (cards, buttons, chips, FAB all get the dark stroke,
  maximum sticker-sheet feel) vs **Concept B — "outlines on hero elements only"** (strokes on
  primary buttons / FAB / plant pots, softer cards elsewhere — cuter but calmer for daily use).
- After selection: token sheet (colors, type, radii, shadows) mapped to existing variable names.
- The 6 surfaces above as mockups (light mode).
- Component specs for PlantRow, buttons (5 existing variants: primary / secondary / danger /
  rest / revive), tabs, chips, FAB, week strip.
- Emoji treatment spec (sizing, container/pot styling).

## 11. Out of scope
- Dark mode.
- Custom illustration / character art.
- IA, navigation, feature, or copy changes.
