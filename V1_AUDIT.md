# Perfect Pack V1 Audit

## Status

**PLAYTEST READY**

Browser vertical slice is frozen as **Perfect Pack V1 Browser Playtest Build**. No new major gameplay features. Use `PLAYTEST_CHECKLIST.md` on a real iPhone next.

## Critical Bugs Fixed

* **Wrap-aware order feasibility** — ideal box generation assumes protection padding for fragile / high-requirement SKUs so ideal / SPACE MASTER boxes stay packable after wrapping.
* **Fit scoring vs actual AABBs** — `theoreticalMinBox` now uses real wrap/compress sizes via `canPackAabbsInBox` (not bare catalog dims), so Fit / SPACE MASTER match what the player packed.
* **Cash soft-floor** — `applyRunRewards` clamps cash at $0 so a bad profit / refund streak cannot go negative and soft-lock the run. Materials are still charged at ship; wrapping does not require prepaid cash.
* **Label print race** — print completion ignores stale timers if the finish sequence left the label step or a newer print token started.

## Remaining Critical Bugs

None known from this audit pass. Real-device Safari may still surface AudioContext / haptic edge cases (see Known Limitations).

## Medium Priority Issues

* Early procedural orders still lean **S box** until difficulty ~5 (`hardSpatial`); M/L variety also comes from curated / showcase beats — watch this in the first 20 human orders.
* Synthetic Web Audio is functional but not production ASMR quality (tape / bubble especially).
* Studio Decor aesthetic bonus is intentional but small; watch if mid-game aesthetic feels “bought.”
* Full 10 / 25 / 50 human long-play balance not completed in this session (checklist remains for device testers).

## Balance Changes

* Difficulty band **5** now enables `hardSpatial` (prefer non-S when the fit solver allows) so medium/large boxes appear earlier in the mid-game ramp.
* No economy formula rewrite; cash floor only.

## Product Variety

| Metric | Value |
| --- | --- |
| Total SKU | **30** |
| Categories | **7** (beauty, home, fashion, jewelry, stationery, tech, collectible) |
| Unlock tiers | **0–3** (Product Shelf) |
| Duplicate identical dims | **0** |
| Fragile / soft / upright / compressible | 10 / 12 / 5 / 11 |

Curated ORDERS (28): all pad-aware feasible; no curated `idealBox` smaller than pad-fit ideal.

20-order repetition (generator design): signature memory (last 5), category memory, theme beats (BEAUTY / FASHION / GIFT / STATIONERY / MIXED). Locked SKUs gated by `catalogTier`. Debug: `?orders=1`.

## ASMR Evaluation

**Strongest moments**

1. Product snap into box
2. Tissue crinkle / tuck
3. Sticker peel → place
4. Tape drag → cut
5. Scanner beep + shipped

**Weaker / placeholder**

* Continuous tape tick can feel synthetic on long swipes
* Label printer timing is good with upgrades; base 900ms can feel long if the player is already waiting
* Product prep is short and good; some SKUs share similar pick families

**Needs real audio assets later:** bubble wrap, tape peel/cut, tissue, scanner, soft vs glass picks.

## Mobile Evaluation

| Viewport | Checked in audit |
| --- | --- |
| 390×844 (primary) | Browser pass — packing UI, 2.5D box, shelf, PACK ORDER, no horizontal overflow |
| 320 / 375 / 430 / 932 | CSS breakpoints present; **confirm on device** via checklist |

**Safari risks:** first-gesture AudioContext unlock; Dynamic Island / safe-area (CSS vars in place); double-tap zoom / selection mitigated with touch-action — verify on hardware.

## Performance

* Existing drag rAF coalescing, pack-area cache, blocker list, idempotent binds kept.
* Confetti / review timers cleared in `clearTimers`.
* Decorative 2.5D layers use `pointer-events: none`.
* No new per-frame packing solver (generation / score-time only).

## Save Reliability

* Invalid JSON → defaults via `loadGame` / `sanitizeSave`.
* Missing fields migrated (SAVE_VERSION **7**, includes `asmrMode`).
* Refresh restores cash, xp, level, rating, upgrades, cosmetics, daily, settings, followers.
* Reset Progress: confirm gate preserved.

## Known Limitations

* Browser prototype, not App Store
* CSS 2.5D, not true 3D
* Synthetic placeholder audio
* Limited native haptics in browser
* No native wrapper yet

## Recommendation

This build is ready for **REAL IPHONE PLAYTEST**.

Next steps: run `PLAYTEST_CHECKLIST.md` on device, collect feedback, keep the V1 feature freeze, then plan native / App Store migration.
