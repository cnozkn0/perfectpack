/**
 * Perfect Pack — vanilla JS packing game
 *
 * Modular data first: add products to PRODUCT_TYPES, orders to ORDERS,
 * or box sizes to BOX_SIZES without rewriting the gameplay loop.
 */

// ---------------------------------------------------------------------------
// PRODUCT_TYPES
// Visuals are CSS classes (type-{id}); gameplay only cares about size + name.
// ---------------------------------------------------------------------------
const PRODUCT_TYPES = {
  candle: {
    id: "candle",
    name: "Candle",
    width: 48,
    height: 90,
    icon: "🕯️",
  },
  mug: {
    id: "mug",
    name: "Mug",
    width: 75,
    height: 75,
    icon: "☕",
  },
  tshirt: {
    id: "tshirt",
    name: "T-Shirt",
    width: 110,
    height: 70,
    icon: "👕",
  },
};

// Future S / M / L boxes can be selected per order via `boxSize`.
const BOX_SIZES = {
  S: { id: "S", label: "Small", width: 300, height: 260 },
  M: { id: "M", label: "Medium", width: 340, height: 300 },
  L: { id: "L", label: "Large", width: 360, height: 340 },
};

// ---------------------------------------------------------------------------
// ORDERS — predefined, slightly harder as the list goes on.
// `items` maps product type id → required count.
// ---------------------------------------------------------------------------
const ORDERS = [
  { items: { candle: 1, mug: 1 } },
  { items: { tshirt: 1, candle: 1 } },
  { items: { mug: 2 } },
  { items: { candle: 2, tshirt: 1 } },
  { items: { mug: 1, candle: 2 } },
  { items: { tshirt: 1, mug: 1, candle: 1 } },
  { items: { tshirt: 2, candle: 1 } },
  { items: { mug: 2, candle: 2 } },
  { items: { tshirt: 1, mug: 2, candle: 1 } },
  { items: { tshirt: 2, mug: 1, candle: 1 } },
];

const SNAP_GRID = 2;
const TAP_MOVE_PX = 8;
const PERFECT_MIN = 90;
const GREAT_MIN = 75;
const GOOD_MIN = 60;
const PERFECT_MONEY_BONUS = 50;
const PERFECT_XP_BONUS = 20;

// ---------------------------------------------------------------------------
// gameState
// ---------------------------------------------------------------------------
const gameState = {
  orderIndex: 0,
  currentOrder: null,
  boxSizeId: "S",
  money: 0,
  xp: 0,
  soundEnabled: true,
  products: [],
  nextInstanceId: 1,
  drag: null,
  packing: false,
};

// DOM
const els = {};
let audioCtx = null;

