# Perfect Pack

A cozy mobile packing game. You run a tiny shop: incoming orders land on the table, and you drag products into a cardboard box without overlapping or spilling over the rim.

Open `index.html` in a browser — no build step, no backend, no extra assets.

## How to play

1. Read the order card at the top.
2. Drag items from the shelf into the box (mouse or touch).
3. Tap an item, or press **↻**, to rotate it 90°.
4. Fit every required item. Extra items cannot be added.
5. When the layout is valid, **PACK ORDER** lights up.
6. Score 90+ for a **PERFECT PACK** bonus, then tap **NEXT ORDER**.

There are 10 preset orders that get a little tighter as you go. Money and XP carry across the session.

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
| `index.html` | Shell, HUD, box, shelf, result sheet |
| `style.css` | Mobile-first layout, safe-area insets, animations |
| `game.js` | `PRODUCT_TYPES`, `ORDERS`, `gameState`, drag/rotate/score |

To add content later without rewriting the loop:

- New SKU → entry in `PRODUCT_TYPES` plus a `.type-{id}` style
- New shipment → object in `ORDERS` (`items`, optional `boxSize`)
- Bigger carton → `BOX_SIZES.M` / `L`, then set `boxSize` on an order
