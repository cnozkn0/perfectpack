/**
 * Perfect Pack — vanilla JS packing prototype
 * Wrapped in an IIFE so gameplay stays off the global scope.
 */
(function () {
  "use strict";

  // ===========================================================================
  // CONFIG
  // ===========================================================================
  const CONFIG = {
    SNAP_GRID: 2,
    TAP_MOVE_PX: 8,
    PERFECT_MIN: 90,
    GREAT_MIN: 75,
    GOOD_MIN: 60,
    PERFECT_MONEY_BONUS: 50,
    PERFECT_XP_BONUS: 20,
    SPACE_MASTER_MONEY: 30,
    SPACE_MASTER_XP: 15,
    SOUND_STORAGE_KEY: "perfect-pack-sound",
  };

  // ===========================================================================
  // PRODUCT_TYPES
  // Visuals live in CSS as .type-{id}. Gameplay only uses size + name.
  // ===========================================================================
  const PRODUCT_TYPES = {
    candle: { id: "candle", name: "Candle", width: 48, height: 90, icon: "🕯️" },
    mug: { id: "mug", name: "Mug", width: 75, height: 75, icon: "☕" },
    tshirt: { id: "tshirt", name: "T-Shirt", width: 110, height: 70, icon: "👕" },
  };

  // ===========================================================================
  // BOX_TYPES
  // Inner packing size in CSS pixels. cost / shippingMultiplier sit in
  // gameState for a later economy pass.
  // ===========================================================================
  const BOX_TYPES = {
    small: {
      id: "small",
      key: "S",
      label: "S BOX",
      width: 220,
      height: 180,
      cost: 0.35,
      shippingMultiplier: 0.9,
      rank: 0,
    },
    medium: {
      id: "medium",
      key: "M",
      label: "M BOX",
      width: 280,
      height: 230,
      cost: 0.6,
      shippingMultiplier: 1.0,
      rank: 1,
    },
    large: {
      id: "large",
      key: "L",
      label: "L BOX",
      width: 330,
      height: 275,
      cost: 1.0,
      shippingMultiplier: 1.2,
      rank: 2,
    },
  };

  // ===========================================================================
  // ORDERS
  // items: product type id → required count. idealBox: small | medium | large
  // ===========================================================================
  const ORDERS = [
    { id: 1, items: { candle: 1, mug: 1 }, idealBox: "small" },
    { id: 2, items: { tshirt: 1, candle: 1 }, idealBox: "small" },
    { id: 3, items: { mug: 2 }, idealBox: "small" },
    { id: 4, items: { candle: 2, tshirt: 1 }, idealBox: "medium" },
    { id: 5, items: { mug: 1, candle: 2 }, idealBox: "small" },
    { id: 6, items: { tshirt: 1, mug: 1, candle: 1 }, idealBox: "medium" },
    { id: 7, items: { tshirt: 2, candle: 1 }, idealBox: "medium" },
    { id: 8, items: { mug: 2, candle: 2 }, idealBox: "medium" },
    { id: 9, items: { tshirt: 1, mug: 2, candle: 1 }, idealBox: "large" },
    { id: 10, items: { tshirt: 2, mug: 1, candle: 1 }, idealBox: "large" },
  ];

  // ===========================================================================
  // gameState
  // ===========================================================================
  const gameState = {
    orderIndex: 0,
    currentOrder: null,
    selectedBoxId: "medium",
    boxCost: BOX_TYPES.medium.cost,
    shippingMultiplier: BOX_TYPES.medium.shippingMultiplier,
    money: 0,
    xp: 0,
    soundEnabled: true,
    products: [],
    nextInstanceId: 1,
    drag: null,
    packing: false,
    timers: {
      reject: 0,
      snap: 0,
      confetti: 0,
      scoreRaf: 0,
    },
  };

  // ===========================================================================
  // DOM REFERENCES
  // ===========================================================================
  const dom = {};

  function cacheDom() {
    dom.app = $("app");
    dom.moneyValue = $("money-value");
    dom.xpValue = $("xp-value");
    dom.soundToggle = $("sound-toggle");
    dom.soundIcon = $("sound-icon");
    dom.orderTitle = $("order-title");
    dom.orderCount = $("order-count");
    dom.orderItems = $("order-items");
    dom.boxPicker = $("box-picker");
    dom.boxSizeTag = $("box-size-tag");
    dom.box = $("box");
    dom.packArea = $("pack-area");
    dom.shelf = $("shelf");
    dom.shelfHint = $("shelf-hint");
    dom.packBtn = $("pack-btn");
    dom.dragLayer = $("drag-layer");
    dom.confetti = $("confetti");
    dom.resultOverlay = $("result-overlay");
    dom.resultSheet = document.querySelector(".result-sheet");
    dom.resultKicker = $("result-kicker");
    dom.resultTitle = $("result-title");
    dom.resultScore = $("result-score");
    dom.scoreRing = $("score-ring");
    dom.resultMoney = $("result-money");
    dom.resultXp = $("result-xp");
    dom.resultBonus = $("result-bonus");
    dom.resultSpace = $("result-space");
    dom.nextBtn = $("next-btn");
  }

  function $(id) {
    return document.getElementById(id);
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function getSelectedBox() {
    return BOX_TYPES[gameState.selectedBoxId] || BOX_TYPES.medium;
  }

  /** Collision / layout still read .width / .height from the selected box. */
  function getBoxSize() {
    return getSelectedBox();
  }

  function getIdealBox() {
    const id = gameState.currentOrder && gameState.currentOrder.idealBox;
    return BOX_TYPES[id] || BOX_TYPES.medium;
  }

  function formatBoxPrice(cost) {
    return "$" + cost.toFixed(2);
  }

  function getType(typeId) {
    return PRODUCT_TYPES[typeId];
  }

  function itemCount(items) {
    return Object.values(items).reduce((sum, n) => sum + n, 0);
  }

  function snapValue(n) {
    return Math.round(n / CONFIG.SNAP_GRID) * CONFIG.SNAP_GRID;
  }

  function clearTimers() {
    window.clearTimeout(gameState.timers.reject);
    window.clearTimeout(gameState.timers.snap);
    window.clearTimeout(gameState.timers.confetti);
    window.cancelAnimationFrame(gameState.timers.scoreRaf);
    gameState.timers.reject = 0;
    gameState.timers.snap = 0;
    gameState.timers.confetti = 0;
    gameState.timers.scoreRaf = 0;
  }

  // ===========================================================================
  // ORDER FUNCTIONS
  // ===========================================================================
  function createOrder() {
    const template = ORDERS[gameState.orderIndex % ORDERS.length];
    const idealBox = template.idealBox || "medium";
    gameState.currentOrder = {
      id: template.id,
      number: gameState.orderIndex + 1,
      items: Object.assign({}, template.items),
      idealBox: idealBox,
    };
    applySelectedBox(idealBox, { dumpItems: false });
  }

  function applyBoxSize() {
    const box = getSelectedBox();
    dom.packArea.style.width = box.width + "px";
    dom.packArea.style.height = box.height + "px";
    document.documentElement.style.setProperty("--pack-w", box.width + "px");
    document.documentElement.style.setProperty("--pack-h", box.height + "px");
    if (dom.boxSizeTag) {
      dom.boxSizeTag.textContent = box.key;
    }
    if (dom.box) {
      dom.box.setAttribute("data-size", box.id);
    }
  }

  function applySelectedBox(boxId, options) {
    const box = BOX_TYPES[boxId] || BOX_TYPES.medium;
    const dumpItems = !options || options.dumpItems !== false;
    const changed = gameState.selectedBoxId !== box.id;

    gameState.selectedBoxId = box.id;
    gameState.boxCost = box.cost;
    gameState.shippingMultiplier = box.shippingMultiplier;

    if (dumpItems && changed) {
      returnPackedItemsToShelf();
    }

    applyBoxSize();
    renderBoxPicker();
  }

  function selectBox(boxId) {
    if (gameState.packing) return;
    if (!BOX_TYPES[boxId]) return;
    if (gameState.selectedBoxId === boxId) return;

    if (gameState.drag) {
      const drag = gameState.drag;
      drag.done = true;
      restoreLastPosition(drag.product, drag);
      finishDrag();
    }

    applySelectedBox(boxId, { dumpItems: true });
    playSound("place");
    updatePackButton();
  }

  function returnPackedItemsToShelf() {
    gameState.products.forEach(function (product) {
      if (product.inBox) {
        returnToShelf(product);
      }
    });
  }

  function renderOrder() {
    const order = gameState.currentOrder;
    const n = String(order.number).padStart(3, "0");
    dom.orderTitle.textContent = "ORDER #" + n;

    const total = itemCount(order.items);
    dom.orderCount.textContent = total + (total === 1 ? " item" : " items");

    dom.orderItems.innerHTML = "";
    Object.entries(order.items).forEach(function (entry) {
      const typeId = entry[0];
      const qty = entry[1];
      const placed = gameState.products.filter(function (p) {
        return p.typeId === typeId && p.inBox;
      }).length;
      const type = getType(typeId);
      const li = document.createElement("li");
      li.className = "order-pill" + (placed >= qty ? " is-filled" : "");
      li.innerHTML =
        '<span aria-hidden="true">' +
        type.icon +
        "</span><span>" +
        type.name +
        ' <span class="qty">×' +
        qty +
        "</span></span>";
      dom.orderItems.appendChild(li);
    });

    dom.moneyValue.textContent = String(gameState.money);
    dom.xpValue.textContent = String(gameState.xp);
  }

  function validateOrder() {
    const order = gameState.currentOrder;
    if (!order) return false;

    const placed = gameState.products.filter(function (p) {
      return p.inBox;
    });
    if (placed.length === 0) return false;
    if (placed.length !== gameState.products.length) return false;

    const counts = {};
    placed.forEach(function (p) {
      counts[p.typeId] = (counts[p.typeId] || 0) + 1;
    });

    const needed = order.items;
    const neededKeys = Object.keys(needed);
    for (let i = 0; i < neededKeys.length; i += 1) {
      const typeId = neededKeys[i];
      if ((counts[typeId] || 0) !== needed[typeId]) return false;
    }

    if (Object.keys(counts).some(function (typeId) {
      return !needed[typeId];
    })) {
      return false;
    }

    for (let i = 0; i < placed.length; i += 1) {
      if (!isInsideBox(placed[i])) return false;
      if (isOverlapping(placed[i], placed)) return false;
    }

    return true;
  }

  function completeOrder() {
    if (!validateOrder() || gameState.packing) return;
    gameState.packing = true;
    dom.packBtn.disabled = true;

    const score = calculatePackScore();
    const perfect = score >= CONFIG.PERFECT_MIN;
    const spaceMaster = isSpaceMaster();
    const selected = getSelectedBox();
    const ideal = getIdealBox();
    const sizeDelta = selected.rank - ideal.rank;

    let money = Math.round(8 + score * 0.42);
    let xp = Math.round(4 + score * 0.16);

    if (sizeDelta > 0) {
      money = Math.max(1, Math.round(money * (1 - 0.22 * sizeDelta)));
    }
    money = Math.max(0, Math.round(money / selected.shippingMultiplier));

    if (perfect) {
      money += CONFIG.PERFECT_MONEY_BONUS;
      xp += CONFIG.PERFECT_XP_BONUS;
    }
    if (spaceMaster) {
      money += CONFIG.SPACE_MASTER_MONEY;
      xp += CONFIG.SPACE_MASTER_XP;
    }

    gameState.money += money;
    gameState.xp += xp;

    playSound(perfect || spaceMaster ? "perfect" : "complete");
    if (perfect || spaceMaster) spawnConfetti();

    showResult(score, money, xp, perfect, spaceMaster);
    renderOrder();
  }

  function nextOrder() {
    hideResult();
    gameState.orderIndex += 1;
    createOrder();
    resetOrder();
  }

  function resetOrder() {
    clearTimers();
    clearDragVisuals();
    gameState.drag = null;
    gameState.packing = false;
    dom.confetti.innerHTML = "";
    dom.dragLayer.innerHTML = "";
    dom.box.classList.remove("is-hot", "is-invalid");
    applyBoxSize();
    renderBoxPicker();
    spawnProducts();
    updatePackButton();
  }

  // ===========================================================================
  // PRODUCT FUNCTIONS
  // ===========================================================================
  function spawnProducts() {
    dom.shelf.innerHTML = "";
    dom.packArea.querySelectorAll(".product").forEach(function (node) {
      node.remove();
    });
    gameState.products = [];

    const order = gameState.currentOrder;
    Object.entries(order.items).forEach(function (entry) {
      const typeId = entry[0];
      const qty = entry[1];
      for (let i = 0; i < qty; i += 1) {
        const product = makeProduct(typeId);
        gameState.products.push(product);
        dom.shelf.appendChild(product.el);
      }
    });

    updateShelfHint();
  }

  function makeProduct(typeId) {
    const type = getType(typeId);
    const product = {
      id: gameState.nextInstanceId,
      typeId: typeId,
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
    el.dataset.typeId = type.id;
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
    rotateBtn.addEventListener("pointerdown", function (event) {
      event.stopPropagation();
      event.preventDefault();
    });
    rotateBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      rotateProduct(product);
    });

    el.appendChild(inner);
    el.appendChild(rotateBtn);
    product.el = el;
    applyProductMetrics(product);

    el.addEventListener(
      "pointerdown",
      function (event) {
        startDrag(event, product);
      },
      { passive: false }
    );

    return product;
  }

  /** Axis-aligned size after rotation (90° / 270° swap width & height). */
  function getAABB(product) {
    const type = getType(product.typeId);
    const swapped = product.rotation % 180 === 90;
    return {
      w: swapped ? type.height : type.width,
      h: swapped ? type.width : type.height,
    };
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

  function rotateProduct(product) {
    if (gameState.packing) return;

    const prevRotation = product.rotation;
    const prevX = product.x;
    const prevY = product.y;
    const aabb = getAABB(product);
    product.rotation = (product.rotation + 90) % 360;

    if (product.inBox) {
      const next = getAABB(product);
      const cx = product.x + aabb.w / 2;
      const cy = product.y + aabb.h / 2;
      const nextX = snapValue(cx - next.w / 2);
      const nextY = snapValue(cy - next.h / 2);
      const candidate = {
        id: product.id,
        typeId: product.typeId,
        rotation: product.rotation,
        x: nextX,
        y: nextY,
        inBox: true,
      };

      if (!isInsideBox(candidate) || isOverlapping(candidate)) {
        product.rotation = prevRotation;
        product.x = prevX;
        product.y = prevY;
        applyProductMetrics(product);
        product.el.classList.add("is-invalid");
        playSound("error");
        haptic(12);
        window.setTimeout(function () {
          product.el.classList.remove("is-invalid");
        }, 320);
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
    el.style.margin = "";
    dom.packArea.appendChild(el);
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
    el.style.margin = "";
    dom.shelf.appendChild(el);
    applyProductMetrics(product);
  }

  function restoreLastPosition(product, drag) {
    if (drag && drag.fromBox) {
      placeInBox(product, drag.lastX, drag.lastY);
    } else {
      returnToShelf(product);
    }
  }

  // ===========================================================================
  // DRAG FUNCTIONS
  // Pointer Events cover mouse + touch. Document-level move/up survive
  // reparenting into the drag layer (setPointerCapture can drop on some browsers).
  // ===========================================================================
  function startDrag(event, product) {
    if (gameState.packing) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (gameState.drag) return;
    if (event.target.closest(".rotate-btn")) return;

    event.preventDefault();
    event.stopPropagation();
    resumeAudio();

    const rect = product.el.getBoundingClientRect();
    gameState.drag = {
      product: product,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
      done: false,
      reparenting: false,
      fromBox: product.inBox,
      lastX: product.x,
      lastY: product.y,
      lastRotation: product.rotation,
      placeholder: null,
    };

    try {
      product.el.setPointerCapture(event.pointerId);
    } catch (err) {
      /* capture is optional; document listeners are the fallback */
    }
  }

  function liftToDragLayer(product) {
    const drag = gameState.drag;
    const el = product.el;
    const rect = el.getBoundingClientRect();
    const parent = el.parentElement;

    if (!product.inBox && parent === dom.shelf) {
      const ph = document.createElement("div");
      ph.className = "shelf-placeholder";
      ph.style.width = el.style.width;
      ph.style.height = el.style.height;
      parent.insertBefore(ph, el);
      drag.placeholder = ph;
    }

    drag.reparenting = true;
    dom.dragLayer.appendChild(el);
    el.classList.add("dragging");
    el.style.position = "fixed";
    el.style.left = rect.left + "px";
    el.style.top = rect.top + "px";
    el.style.margin = "0";
    el.style.zIndex = "80";
    drag.reparenting = false;

    try {
      el.setPointerCapture(drag.pointerId);
    } catch (err) {
      /* document pointermove still tracks the finger / mouse */
    }
  }

  function moveProduct(event) {
    const drag = gameState.drag;
    if (!drag || drag.done || event.pointerId !== drag.pointerId) return;
    event.preventDefault();

    const dist = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.moved && dist < CONFIG.TAP_MOVE_PX) return;

    if (!drag.moved) {
      drag.moved = true;
      liftToDragLayer(drag.product);
    }

    const el = drag.product.el;
    el.style.left = event.clientX - drag.offsetX + "px";
    el.style.top = event.clientY - drag.offsetY + "px";

    const local = clientRectToBoxLocal(el);
    const candidate = {
      id: drag.product.id,
      typeId: drag.product.typeId,
      rotation: drag.product.rotation,
      x: local.x,
      y: local.y,
      inBox: true,
    };

    const inside = isInsideBox(candidate);
    const overlap = isOverlapping(candidate);
    const overBox = inside || isPointInElement(event.clientX, event.clientY, dom.packArea);
    const invalid = overBox && (!inside || overlap);
    dom.box.classList.toggle("is-hot", inside && !overlap);
    dom.box.classList.toggle("is-invalid", invalid);
    el.classList.toggle("is-invalid", invalid);
  }

  function dropProduct(event) {
    const drag = gameState.drag;
    if (!drag || drag.done || event.pointerId !== drag.pointerId) return;
    if (drag.reparenting) return;
    drag.done = true;
    event.preventDefault();

    const product = drag.product;
    const el = product.el;

    try {
      if (el.hasPointerCapture && el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }
    } catch (err) {
      /* already released */
    }

    if (!drag.moved) {
      clearDragVisuals();
      gameState.drag = null;
      rotateProduct(product);
      return;
    }

    const overShelf = isPointInElement(event.clientX, event.clientY, dom.shelf);
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
      id: product.id,
      typeId: product.typeId,
      rotation: product.rotation,
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
    dom.box.classList.add("is-invalid");
    el.classList.add("is-invalid");

    const drag = gameState.drag;
    gameState.timers.reject = window.setTimeout(function () {
      el.classList.remove("is-invalid");
      dom.box.classList.remove("is-invalid");
      restoreLastPosition(product, drag);
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
    if (dom.box) {
      dom.box.classList.remove("is-hot", "is-invalid");
    }
    gameState.products.forEach(function (p) {
      if (p.el) p.el.classList.remove("dragging", "is-invalid");
    });
  }

  function clientRectToBoxLocal(el) {
    const er = el.getBoundingClientRect();
    const br = dom.packArea.getBoundingClientRect();
    const scaleX = br.width / (getBoxSize().width || br.width);
    const scaleY = br.height / (getBoxSize().height || br.height);
    return {
      x: (er.left - br.left) / (scaleX || 1),
      y: (er.top - br.top) / (scaleY || 1),
    };
  }

  function isPointInElement(x, y, node) {
    const r = node.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function playSnapAnimation(el) {
    el.classList.remove("is-valid-snap");
    void el.offsetWidth;
    el.classList.add("is-valid-snap");
    gameState.timers.snap = window.setTimeout(function () {
      el.classList.remove("is-valid-snap");
    }, 360);
  }

  // ===========================================================================
  // COLLISION FUNCTIONS
  // ===========================================================================
  function isInsideBox(product) {
    const box = getBoxSize();
    const size = getAABB(product);
    return (
      product.x >= 0 &&
      product.y >= 0 &&
      product.x + size.w <= box.width &&
      product.y + size.h <= box.height
    );
  }

  function isOverlapping(product, others) {
    const list =
      others ||
      gameState.products.filter(function (p) {
        return p.inBox;
      });
    const a = {
      x: product.x,
      y: product.y,
      w: getAABB(product).w,
      h: getAABB(product).h,
    };

    return list.some(function (other) {
      if (other.id === product.id) return false;
      return rectsOverlap(a, getRect(other));
    });
  }

  function getRect(product) {
    const size = getAABB(product);
    return { x: product.x, y: product.y, w: size.w, h: size.h };
  }

  function rectsOverlap(a, b) {
    // Edges may touch. Overlap only if interiors intersect.
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function rectGap(a, b) {
    const dx = Math.max(0, Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w)));
    const dy = Math.max(0, Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h)));
    if (dx === 0 && dy === 0) return 0;
    return Math.hypot(dx, dy);
  }

  // ===========================================================================
  // SCORING FUNCTIONS
  // ===========================================================================
  function calculatePackScore() {
    const placed = gameState.products.filter(function (p) {
      return p.inBox;
    });

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let productArea = 0;
    placed.forEach(function (p) {
      const r = getRect(p);
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
      productArea += r.w * r.h;
    });
    const bboxArea = Math.max(1, (maxX - minX) * (maxY - minY));
    const compactness = clamp(productArea / bboxArea, 0, 1);
    const efficiencyScore = 20 * clamp((compactness - 0.35) / 0.6, 0, 1);

    let gapScore = 15;
    if (placed.length >= 2) {
      let total = 0;
      placed.forEach(function (p) {
        const a = getRect(p);
        let nearest = Infinity;
        placed.forEach(function (other) {
          if (other.id === p.id) return;
          nearest = Math.min(nearest, rectGap(a, getRect(other)));
        });
        total += nearest;
      });
      const mean = total / placed.length;
      gapScore = 15 * (1 - clamp(mean / 42, 0, 1));
    }

    const boxScore = calculateBoxEfficiencyScore();
    const correctScore = 40;

    return clamp(Math.round(correctScore + efficiencyScore + gapScore + boxScore), 0, 100);
  }

  function calculateBoxEfficiencyScore() {
    const delta = getSelectedBox().rank - getIdealBox().rank;
    if (delta <= 0) return 25;
    if (delta === 1) return 10;
    return 0;
  }

  function isSpaceMaster() {
    return getSelectedBox().rank < getIdealBox().rank;
  }

  function ratingFor(score) {
    if (score >= CONFIG.PERFECT_MIN) return "PERFECT PACK";
    if (score >= CONFIG.GREAT_MIN) return "GREAT PACK";
    if (score >= CONFIG.GOOD_MIN) return "GOOD PACK";
    return "NEEDS IMPROVEMENT";
  }

  // ===========================================================================
  // UI FUNCTIONS
  // ===========================================================================
  function renderBoxPicker() {
    if (!dom.boxPicker) return;
    const selectedId = gameState.selectedBoxId;
    const buttons = ["small", "medium", "large"];
    if (!dom.boxPicker.childElementCount) {
      buttons.forEach(function (id) {
        const box = BOX_TYPES[id];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "box-choice";
        btn.setAttribute("data-box", id);
        btn.setAttribute("role", "radio");
        btn.innerHTML =
          '<span class="box-choice-size">' +
          box.label +
          '</span><span class="box-choice-price">' +
          formatBoxPrice(box.cost) +
          "</span>";
        dom.boxPicker.appendChild(btn);
      });
    }
    Array.prototype.forEach.call(dom.boxPicker.querySelectorAll(".box-choice"), function (btn) {
      const on = btn.getAttribute("data-box") === selectedId;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function updateShelfHint() {
    const remaining = gameState.products.filter(function (p) {
      return !p.inBox;
    }).length;
    if (remaining === 0) {
      dom.shelfHint.textContent = "Nudge items tight · Tap to rotate";
      if (!dom.shelf.querySelector(".product") && !dom.shelf.querySelector(".shelf-empty")) {
        const empty = document.createElement("p");
        empty.className = "shelf-empty";
        empty.textContent = "All items are in the box";
        dom.shelf.appendChild(empty);
      }
    } else {
      dom.shelfHint.textContent = "Drag into the box · Tap to rotate";
      const empty = dom.shelf.querySelector(".shelf-empty");
      if (empty) empty.remove();
    }
  }

  function updatePackButton() {
    dom.packBtn.disabled = gameState.packing || !validateOrder();
    if (dom.boxPicker) {
      dom.boxPicker.classList.toggle("is-locked", gameState.packing);
    }
    renderOrder();
    updateShelfHint();
  }

  function showResult(score, money, xp, perfect, spaceMaster) {
    if (spaceMaster) {
      dom.resultTitle.textContent = ratingFor(score);
      dom.resultKicker.textContent = "SPACE MASTER · smaller than ideal";
    } else {
      dom.resultTitle.textContent = ratingFor(score);
      dom.resultKicker.textContent = perfect ? "Every millimetre earned it" : "Order packed";
    }
    dom.resultSheet.classList.toggle("perfect", perfect || spaceMaster);
    dom.resultMoney.textContent = "+$" + money;
    dom.resultXp.textContent = "+" + xp;
    dom.resultBonus.hidden = !perfect;
    dom.resultBonus.classList.toggle("hidden", !perfect);
    if (dom.resultSpace) {
      dom.resultSpace.hidden = !spaceMaster;
      dom.resultSpace.classList.toggle("hidden", !spaceMaster);
    }
    dom.resultScore.textContent = "0";
    dom.scoreRing.style.setProperty("--p", "0%");

    dom.resultOverlay.hidden = false;
    dom.resultOverlay.classList.remove("hidden");

    countUp(score);
  }

  function hideResult() {
    window.cancelAnimationFrame(gameState.timers.scoreRaf);
    gameState.timers.scoreRaf = 0;
    dom.resultOverlay.hidden = true;
    dom.resultOverlay.classList.add("hidden");
    dom.resultSheet.classList.remove("perfect");
  }

  function countUp(target) {
    const start = performance.now();
    const duration = 700;

    function frame(now) {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(target * eased);
      if (!dom.resultOverlay.hidden) {
        dom.resultScore.textContent = String(value);
        dom.scoreRing.style.setProperty("--p", value + "%");
      }
      if (t < 1) {
        gameState.timers.scoreRaf = window.requestAnimationFrame(frame);
      }
    }

    gameState.timers.scoreRaf = window.requestAnimationFrame(frame);
  }

  function spawnConfetti() {
    dom.confetti.innerHTML = "";
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
      dom.confetti.appendChild(piece);
    }
    gameState.timers.confetti = window.setTimeout(function () {
      dom.confetti.innerHTML = "";
    }, 2400);
  }

  function renderSoundButton() {
    const on = gameState.soundEnabled;
    dom.soundIcon.textContent = on ? "🔊" : "🔇";
    dom.soundToggle.setAttribute("aria-label", on ? "Mute sound" : "Unmute sound");
    dom.soundToggle.setAttribute("aria-pressed", on ? "false" : "true");
  }

  function bindUi() {
    dom.soundToggle.addEventListener("click", toggleSound);
    dom.packBtn.addEventListener("click", completeOrder);
    dom.nextBtn.addEventListener("click", nextOrder);
    dom.boxPicker.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-box]");
      if (btn) selectBox(btn.getAttribute("data-box"));
    });

    document.addEventListener("pointermove", moveProduct, { passive: false });
    document.addEventListener("pointerup", dropProduct);
    document.addEventListener("pointercancel", dropProduct);

    document.addEventListener(
      "touchmove",
      function (event) {
        event.preventDefault();
      },
      { passive: false }
    );

    document.addEventListener("contextmenu", function (event) {
      if (event.target.closest(".product") || event.target.closest("#app")) {
        event.preventDefault();
      }
    });

    document.addEventListener("lostpointercapture", function (event) {
      const drag = gameState.drag;
      if (!drag || drag.done || drag.reparenting) return;
      if (event.pointerId !== drag.pointerId) return;
      try {
        drag.product.el.setPointerCapture(drag.pointerId);
      } catch (err) {
        /* document listeners keep tracking */
      }
    });
  }

  function init() {
    cacheDom();
    bindUi();

    try {
      const saved = window.localStorage.getItem(CONFIG.SOUND_STORAGE_KEY);
      if (saved === "0") gameState.soundEnabled = false;
    } catch (err) {
      /* ignore quota / private mode */
    }
    renderSoundButton();
    renderBoxPicker();

    createOrder();
    spawnProducts();
    renderOrder();
    updatePackButton();
  }

  // ===========================================================================
  // AUDIO FUNCTIONS
  // ===========================================================================
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }

  function resumeAudio() {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function tone(freq, duration, type, gainValue, delay) {
    const ctx = getAudioContext();
    if (!ctx || !gameState.soundEnabled) return;
    resumeAudio();

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
      window.localStorage.setItem(CONFIG.SOUND_STORAGE_KEY, gameState.soundEnabled ? "1" : "0");
    } catch (err) {
      /* ignore */
    }
    renderSoundButton();
    if (gameState.soundEnabled) playSound("place");
  }

  init();
})();