function $(id) {
  return document.getElementById(id);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function getBoxSize() {
  return BOX_SIZES[gameState.boxSizeId] || BOX_SIZES.S;
}

function getType(typeId) {
  return PRODUCT_TYPES[typeId];
}

/** Axis-aligned size after rotation (90/270 swap width & height). */
function getAABB(product) {
  const type = getType(product.typeId);
  const swapped = product.rotation % 180 === 90;
  return {
    w: swapped ? type.height : type.width,
    h: swapped ? type.width : type.height,
  };
}

function getRect(product) {
  const { w, h } = getAABB(product);
  return { x: product.x, y: product.y, w, h };
}

function snapValue(n) {
  return Math.round(n / SNAP_GRID) * SNAP_GRID;
}

function itemCount(items) {
  return Object.values(items).reduce((sum, n) => sum + n, 0);
}

function productLabel(typeId) {
  return getType(typeId).name;
}

// ---------------------------------------------------------------------------
// Audio (Web Audio API — no external files)
// ---------------------------------------------------------------------------
function getAudioContext() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function tone(freq, duration, type, gainValue, delay) {
  const ctx = getAudioContext();
  if (!ctx || !gameState.soundEnabled) return;
  if (ctx.state === "suspended") ctx.resume();

  const start = ctx.currentTime + (delay || 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue || 0.07, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function playSound(kind) {
  if (!gameState.soundEnabled) return;
  if (kind === "place") {
    tone(720, 0.07, "triangle", 0.05);
    tone(980, 0.05, "sine", 0.03, 0.04);
  } else if (kind === "error") {
    tone(180, 0.14, "square", 0.05);
    tone(140, 0.12, "square", 0.03, 0.05);
  } else if (kind === "complete") {
    tone(392, 0.12, "sine", 0.06);
    tone(523, 0.12, "sine", 0.06, 0.1);
    tone(659, 0.18, "sine", 0.07, 0.2);
  } else if (kind === "perfect") {
    tone(523, 0.1, "sine", 0.05);
    tone(659, 0.1, "sine", 0.05, 0.08);
    tone(784, 0.12, "sine", 0.06, 0.16);
    tone(1046, 0.2, "triangle", 0.05, 0.26);
  } else if (kind === "rotate") {
    tone(840, 0.05, "triangle", 0.035);
  }
}

function haptic(ms) {
  if (typeof navigator.vibrate === "function") {
    navigator.vibrate(ms);
  }
}

function toggleSound() {
  gameState.soundEnabled = !gameState.soundEnabled;
  try {
    localStorage.setItem("perfect-pack-sound", gameState.soundEnabled ? "1" : "0");
  } catch (err) {
    /* ignore quota / private mode */
  }
  renderSoundButton();
  if (gameState.soundEnabled) playSound("place");
}

function renderSoundButton() {
  const on = gameState.soundEnabled;
  els.soundIcon.textContent = on ? "🔊" : "🔇";
  els.soundToggle.setAttribute("aria-label", on ? "Mute sound" : "Unmute sound");
  els.soundToggle.setAttribute("aria-pressed", on ? "false" : "true");
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
function createOrder() {
  const template = ORDERS[gameState.orderIndex % ORDERS.length];
  gameState.currentOrder = {
    number: gameState.orderIndex + 1,
    items: { ...template.items },
    boxSize: template.boxSize || "S",
  };
  gameState.boxSizeId = gameState.currentOrder.boxSize;
  applyBoxSize();
}

function applyBoxSize() {
  const box = getBoxSize();
  els.packArea.style.width = box.width + "px";
  els.packArea.style.height = box.height + "px";
  document.documentElement.style.setProperty("--pack-w", box.width + "px");
  document.documentElement.style.setProperty("--pack-h", box.height + "px");
}

function renderOrder() {
  const order = gameState.currentOrder;
  const n = String(order.number).padStart(3, "0");
  els.orderTitle.textContent = "ORDER #" + n;

  const total = itemCount(order.items);
  els.orderCount.textContent = total + (total === 1 ? " item" : " items");

  els.orderItems.innerHTML = "";
  Object.entries(order.items).forEach(([typeId, qty]) => {
    const placed = gameState.products.filter((p) => p.typeId === typeId && p.inBox).length;
    const li = document.createElement("li");
    li.className = "order-pill" + (placed >= qty ? " is-filled" : "");
    const type = getType(typeId);
    li.innerHTML =
      '<span aria-hidden="true">' +
      type.icon +
      "</span><span>" +
      type.name +
      ' <span class="qty">×' +
      qty +
      "</span></span>";
    els.orderItems.appendChild(li);
  });

  els.moneyValue.textContent = String(gameState.money);
  els.xpValue.textContent = String(gameState.xp);
}

function spawnProducts() {
  els.shelf.innerHTML = "";
  els.packArea.querySelectorAll(".product").forEach((n) => n.remove());
  gameState.products = [];

  const order = gameState.currentOrder;
  Object.entries(order.items).forEach(([typeId, qty]) => {
    for (let i = 0; i < qty; i += 1) {
      const product = makeProduct(typeId);
      gameState.products.push(product);
      els.shelf.appendChild(product.el);
    }
  });

  updateShelfHint();
}

function makeProduct(typeId) {
  const type = getType(typeId);
  const product = {
    id: gameState.nextInstanceId,
    typeId,
    x: 0,
    y: 0,
    rotation: 0,
    inBox: false,
    el: null,
  };
  gameState.nextInstanceId += 1;

  const el = document.createElement("div");
  el.className = "product type-" + type.id;
  el.dataset.instanceId = String(product.id);
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", type.name);

  const inner = document.createElement("div");
  inner.className = "product-inner";
  inner.innerHTML =
    '<span class="product-icon" aria-hidden="true">' +
    type.icon +
    '</span><span class="product-label">' +
    type.name +
    "</span>";

  const rotateBtn = document.createElement("button");
  rotateBtn.className = "rotate-btn";
  rotateBtn.type = "button";
  rotateBtn.setAttribute("aria-label", "Rotate " + type.name);
  rotateBtn.textContent = "↻";
  rotateBtn.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    event.preventDefault();
  });
  rotateBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    rotateProduct(product);
  });

  el.appendChild(inner);
  el.appendChild(rotateBtn);
  product.el = el;
  applyProductMetrics(product);

  el.addEventListener("pointerdown", (event) => startDrag(event, product));
  el.addEventListener("pointermove", moveProduct);
  el.addEventListener("pointerup", dropProduct);
  el.addEventListener("pointercancel", dropProduct);

  return product;
}

