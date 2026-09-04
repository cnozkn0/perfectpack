# Perfect Pack

A cozy mobile packing game. You run a tiny shop: incoming orders land on the table, and you drag products into a cardboard box without overlapping or spilling over the rim.

Open `index.html` in a browser — no build step, no backend, no extra assets.

## How to play

1. Read the order card at the top.
2. Drag items from the shelf into the box, or tap an item twice to auto-place it (mouse or touch).
3. Tap a packed item again, or press **↻**, to rotate. Candles and perfume stay upright (0° / 180°).
4. Fit every required item. Extra items cannot be added.
5. When the layout is valid, **PACK ORDER** lights up.
6. Run the packing finish sequence (tissue, card, flaps, sticker, tape, label, scan).
7. **SHIPPED ✓**, then the score sheet. Score 90+ for a **PERFECT PACK** bonus, then tap **NEXT ORDER**.

There are 18 preset orders that get a little tighter as you go. Money and XP carry across the session.

After **PACK ORDER** you seal the box by hand — swipe tissue, drop a thank-you card, fold both flaps, peel a sticker, tape left-to-right, place the label, then scan. Sounds are generated with the Web Audio API (`playSound("tape")` and friends in `SOUND_BANK`); drop a file path on `SOUND_BANK[id].src` later to swap in real audio without changing call sites. The HUD mute toggle still works during the sequence.

## Run locally

Double-click `index.html`, or from this folder:

```bash
python3 -m http.server 47821
```

Then open `http://127.0.0.1:47821`.

Best on a phone in portrait, or a desktop window around **390×844**.

## Project layout

| File | Role |
| --- | --- |
| `index.html` | Shell, HUD, box, shelf, finish sequence, result sheet |
| `style.css` | Mobile-first layout, safe-area insets, animations |
| `game.js` | `PRODUCT_TYPES`, `ORDERS`, `gameState`, drag/rotate/wrap/score, finish sequence, `playSound` |

To add content later without rewriting the loop:

- New SKU → entry in `PRODUCT_TYPES` plus a `.type-{id}` style
- New shipment → object in `ORDERS` (`items`, optional `boxSize`)
- Bigger carton → `BOX_SIZES.M` / `L`, then set `boxSize` on an order
