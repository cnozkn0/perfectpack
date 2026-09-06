# Perfect Pack

## Game Concept

A mobile-first cozy packing simulator focused on satisfying product placement, small-business progression and ASMR packing interactions.

Open `index.html` in a browser — no build step, no backend, no framework. Vanilla HTML + CSS + JavaScript only.

## Core Loop

Order → Choose box → Pack → Protect → Seal → Ship → Score → Earn → Upgrade → Repeat

1. Desk shows the order card, special request, and S / M / L box picker.
2. **START PACKING** opens the packing table (box, shelf, wrap tray, **PACK ORDER**).
3. Drag shelf items into the 2.5D carton (or tap twice to auto-place). Rotate / compress as needed.
4. Wrap fragile items. Validate layout → **PACK ORDER**.
5. Finish sequence: tissue → card → close → sticker → tape → label print/place → scan → **SHIPPED**.
6. Score sheet → profit / XP / review → shop, cosmetics, daily → **NEXT ORDER**.

There is **no classic tutorial**. Short contextual shelf hints only (e.g. “Drag or tap twice to pack”, “Tap to wrap · tap again to rotate”).

## Features

* Expanded product catalog (~30 SKUs, unlock tiers)
* 2.5D cardboard packing box (walls / flaps; 2D collision)
* Box sizing (S / M / L) + Packing Table visual scale
* Spatial packing (drag/drop, rotate, compress, overlap validation)
* Product properties (fragile, soft, upright, compressible, liquid, …)
* Product prep micro-interactions
* Protection / wrap system (bubble, paper, tissue, foam, unwrap)
* Procedural + curated hybrid order generator
* Special customer requests
* ASMR finish sequence + ASMR Mode setting
* Viral quick-pack rush (tissue → tape → scan)
* Scoring (Accuracy / Fit / Protection / Cost / Aesthetic)
* Economy (revenue, costs, tip, refund, profit)
* Customer reviews + shop rating
* XP / level, followers
* Shop upgrades + cosmetics / brand customization
* Returns / damage
* Daily challenges
* Local save / load (`localStorage`)
* Settings (sound, ASMR Mode, reset progress)

## Product Catalog

~30 SKUs across **beauty**, **home**, **fashion**, **jewelry**, **stationery**, **tech**, **collectible**.

**Unlock tiers** (Product Shelf upgrade raises `catalogTier`):

| Tier | Focus |
| --- | --- |
| 0 | Basic lifestyle (candle, mug, t-shirt, socks, …) |
| 1 | Beauty + fashion depth |
| 2 | Jewelry + stationery |
| 3 | Tech + collectibles |

Locked SKUs never appear in procedural orders. See `PRODUCT_TYPES` in `game.js` for full dims / properties.

## ASMR System

Web Audio (`SOUND_BANK`) with synthetic placeholders; swap `.src` later for real assets.

* Order ticket / printer feel on arrival
* Product pick families (soft / hard / glass / paper)
* Product prep (fold, cap, jewelry, paper slide)
* Wrap (bubble crackle, paper rustle, tissue, foam)
* Sticker peel + place
* Tape drag + cut/rip
* Label printer → place
* Scanner beep + shipped
* **ASMR Mode** (Settings): packing sounds forward, quieter UI
* Sound Off remains fully playable (visual feedback)

## Save System

Persists (SAVE_VERSION 7): cash, xp, level, rating, orders, perfect packs, followers, upgrades, cosmetics, statistics, daily challenge, settings (sound + asmrMode), order-gen memory, pending returns.

Runtime-only (not saved): drag/gesture, DOM nodes, unfinished finish sequence, active timers.

Corrupt / incomplete saves go through `sanitizeSave` / migration and recover with defaults. `?fresh=1` starts clean.

## Debug Options

| Query | Effect |
| --- | --- |
| `?fresh=1` | Clear save, start fresh |
| `?orders=1` | Order-generator debug panel |
| `?viral=1` | Viral event preview path |

```bash
python3 serve.py
```

Then open `http://127.0.0.1:47821` (best at **390×844** portrait).

## V1 Feature Freeze

**V1_FEATURE_FREEZE** — this is the browser playtest build.

Do **not** add major gameplay features. Prefer bugfixes, small balance tweaks, ASMR polish, and save/mobile stability until real-device playtest and native / App Store migration.

## Project layout

| File | Role |
| --- | --- |
| `index.html` | Shell, desk, packing, finish, result, modals |
| `style.css` | Mobile-first layout, 2.5D box, safe-area |
| `game.js` | Catalog, generator, packing, score, economy, save, audio |
| `PLAYTEST_CHECKLIST.md` | Device / loop playtest checklist |
| `V1_AUDIT.md` | V1 audit status and findings |

## Known Limitations

* Browser prototype (not a native App Store build)
* CSS 2.5D carton — not true 3D / WebGL
* Synthetic placeholder audio (Web Audio), not production ASMR packs
* Native haptics limited / inconsistent in mobile browsers
* No App Store / Capacitor / native engine wrapper yet
* Touch + AudioContext unlock depends on first user gesture (esp. iPhone Safari)

## Next Native Milestone

After this browser vertical slice:

1. Real iPhone playtest + feedback
2. Lock gameplay / freeze content
3. Native engine / App Store migration plan