function applyProductMetrics(product) {
  const type = getType(product.typeId);
  const aabb = getAABB(product);
  const el = product.el;
  el.style.width = aabb.w + "px";
  el.style.height = aabb.h + "px";
  el.style.setProperty("--ow", type.width + "px");
  el.style.setProperty("--oh", type.height + "px");
  el.style.setProperty("--rot", product.rotation + "deg");
  if (product.inBox) {
    el.style.left = product.x + "px";
    el.style.top = product.y + "px";
  }
}

function updateShelfHint() {
  const remaining = gameState.products.filter((p) => !p.inBox).length;
  if (remaining === 0) {
    els.shelfHint.textContent = "Nudge items tight · Tap to rotate";
    if (!els.shelf.querySelector(".product") && !els.shelf.querySelector(".shelf-empty")) {
      const empty = document.createElement("p");
      empty.className = "shelf-empty";
      empty.textContent = "All items are in the box";
      els.shelf.appendChild(empty);
    }
  } else {
    els.shelfHint.textContent = "Drag into the box · Tap to rotate";
    const empty = els.shelf.querySelector(".shelf-empty");
    if (empty) empty.remove();
  }
}

function updatePackButton() {
  els.packBtn.disabled = gameState.packing || !validateOrder();
  renderOrder();
  updateShelfHint();
}

// ---------------------------------------------------------------------------
// Drag & drop (Pointer Events — mouse + touch)
// ---------------------------------------------------------------------------
function startDrag(event, product) {
  if (gameState.packing) return;
  if (event.button !== undefined && event.button !== 0) return;
  if (gameState.drag) return;
  if (event.target.closest(".rotate-btn")) return;

  event.preventDefault();
  getAudioContext();

  const rect = product.el.getBoundingClientRect();
  gameState.drag = {
    product,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    moved: false,
    done: false,
    fromBox: product.inBox,
    lastX: product.x,
    lastY: product.y,
    placeholder: null,
  };

  try {
    product.el.setPointerCapture(event.pointerId);
  } catch (err) {
    /* some browsers throw if already released */
  }
}

function liftToDragLayer(product, placeholderParent) {
  const el = product.el;
  const rect = el.getBoundingClientRect();

  if (!product.inBox && placeholderParent) {
    const ph = document.createElement("div");
    ph.className = "shelf-placeholder";
    ph.style.width = el.style.width;
    ph.style.height = el.style.height;
    placeholderParent.insertBefore(ph, el);
    gameState.drag.placeholder = ph;
  }

  els.dragLayer.appendChild(el);
  el.classList.add("dragging");
  el.style.position = "fixed";
  el.style.left = rect.left + "px";
  el.style.top = rect.top + "px";
  el.style.margin = "0";
  el.style.zIndex = "80";
}

function moveProduct(event) {
  const drag = gameState.drag;
  if (!drag || drag.done || event.pointerId !== drag.pointerId) return;
  event.preventDefault();

  const dist = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
  if (!drag.moved && dist < TAP_MOVE_PX) return;

  if (!drag.moved) {
    drag.moved = true;
    const parent = drag.product.el.parentElement;
    liftToDragLayer(drag.product, parent === els.shelf ? els.shelf : null);
  }

  const el = drag.product.el;
  el.style.left = event.clientX - drag.offsetX + "px";
  el.style.top = event.clientY - drag.offsetY + "px";

  const local = clientRectToBoxLocal(el);
  const candidate = {
    ...drag.product,
    x: local.x,
    y: local.y,
    inBox: true,
  };

  const inside = isInsideBox(candidate);
  const overlap = isOverlapping(candidate);
  const overBox = inside || isPointInElement(event.clientX, event.clientY, els.packArea);
  const invalid = overBox && (!inside || overlap);
  els.box.classList.toggle("is-hot", inside && !overlap);
  els.box.classList.toggle("is-invalid", invalid);
  el.classList.toggle("is-invalid", invalid);
}

