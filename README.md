# Perfect Pack

A cozy mobile packing game. You run a tiny shop: incoming orders land on the table, and you drag products into a cardboard box without overlapping or spilling over the rim.

Open `index.html` in a browser — no build step, no backend, no extra assets.

## How to play

1. The **desk** shows the order card, special request, and box picker. Pick a carton, then tap **START PACKING**.
2. The packing table slides up (~0.22s) as its own screen — box, shelf, wrap tray, and **PACK ORDER**. Tap **← Order** to go back and change the box (blocked once the finish sequence starts).
3. Drag items from the shelf into the box, or tap an item twice to auto-place it (mouse or touch).
4. Tap a packed item again, or press **↻**, to rotate. Candles and perfume stay upright (0° / 180°).
5. Tap a packed item to wrap it. The wrap tray sits above the shelf so leftover items stay tappable.
6. Fit every required item. Extra items cannot be added.
7. When the layout is valid, **PACK ORDER** lights up.
8. Run the packing finish sequence (tissue, card, flaps, sticker, tape, label, scan).
9. **SHIPPED ✓**, then the score sheet. Spend profits in **SHOP UPGRADES** (desk 🏪 or the result sheet) — tools, not pay-to-win. **NEXT ORDER** returns to the desk. Pack Score is a weighted mix of Accuracy (25%), Fit (20%), Protection (20%), Cost (15%), and Aesthetic (20%). **98+** is a **PERFECT PACK ✨** (confetti + haptic). Badges: SPACE MASTER, PROTECTOR, BUDGET MASTER, STYLIST, FLAWLESS.

Some orders carry a **special request** on the order card (icon, name, and a customer quote). Honor it while you pack:

| Request | What it asks |
| --- | --- |
| **GIFT** | Gift note required. Presentation counts. |
| **ECO** | No plastic wrap (bubble / foam). Paper fill is a bonus. |
| **DISCREET** | Skip the shop sticker. Placing it fails the request. |
| **FRAGILE PLUS** | Protection requirement goes up. Wrap until the tray hits the new target. |
| **EXPRESS** | Pack before the countdown on the card hits TIME'S UP. Sealing the box after **PACK ORDER** does not use the timer. |
| **NO INVOICE** | Skip the card. Dropping it in fails the request. |
| **BIRTHDAY** | Birthday card required (`"Please make it cute!"`). |
| **PREMIUM** | Card required and a high aesthetic bar. |

Wrong material during packing toasts a failure (for example bubble wrap on an **ECO** order → **ECO REQUEST FAILED**). You can still unwrap; scoring uses the **final** wraps. A failed request cuts Accuracy and Aesthetic. **DISCREET** / **NO INVOICE** finish steps offer **Skip — no branding** / **Skip — no invoice** so you can honor those asks.

You start with **$100.00**. Open **Shop Upgrades** from the desk (🏪) or the score sheet. Effects live in `SHOP_UPGRADES` and are read only through `upgradeEffect(key)`: a bigger packing table, faster tape/label finish gestures, a small scanner accuracy bump, cheaper wrap, extra catalog SKUs, and a light aesthetic modifier. First levels are cheap (Tape Gun Lv1 is **$40**); later levels cost real run profits. Skill still has to pack the box — bonuses will not rescue a failed request. Each SKU has a `salePrice` and `productCost`. After shipping, profit is revenue − product cost − packaging (box + wrap) − shipping, plus a tip (**+5%** at 90+, **+10%** on a Perfect Pack). Seriously weak protection takes a deterministic refund, not a dice roll. Shop rating is the running average of customer **star reviews** (not raw pack score). Rating **4.0+** adds a tiny reward multiplier (about **+0.3% per 0.1 stars**, so 4.8 → ~1.024× on XP, tips, and a small reputation bonus). **4.8★ after 5 reviews** unlocks VIP customer infrastructure (`shouldOfferVipOrder()` / `gameState.vipUnlocked`) — VIP SKUs are not in the catalog yet. XP: **+50** per order, **+20** at 90+, **+50** more for Perfect Pack, then multiplied by the rating bonus. Level curve: `100 × 1.32^(level-1)`.

After **SHIPPED ✓**, the score sheet lands first. About two seconds later a **customer review** notification slides in from a template pool (5★ praise, weak protection, missed requests, and so on). 1★ is a pack score under 50 **or** a serious miss (failed special request, or protection under 40).

After **PACK ORDER** you seal the box by hand — swipe tissue, drop a thank-you card, fold both flaps, peel a sticker, tape left-to-right, place the label, then scan. Sounds are generated with the Web Audio API (`playSound("tape")` and friends in `SOUND_BANK`); drop a file path on `SOUND_BANK[id].src` later to swap in real audio without changing call sites. The HUD mute toggle still works during the sequence.

## Run locally

Double-click `index.html`, or from this folder:

```bash
python3 serve.py
```

Then open `http://127.0.0.1:47821`. On your own Mac/iPhone Safari that address only works if this command is running **on that device**. The Cursor Preview button opens the cloud copy.

Best on a phone in portrait, or a desktop window around **390×844**.

## Project layout

| File | Role |
| --- | --- |
| `index.html` | Shell, desk stage, packing stage, finish sequence, result sheet |
| `style.css` | Mobile-first layout, safe-area insets, animations |
| `game.js` | `PRODUCT_TYPES`, `ORDERS`, `gameState`, drag/rotate/wrap/score, finish sequence, `playSound` |

To add content later without rewriting the loop:

- New SKU → entry in `PRODUCT_TYPES` (`unlockTier` for the Product Shelf) plus a `.type-{id}` style
- New shipment → object in `ORDERS` (`items`, optional `idealBox`, optional `request`)
- New request type → entry in `REQUEST_TYPES`, then set `request` on an order
- Bigger carton → `BOX_TYPES`, then set `idealBox` on an order
- New / rebalanced upgrade → row in `SHOP_UPGRADES` (cost, perk, `effects`)