function dropProduct(event) {
  const drag = gameState.drag;
  if (!drag || drag.done || event.pointerId !== drag.pointerId) return;
  drag.done = true;
  event.preventDefault();

  const product = drag.product;
  const el = product.el;

  try {
    if (el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
  } catch (err) {
    /* ignore */
  }

  if (!drag.moved) {
    clearDragVisuals();
    gameState.drag = null;
    rotateProduct(product);
    return;
  }

  const overShelf = isPointInElement(event.clientX, event.clientY, els.shelf);
  if (overShelf) {
    returnToShelf(product);
    playSound("place");
    finishDrag();
    return;
  }

  const local = clientRectToBoxLocal(el);
  const snappedX = snapValue(local.x);
  const snappedY = snapValue(local.y);
  const candidate = {
    ...product,
    x: snappedX,
    y: snappedY,
    inBox: true,
  };

  if (!isInsideBox(candidate) || isOverlapping(candidate)) {
    rejectPlacement(product, el);
    return;
  }

  placeInBox(product, snappedX, snappedY);
  playSound("place");
  haptic(8);
  playSnapAnimation(el);
  finishDrag();
}

function rejectPlacement(product, el) {
  playSound("error");
  haptic(18);
  els.box.classList.add("is-invalid");
  el.classList.add("is-invalid");

  window.setTimeout(() => {
    el.classList.remove("is-invalid");
    els.box.classList.remove("is-invalid");
    const drag = gameState.drag;
    if (drag && drag.fromBox) {
      placeInBox(product, drag.lastX, drag.lastY);
    } else {
      returnToShelf(product);
    }
    finishDrag();
  }, 280);
}

function finishDrag() {
  clearDragVisuals();
  gameState.drag = null;
  updatePackButton();
}

function clearDragVisuals() {
  const drag = gameState.drag;
  if (drag && drag.placeholder && drag.placeholder.parentElement) {
    drag.placeholder.remove();
  }
  els.box.classList.remove("is-hot", "is-invalid");
  gameState.products.forEach((p) => p.el.classList.remove("dragging", "is-invalid"));
}

function clientRectToBoxLocal(el) {
  const er = el.getBoundingClientRect();
  const br = els.packArea.getBoundingClientRect();
  return { x: er.left - br.left, y: er.top - br.top };
}

function isPointInElement(x, y, node) {
  const r = node.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function placeInBox(product, x, y) {
  product.inBox = true;
  product.x = x;
  product.y = y;
  const el = product.el;
  el.classList.add("in-box");
  el.classList.remove("dragging");
  el.style.position = "absolute";
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.style.zIndex = "";
  els.packArea.appendChild(el);
  applyProductMetrics(product);
}

function returnToShelf(product) {
  product.inBox = false;
  product.x = 0;
  product.y = 0;
  const el = product.el;
  el.classList.remove("in-box", "dragging");
  el.style.position = "";
  el.style.left = "";
  el.style.top = "";
  el.style.zIndex = "";
  els.shelf.appendChild(el);
  applyProductMetrics(product);
}

function playSnapAnimation(el) {
  el.classList.remove("is-valid-snap");
  void el.offsetWidth;
  el.classList.add("is-valid-snap");
  window.setTimeout(() => el.classList.remove("is-valid-snap"), 360);
}

function rotateProduct(product) {
  if (gameState.packing) return;

  const prev = product.rotation;
  const aabb = getAABB(product);
  product.rotation = (product.rotation + 90) % 360;

  if (product.inBox) {
    const next = getAABB(product);
    const cx = product.x + aabb.w / 2;
    const cy = product.y + aabb.h / 2;
    const nextX = snapValue(cx - next.w / 2);
    const nextY = snapValue(cy - next.h / 2);
    const candidate = { ...product, x: nextX, y: nextY };

    if (!isInsideBox(candidate) || isOverlapping(candidate)) {
      product.rotation = prev;
      product.el.classList.add("is-invalid");
      playSound("error");
      haptic(12);
      window.setTimeout(() => product.el.classList.remove("is-invalid"), 320);
      return;
    }

    product.x = nextX;
    product.y = nextY;
  }

  applyProductMetrics(product);
  playSound("rotate");
  playSnapAnimation(product.el);
  updatePackButton();
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
function isInsideBox(product) {
  const box = getBoxSize();
  const { w, h } = getAABB(product);
  return product.x >= 0 && product.y >= 0 && product.x + w <= box.width && product.y + h <= box.height;
}

function isOverlapping(product, others) {
  const list = others || gameState.products.filter((p) => p.inBox);
  const a = {
    x: product.x,
    y: product.y,
    ...getAABB(product),
  };

  return list.some((other) => {
    if (other.id === product.id) return false;
    const b = getRect(other);
    return rectsOverlap(a, b);
  });
}

function rectsOverlap(a, b) {
  // Edges may touch (gap of 0). Overlap only if interiors intersect.
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function rectGap(a, b) {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
  if (dx === 0 && dy === 0) return 0;
  return Math.hypot(dx, dy);
}

// ---------------------------------------------------------------------------
// Scoring & flow
// ---------------------------------------------------------------------------
function validateOrder() {
  const order = gameState.currentOrder;
  if (!order) return false;

  const placed = gameState.products.filter((p) => p.inBox);
  if (placed.length !== gameState.products.length) return false;
  if (placed.length === 0) return false;

  const counts = {};
  placed.forEach((p) => {
    counts[p.typeId] = (counts[p.typeId] || 0) + 1;
  });

  const needed = order.items;
  const neededKeys = Object.keys(needed);
  for (let i = 0; i < neededKeys.length; i += 1) {
    const typeId = neededKeys[i];
    if ((counts[typeId] || 0) !== needed[typeId]) return false;
  }

  const extra = Object.keys(counts).some((typeId) => !needed[typeId]);
  if (extra) return false;

  for (let i = 0; i < placed.length; i += 1) {
    if (!isInsideBox(placed[i])) return false;
    if (isOverlapping(placed[i], placed)) return false;
  }

  return true;
}

function calculatePackScore() {
  const placed = gameState.products.filter((p) => p.inBox);

  // 50% — correct SKUs & quantities (button already requires this).
  const correctScore = 50;

  // 30% — how tightly the shipment uses its own bounding box.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let productArea = 0;
  placed.forEach((p) => {
    const r = getRect(p);
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
    productArea += r.w * r.h;
  });
  const bboxArea = Math.max(1, (maxX - minX) * (maxY - minY));
  const compactness = clamp(productArea / bboxArea, 0, 1);
  const efficiencyScore = 30 * clamp((compactness - 0.35) / 0.6, 0, 1);

  // 20% — leftover air between nearest neighbors (touching = full points).
  let gapScore = 20;
  if (placed.length >= 2) {
    let total = 0;
    placed.forEach((p) => {
      const a = getRect(p);
      let nearest = Infinity;
      placed.forEach((other) => {
        if (other.id === p.id) return;
        nearest = Math.min(nearest, rectGap(a, getRect(other)));
      });
      total += nearest;
    });
    const mean = total / placed.length;
    gapScore = 20 * (1 - clamp(mean / 42, 0, 1));
  }

  const score = Math.round(correctScore + efficiencyScore + gapScore);
  return clamp(score, 0, 100);
}

function ratingFor(score) {
  if (score >= PERFECT_MIN) return "PERFECT PACK";
  if (score >= GREAT_MIN) return "GREAT PACK";
  if (score >= GOOD_MIN) return "GOOD PACK";
  return "NEEDS IMPROVEMENT";
}

function completeOrder() {
  if (!validateOrder() || gameState.packing) return;
  gameState.packing = true;
  els.packBtn.disabled = true;

  const score = calculatePackScore();
  const perfect = score >= PERFECT_MIN;
  let money = Math.round(8 + score * 0.42);
  let xp = Math.round(4 + score * 0.16);
  if (perfect) {
    money += PERFECT_MONEY_BONUS;
    xp += PERFECT_XP_BONUS;
  }

  gameState.money += money;
  gameState.xp += xp;

  playSound(perfect ? "perfect" : "complete");
  if (perfect) spawnConfetti();

  showResult(score, money, xp, perfect);
  renderOrder();
}

function showResult(score, money, xp, perfect) {
  els.resultTitle.textContent = ratingFor(score);
  els.resultKicker.textContent = perfect ? "Every millimetre earned it" : "Order packed";
  els.resultSheet.classList.toggle("perfect", perfect);
  els.resultMoney.textContent = "+$" + money;
  els.resultXp.textContent = "+" + xp;
  els.resultBonus.hidden = !perfect;
  els.resultBonus.classList.toggle("hidden", !perfect);
  els.resultScore.textContent = "0";
  els.scoreRing.style.setProperty("--p", "0%");

  els.resultOverlay.hidden = false;
  els.resultOverlay.classList.remove("hidden");

  countUp(score);
}

function countUp(target) {
  const start = performance.now();
  const duration = 700;

  function frame(now) {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(target * eased);
    els.resultScore.textContent = String(value);
    els.scoreRing.style.setProperty("--p", value + "%");
    if (t < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function spawnConfetti() {
  els.confetti.innerHTML = "";
  const colors = ["#d46a4c", "#6d9a7c", "#e2b15a", "#e5989b", "#83c5be", "#fff8ef"];
  for (let i = 0; i < 52; i += 1) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.setProperty("--c", colors[i % colors.length]);
    piece.style.setProperty("--dx", Math.round(Math.random() * 120 - 60) + "px");
    piece.style.setProperty("--spin", Math.round(400 + Math.random() * 500) + "deg");
    piece.style.setProperty("--dur", 1.35 + Math.random() * 0.8 + "s");
    piece.style.setProperty("--delay", Math.random() * 0.28 + "s");
    els.confetti.appendChild(piece);
  }
  window.setTimeout(() => {
    els.confetti.innerHTML = "";
  }, 2400);
}

function nextOrder() {
  els.resultOverlay.hidden = true;
  els.resultOverlay.classList.add("hidden");
  gameState.orderIndex += 1;
  gameState.packing = false;
  createOrder();
  resetOrder();
}

function resetOrder() {
  clearDragVisuals();
  gameState.drag = null;
  spawnProducts();
  updatePackButton();
}

function cacheEls() {
  els.app = $("app");
  els.moneyValue = $("money-value");
  els.xpValue = $("xp-value");
  els.soundToggle = $("sound-toggle");
  els.soundIcon = $("sound-icon");
  els.orderTitle = $("order-title");
  els.orderCount = $("order-count");
  els.orderItems = $("order-items");
  els.box = $("box");
  els.packArea = $("pack-area");
  els.shelf = $("shelf");
  els.shelfHint = $("shelf-hint");
  els.packBtn = $("pack-btn");
  els.dragLayer = $("drag-layer");
  els.confetti = $("confetti");
  els.resultOverlay = $("result-overlay");
  els.resultSheet = document.querySelector(".result-sheet");
  els.resultKicker = $("result-kicker");
  els.resultTitle = $("result-title");
  els.resultScore = $("result-score");
  els.scoreRing = $("score-ring");
  els.resultMoney = $("result-money");
  els.resultXp = $("result-xp");
  els.resultBonus = $("result-bonus");
  els.nextBtn = $("next-btn");
}

function bindUi() {
  els.soundToggle.addEventListener("click", toggleSound);
  els.packBtn.addEventListener("click", completeOrder);
  els.nextBtn.addEventListener("click", nextOrder);

  // Keep the page from scrolling / bouncing while packing on mobile browsers.
  document.addEventListener(
    "touchmove",
    (event) => {
      event.preventDefault();
    },
    { passive: false }
  );

  document.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".product") || event.target.closest("#app")) {
      event.preventDefault();
    }
  });

  window.addEventListener("pointerup", (event) => {
    if (gameState.drag && event.pointerId === gameState.drag.pointerId) {
      dropProduct(event);
    }
  });
}

function init() {
  cacheEls();
  bindUi();

  try {
    const saved = localStorage.getItem("perfect-pack-sound");
    if (saved === "0") gameState.soundEnabled = false;
  } catch (err) {
    /* ignore */
  }
  renderSoundButton();

  createOrder();
  spawnProducts();
  renderOrder();
  updatePackButton();
}

init();
