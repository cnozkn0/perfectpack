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
    TAP_MOVE_PX: 16,
    PERFECT_MIN: 98,
    AMAZING_MIN: 90,
    GREAT_MIN: 80,
    GOOD_MIN: 70,
    OKAY_MIN: 60,
    STARTING_CASH: 100,
    XP_ORDER: 50,
    XP_HIGH_SCORE: 20,
    XP_PERFECT: 50,
    XP_LEVEL_BASE: 100,
    XP_LEVEL_GROWTH: 1.32,
    TIP_HIGH_SCORE: 0.05,
    TIP_PERFECT: 0.1,
    REFUND_HARD: 0.5,
    REFUND_SOFT: 0.25,
    REFUND_HARD_BELOW: 40,
    REFUND_SOFT_BELOW: 55,
    SHIPPING_BASE: 4,
    SHIPPING_PER_WEIGHT: 0.6,
    SCORE_WEIGHTS: {
      accuracy: 0.25,
      fit: 0.2,
      protection: 0.2,
      cost: 0.15,
      aesthetic: 0.2,
    },
    SPACE_MASTER_FIT: 90,
    SOUND_STORAGE_KEY: "perfect-pack-sound",
    COMPRESS_FACTOR: 0.72,
    SOFT_PROTECT_GAP: 8,
    SOFT_PROTECT_BONUS: 1,
    HEAVY_WEIGHT: 0.75,
    STACK_GAP_PX: 10,
    COMPRESS_AESTHETIC_PENALTY: 2,
    STACK_AESTHETIC_PENALTY: 2,
    MAX_WRAPS: 3,
    REVIEW_DELAY: 2000,
    VIP_RATING: 4.8,
    VIP_MIN_REVIEWS: 5,
    STAR_FIVE: 95,
    STAR_FOUR: 85,
    STAR_THREE: 70,
    STAR_TWO: 50,
  };

  // ===========================================================================
  // PRODUCT_TYPES
  // Booleans default false. Instance state (protection, compress) lives on
  // each spawned product, not on the type.
  // ===========================================================================
  const PRODUCT_TYPES = {
    candle: productType({
      id: "candle",
      name: "Candle",
      width: 48,
      height: 90,
      icon: "🕯️",
      fragile: true,
      uprightOnly: true,
      requiredProtection: 4,
      weight: 0.4,
      salePrice: 14,
      productCost: 5,
    }),
    mug: productType({
      id: "mug",
      name: "Mug",
      width: 75,
      height: 75,
      icon: "☕",
      fragile: true,
      requiredProtection: 8,
      weight: 0.95,
      salePrice: 18,
      productCost: 7,
    }),
    tshirt: productType({
      id: "tshirt",
      name: "T-Shirt",
      width: 110,
      height: 70,
      icon: "👕",
      soft: true,
      compressible: true,
      weight: 0.25,
      salePrice: 22,
      productCost: 8,
    }),
    perfume: productType({
      id: "perfume",
      name: "Perfume",
      width: 36,
      height: 78,
      icon: "🧴",
      fragile: true,
      liquid: true,
      uprightOnly: true,
      requiredProtection: 7,
      weight: 0.35,
      salePrice: 36,
      productCost: 14,
    }),
    notebook: productType({
      id: "notebook",
      name: "Notebook",
      width: 80,
      height: 100,
      icon: "📓",
      bendable: false,
      weight: 0.5,
      salePrice: 16,
      productCost: 6,
    }),
    socks: productType({
      id: "socks",
      name: "Socks",
      width: 70,
      height: 50,
      icon: "🧦",
      soft: true,
      compressible: true,
      weight: 0.15,
      salePrice: 10,
      productCost: 3,
    }),
    jewelry_box: productType({
      id: "jewelry_box",
      name: "Jewelry",
      width: 44,
      height: 36,
      icon: "💎",
      fragile: false,
      weight: 0.2,
      salePrice: 48,
      productCost: 18,
    }),
    poster: productType({
      id: "poster",
      name: "Poster",
      width: 168,
      height: 28,
      icon: "📜",
      bendable: false,
      weight: 0.12,
      salePrice: 14,
      productCost: 4,
    }),
  };

  function productType(spec) {
    return Object.assign(
      {
        fragile: false,
        soft: false,
        liquid: false,
        compressible: false,
        uprightOnly: false,
        bendable: true,
        requiredProtection: 0,
        weight: 0.3,
        salePrice: 12,
        productCost: 4,
      },
      spec
    );
  }

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
  // PROTECTION_MATERIALS
  // Each wrap adds protection AND extra occupied size (pad on every side).
  // ===========================================================================
  const PROTECTION_MATERIALS = {
    tissue: {
      id: "tissue",
      label: "TISSUE PAPER",
      short: "Tissue",
      cost: 0.08,
      protection: 1,
      aesthetic: 5,
      pad: 4,
    },
    bubble: {
      id: "bubble",
      label: "BUBBLE WRAP",
      short: "Bubble",
      cost: 0.18,
      protection: 8,
      aesthetic: 0,
      pad: 10,
      plastic: true,
    },
    paper_fill: {
      id: "paper_fill",
      label: "PAPER FILL",
      short: "Paper",
      cost: 0.12,
      protection: 5,
      eco: true,
      aesthetic: 2,
      pad: 7,
    },
    foam: {
      id: "foam",
      label: "FOAM PAD",
      short: "Foam",
      cost: 0.25,
      protection: 10,
      aesthetic: 1,
      pad: 12,
      plastic: true,
    },
  };

  // ===========================================================================
  // REQUEST_TYPES
  // Optional special request on an order. Honored or failed at score time
  // from the final wrap / finish snapshot (unwrap can still pass ECO).
  // ===========================================================================
  const REQUEST_TYPES = {
    GIFT: {
      id: "GIFT",
      name: "Gift Wrap",
      icon: "🎁",
      quote: "It's a surprise — add a gift note and make it feel special.",
      needsCard: true,
      cardKind: "gift",
      aestheticImportant: true,
    },
    ECO: {
      id: "ECO",
      name: "Eco Pack",
      icon: "🌱",
      quote: "No plastic packaging, please. Paper fill is perfect.",
      banPlastic: true,
      paperBonus: true,
    },
    DISCREET: {
      id: "DISCREET",
      name: "Discreet",
      icon: "🤫",
      quote: "No branding. Skip the shop sticker.",
      banSticker: true,
    },
    FRAGILE_PLUS: {
      id: "FRAGILE_PLUS",
      name: "Extra Fragile",
      icon: "📦",
      quote: "These break easily. Extra padding, please.",
      protectionBoost: 1.5,
    },
    EXPRESS: {
      id: "EXPRESS",
      name: "Express",
      icon: "⚡",
      quote: "Need this packed in a hurry!",
      timerSeconds: 45,
    },
    NO_INVOICE: {
      id: "NO_INVOICE",
      name: "No Invoice",
      icon: "🙈",
      quote: "Please don't include a card or invoice.",
      banCard: true,
    },
    BIRTHDAY: {
      id: "BIRTHDAY",
      name: "Birthday Gift",
      icon: "🎁",
      quote: "Please make it cute!",
      needsCard: true,
      cardKind: "birthday",
      aestheticImportant: true,
    },
    PREMIUM: {
      id: "PREMIUM",
      name: "Premium",
      icon: "✨",
      quote: "Presentation matters. Make it look expensive.",
      needsCard: true,
      cardKind: "premium",
      aestheticFloor: 90,
      aestheticImportant: true,
    },
  };

  // ===========================================================================
  // ORDERS
  // items: product type id → required count. idealBox: small | medium | large
  // request: optional REQUEST_TYPES id. quote / timerSeconds override the type.
  // ===========================================================================
  const ORDERS = [
    {
      id: 1,
      items: { candle: 1, mug: 1 },
      idealBox: "small",
      request: "BIRTHDAY",
      quote: "Please make it cute!",
    },
    {
      id: 2,
      items: { tshirt: 1, socks: 1 },
      idealBox: "small",
      request: "ECO",
      quote: "No plastic — paper fill is a gift to the planet.",
    },
    {
      id: 3,
      items: { perfume: 1, jewelry_box: 1 },
      idealBox: "small",
      request: "DISCREET",
      quote: "Keep the box anonymous. No shop sticker.",
    },
    {
      id: 4,
      items: { perfume: 1, mug: 1 },
      idealBox: "medium",
      request: "FRAGILE_PLUS",
      quote: "These shatter. Extra padding, please.",
    },
    {
      id: 5,
      items: { notebook: 1, candle: 1 },
      idealBox: "small",
      request: "EXPRESS",
      timerSeconds: 40,
    },
    {
      id: 6,
      items: { jewelry_box: 1 },
      idealBox: "small",
      request: "NO_INVOICE",
      quote: "Skip the card — no paper trail.",
    },
    {
      id: 7,
      items: { perfume: 1, candle: 1 },
      idealBox: "small",
      request: "GIFT",
      quote: "It's a surprise. Add a gift note.",
    },
    {
      id: 8,
      items: { jewelry_box: 1, perfume: 1 },
      idealBox: "small",
      request: "PREMIUM",
      quote: "Make it look expensive.",
    },
    { id: 9, items: { mug: 2 }, idealBox: "small" },
    { id: 10, items: { poster: 1, notebook: 1 }, idealBox: "medium", request: "ECO" },
    {
      id: 11,
      items: { socks: 1, tshirt: 1, candle: 1 },
      idealBox: "medium",
      request: "BIRTHDAY",
      quote: "Birthday socks — make the box feel festive.",
    },
    { id: 12, items: { mug: 1, candle: 1 }, idealBox: "small", request: "DISCREET" },
    { id: 13, items: { candle: 2 }, idealBox: "small", request: "FRAGILE_PLUS" },
    {
      id: 14,
      items: { tshirt: 1, mug: 1, candle: 1 },
      idealBox: "medium",
      request: "EXPRESS",
      timerSeconds: 50,
    },
    { id: 15, items: { notebook: 1, socks: 1 }, idealBox: "small", request: "NO_INVOICE" },
    { id: 16, items: { jewelry_box: 1, socks: 1 }, idealBox: "small", request: "GIFT" },
    {
      id: 17,
      items: { candle: 1, perfume: 1, tshirt: 1 },
      idealBox: "medium",
      request: "PREMIUM",
    },
    {
      id: 18,
      items: { mug: 1 },
      idealBox: "small",
      request: "ECO",
      quote: "Wrap the mug without a scrap of plastic.",
    },
    { id: 19, items: { poster: 1, socks: 1 }, idealBox: "small" },
    {
      id: 20,
      items: { perfume: 1 },
      idealBox: "small",
      request: "BIRTHDAY",
      quote: "Perfume for her birthday — keep it adorable.",
    },
    { id: 21, items: { poster: 1, tshirt: 1 }, idealBox: "medium", request: "DISCREET" },
    {
      id: 22,
      items: { perfume: 1, jewelry_box: 1, socks: 1 },
      idealBox: "small",
      request: "FRAGILE_PLUS",
    },
    {
      id: 23,
      items: { perfume: 1, mug: 1 },
      idealBox: "medium",
      request: "EXPRESS",
      timerSeconds: 35,
    },
    { id: 24, items: { mug: 1, notebook: 1 }, idealBox: "small", request: "GIFT" },
    { id: 25, items: { jewelry_box: 1, notebook: 1 }, idealBox: "small", request: "PREMIUM" },
    { id: 26, items: { tshirt: 1, candle: 1 }, idealBox: "small", request: "ECO" },
    { id: 27, items: { perfume: 1 }, idealBox: "small", request: "NO_INVOICE" },
    { id: 28, items: { tshirt: 1, socks: 1, mug: 1, candle: 1 }, idealBox: "large" },
  ];

  // ===========================================================================
  // CUSTOMER REVIEWS
  // Star bands from pack score; serious violations clamp to 1★.
  // VIP customers unlock at shop rating 4.8+ after VIP_MIN_REVIEWS.
  // ===========================================================================
  const REVIEW_AUTHORS = [
    "Maya K.",
    "Owen P.",
    "Aya S.",
    "Leo M.",
    "Nora J.",
    "Chris T.",
    "Priya R.",
    "Sam H.",
    "Elena V.",
    "Jonah L.",
  ];

  const REVIEW_TEMPLATES = {
    five: [
      "The packaging was absolutely perfect!",
      "Everything arrived beautifully packed.",
      "Obsessed with this packaging!",
      "This is how every order should arrive.",
      "Careful, cute, and completely intact.",
    ],
    four: [
      "Really solid packing. Tiny room to grow.",
      "Arrived looking lovely. Almost perfect.",
      "Great job — I'd order again.",
      "Neat box, happy customer.",
    ],
    three: [
      "It got here. Packing was fine, nothing special.",
      "Decent, but I've seen tidier boxes.",
      "Okay overall. A bit rushed maybe?",
      "Fine. Not the prettiest packing.",
    ],
    two: [
      "The box felt messy. Not impressed.",
      "Items were loose. Please be more careful.",
      "Cute shop, sloppy packing.",
      "I expected more care than this.",
    ],
    one: [
      "Would not order again.",
      "This packing was a mess.",
      "I'm requesting a refund.",
      "Really disappointed with this box.",
    ],
    protection: [
      "My {item} arrived damaged.",
      "Packaging looked cute but wasn't safe.",
      "The {item} was chipped. More padding next time.",
      "Fragile sticker energy, zero actual protection.",
    ],
    request: {
      ECO: [
        "I asked for eco packaging.",
        "There was plastic in a no-plastic order.",
        "Please skip the bubble wrap on eco orders.",
      ],
      BIRTHDAY: [
        "The birthday note was missing.",
        "Where was the birthday card?",
        "I asked you to make it cute — no note inside.",
      ],
      GIFT: [
        "I asked for a gift note.",
        "This didn't feel like a present.",
        "No gift card in the box.",
      ],
      DISCREET: [
        "I asked for no branding.",
        "The shop sticker was still on the box.",
        "Please keep discreet orders anonymous.",
      ],
      NO_INVOICE: [
        "Please don't include an invoice.",
        "There was a card in the box.",
        "I asked for no invoice.",
      ],
      FRAGILE_PLUS: [
        "I flagged this as extra fragile.",
        "Not enough padding for a fragile order.",
        "Extra-fragile meant extra wrap. It didn't.",
      ],
      EXPRESS: [
        "I paid for express and it felt late.",
        "The rush order didn't feel rushed on your end.",
        "Express packing took too long.",
      ],
      PREMIUM: [
        "I expected premium presentation.",
        "This didn't look expensive.",
        "Premium order, ordinary packing.",
      ],
    },
  };

  // ===========================================================================
  // gameState
  // ===========================================================================
  const gameState = {
    orderIndex: 0,
    currentOrder: null,
    selectedBoxId: "medium",
    boxCost: BOX_TYPES.medium.cost,
    shippingMultiplier: BOX_TYPES.medium.shippingMultiplier,
    cash: CONFIG.STARTING_CASH,
    xp: 0,
    level: 1,
    totalOrders: 0,
    perfectPacks: 0,
    shopRating: 5,
    ratingSum: 0,
    ratingCount: 0,
    reviews: [],
    vipUnlocked: false,
    vipUnlockPending: false,
    soundEnabled: true,
    products: [],
    nextInstanceId: 1,
    drag: null,
    packing: false,
    packingReport: null,
    selectedProductId: null,
    protectionCost: 0,
    pendingResult: null,
    finish: null,
    expressDeadline: 0,
    expressFailed: false,
    timers: {
      reject: 0,
      snap: 0,
      confetti: 0,
      scoreRaf: 0,
      express: 0,
      toast: 0,
      review: 0,
    },
  };

  // ===========================================================================
  // DOM REFERENCES
  // ===========================================================================
  const dom = {};

  function cacheDom() {
    dom.app = $("app");
    dom.cashValue = $("cash-value");
    dom.levelValue = $("level-value");
    dom.xpValue = $("xp-value");
    dom.shopRating = $("shop-rating");
    dom.shopOrders = $("shop-orders");
    dom.shopPerfects = $("shop-perfects");
    dom.shopStats = $("shop-stats");
    dom.shopVip = $("shop-vip");
    dom.soundToggle = $("sound-toggle");
    dom.soundIcon = $("sound-icon");
    dom.orderTitle = $("order-title");
    dom.orderCount = $("order-count");
    dom.orderItems = $("order-items");
    dom.orderRequest = $("order-request");
    dom.requestTitle = $("request-title");
    dom.requestQuote = $("request-quote");
    dom.requestTimer = $("request-timer");
    dom.requestToast = $("request-toast");
    dom.boxPicker = $("box-picker");
    dom.boxSizeTag = $("box-size-tag");
    dom.box = $("box");
    dom.packArea = $("pack-area");
    dom.shelf = $("shelf");
    dom.shelfHint = $("shelf-hint");
    dom.dock = document.querySelector(".dock");
    dom.wrapTray = $("wrap-tray");
    dom.wrapTrayLabel = $("wrap-tray-label");
    dom.wrapTrayStat = $("wrap-tray-stat");
    dom.wrapTargets = $("wrap-targets");
    dom.wrapOptions = $("wrap-options");
    dom.unwrapBtn = $("unwrap-btn");
    dom.packBtn = $("pack-btn");
    dom.finishOverlay = $("finish-overlay");
    dom.finishKicker = $("finish-kicker");
    dom.finishRail = $("finish-rail");
    dom.finishStep = $("finish-step");
    dom.finishTitle = $("finish-title");
    dom.finishHint = $("finish-hint");
    dom.finishSkip = $("finish-skip");
    dom.finishBox = $("finish-box");
    dom.finishBoxTag = $("finish-box-tag");
    dom.finishSwipeCue = $("finish-swipe-cue");
    dom.finishTissue = $("finish-tissue");
    dom.finishCard = $("finish-card");
    dom.finishCardText = $("finish-card-text");
    dom.finishCardSlot = $("finish-card-slot");
    dom.finishFlapL = $("finish-flap-l");
    dom.finishFlapR = $("finish-flap-r");
    dom.finishSticker = $("finish-sticker");
    dom.finishStickerSpot = $("finish-sticker-spot");
    dom.finishTape = $("finish-tape");
    dom.finishLabel = $("finish-label");
    dom.finishLabelSpot = $("finish-label-spot");
    dom.finishBarcode = $("finish-barcode");
    dom.finishScanner = $("finish-scanner");
    dom.finishShipped = $("finish-shipped");
    dom.finishProps = $("finish-props");
    dom.dragLayer = $("drag-layer");
    dom.confetti = $("confetti");
    dom.resultOverlay = $("result-overlay");
    dom.resultSheet = document.querySelector(".result-sheet");
    dom.resultKicker = $("result-kicker");
    dom.resultRequest = $("result-request");
    dom.resultTitle = $("result-title");
    dom.resultScore = $("result-score");
    dom.scoreRing = $("score-ring");
    dom.scoreCats = $("score-cats");
    dom.resultBadges = $("result-badges");
    dom.resultLedger = $("result-ledger");
    dom.resultXp = $("result-xp");
    dom.resultLevelUp = $("result-level-up");
    dom.nextBtn = $("next-btn");
    dom.reviewToast = $("review-toast");
    dom.reviewAuthor = $("review-author");
    dom.reviewStars = $("review-stars");
    dom.reviewQuote = $("review-quote");
    dom.reviewVipNote = $("review-vip-note");
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

  function cents(n) {
    return Math.round(n * 100) / 100;
  }

  function formatMoney(n) {
    const value = cents(n);
    const abs = Math.abs(value).toFixed(2);
    if (value < 0) return "-$" + abs;
    return "$" + abs;
  }

  function formatMoneyDelta(n) {
    const value = cents(n);
    if (value > 0) return "+$" + value.toFixed(2);
    if (value < 0) return "-$" + Math.abs(value).toFixed(2);
    return "$0.00";
  }

  function getType(typeId) {
    return PRODUCT_TYPES[typeId];
  }

  function getOrderRequest() {
    const order = gameState.currentOrder;
    if (!order || !order.request) return null;
    const spec = REQUEST_TYPES[order.request];
    if (!spec) return null;
    const copy = Object.assign({}, spec);
    if (order.quote) copy.quote = order.quote;
    if (order.timerSeconds) copy.timerSeconds = order.timerSeconds;
    return copy;
  }

  function getRequiredProtection(type) {
    if (!type) return 0;
    let required = type.requiredProtection || 0;
    const request = getOrderRequest();
    if (request && request.protectionBoost) {
      if (required <= 0) required = 4;
      required = Math.ceil(required * request.protectionBoost);
    }
    return required;
  }

  function orderUsesPlastic() {
    return gameState.products.some(function (p) {
      if (!p.inBox) return false;
      return (p.wraps || []).some(function (id) {
        const mat = PROTECTION_MATERIALS[id];
        return mat && mat.plastic;
      });
    });
  }

  function orderUsesPaperFill() {
    return gameState.products.some(function (p) {
      return p.inBox && (p.wraps || []).indexOf("paper_fill") !== -1;
    });
  }

  function failLabelFor(req) {
    return req.id.replace(/_/g, " ") + " REQUEST FAILED";
  }

  function honorLabelFor(req) {
    return req.id.replace(/_/g, " ") + " HONORED";
  }

  function pickFrom(list, seed) {
    if (!list || !list.length) return "";
    const i = Math.abs(seed | 0) % list.length;
    return list[i];
  }

  function damagedItemName() {
    const placed = gameState.products.filter(function (p) {
      return p.inBox;
    });
    const fragile = placed.filter(function (p) {
      return getType(p.typeId).fragile;
    });
    const pick = fragile[0] || placed[0];
    return pick ? getType(pick.typeId).name.toLowerCase() : "item";
  }

  function fillReviewText(text) {
    return String(text || "").replace(/\{item\}/g, damagedItemName());
  }

  function starsFromScore(total) {
    if (total >= CONFIG.STAR_FIVE) return 5;
    if (total >= CONFIG.STAR_FOUR) return 4;
    if (total >= CONFIG.STAR_THREE) return 3;
    if (total >= CONFIG.STAR_TWO) return 2;
    return 1;
  }

  function isSeriousViolation(breakdown) {
    const requestFailed = !!(breakdown.request && breakdown.request.id && !breakdown.request.honored);
    const damaged = (breakdown.categories && breakdown.categories.protection) < CONFIG.REFUND_HARD_BELOW;
    return requestFailed || damaged;
  }

  function starGlyphs(n) {
    const filled = "★★★★★".slice(0, n);
    const empty = "☆☆☆☆☆".slice(0, 5 - n);
    return filled + empty;
  }

  function rewardMultiplier() {
    if (gameState.ratingCount < 1) return 1;
    const r = gameState.shopRating;
    if (r < 4) return 1;
    return Math.round((1 + (r - 4) * 0.03) * 1000) / 1000;
  }

  function shouldOfferVipOrder() {
    return (
      gameState.vipUnlocked &&
      gameState.shopRating >= CONFIG.VIP_RATING &&
      gameState.ratingCount >= CONFIG.VIP_MIN_REVIEWS
    );
  }

  function syncVipUnlock() {
    if (gameState.vipUnlocked) return false;
    if (gameState.ratingCount < CONFIG.VIP_MIN_REVIEWS) return false;
    if (gameState.shopRating < CONFIG.VIP_RATING) return false;
    gameState.vipUnlocked = true;
    gameState.vipUnlockPending = true;
    return true;
  }

  function buildCustomerReview(breakdown) {
    const total = breakdown.total || 0;
    let stars = starsFromScore(total);
    const serious = isSeriousViolation(breakdown);
    if (serious) stars = 1;

    const seed =
      ((gameState.currentOrder && gameState.currentOrder.number) || 1) * 17 +
      total * 3 +
      stars * 11;
    let pool = REVIEW_TEMPLATES.five;
    let reason = "score";
    const req = breakdown.request;
    if (req && req.id && !req.honored) {
      pool = REVIEW_TEMPLATES.request[req.id] || REVIEW_TEMPLATES.one;
      reason = "request";
    } else if ((breakdown.categories && breakdown.categories.protection) < CONFIG.REFUND_SOFT_BELOW) {
      pool = REVIEW_TEMPLATES.protection;
      reason = "protection";
    } else if (stars === 5) pool = REVIEW_TEMPLATES.five;
    else if (stars === 4) pool = REVIEW_TEMPLATES.four;
    else if (stars === 3) pool = REVIEW_TEMPLATES.three;
    else if (stars === 2) pool = REVIEW_TEMPLATES.two;
    else pool = REVIEW_TEMPLATES.one;

    return {
      stars: stars,
      text: fillReviewText(pickFrom(pool, seed)),
      author: pickFrom(REVIEW_AUTHORS, seed + 5),
      reason: reason,
      serious: serious,
    };
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
    window.clearTimeout(gameState.timers.toast);
    window.clearTimeout(gameState.timers.review);
    window.clearInterval(gameState.timers.express);
    window.cancelAnimationFrame(gameState.timers.scoreRaf);
    gameState.timers.reject = 0;
    gameState.timers.snap = 0;
    gameState.timers.confetti = 0;
    gameState.timers.toast = 0;
    gameState.timers.review = 0;
    gameState.timers.express = 0;
    gameState.timers.scoreRaf = 0;
  }

  function hideRequestToast() {
    if (!dom.requestToast) return;
    dom.requestToast.classList.remove("is-on");
    dom.requestToast.hidden = true;
  }

  function showRequestToast(message) {
    if (!dom.requestToast) return;
    window.clearTimeout(gameState.timers.toast);
    dom.requestToast.hidden = false;
    dom.requestToast.textContent = message;
    window.requestAnimationFrame(function () {
      dom.requestToast.classList.add("is-on");
    });
    gameState.timers.toast = window.setTimeout(function () {
      hideRequestToast();
      gameState.timers.toast = 0;
    }, 2200);
  }

  function formatCountdown(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ":" + String(r).padStart(2, "0");
  }

  function stopExpressTimer() {
    window.clearInterval(gameState.timers.express);
    gameState.timers.express = 0;
  }

  function tickExpressTimer() {
    const el = dom.requestTimer;
    const deadline = gameState.expressDeadline;
    if (!deadline) {
      if (el) el.hidden = true;
      return;
    }
    const remaining = deadline - Date.now();
    if (el) {
      el.hidden = false;
      if (remaining <= 0) {
        el.textContent = "TIME'S UP";
        el.classList.add("is-late");
      } else {
        el.textContent = formatCountdown(remaining);
        el.classList.toggle("is-late", remaining <= 8000);
      }
    }
    if (remaining <= 0) {
      gameState.expressFailed = true;
      stopExpressTimer();
    }
  }

  function startExpressTimer() {
    stopExpressTimer();
    const req = getOrderRequest();
    const seconds = req && req.timerSeconds;
    if (!seconds) {
      gameState.expressDeadline = 0;
      gameState.expressFailed = false;
      if (dom.requestTimer) {
        dom.requestTimer.hidden = true;
        dom.requestTimer.classList.remove("is-late");
      }
      return;
    }
    gameState.expressFailed = false;
    gameState.expressDeadline = Date.now() + seconds * 1000;
    if (dom.requestTimer) dom.requestTimer.classList.remove("is-late");
    tickExpressTimer();
    gameState.timers.express = window.setInterval(tickExpressTimer, 250);
  }

  // ===========================================================================
  // ORDER FUNCTIONS
  // ===========================================================================
  function createOrder() {
    const template = ORDERS[gameState.orderIndex % ORDERS.length];
    const idealBox = template.idealBox || "medium";
    // VIP catalog hook: when shouldOfferVipOrder() is true, future VIP_ORDERS
    // can replace `template`. For now the flag rides on the same SKUs.
    gameState.currentOrder = {
      id: template.id,
      number: gameState.orderIndex + 1,
      items: Object.assign({}, template.items),
      idealBox: idealBox,
      request: template.request || null,
      quote: template.quote || null,
      timerSeconds: template.timerSeconds || null,
      vip: shouldOfferVipOrder(),
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
    scheduleFitBox();
  }

  function scheduleFitBox() {
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(fitBoxToTable);
    });
  }

  function fitBoxToTable() {
    if (!dom.box || !dom.packArea) return;
    const surface = document.querySelector(".table-surface");
    if (!surface) return;
    const box = getSelectedBox();
    const outerW = box.width + 24;
    const outerH = box.height + 40;
    const availW = Math.max(120, surface.clientWidth - 16);
    const availH = Math.max(120, surface.clientHeight - 16);
    let scale = Math.min(availW / outerW, availH / outerH);
    scale = clamp(Number.isFinite(scale) ? scale : 1, 0.78, 1.75);
    dom.box.style.transform = "scale(" + scale + ")";
    dom.box.style.transformOrigin = "center center";
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

    renderRequestBlock();
    renderShopStats();
    scheduleFitBox();

    dom.cashValue.textContent = formatMoney(gameState.cash);
    const progress = levelProgress(gameState.xp);
    if (dom.levelValue) {
      dom.levelValue.textContent = "Lv " + progress.level;
    }
    dom.xpValue.textContent = progress.into + "/" + progress.need;
  }

  function renderShopStats() {
    if (dom.shopRating) {
      dom.shopRating.textContent = gameState.shopRating.toFixed(1);
    }
    if (dom.shopOrders) {
      dom.shopOrders.textContent = String(gameState.totalOrders);
    }
    if (dom.shopPerfects) {
      dom.shopPerfects.textContent = String(gameState.perfectPacks);
    }
    if (dom.shopStats) {
      dom.shopStats.classList.toggle("is-vip", !!gameState.vipUnlocked);
    }
    if (dom.shopVip) {
      dom.shopVip.hidden = !gameState.vipUnlocked;
    }
  }

  function renderRequestBlock() {
    const block = dom.orderRequest;
    if (!block) return;
    const req = getOrderRequest();
    if (!req) {
      block.hidden = true;
      if (dom.requestTimer) {
        dom.requestTimer.hidden = true;
        dom.requestTimer.classList.remove("is-late");
      }
      return;
    }
    block.hidden = false;
    block.className = "order-request request-" + req.id.toLowerCase().replace(/_/g, "-");
    if (dom.requestTitle) {
      dom.requestTitle.textContent = req.icon + " " + req.name;
    }
    if (dom.requestQuote) {
      dom.requestQuote.textContent = '"' + (req.quote || "") + '"';
    }
    if (dom.requestTimer && !req.timerSeconds) {
      dom.requestTimer.hidden = true;
      dom.requestTimer.classList.remove("is-late");
    }
  }

  function validateOrder() {
    const report = buildPackingReport();
    gameState.packingReport = report;
    return report.ok;
  }

  function completeOrder() {
    if (!validateOrder() || gameState.packing) return;
    if (gameState.expressDeadline && Date.now() > gameState.expressDeadline) {
      gameState.expressFailed = true;
    }
    stopExpressTimer();
    gameState.packing = true;
    dom.packBtn.disabled = true;
    gameState.pendingResult = { ready: true };
    clearSelection();
    startFinishSequence();
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
    clearSelection();
    hideFinishSequence();
    hideRequestToast();
    updatePackButton();
    startExpressTimer();
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
    refreshProtectionCost();
  }

  function makeProduct(typeId) {
    const type = getType(typeId);
    const product = {
      id: gameState.nextInstanceId,
      typeId: typeId,
      x: 0,
      y: 0,
      rotation: 0,
      compressed: false,
      wraps: [],
      inBox: false,
      protectionLevel: 0,
      softProtection: 0,
      effectiveProtection: 0,
      el: null,
    };
    gameState.nextInstanceId += 1;

    const el = document.createElement("div");
    el.className = "product type-" + type.id + (type.compressible ? " is-compressible" : "");
    el.dataset.instanceId = String(product.id);
    el.dataset.typeId = type.id;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", type.name);

    const inner = document.createElement("div");
    inner.className = "product-inner";
    inner.innerHTML =
      propertyChipsHtml(type) +
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
    bindActionButton(rotateBtn, function () {
      rotateProduct(product);
    });

    el.appendChild(inner);
    el.appendChild(rotateBtn);

    if (type.compressible) {
      const compressBtn = document.createElement("button");
      compressBtn.className = "compress-btn";
      compressBtn.type = "button";
      compressBtn.setAttribute("aria-label", "Compress " + type.name);
      compressBtn.title = "COMPRESS";
      compressBtn.textContent = "▾";
      bindActionButton(compressBtn, function () {
        compressProduct(product);
      });
      el.appendChild(compressBtn);
      product.compressBtn = compressBtn;
    }

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

  function bindActionButton(btn, onClick) {
    btn.addEventListener("pointerdown", function (event) {
      event.stopPropagation();
      event.preventDefault();
    });
    btn.addEventListener("click", function (event) {
      event.stopPropagation();
      onClick();
    });
  }

  function propertyChipsHtml(type) {
    const chips = [];
    if (type.fragile) chips.push({ id: "fragile", label: "Fragile", short: "Fr" });
    if (type.liquid) chips.push({ id: "liquid", label: "Liquid", short: "Liq" });
    if (type.soft) chips.push({ id: "soft", label: "Soft", short: "Sf" });
    if (type.uprightOnly) chips.push({ id: "upright", label: "Upright", short: "Up" });
    if (!chips.length) return "";
    return (
      '<div class="product-props">' +
      chips
        .map(function (chip) {
          return (
            '<span class="prop-chip prop-' +
            chip.id +
            '" title="' +
            chip.label +
            '">' +
            chip.short +
            "</span>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function clonePose(product, overrides) {
    return Object.assign(
      {
        id: product.id,
        typeId: product.typeId,
        rotation: product.rotation,
        compressed: !!product.compressed,
        wraps: (product.wraps || []).slice(),
        x: product.x,
        y: product.y,
        inBox: product.inBox,
        protectionLevel: product.protectionLevel || 0,
      },
      overrides || {}
    );
  }

  function getWrapPad(product) {
    let pad = 0;
    (product.wraps || []).forEach(function (id) {
      const mat = PROTECTION_MATERIALS[id];
      if (mat) pad += mat.pad;
    });
    return pad;
  }

  function sumWrapProtection(product) {
    return (product.wraps || []).reduce(function (sum, id) {
      const mat = PROTECTION_MATERIALS[id];
      return sum + (mat ? mat.protection : 0);
    }, 0);
  }

  function sumWrapCost(product) {
    return (product.wraps || []).reduce(function (sum, id) {
      const mat = PROTECTION_MATERIALS[id];
      return sum + (mat ? mat.cost : 0);
    }, 0);
  }

  function sumWrapAesthetic(product) {
    return (product.wraps || []).reduce(function (sum, id) {
      const mat = PROTECTION_MATERIALS[id];
      return sum + (mat && mat.aesthetic ? mat.aesthetic : 0);
    }, 0);
  }

  function refreshProtectionCost() {
    gameState.protectionCost = gameState.products.reduce(function (sum, p) {
      return sum + sumWrapCost(p);
    }, 0);
  }

  function getBaseSize(product) {
    const type = getType(product.typeId);
    let w = type.width;
    let h = type.height;
    if (product.compressed && type.compressible) {
      if (h >= w) {
        h = Math.max(20, snapValue(h * CONFIG.COMPRESS_FACTOR));
      } else {
        w = Math.max(20, snapValue(w * CONFIG.COMPRESS_FACTOR));
      }
    }
    return { w: w, h: h };
  }

  /** Axis-aligned size after rotation, plus wrap padding on every side. */
  function getAABB(product) {
    const base = getBaseSize(product);
    const swapped = product.rotation % 180 === 90;
    const pad = getWrapPad(product);
    return {
      w: (swapped ? base.h : base.w) + pad * 2,
      h: (swapped ? base.w : base.h) + pad * 2,
    };
  }

  function applyProductMetrics(product) {
    const type = getType(product.typeId);
    const base = getBaseSize(product);
    const aabb = getAABB(product);
    const el = product.el;
    el.style.width = aabb.w + "px";
    el.style.height = aabb.h + "px";
    el.style.setProperty("--ow", base.w + "px");
    el.style.setProperty("--oh", base.h + "px");
    el.style.setProperty("--rot", product.rotation + "deg");
    el.classList.toggle("is-compressed", !!product.compressed);
    el.classList.toggle("is-tipped", type.uprightOnly && !isUpright(product));
    el.classList.toggle("is-wrapped", !!(product.wraps && product.wraps.length));
    el.classList.toggle("is-selected", gameState.selectedProductId === product.id);
    syncWrapLayers(product);
    product.protectionLevel = sumWrapProtection(product);
    if (product.compressBtn) {
      product.compressBtn.classList.toggle("is-on", !!product.compressed);
      product.compressBtn.textContent = product.compressed ? "▴" : "▾";
      product.compressBtn.setAttribute(
        "aria-label",
        (product.compressed ? "Expand " : "Compress ") + type.name
      );
      product.compressBtn.title = product.compressed ? "EXPAND" : "COMPRESS";
    }
    if (product.inBox) {
      el.style.left = product.x + "px";
      el.style.top = product.y + "px";
    }
  }

  function isUpright(product) {
    const rot = ((product.rotation % 360) + 360) % 360;
    return rot % 180 === 0;
  }

  function snapUprightPose(product) {
    if (!getType(product.typeId).uprightOnly) return;
    if (!isUpright(product)) product.rotation = 0;
  }

  function nextRotation(product) {
    if (getType(product.typeId).uprightOnly) {
      const rot = ((product.rotation % 360) + 360) % 360;
      return rot === 0 ? 180 : 0;
    }
    return (product.rotation + 90) % 360;
  }

  function syncWrapLayers(product) {
    if (!product.el) return;
    let stack = product.el.querySelector(".wrap-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "wrap-stack";
      product.el.insertBefore(stack, product.el.firstChild);
    }
    stack.innerHTML = "";
    (product.wraps || []).forEach(function (id) {
      const layer = document.createElement("div");
      layer.className = "wrap-layer wrap-" + id;
      stack.appendChild(layer);
    });
  }

  function getSelectedProduct() {
    const id = gameState.selectedProductId;
    if (!id) return null;
    for (let i = 0; i < gameState.products.length; i += 1) {
      if (gameState.products[i].id === id) return gameState.products[i];
    }
    return null;
  }

  function selectProduct(product) {
    if (gameState.packing || !product) return;
    gameState.selectedProductId = product.id;
    gameState.products.forEach(function (p) {
      if (p.el) p.el.classList.toggle("is-selected", p.id === product.id);
    });
    renderWrapTray();
  }

  function clearSelection() {
    gameState.selectedProductId = null;
    gameState.products.forEach(function (p) {
      if (p.el) p.el.classList.remove("is-selected");
    });
    renderWrapTray();
  }

  function tryResizeInBox(product, previousAABB) {
    if (!product.inBox) {
      applyProductMetrics(product);
      return true;
    }
    const next = getAABB(product);
    const cx = product.x + previousAABB.w / 2;
    const cy = product.y + previousAABB.h / 2;
    const nextX = snapValue(cx - next.w / 2);
    const nextY = snapValue(cy - next.h / 2);
    const candidate = clonePose(product, { x: nextX, y: nextY, inBox: true });
    if (!isInsideBox(candidate) || isOverlapping(candidate)) {
      return false;
    }
    product.x = nextX;
    product.y = nextY;
    applyProductMetrics(product);
    return true;
  }

  function applyWrap(product, materialId) {
    if (gameState.packing) return;
    if (!product || !product.inBox) return;
    if (!PROTECTION_MATERIALS[materialId]) return;
    if ((product.wraps || []).length >= CONFIG.MAX_WRAPS) {
      playSound("error");
      haptic(10);
      return;
    }

    const prevAABB = getAABB(product);
    const prevWraps = (product.wraps || []).slice();
    product.wraps = prevWraps.concat([materialId]);
    product.protectionLevel = sumWrapProtection(product);

    if (!tryResizeInBox(product, prevAABB)) {
      product.wraps = prevWraps;
      product.protectionLevel = sumWrapProtection(product);
      applyProductMetrics(product);
      product.el.classList.add("is-invalid");
      playSound("error");
      haptic(12);
      window.setTimeout(function () {
        product.el.classList.remove("is-invalid");
      }, 320);
      return;
    }

    refreshProtectionCost();
    const req = getOrderRequest();
    const mat = PROTECTION_MATERIALS[materialId];
    if (req && req.banPlastic && mat && mat.plastic) {
      playSound("error");
      haptic(14);
      showRequestToast(failLabelFor(req));
    } else {
      playSound("place");
      haptic(8);
    }
    playSnapAnimation(product.el);
    renderWrapTray();
    updatePackButton();
  }

  function unwrapProduct(product) {
    if (gameState.packing) return;
    if (!product.wraps || !product.wraps.length) return;

    const prevAABB = getAABB(product);
    product.wraps = product.wraps.slice(0, -1);
    product.protectionLevel = sumWrapProtection(product);

    if (!tryResizeInBox(product, prevAABB)) {
      applyProductMetrics(product);
    }

    refreshProtectionCost();
    playSound("rotate");
    renderWrapTray();
    updatePackButton();
  }

  function rotateProduct(product) {
    if (gameState.packing) return;

    const prevRotation = product.rotation;
    const prevX = product.x;
    const prevY = product.y;
    const aabb = getAABB(product);
    product.rotation = nextRotation(product);

    if (product.inBox) {
      const next = getAABB(product);
      const cx = product.x + aabb.w / 2;
      const cy = product.y + aabb.h / 2;
      const nextX = snapValue(cx - next.w / 2);
      const nextY = snapValue(cy - next.h / 2);
      const candidate = clonePose(product, { x: nextX, y: nextY, inBox: true });

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

  function compressProduct(product) {
    const type = getType(product.typeId);
    if (!type.compressible || gameState.packing) return;

    const prev = !!product.compressed;
    product.compressed = !prev;

    if (product.inBox) {
      const aabb = getAABB(clonePose(product, { compressed: prev }));
      const next = getAABB(product);
      const cx = product.x + aabb.w / 2;
      const cy = product.y + aabb.h / 2;
      const nextX = snapValue(cx - next.w / 2);
      const nextY = snapValue(cy - next.h / 2);
      const candidate = clonePose(product, { x: nextX, y: nextY, inBox: true });

      if (!isInsideBox(candidate) || isOverlapping(candidate)) {
        product.compressed = prev;
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
    playSound(product.compressed ? "place" : "rotate");
    playSnapAnimation(product.el);
    updatePackButton();
  }

  function findFreeSlot(product, preferredX, preferredY) {
    snapUprightPose(product);
    const box = getBoxSize();
    const size = getAABB(product);
    const maxX = box.width - size.w;
    const maxY = box.height - size.h;
    if (maxX < 0 || maxY < 0) return null;

    const step = Math.max(CONFIG.SNAP_GRID * 4, 8);
    const seen = {};
    const tries = [];

    function add(x, y) {
      const sx = snapValue(clamp(x, 0, maxX));
      const sy = snapValue(clamp(y, 0, maxY));
      const key = sx + "," + sy;
      if (seen[key]) return;
      seen[key] = true;
      tries.push({ x: sx, y: sy });
    }

    if (preferredX != null && preferredY != null) add(preferredX, preferredY);
    add(8, 8);
    add(maxX, 8);
    add(8, maxY);
    add(maxX / 2, 8);
    add(8, maxY / 2);
    add(maxX / 2, maxY / 2);

    for (let y = 0; y <= maxY; y += step) {
      for (let x = 0; x <= maxX; x += step) {
        add(x, y);
      }
    }
    add(maxX, maxY);

    for (let i = 0; i < tries.length; i += 1) {
      const t = tries[i];
      const candidate = clonePose(product, { x: t.x, y: t.y, inBox: true });
      if (isInsideBox(candidate) && !isOverlapping(candidate)) return t;
    }
    return null;
  }

  function autoPlaceProduct(product) {
    if (gameState.packing || !product) return false;
    snapUprightPose(product);
    applyProductMetrics(product);
    const hintX = product.inBox ? product.x : 8;
    const hintY = product.inBox ? product.y : 8;
    const slot = findFreeSlot(product, hintX, hintY);
    if (!slot) {
      playSound("error");
      haptic(12);
      if (product.el) {
        product.el.classList.add("is-invalid");
        window.setTimeout(function () {
          if (product.el) product.el.classList.remove("is-invalid");
        }, 320);
      }
      return false;
    }
    placeInBox(product, slot.x, slot.y);
    playSound("place");
    haptic(8);
    playSnapAnimation(product.el);
    selectProduct(product);
    updatePackButton();
    return true;
  }

  function handleProductTap(product) {
    if (gameState.packing) return;
    const already = gameState.selectedProductId === product.id;
    if (!product.inBox) {
      if (already) {
        autoPlaceProduct(product);
      } else {
        selectProduct(product);
      }
      return;
    }
    if (already) {
      rotateProduct(product);
    } else {
      selectProduct(product);
    }
  }

  function placeInBox(product, x, y) {
    snapUprightPose(product);
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
    if (gameState.finish && gameState.finish.active) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (gameState.drag) return;
    if (event.target.closest(".rotate-btn, .compress-btn")) return;

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
    const candidate = clonePose(drag.product, {
      x: local.x,
      y: local.y,
      inBox: true,
    });

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
      handleProductTap(product);
      return;
    }

    snapUprightPose(product);
    applyProductMetrics(product);

    const dist = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    const overShelf = isPointInElement(event.clientX, event.clientY, dom.shelf);
    const overBox =
      isPointInElement(event.clientX, event.clientY, dom.packArea) ||
      isPointInElement(event.clientX, event.clientY, dom.box);

    if (!drag.fromBox && overShelf && !overBox && dist < 48) {
      returnToShelf(product);
      clearDragVisuals();
      gameState.drag = null;
      handleProductTap(product);
      return;
    }

    if (overShelf) {
      returnToShelf(product);
      playSound("place");
      finishDrag();
      return;
    }

    const local = clientRectToBoxLocal(el);
    let snappedX = snapValue(local.x);
    let snappedY = snapValue(local.y);
    const candidate = clonePose(product, {
      x: snappedX,
      y: snappedY,
      inBox: true,
    });

    if (!isInsideBox(candidate) || isOverlapping(candidate)) {
      const slot = overBox || drag.fromBox ? findFreeSlot(product, snappedX, snappedY) : null;
      if (!slot) {
        rejectPlacement(product, el);
        return;
      }
      snappedX = slot.x;
      snappedY = slot.y;
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
  // PACKAGING VALIDATION
  // Property-based report. Blockers prevent PACK ORDER. Warnings and stacking
  // data are stored for scoring / a later physics pass.
  // ===========================================================================
  function buildPackingReport() {
    const order = gameState.currentOrder;
    const report = {
      ok: false,
      blockers: [],
      warnings: [],
      placed: [],
      stacking: { heavyOnFragile: [] },
      protection: {},
    };

    if (!order) return report;

    const placed = gameState.products.filter(function (p) {
      return p.inBox;
    });
    report.placed = placed;

    if (placed.length === 0) {
      report.blockers.push("empty");
      return report;
    }
    if (placed.length !== gameState.products.length) {
      report.blockers.push("missing-items");
    }

    const counts = {};
    placed.forEach(function (p) {
      counts[p.typeId] = (counts[p.typeId] || 0) + 1;
    });
    const needed = order.items;
    Object.keys(needed).forEach(function (typeId) {
      if ((counts[typeId] || 0) !== needed[typeId]) {
        report.blockers.push("wrong-count");
      }
    });
    Object.keys(counts).forEach(function (typeId) {
      if (!needed[typeId]) report.blockers.push("extra-item");
    });

    placed.forEach(function (p) {
      if (!isInsideBox(p)) report.blockers.push("out-of-box");
      if (isOverlapping(p, placed)) report.blockers.push("overlap");
      if (getType(p.typeId).uprightOnly && !isUpright(p)) {
        report.blockers.push("upright");
      }
    });

    refreshProtection(placed);
    placed.forEach(function (p) {
      const type = getType(p.typeId);
      report.protection[p.id] = {
        protectionLevel: p.protectionLevel,
        softProtection: p.softProtection,
        effectiveProtection: p.effectiveProtection,
        requiredProtection: getRequiredProtection(type),
        fragile: type.fragile,
        risk: protectionRisk(p),
      };
    });

    report.stacking = buildStackingReport(placed);
    if (report.stacking.heavyOnFragile.length) {
      report.warnings.push("heavy-on-fragile");
    }
    if (report.protection) {
      Object.keys(report.protection).forEach(function (id) {
        if (report.protection[id].risk === "HIGH") report.warnings.push("high-damage-risk");
      });
    }

    report.ok = report.blockers.length === 0;
    return report;
  }

  function refreshProtection(placed) {
    placed.forEach(function (product) {
      const type = getType(product.typeId);
      product.protectionLevel = sumWrapProtection(product);
      product.softProtection = 0;
      if (type.fragile) {
        placed.forEach(function (other) {
          if (other.id === product.id) return;
          if (!getType(other.typeId).soft) return;
          if (rectGap(getRect(product), getRect(other)) <= CONFIG.SOFT_PROTECT_GAP) {
            product.softProtection += CONFIG.SOFT_PROTECT_BONUS;
          }
        });
      }
      product.effectiveProtection = (product.protectionLevel || 0) + product.softProtection;
    });
  }

  function buildStackingReport(placed) {
    const heavyOnFragile = [];
    placed.forEach(function (upper) {
      const upperType = getType(upper.typeId);
      if (upperType.weight < CONFIG.HEAVY_WEIGHT) return;
      placed.forEach(function (lower) {
        if (upper.id === lower.id) return;
        if (!getType(lower.typeId).fragile) return;
        if (!isRestingOn(upper, lower)) return;
        heavyOnFragile.push({
          heavyId: upper.id,
          heavyType: upper.typeId,
          heavyWeight: upperType.weight,
          fragileId: lower.id,
          fragileType: lower.typeId,
        });
      });
    });
    return { heavyOnFragile: heavyOnFragile };
  }

  /** Gravity is +y (down the packing area). No live physics — contact only. */
  function isRestingOn(upper, lower) {
    const a = getRect(upper);
    const b = getRect(lower);
    const xOverlap = a.x < b.x + b.w && a.x + a.w > b.x;
    if (!xOverlap) return false;
    const gap = b.y - (a.y + a.h);
    return a.y < b.y && gap >= -1 && gap <= CONFIG.STACK_GAP_PX;
  }

  // ===========================================================================
  // SCORING FUNCTIONS
  // Weighted pack score: Accuracy 25, Fit 20, Protection 20, Cost 15, Aesthetic 20.
  // ===========================================================================
  const SCORE_CATS = [
    { id: "accuracy", label: "Accuracy", weight: 25 },
    { id: "fit", label: "Fit", weight: 20 },
    { id: "protection", label: "Protection", weight: 20 },
    { id: "cost", label: "Cost", weight: 15 },
    { id: "aesthetic", label: "Aesthetic", weight: 20 },
  ];

  const GIFT_TYPES = { candle: 1, perfume: 1, jewelry_box: 1, mug: 1 };
  const EVERYDAY_TYPES = { tshirt: 1, socks: 1, poster: 1, notebook: 1 };

  function roundScore(n) {
    return clamp(Math.round(n), 0, 100);
  }

  function snapshotFinish(finish) {
    finish = finish || gameState.finish || {};
    return {
      tissue: finish.tissue || 0,
      cardPlaced: !!finish.cardPlaced,
      cardSkipped: !!finish.cardSkipped,
      flapL: !!finish.flapL,
      flapR: !!finish.flapR,
      stickerPlaced: !!finish.stickerPlaced,
      stickerSkipped: !!finish.stickerSkipped,
      tape: finish.tape || 0,
      labelPlaced: !!finish.labelPlaced,
      scanned: !!finish.scanned,
    };
  }

  function evaluateRequest(finishSnap) {
    finishSnap = finishSnap || {};
    const req = getOrderRequest();
    const empty = {
      id: null,
      honored: true,
      fails: [],
      failLabel: "",
      honorLabel: "",
      paperBonus: false,
    };
    if (!req) return empty;

    const placed = gameState.products.filter(function (p) {
      return p.inBox;
    });
    refreshProtection(placed);

    const fails = [];
    if (req.banPlastic && orderUsesPlastic()) fails.push(failLabelFor(req));
    if (req.banSticker && finishSnap.stickerPlaced) fails.push(failLabelFor(req));
    if (req.banCard && finishSnap.cardPlaced) fails.push(failLabelFor(req));
    if (req.needsCard && !finishSnap.cardPlaced) fails.push(failLabelFor(req));
    if (req.timerSeconds && gameState.expressFailed) fails.push(failLabelFor(req));
    if (req.protectionBoost) {
      const under = placed.some(function (p) {
        const need = getRequiredProtection(getType(p.typeId));
        return need > 0 && (p.effectiveProtection || 0) < need;
      });
      if (under) fails.push(failLabelFor(req));
    }

    const honored = fails.length === 0;
    return {
      id: req.id,
      honored: honored,
      fails: fails,
      failLabel: fails[0] || "",
      honorLabel: honorLabelFor(req),
      paperBonus: !!(req.paperBonus && honored && orderUsesPaperFill()),
      aestheticFloor: req.aestheticFloor || 0,
    };
  }

  function calculateScoreBreakdown(finishSnap) {
    const report = buildPackingReport();
    const request = evaluateRequest(finishSnap);
    let accuracy = scoreAccuracy(report);
    const fitInfo = scoreFit(report);
    const protInfo = scoreProtection(report);
    const cost = scoreCost();
    let aesthetic = scoreAesthetic(finishSnap);

    if (request.id === "PREMIUM" && request.honored && aesthetic < (request.aestheticFloor || 90)) {
      request.honored = false;
      request.fails.push("PREMIUM REQUEST FAILED");
      request.failLabel = "PREMIUM REQUEST FAILED";
    }

    if (request.id && !request.honored) {
      accuracy = roundScore(accuracy - 40);
      aesthetic = roundScore(aesthetic - 45);
    } else if (request.paperBonus) {
      aesthetic = roundScore(aesthetic + 12);
    }

    const categories = {
      accuracy: accuracy,
      fit: fitInfo.score,
      protection: protInfo.score,
      cost: cost,
      aesthetic: aesthetic,
    };
    const weights = CONFIG.SCORE_WEIGHTS;
    const total = roundScore(
      categories.accuracy * weights.accuracy +
        categories.fit * weights.fit +
        categories.protection * weights.protection +
        categories.cost * weights.cost +
        categories.aesthetic * weights.aesthetic
    );
    const badges = collectBadges(categories, fitInfo, request);
    const rank = rankFor(total);
    const perfect = rank.id === "perfect";
    const review = buildCustomerReview({
      total: total,
      categories: categories,
      request: request,
    });
    const economy = calculateEconomy(total, perfect, categories.protection);
    return {
      total: total,
      categories: categories,
      badges: badges,
      rank: rank,
      perfect: perfect,
      fitInfo: fitInfo,
      protection: protInfo,
      economy: economy,
      xp: economy.xp,
      request: request,
      review: review,
    };
  }

  function rankFor(total) {
    if (total >= CONFIG.PERFECT_MIN) return { id: "perfect", label: "PERFECT PACK ✨" };
    if (total >= CONFIG.AMAZING_MIN) return { id: "amazing", label: "AMAZING" };
    if (total >= CONFIG.GREAT_MIN) return { id: "great", label: "GREAT" };
    if (total >= CONFIG.GOOD_MIN) return { id: "good", label: "GOOD" };
    if (total >= CONFIG.OKAY_MIN) return { id: "okay", label: "OKAY" };
    return { id: "needs", label: "NEEDS WORK" };
  }

  function collectBadges(categories, fitInfo, request) {
    const badges = [];
    if (request && request.id) {
      if (request.honored) {
        badges.push({ id: "honored", label: request.honorLabel });
      } else {
        badges.push({ id: "failed", label: request.failLabel });
      }
    }
    if (
      fitInfo.minBox &&
      getSelectedBox().id === fitInfo.minBox.id &&
      categories.fit >= CONFIG.SPACE_MASTER_FIT
    ) {
      badges.push({ id: "space", label: "SPACE MASTER" });
    }
    if (categories.protection >= 100) badges.push({ id: "protector", label: "PROTECTOR" });
    if (categories.cost >= 95) badges.push({ id: "budget", label: "BUDGET MASTER" });
    if (categories.aesthetic >= 100) badges.push({ id: "stylist", label: "STYLIST" });
    const allHigh = SCORE_CATS.every(function (cat) {
      return categories[cat.id] >= 95;
    });
    if (allHigh) badges.push({ id: "flawless", label: "FLAWLESS" });
    return badges;
  }

  function xpRequiredForLevel(level) {
    return Math.round(
      CONFIG.XP_LEVEL_BASE * Math.pow(CONFIG.XP_LEVEL_GROWTH, Math.max(0, level - 1))
    );
  }

  function levelProgress(totalXp) {
    let level = 1;
    let remaining = Math.max(0, totalXp);
    while (level < 99) {
      const need = xpRequiredForLevel(level);
      if (remaining < need) {
        return { level: level, into: remaining, need: need };
      }
      remaining -= need;
      level += 1;
    }
    return { level: 99, into: remaining, need: xpRequiredForLevel(99) };
  }

  function syncLevel() {
    const info = levelProgress(gameState.xp);
    const previous = gameState.level;
    gameState.level = info.level;
    return {
      leveled: info.level > previous,
      from: previous,
      to: info.level,
      into: info.into,
      need: info.need,
    };
  }

  function updateShopRating(stars) {
    const value = clamp(stars, 1, 5);
    gameState.ratingSum += value;
    gameState.ratingCount += 1;
    gameState.shopRating =
      Math.round((gameState.ratingSum / gameState.ratingCount) * 10) / 10;
    syncVipUnlock();
  }

  function calculateEconomy(total, perfect, protectionScore) {
    const placed = gameState.products.filter(function (p) {
      return p.inBox;
    });
    const box = getSelectedBox();
    let revenue = 0;
    let productCost = 0;
    let weight = 0;
    placed.forEach(function (p) {
      const type = getType(p.typeId);
      revenue += type.salePrice || 0;
      productCost += type.productCost || 0;
      weight += type.weight || 0;
    });
    const materials = placed.reduce(function (sum, p) {
      return sum + sumWrapCost(p);
    }, 0);
    const boxCost = box.cost;
    const packaging = boxCost + materials;
    const shipping = cents(
      CONFIG.SHIPPING_BASE * box.shippingMultiplier + weight * CONFIG.SHIPPING_PER_WEIGHT
    );

    let tipRate = 0;
    if (perfect) tipRate = CONFIG.TIP_PERFECT;
    else if (total >= CONFIG.AMAZING_MIN) tipRate = CONFIG.TIP_HIGH_SCORE;
    const mult = rewardMultiplier();
    const tip = cents(revenue * tipRate * (tipRate ? mult : 1));
    const ratingBonus =
      mult > 1 ? cents(Math.max(0, revenue - productCost) * (mult - 1)) : 0;

    let refundRate = 0;
    if (protectionScore < CONFIG.REFUND_HARD_BELOW) refundRate = CONFIG.REFUND_HARD;
    else if (protectionScore < CONFIG.REFUND_SOFT_BELOW) refundRate = CONFIG.REFUND_SOFT;
    const refund = cents(revenue * refundRate);

    const profit = cents(revenue - productCost - packaging - shipping + tip + ratingBonus - refund);

    let xp = CONFIG.XP_ORDER;
    if (total >= CONFIG.AMAZING_MIN) xp += CONFIG.XP_HIGH_SCORE;
    if (perfect) xp += CONFIG.XP_PERFECT;
    xp = Math.round(xp * mult);

    return {
      revenue: cents(revenue),
      productCost: cents(productCost),
      boxCost: cents(boxCost),
      materials: cents(materials),
      packaging: cents(packaging),
      shipping: shipping,
      tip: tip,
      ratingBonus: ratingBonus,
      multiplier: mult,
      refund: refund,
      refundRate: refundRate,
      profit: profit,
      xp: xp,
    };
  }

  function applyRunRewards(breakdown) {
    const eco = breakdown.economy;
    gameState.cash = cents(gameState.cash + eco.profit);
    gameState.xp += eco.xp;
    gameState.totalOrders += 1;
    if (breakdown.perfect) gameState.perfectPacks += 1;
    if (breakdown.review) {
      updateShopRating(breakdown.review.stars);
      gameState.reviews.push(breakdown.review);
      if (gameState.reviews.length > 12) gameState.reviews.shift();
    }
    const levelInfo = syncLevel();
    breakdown.levelInfo = levelInfo;
    breakdown.vipJustUnlocked = !!gameState.vipUnlockPending;
    if (gameState.vipUnlockPending) gameState.vipUnlockPending = false;
    return levelInfo;
  }

  function scoreAccuracy(report) {
    const order = gameState.currentOrder;
    if (!order) return 0;
    const placed = report.placed || [];
    const needed = order.items;
    const counts = {};
    placed.forEach(function (p) {
      counts[p.typeId] = (counts[p.typeId] || 0) + 1;
    });

    const types = Object.keys(needed);
    let typePts = 0;
    types.forEach(function (id) {
      const want = needed[id];
      const got = counts[id] || 0;
      typePts += 100 * (1 - clamp(Math.abs(got - want) / Math.max(1, want), 0, 1));
    });
    typePts = types.length ? typePts / types.length : 0;

    let extra = 0;
    Object.keys(counts).forEach(function (id) {
      if (!needed[id]) extra += counts[id];
    });
    const requiredTotal = itemCount(needed);
    let matched = 0;
    types.forEach(function (id) {
      matched += Math.min(counts[id] || 0, needed[id]);
    });
    const qtyPts = clamp(100 * (matched / Math.max(1, requiredTotal)) - extra * 25, 0, 100);

    let requestPts = 100;
    placed.forEach(function (p) {
      const type = getType(p.typeId);
      if (type.uprightOnly && !isUpright(p)) requestPts -= 40;
    });
    if (placed.length !== gameState.products.length) requestPts -= 20;
    if (extra) requestPts -= 20;

    return roundScore(typePts * 0.4 + qtyPts * 0.35 + clamp(requestPts, 0, 100) * 0.25);
  }

  function theoreticalMinBox(placed) {
    let maxW = 0;
    let maxH = 0;
    let area = 0;
    placed.forEach(function (p) {
      const r = getRect(p);
      maxW = Math.max(maxW, r.w);
      maxH = Math.max(maxH, r.h);
      area += r.w * r.h;
    });
    const needArea = area * 1.12;
    const ids = ["small", "medium", "large"];
    for (let i = 0; i < ids.length; i += 1) {
      const box = BOX_TYPES[ids[i]];
      if (box.width >= maxW && box.height >= maxH && box.width * box.height >= needArea) {
        return box;
      }
    }
    return BOX_TYPES.large;
  }

  function scoreFit(report) {
    const placed = report.placed || [];
    const box = getSelectedBox();
    const boxArea = Math.max(1, box.width * box.height);
    let productArea = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let overlaps = 0;
    placed.forEach(function (p) {
      const r = getRect(p);
      productArea += r.w * r.h;
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
      if (isOverlapping(p, placed)) overlaps += 1;
    });
    const fill = productArea / boxArea;
    const minBox = theoreticalMinBox(placed);
    const emptyPts =
      box.id === minBox.id ? 100 : roundScore(100 * clamp(fill / 0.5, 0, 1));
    const delta = box.rank - getIdealBox().rank;
    const sizePts = delta < 0 ? 100 : delta === 0 ? 92 : delta === 1 ? 40 : 10;
    const overlapPts = overlaps ? 0 : 100;
    const boundsW = Math.max(1, maxX - minX);
    const boundsH = Math.max(1, maxY - minY);
    const compact = productArea / Math.max(1, boundsW * boundsH);
    const compactPts = roundScore(100 * clamp((compact - 0.32) / 0.58, 0, 1));

    return {
      score: roundScore(emptyPts * 0.3 + sizePts * 0.3 + overlapPts * 0.2 + compactPts * 0.2),
      fill: fill,
      overlaps: overlaps,
      minBox: minBox,
    };
  }

  function protectionRisk(product) {
    const type = getType(product.typeId);
    const required = getRequiredProtection(type);
    if (required <= 0) return null;
    const got = product.effectiveProtection || 0;
    if (got >= required) return null;
    const ratio = got / required;
    if (ratio < 0.4) return "HIGH";
    if (ratio < 0.75) return "MEDIUM";
    return "LOW";
  }

  function scoreProtection(report) {
    const placed = report.placed || [];
    refreshProtection(placed);
    const needProtect = placed.filter(function (p) {
      return getRequiredProtection(getType(p.typeId)) > 0;
    });
    let fragilePts = 100;
    if (needProtect.length) {
      let sum = 0;
      needProtect.forEach(function (p) {
        const req = getRequiredProtection(getType(p.typeId));
        const got = p.effectiveProtection || 0;
        sum += req <= 0 ? 1 : clamp(got / req, 0, 1);
      });
      fragilePts = (sum / needProtect.length) * 100;
    }
    const heavyN = (report.stacking && report.stacking.heavyOnFragile
      ? report.stacking.heavyOnFragile
      : []
    ).length;
    const heavyPts = clamp(100 - heavyN * 40, 0, 100);
    let packPts = 100;
    if (placed.length) {
      let packSum = 0;
      placed.forEach(function (p) {
        const req = getRequiredProtection(getType(p.typeId));
        if (req <= 0) {
          packSum += 100;
          return;
        }
        const got = p.effectiveProtection || 0;
        packSum += 100 * clamp(got / req, 0, 1);
      });
      packPts = packSum / placed.length;
    }
    const score = roundScore(fragilePts * 0.5 + heavyPts * 0.25 + packPts * 0.25);
    return {
      score: score,
      allSafe: fragilePts >= 99.5 && heavyN === 0,
    };
  }

  function cheapestProtectionCost(required) {
    if (required <= 0) return 0;
    const request = getOrderRequest();
    const mats = Object.keys(PROTECTION_MATERIALS)
      .map(function (id) {
        return PROTECTION_MATERIALS[id];
      })
      .filter(function (mat) {
        if (request && request.banPlastic && mat.plastic) return false;
        return true;
      });
    let best = Infinity;
    function search(got, cost, depth) {
      if (got >= required) {
        best = Math.min(best, cost);
        return;
      }
      if (depth >= CONFIG.MAX_WRAPS || cost >= best) return;
      for (let i = 0; i < mats.length; i += 1) {
        search(got + mats[i].protection, cost + mats[i].cost, depth + 1);
      }
    }
    search(0, 0, 0);
    return best === Infinity ? 0 : best;
  }

  function scoreCost() {
    const placed = gameState.products.filter(function (p) {
      return p.inBox;
    });
    const selected = getSelectedBox();
    const ideal = getIdealBox();
    const delta = selected.rank - ideal.rank;
    const boxPts = delta <= 0 ? 100 : delta === 1 ? 55 : 18;

    let needed = ideal.cost;
    let actual = selected.cost;
    let wasteWraps = 0;
    placed.forEach(function (p) {
      const req = getRequiredProtection(getType(p.typeId));
      needed += cheapestProtectionCost(req);
      actual += sumWrapCost(p);
      const got = sumWrapProtection(p);
      if (req <= 0 && (p.wraps || []).length) wasteWraps += p.wraps.length;
      if (req > 0 && got > req * 2.2 && (p.wraps || []).length >= 3) wasteWraps += 1;
    });
    const ratio = actual / Math.max(0.01, needed);
    let matPts;
    if (ratio <= 1.08) matPts = 100;
    else if (ratio <= 1.45) matPts = 100 - ((ratio - 1.08) / 0.37) * 42;
    else matPts = clamp(58 - (ratio - 1.45) * 50, 0, 58);
    const wastePts = clamp(100 - wasteWraps * 22, 0, 100);
    return roundScore(boxPts * 0.45 + matPts * 0.35 + wastePts * 0.2);
  }

  function orderVibe() {
    const items = (gameState.currentOrder && gameState.currentOrder.items) || {};
    let gift = 0;
    let everyday = 0;
    Object.keys(items).forEach(function (id) {
      const n = items[id];
      if (GIFT_TYPES[id]) gift += n;
      if (EVERYDAY_TYPES[id]) everyday += n;
    });
    if (gift > everyday) return "gift";
    if (everyday > gift) return "everyday";
    return "mixed";
  }

  function packagingStyleScore() {
    const placed = gameState.products.filter(function (p) {
      return p.inBox;
    });
    const vibe = orderVibe();
    let pts = 70;
    placed.forEach(function (p) {
      const type = getType(p.typeId);
      const wraps = p.wraps || [];
      const hasTissue = wraps.indexOf("tissue") !== -1;
      const hasBubble = wraps.indexOf("bubble") !== -1;
      const hasFoam = wraps.indexOf("foam") !== -1;
      const hasPaper = wraps.indexOf("paper_fill") !== -1;
      if (vibe === "gift") {
        if (type.fragile && hasTissue) pts += 10;
        if (type.fragile && (hasBubble || hasFoam || hasPaper) && hasTissue) pts += 6;
        if (p.compressed) pts -= 10;
        if (!type.fragile && hasFoam) pts -= 6;
      } else if (vibe === "everyday") {
        if (type.soft && p.compressed) pts += 6;
        if (type.soft && hasPaper) pts += 5;
        if (type.soft && hasFoam) pts -= 8;
        if (type.fragile && (hasBubble || hasFoam || hasPaper || hasTissue)) pts += 6;
      } else {
        if (type.fragile && (hasTissue || hasBubble || hasPaper)) pts += 5;
        if (type.soft && (hasPaper || p.compressed)) pts += 4;
      }
    });
    return clamp(pts, 0, 100);
  }

  function scoreAesthetic(finish) {
    finish = finish || {};
    const req = getOrderRequest();
    const tissuePts =
      finish.tissue >= 0.48 ? 100 : roundScore((finish.tissue || 0) * (100 / 0.48));
    let cardPts = finish.cardPlaced ? 100 : 0;
    let stickerPts = finish.stickerPlaced ? 100 : 0;
    if (req && req.banCard) {
      cardPts = finish.cardPlaced ? 0 : 100;
    }
    if (req && req.banSticker) {
      stickerPts = finish.stickerPlaced ? 0 : 100;
    }
    let present = 0;
    if (finish.flapL && finish.flapR) present += 40;
    if ((finish.tape || 0) >= 0.78) present += 35;
    if (finish.labelPlaced) present += 25;
    const stylePts = packagingStyleScore();
    return roundScore(
      tissuePts * 0.22 +
        cardPts * 0.22 +
        stickerPts * 0.22 +
        present * 0.14 +
        stylePts * 0.2
    );
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

  function renderWrapTray() {
    if (!dom.wrapTray) return;
    const product = getSelectedProduct();
    if (!product || !product.inBox) {
      dom.wrapTray.hidden = true;
      dom.wrapTray.classList.add("hidden");
      if (dom.dock) dom.dock.classList.remove("is-wrapping");
      renderWrapTargets(null);
      scheduleFitBox();
      return;
    }

    const type = getType(product.typeId);
    refreshProtection(
      gameState.products.filter(function (p) {
        return p.inBox;
      })
    );
    if (!product.inBox) {
      product.protectionLevel = sumWrapProtection(product);
      product.effectiveProtection = product.protectionLevel;
    }
    const got = product.effectiveProtection || 0;
    const required = getRequiredProtection(type);
    const req = getOrderRequest();

    dom.wrapTray.hidden = false;
    dom.wrapTray.classList.remove("hidden");
    let wrapLabel = "WRAP " + type.name.toUpperCase();
    if (req) wrapLabel += " · " + req.id.replace(/_/g, " ");
    dom.wrapTrayLabel.textContent = wrapLabel;
    if (required) {
      dom.wrapTrayStat.textContent = got + " / " + required;
      dom.wrapTrayStat.classList.toggle("is-risk", got < required);
    } else {
      dom.wrapTrayStat.textContent = "Prot " + got;
      dom.wrapTrayStat.classList.remove("is-risk");
    }

    if (!dom.wrapOptions.childElementCount) {
      Object.keys(PROTECTION_MATERIALS).forEach(function (id) {
        const mat = PROTECTION_MATERIALS[id];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "wrap-choice";
        btn.setAttribute("data-wrap", id);
        btn.innerHTML =
          '<span class="wrap-choice-name">' +
          mat.short +
          '</span><span class="wrap-choice-meta">+' +
          mat.protection +
          " · $" +
          mat.cost.toFixed(2) +
          "</span>";
        dom.wrapOptions.appendChild(btn);
      });
    }

    const counts = {};
    (product.wraps || []).forEach(function (id) {
      counts[id] = (counts[id] || 0) + 1;
    });
    Array.prototype.forEach.call(dom.wrapOptions.querySelectorAll(".wrap-choice"), function (btn) {
      const id = btn.getAttribute("data-wrap");
      const mat = PROTECTION_MATERIALS[id];
      btn.classList.toggle("is-on", !!counts[id]);
      btn.classList.toggle("is-banned", !!(req && req.banPlastic && mat && mat.plastic));
      btn.classList.toggle("is-eco-pick", !!(req && req.paperBonus && id === "paper_fill"));
    });
    if (dom.unwrapBtn) {
      dom.unwrapBtn.disabled = !(product.wraps && product.wraps.length);
    }
    if (dom.dock) dom.dock.classList.add("is-wrapping");
    renderWrapTargets(product);
    scheduleFitBox();
  }

  function renderWrapTargets(selected) {
    if (!dom.wrapTargets) return;
    const packed = gameState.products.filter(function (p) {
      return p.inBox;
    });
    if (!selected || packed.length < 2) {
      dom.wrapTargets.hidden = true;
      dom.wrapTargets.innerHTML = "";
      return;
    }
    dom.wrapTargets.hidden = false;
    dom.wrapTargets.innerHTML = "";
    packed.forEach(function (p) {
      const type = getType(p.typeId);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "wrap-target" + (selected.id === p.id ? " is-on" : "");
      btn.setAttribute("data-product", String(p.id));
      btn.innerHTML =
        '<span aria-hidden="true">' + type.icon + "</span><span>" + type.name + "</span>";
      dom.wrapTargets.appendChild(btn);
    });
  }

  function updateShelfHint() {
    const remaining = gameState.products.filter(function (p) {
      return !p.inBox;
    }).length;
    const report = gameState.packingReport;
    if (remaining === 0) {
      if (report && report.blockers.indexOf("upright") !== -1) {
        dom.shelfHint.textContent = "Stand upright items up · Tap to rotate";
      } else {
        dom.shelfHint.textContent = "Tap to wrap · tap again to rotate";
      }
      if (!dom.shelf.querySelector(".product") && !dom.shelf.querySelector(".shelf-empty")) {
        const empty = document.createElement("p");
        empty.className = "shelf-empty";
        empty.textContent = "All items are in the box";
        dom.shelf.appendChild(empty);
      }
    } else {
      dom.shelfHint.textContent = "Drag or tap twice to pack";
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

  function showResult(breakdown) {
    if (gameState.finish && gameState.finish.active && !gameState.finish.completed) return;
    if (!breakdown) return;

    const rank = breakdown.rank;
    const cats = breakdown.categories;
    const badges = breakdown.badges || [];
    const perfect = !!breakdown.perfect;

    const request = breakdown.request;
    if (dom.resultRequest) {
      if (request && request.id) {
        dom.resultRequest.hidden = false;
        dom.resultRequest.textContent = request.honored ? request.honorLabel : request.failLabel;
        dom.resultRequest.className =
          "result-request " + (request.honored ? "is-honored" : "is-failed");
      } else {
        dom.resultRequest.hidden = true;
        dom.resultRequest.textContent = "";
        dom.resultRequest.className = "result-request";
      }
    }

    dom.resultTitle.textContent = rank.label;
    if (request && request.id && !request.honored) {
      dom.resultKicker.textContent = request.failLabel;
    } else if (request && request.id && request.honored) {
      dom.resultKicker.textContent = request.honorLabel;
    } else if (cats.protection < CONFIG.REFUND_SOFT_BELOW) {
      dom.resultKicker.textContent = "Fragile items need more wrap";
    } else if (perfect) {
      dom.resultKicker.textContent = "Every millimetre earned it";
    } else if (badges.length) {
      dom.resultKicker.textContent = badges[0].label;
    } else {
      dom.resultKicker.textContent = "Order packed";
    }
    dom.resultSheet.className = "result-sheet rank-" + rank.id + (perfect ? " perfect" : "");
    renderScoreCats(cats, true);
    renderResultBadges(badges);
    renderLedger(breakdown);

    if (dom.resultXp) {
      dom.resultXp.textContent = "+" + breakdown.xp;
    }
    if (dom.resultLevelUp) {
      const leveled = breakdown.levelInfo && breakdown.levelInfo.leveled;
      dom.resultLevelUp.hidden = !leveled;
      dom.resultLevelUp.classList.toggle("hidden", !leveled);
      if (leveled) {
        dom.resultLevelUp.querySelector("strong").textContent =
          "LEVEL " + breakdown.levelInfo.to;
      }
    }

    dom.resultScore.textContent = "0";
    dom.scoreRing.style.setProperty("--p", "0%");

    setOverlayOpen(dom.resultOverlay, true);
    countUpBreakdown(breakdown);
    scheduleReviewToast(breakdown);
  }

  function hideReviewToast() {
    window.clearTimeout(gameState.timers.review);
    gameState.timers.review = 0;
    if (!dom.reviewToast) return;
    dom.reviewToast.classList.remove("is-on");
    dom.reviewToast.hidden = true;
    if (dom.reviewVipNote) {
      dom.reviewVipNote.hidden = true;
    }
  }

  function scheduleReviewToast(breakdown) {
    hideReviewToast();
    const review = breakdown && breakdown.review;
    if (!review || !dom.reviewToast) return;
    gameState.timers.review = window.setTimeout(function () {
      showReviewToast(review, !!breakdown.vipJustUnlocked);
    }, CONFIG.REVIEW_DELAY);
  }

  function showReviewToast(review, vipNote) {
    if (!dom.reviewToast) return;
    if (dom.reviewAuthor) dom.reviewAuthor.textContent = review.author;
    if (dom.reviewStars) {
      dom.reviewStars.textContent = starGlyphs(review.stars);
      dom.reviewStars.setAttribute("aria-label", review.stars + " stars");
    }
    if (dom.reviewQuote) {
      dom.reviewQuote.textContent = '"' + review.text + '"';
    }
    if (dom.reviewVipNote) {
      dom.reviewVipNote.hidden = !vipNote;
    }
    dom.reviewToast.classList.toggle("is-low", review.stars <= 2);
    dom.reviewToast.hidden = false;
    window.requestAnimationFrame(function () {
      dom.reviewToast.classList.add("is-on");
    });
    playSound("review");
    haptic(review.stars <= 2 ? 16 : 10);
  }

  function renderScoreCats(categories, reset) {
    if (!dom.scoreCats) return;
    if (!dom.scoreCats.childElementCount) {
      SCORE_CATS.forEach(function (cat) {
        const li = document.createElement("li");
        li.className = "score-cat score-cat-" + cat.id;
        li.dataset.cat = cat.id;
        li.innerHTML =
          '<div class="score-cat-top">' +
          "<span>" +
          cat.label +
          '</span><small>' +
          cat.weight +
          '%</small><em>0</em></div>' +
          '<div class="score-cat-bar" aria-hidden="true"><i></i></div>';
        dom.scoreCats.appendChild(li);
      });
    }
    Array.prototype.forEach.call(dom.scoreCats.children, function (li) {
      const id = li.dataset.cat;
      const value = reset ? 0 : categories[id] || 0;
      const em = li.querySelector("em");
      const fill = li.querySelector("i");
      if (em) em.textContent = String(value);
      if (fill) fill.style.width = value + "%";
      li.setAttribute("aria-label", SCORE_CATS.filter(function (c) { return c.id === id; })[0].label + " " + value);
    });
  }

  function renderResultBadges(badges) {
    if (!dom.resultBadges) return;
    dom.resultBadges.innerHTML = "";
    if (!badges.length) {
      dom.resultBadges.hidden = true;
      return;
    }
    dom.resultBadges.hidden = false;
    badges.forEach(function (badge) {
      const li = document.createElement("li");
      li.className = "result-badge badge-" + badge.id;
      li.textContent = badge.label;
      dom.resultBadges.appendChild(li);
    });
  }

  function renderLedger(breakdown) {
    if (!dom.resultLedger) return;
    const eco = breakdown.economy || {};
    const rows = [
      { label: "Order revenue", value: eco.revenue, kind: "pos" },
      { label: "Product cost", value: -eco.productCost, kind: "neg" },
      { label: "Packaging", value: -eco.packaging, kind: "neg" },
      { label: "Shipping", value: -eco.shipping, kind: "neg" },
    ];
    if (eco.tip) rows.push({ label: "Tip", value: eco.tip, kind: "tip" });
    if (eco.ratingBonus) rows.push({ label: "Rating bonus", value: eco.ratingBonus, kind: "tip" });
    if (eco.refund) rows.push({ label: "Refund", value: -eco.refund, kind: "refund" });
    rows.push({ label: "Profit", value: eco.profit, kind: "profit" });

    dom.resultLedger.innerHTML = "";
    rows.forEach(function (row) {
      const li = document.createElement("li");
      li.className = "ledger-row ledger-" + row.kind;
      if (row.kind === "profit" && row.value < 0) li.classList.add("is-loss");
      const display = row.kind === "tip" ? formatMoneyDelta(row.value) : formatMoney(row.value);
      li.innerHTML = "<span>" + row.label.toUpperCase() + "</span><strong>" + display + "</strong>";
      dom.resultLedger.appendChild(li);
    });
  }

  function hideResult() {
    window.cancelAnimationFrame(gameState.timers.scoreRaf);
    gameState.timers.scoreRaf = 0;
    hideReviewToast();
    setOverlayOpen(dom.resultOverlay, false);
    if (dom.resultSheet) dom.resultSheet.className = "result-sheet";
  }

  function countUpBreakdown(breakdown) {
    const start = performance.now();
    const duration = 900;
    renderScoreCats(breakdown.categories, true);

    function frame(now) {
      const t = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(breakdown.total * eased);
      if (dom.resultOverlay && dom.resultOverlay.classList.contains("is-open")) {
        dom.resultScore.textContent = String(value);
        dom.scoreRing.style.setProperty("--p", value + "%");
        Array.prototype.forEach.call(dom.scoreCats.children, function (li) {
          const id = li.dataset.cat;
          const catVal = Math.round((breakdown.categories[id] || 0) * eased);
          const em = li.querySelector("em");
          const fill = li.querySelector("i");
          if (em) em.textContent = String(catVal);
          if (fill) fill.style.width = catVal + "%";
        });
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
    if (dom.wrapOptions) {
      dom.wrapOptions.addEventListener("click", function (event) {
        const btn = event.target.closest("[data-wrap]");
        const product = getSelectedProduct();
        if (!btn || !product) return;
        applyWrap(product, btn.getAttribute("data-wrap"));
      });
    }
    if (dom.wrapTargets) {
      dom.wrapTargets.addEventListener("click", function (event) {
        const btn = event.target.closest("[data-product]");
        if (!btn) return;
        const id = parseInt(btn.getAttribute("data-product"), 10);
        const product = gameState.products.filter(function (p) {
          return p.id === id;
        })[0];
        if (product) selectProduct(product);
      });
    }
    if (dom.unwrapBtn) {
      dom.unwrapBtn.addEventListener("click", function () {
        const product = getSelectedProduct();
        if (product) unwrapProduct(product);
      });
    }
    if (dom.packArea) {
      dom.packArea.addEventListener("pointerdown", function (event) {
        if (event.target.closest(".product")) return;
        const selected = getSelectedProduct();
        if (selected && !selected.inBox && !gameState.packing) {
          autoPlaceProduct(selected);
          return;
        }
        clearSelection();
      });
    }
    bindFinishUi();
    dom.boxPicker.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-box]");
      if (btn) selectBox(btn.getAttribute("data-box"));
    });
    window.addEventListener("resize", scheduleFitBox);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleFitBox);
    }

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

  // ===========================================================================
  // FINISH SEQUENCE
  // After PACK ORDER: tissue → card → flaps → sticker → tape → label → scan → shipped
  // ===========================================================================
  const FINISH_STEPS = [
    { id: "tissue", title: "Tissue Paper", hint: "Swipe down to tuck the tissue" },
    { id: "card", title: "Thank You Card", hint: "Drop the card into the box" },
    { id: "close", title: "Close Box", hint: "Tap the left flap, then the right flap" },
    { id: "sticker", title: "Sticker", hint: "Peel, then stick it on the box" },
    { id: "tape", title: "Tape", hint: "Swipe left to right across the box" },
    { id: "label", title: "Shipping Label", hint: "Place the label on the box" },
    { id: "scan", title: "Barcode Scan", hint: "Tap the barcode or drag the scanner" },
    { id: "shipped", title: "Shipped", hint: "On its way" },
  ];

  function emptyFinishState() {
    return {
      active: false,
      step: 0,
      tissue: 0,
      cardPlaced: false,
      cardSkipped: false,
      flapL: false,
      flapR: false,
      stickerPeeled: false,
      stickerPlaced: false,
      stickerSkipped: false,
      tape: 0,
      labelPlaced: false,
      scanned: false,
      completed: false,
      ignoreUntil: 0,
      gesture: null,
    };
  }

  function setOverlayOpen(el, open) {
    if (!el) return;
    el.classList.toggle("is-open", open);
    el.setAttribute("aria-hidden", open ? "false" : "true");
    el.removeAttribute("hidden");
    el.style.removeProperty("display");
  }

  function startFinishSequence() {
    const overlay = dom.finishOverlay || $("finish-overlay");
    if (!overlay) return;
    dom.finishOverlay = overlay;
    gameState.finish = emptyFinishState();
    gameState.finish.active = true;
    resetFinishVisuals();
    if (dom.finishBoxTag) {
      dom.finishBoxTag.textContent = getSelectedBox().key;
    }
    setOverlayOpen(dom.resultOverlay, false);
    setOverlayOpen(overlay, true);
    if (dom.app) dom.app.classList.add("is-finishing");
    gameState.finish.ignoreUntil = Date.now() + 220;
    showFinishStep(0);
    playSound("complete");
    haptic(10);
  }

  function hideFinishSequence() {
    setOverlayOpen(dom.finishOverlay, false);
    if (dom.app) dom.app.classList.remove("is-finishing");
    if (dom.finishSkip) dom.finishSkip.hidden = true;
    gameState.finish = emptyFinishState();
    resetFinishVisuals();
  }

  function resetFinishVisuals() {
    function clearClass(el, name) {
      if (el) el.classList.remove(name);
    }
    if (!dom.finishBox) return;
    if (dom.finishTissue) {
      dom.finishTissue.classList.remove("is-tucked");
      dom.finishTissue.style.transform = "";
    }
    if (dom.finishCardSlot) {
      dom.finishCardSlot.classList.remove("is-filled");
      dom.finishCardSlot.innerHTML = "";
    }
    clearClass(dom.finishFlapL, "is-closed");
    clearClass(dom.finishFlapR, "is-closed");
    if (dom.finishFlapL) dom.finishFlapL.style.transform = "";
    if (dom.finishFlapR) dom.finishFlapR.style.transform = "";
    dom.finishBox.classList.remove("is-closing", "is-scan", "is-pop");
    if (dom.finishTape) {
      dom.finishTape.classList.remove("is-on");
      dom.finishTape.style.right = "92%";
    }
    if (dom.finishStickerSpot) {
      dom.finishStickerSpot.classList.remove("is-on");
      dom.finishStickerSpot.textContent = "";
    }
    if (dom.finishLabelSpot) {
      dom.finishLabelSpot.classList.remove("is-on");
      dom.finishLabelSpot.innerHTML = "";
    }
    clearClass(dom.finishBarcode, "is-scanned");
    clearClass(dom.finishShipped, "is-on");
    ["finishCard", "finishSticker", "finishLabel", "finishScanner"].forEach(function (key) {
      const el = dom[key];
      if (!el) return;
      el.classList.remove("is-hidden", "dragging", "is-peeling");
      el.style.left = "";
      el.style.top = "";
      el.style.position = "";
    });
  }

  function cardCopy() {
    const req = getOrderRequest();
    if (req && req.cardKind === "birthday") {
      return {
        title: "Birthday Card",
        hint: "Drop the birthday card into the box",
        label: "Happy birthday",
      };
    }
    if (req && req.cardKind === "gift") {
      return {
        title: "Gift Note",
        hint: "Drop the gift note into the box",
        label: "For you",
      };
    }
    if (req && req.cardKind === "premium") {
      return {
        title: "Presentation Card",
        hint: "Tuck in a presentation card",
        label: "With care",
      };
    }
    if (req && req.banCard) {
      return {
        title: "Invoice / Card",
        hint: "This order asked for no invoice. Skip it.",
        label: "Invoice",
      };
    }
    return {
      title: "Thank You Card",
      hint: "Drop the card into the box",
      label: "Thank you",
    };
  }

  function skipFinishStep() {
    const finish = gameState.finish;
    if (!finish || !finish.active) return;
    const id = finishStepId();
    const req = getOrderRequest();
    if (id === "card" && req && req.banCard) {
      finish.cardSkipped = true;
      finish.cardPlaced = false;
      if (dom.finishSkip) dom.finishSkip.hidden = true;
      if (dom.finishCard) dom.finishCard.classList.add("is-hidden");
      succeedFinish("place");
      return;
    }
    if (id === "sticker" && req && req.banSticker) {
      finish.stickerSkipped = true;
      finish.stickerPlaced = false;
      if (dom.finishSkip) dom.finishSkip.hidden = true;
      if (dom.finishSticker) dom.finishSticker.classList.add("is-hidden");
      succeedFinish("place");
    }
  }

  function showFinishStep(index) {
    const finish = gameState.finish;
    finish.step = index;
    finish.gesture = null;
    const step = FINISH_STEPS[index];
    const id = step.id;
    const req = getOrderRequest();
    const copy = cardCopy();
    if (dom.finishOverlay) {
      dom.finishOverlay.dataset.step = id;
      setOverlayOpen(dom.finishOverlay, true);
    }
    if (dom.finishStep) {
      dom.finishStep.textContent = String(index + 1).padStart(2, "0") + " / " + FINISH_STEPS.length;
    }
    if (dom.finishTitle) {
      if (id === "shipped") {
        dom.finishTitle.textContent = "SHIPPED ✓";
      } else if (id === "card") {
        dom.finishTitle.textContent = copy.title;
      } else if (id === "sticker" && req && req.banSticker) {
        dom.finishTitle.textContent = "Shop Sticker";
      } else {
        dom.finishTitle.textContent = step.title;
      }
    }
    if (dom.finishHint) {
      if (id === "card") dom.finishHint.textContent = copy.hint;
      else if (id === "sticker" && req && req.banSticker) {
        dom.finishHint.textContent = "Skip the sticker — no branding on this box.";
      } else {
        dom.finishHint.textContent = step.hint;
      }
    }
    if (dom.finishCardText) dom.finishCardText.textContent = copy.label;
    if (dom.finishSkip) {
      const showSkip =
        (id === "card" && req && req.banCard && !finish.cardPlaced && !finish.cardSkipped) ||
        (id === "sticker" && req && req.banSticker && !finish.stickerPlaced && !finish.stickerSkipped);
      dom.finishSkip.hidden = !showSkip;
      if (id === "card" && req && req.banCard) {
        dom.finishSkip.textContent = "Skip — no invoice";
      } else if (id === "sticker" && req && req.banSticker) {
        dom.finishSkip.textContent = "Skip — no branding";
      }
    }
    if (dom.finishRail) {
      Array.prototype.forEach.call(dom.finishRail.querySelectorAll("[data-finish]"), function (el) {
        const key = el.getAttribute("data-finish");
        const stepIndex = FINISH_STEPS.findIndex(function (s) {
          return s.id === key;
        });
        el.classList.toggle("is-current", stepIndex === index);
        el.classList.toggle("is-done", stepIndex >= 0 && stepIndex < index);
      });
    }

    if (dom.finishCard) {
      dom.finishCard.classList.toggle("is-hidden", id !== "card" || finish.cardPlaced);
    }
    if (dom.finishSticker) {
      dom.finishSticker.classList.toggle("is-hidden", id !== "sticker" || finish.stickerPlaced);
    }
    if (dom.finishLabel) {
      dom.finishLabel.classList.toggle("is-hidden", id !== "label" || finish.labelPlaced);
    }
    if (dom.finishScanner) {
      dom.finishScanner.classList.toggle("is-hidden", id !== "scan" || finish.scanned);
    }
    if (dom.finishBox) {
      dom.finishBox.classList.toggle("is-closing", id === "close" || index > 2);
      dom.finishBox.classList.toggle("is-scan", id === "scan" || index >= 6);
    }
    if (index > 0 && dom.finishTissue) {
      dom.finishTissue.classList.add("is-tucked");
      dom.finishTissue.style.transform = "translateY(0)";
    }
    if (id === "shipped") {
      if (finish.scanned) completeShipped();
    }
  }

  function advanceFinish() {
    haptic(8);
    const next = gameState.finish.step + 1;
    if (next >= FINISH_STEPS.length) return;
    showFinishStep(next);
  }

  function popFinishBox() {
    if (!dom.finishBox) return;
    dom.finishBox.classList.remove("is-pop");
    void dom.finishBox.offsetWidth;
    dom.finishBox.classList.add("is-pop");
  }

  function succeedFinish(soundId) {
    playSound(soundId);
    haptic(12);
    popFinishBox();
    window.setTimeout(advanceFinish, 320);
  }

  function completeShipped() {
    const finish = gameState.finish;
    if (!finish || finish.completed || !finish.scanned) return;
    finish.completed = true;
    if (dom.finishShipped) dom.finishShipped.classList.add("is-on");
    playSound("shipped");
    haptic(22);
    const finishSnap = snapshotFinish(finish);
    const breakdown = calculateScoreBreakdown(finishSnap);
    window.setTimeout(function () {
      if (!gameState.pendingResult) return;
      applyRunRewards(breakdown);
      if (breakdown.perfect) {
        spawnConfetti();
        haptic(32);
        window.setTimeout(function () {
          haptic(18);
        }, 160);
        window.setTimeout(function () {
          haptic(12);
        }, 340);
      }
      hideFinishSequence();
      showResult(breakdown);
      renderOrder();
      gameState.pendingResult = null;
    }, 1300);
  }

  function bindFinishUi() {
    if (!dom.finishOverlay) return;
    const root = dom.finishOverlay;
    root.addEventListener("pointerdown", onFinishPointerDown, { passive: false });
    document.addEventListener("pointermove", onFinishPointerMove, { passive: false });
    document.addEventListener("pointerup", onFinishPointerUp);
    document.addEventListener("pointercancel", onFinishPointerUp);
  }

  function finishStepId() {
    return gameState.finish && gameState.finish.active
      ? FINISH_STEPS[gameState.finish.step].id
      : "";
  }

  function onFinishPointerDown(event) {
    if (!gameState.finish || !gameState.finish.active) return;
    if (Date.now() < (gameState.finish.ignoreUntil || 0)) return;
    const id = finishStepId();
    if (id === "shipped") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target;
    if (target.closest && target.closest("#finish-skip")) {
      event.preventDefault();
      skipFinishStep();
      return;
    }
    event.preventDefault();
    resumeAudio();

    const finish = gameState.finish;

    if (id === "tissue") {
      finish.gesture = {
        type: "tissue",
        pointerId: event.pointerId,
        startY: event.clientY,
        progress: finish.tissue || 0,
      };
      captureFinish(event);
      return;
    }

    if (id === "close") {
      const flap = target.closest(".finish-flap");
      const box = dom.finishBox.getBoundingClientRect();
      const overBox = isPointInElement(event.clientX, event.clientY, dom.finishBox);
      let side = null;
      if (flap) side = flap === dom.finishFlapL ? "L" : "R";
      else if (overBox) side = event.clientX < box.left + box.width / 2 ? "L" : "R";
      if (!side) return;
      if ((side === "L" && finish.flapL) || (side === "R" && finish.flapR)) return;
      finish.gesture = {
        type: "flap",
        pointerId: event.pointerId,
        startY: event.clientY,
        flap: side,
        moved: false,
      };
      captureFinish(event);
      return;
    }

    if (id === "tape") {
      if (!isPointInElement(event.clientX, event.clientY, dom.finishBox)) return;
      const box = dom.finishBox.getBoundingClientRect();
      finish.gesture = {
        type: "tape",
        pointerId: event.pointerId,
        startX: event.clientX,
        boxWidth: box.width,
        startProgress: finish.tape || 0,
        lastTick: Math.floor((finish.tape || 0) * 6),
      };
      captureFinish(event);
      return;
    }

    if (id === "scan" && target.closest("#finish-barcode")) {
      finishScan();
      return;
    }

    const prop = target.closest(".finish-prop");
    if (!prop || prop.classList.contains("is-hidden")) return;
    if (id === "sticker" && prop.id === "finish-sticker" && !finish.stickerPeeled) {
      finish.stickerPeeled = true;
      prop.classList.add("is-peeling");
      playSound("peel");
      haptic(6);
    }
    const rect = prop.getBoundingClientRect();
    prop.classList.add("dragging");
    prop.style.left = rect.left + "px";
    prop.style.top = rect.top + "px";
    finish.gesture = {
      type: "drag",
      pointerId: event.pointerId,
      prop: prop,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    captureFinish(event);
  }

  function captureFinish(event) {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (err) {
      /* optional */
    }
  }

  function onFinishPointerMove(event) {
    const finish = gameState.finish;
    if (!finish || !finish.gesture || event.pointerId !== finish.gesture.pointerId) return;
    event.preventDefault();
    const g = finish.gesture;
    const id = finishStepId();

    if (g.type === "tissue") {
      const delta = event.clientY - g.startY;
      const progress = clamp(g.progress + delta / 110, 0, 1);
      finish.tissue = progress;
      dom.finishTissue.style.transform = "translateY(" + (-68 + progress * 68) + "%)";
      return;
    }

    if (g.type === "flap") {
      const dy = event.clientY - g.startY;
      if (Math.abs(dy) > 8) g.moved = true;
      const p = clamp(dy / 90, 0, 1);
      const flapEl = g.flap === "L" ? dom.finishFlapL : dom.finishFlapR;
      flapEl.style.transform = "rotateX(" + (-78 + p * 78) + "deg)";
      return;
    }

    if (g.type === "tape") {
      const dx = event.clientX - g.startX;
      const progress = clamp(g.startProgress + dx / g.boxWidth, 0, 1);
      finish.tape = progress;
      dom.finishTape.classList.add("is-on");
      dom.finishTape.style.right = 100 - progress * 92 + "%";
      const tick = Math.floor(progress * 6);
      if (tick > g.lastTick) {
        g.lastTick = tick;
        playSound("tape");
        haptic(4);
      }
      return;
    }

    if (g.type === "drag") {
      g.prop.classList.add("dragging");
      g.prop.style.left = event.clientX - g.offsetX + "px";
      g.prop.style.top = event.clientY - g.offsetY + "px";
      if (id === "scan") {
        const bar = dom.finishBarcode.getBoundingClientRect();
        const wand = g.prop.getBoundingClientRect();
        if (domRectsOverlap(bar, wand)) finishScan();
      }
    }
  }

  function onFinishPointerUp(event) {
    const finish = gameState.finish;
    if (!finish || !finish.gesture || event.pointerId !== finish.gesture.pointerId) return;
    const g = finish.gesture;
    finish.gesture = null;
    const id = finishStepId();

    if (g.type === "tissue") {
      if (finish.tissue >= 0.48) {
        dom.finishTissue.classList.add("is-tucked");
        dom.finishTissue.style.transform = "translateY(0)";
        succeedFinish("tissue");
      } else {
        finish.tissue = 0;
        dom.finishTissue.style.transform = "";
        playSound("error");
      }
      return;
    }

    if (g.type === "flap") {
      const dy = event.clientY - g.startY;
      const flapEl = g.flap === "L" ? dom.finishFlapL : dom.finishFlapR;
      flapEl.style.transform = "";
      if (dy < -28) return;
      closeFinishFlap(g.flap);
      return;
    }

    if (g.type === "tape") {
      if (finish.tape >= 0.78) {
        dom.finishTape.style.right = "8%";
        succeedFinish("tape");
      } else {
        playSound("error");
      }
      return;
    }

    if (g.type === "drag") {
      const prop = g.prop;
      const propRect = prop.getBoundingClientRect();
      const boxRect = dom.finishBox.getBoundingClientRect();
      const overBox =
        isPointInElement(event.clientX, event.clientY, dom.finishBox) ||
        domRectsOverlap(propRect, boxRect);
      prop.classList.remove("dragging");
      prop.style.left = "";
      prop.style.top = "";
      prop.style.position = "";

      if (id === "card" && overBox) {
        finish.cardPlaced = true;
        finish.cardSkipped = false;
        prop.classList.add("is-hidden");
        dom.finishCardSlot.classList.add("is-filled");
        dom.finishCardSlot.innerHTML = "<span>" + cardCopy().label + "</span>";
        succeedFinish("card");
        return;
      }
      if (id === "sticker" && overBox && finish.stickerPeeled) {
        finish.stickerPlaced = true;
        prop.classList.add("is-hidden");
        dom.finishStickerSpot.classList.add("is-on");
        dom.finishStickerSpot.textContent = "PP";
        succeedFinish("sticker");
        return;
      }
      if (id === "label" && overBox) {
        finish.labelPlaced = true;
        prop.classList.add("is-hidden");
        dom.finishLabelSpot.classList.add("is-on");
        dom.finishLabelSpot.innerHTML = "<span>SHIP TO</span><em>Cozy Shop</em>";
        succeedFinish("label");
        return;
      }
    }
  }

  function domRectsOverlap(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  function closeFinishFlap(side) {
    const finish = gameState.finish;
    if (!finish) return;
    const el = side === "L" ? dom.finishFlapL : dom.finishFlapR;
    if (side === "L") {
      if (finish.flapL) return;
      finish.flapL = true;
    } else {
      if (finish.flapR) return;
      finish.flapR = true;
    }
    el.style.transform = "";
    el.classList.add("is-closed");
    playSound("flap");
    haptic(10);
    popFinishBox();
    if (finish.flapL && finish.flapR) {
      window.setTimeout(advanceFinish, 320);
    }
  }

  function finishScan() {
    const finish = gameState.finish;
    if (!finish || finish.scanned || finish.completed) return;
    finish.scanned = true;
    finish.gesture = null;
    dom.finishBarcode.classList.add("is-scanned");
    if (dom.finishScanner) dom.finishScanner.classList.add("is-hidden");
    playSound("scan");
    haptic(16);
    popFinishBox();
    window.setTimeout(advanceFinish, 360);
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
    startExpressTimer();
  }

  // ===========================================================================
  // AUDIO
  // Central manager: playSound("tape") etc. Placeholder synths now.
  // Drop a file path into SOUND_BANK[id].src later (e.g. "sounds/tape.mp3")
  // and call sites stay the same.
  // ===========================================================================
  let audioCtx = null;
  const audioBuffers = Object.create(null);

  const SOUND_BANK = {
    place: { src: null, synth: "place" },
    error: { src: null, synth: "error" },
    complete: { src: null, synth: "complete" },
    perfect: { src: null, synth: "perfect" },
    rotate: { src: null, synth: "rotate" },
    tissue: { src: null, synth: "tissue" },
    card: { src: null, synth: "card" },
    flap: { src: null, synth: "flap" },
    peel: { src: null, synth: "peel" },
    tape: { src: null, synth: "tape" },
    sticker: { src: null, synth: "sticker" },
    label: { src: null, synth: "label" },
    scan: { src: null, synth: "scan" },
    shipped: { src: null, synth: "shipped" },
    review: { src: null, synth: "review" },
  };

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
    if (ctx && ctx.state === "suspended") ctx.resume().catch(function () {});
  }

  function playSound(kind) {
    if (!gameState.soundEnabled) return;
    const entry = SOUND_BANK[kind];
    if (!entry) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    resumeAudio();
    if (entry.src) {
      playFileSound(ctx, kind, entry.src, entry.synth);
      return;
    }
    playSynth(ctx, entry.synth || kind);
  }

  function playFileSound(ctx, kind, src, fallback) {
    const playBuffer = function (buffer) {
      const srcNode = ctx.createBufferSource();
      const gain = ctx.createGain();
      srcNode.buffer = buffer;
      gain.gain.value = 0.85;
      srcNode.connect(gain);
      gain.connect(ctx.destination);
      srcNode.start();
    };
    if (audioBuffers[kind]) {
      playBuffer(audioBuffers[kind]);
      return;
    }
    fetch(src)
      .then(function (res) {
        return res.arrayBuffer();
      })
      .then(function (data) {
        return ctx.decodeAudioData(data);
      })
      .then(function (buffer) {
        audioBuffers[kind] = buffer;
        playBuffer(buffer);
      })
      .catch(function () {
        playSynth(ctx, fallback || kind);
      });
  }

  function playSynth(ctx, synth) {
    const now = ctx.currentTime;

    function tone(type, freq, dur, peak, slideTo, delay) {
      const start = now + (delay || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + dur);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    }

    function noiseBurst(dur, peak, filterFreq, delay) {
      const start = now + (delay || 0);
      const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = filterFreq;
      filter.Q.value = 0.75;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(start);
      src.stop(start + dur + 0.02);
    }

    switch (synth) {
      case "place":
        tone("triangle", 720, 0.07, 0.05, null, 0);
        tone("sine", 980, 0.05, 0.03, null, 0.04);
        break;
      case "error":
        tone("square", 180, 0.14, 0.05, 90, 0);
        tone("square", 140, 0.12, 0.03, null, 0.05);
        break;
      case "complete":
        tone("sine", 392, 0.12, 0.06, null, 0);
        tone("sine", 523, 0.12, 0.06, null, 0.1);
        tone("sine", 659, 0.18, 0.07, null, 0.2);
        break;
      case "perfect":
        tone("sine", 523, 0.1, 0.05, null, 0);
        tone("sine", 659, 0.1, 0.05, null, 0.08);
        tone("sine", 784, 0.12, 0.06, null, 0.16);
        tone("triangle", 1046, 0.2, 0.05, null, 0.26);
        break;
      case "rotate":
        tone("triangle", 840, 0.05, 0.035, 980, 0);
        break;
      case "tissue":
        noiseBurst(0.22, 0.07, 2400, 0);
        tone("sine", 880, 0.12, 0.04, 420, 0);
        break;
      case "card":
        tone("triangle", 520, 0.14, 0.09, 340, 0);
        noiseBurst(0.08, 0.04, 1800, 0);
        break;
      case "flap":
        tone("sine", 210, 0.16, 0.1, 140, 0);
        noiseBurst(0.1, 0.05, 400, 0);
        break;
      case "peel":
        noiseBurst(0.2, 0.08, 3200, 0);
        tone("sine", 980, 0.1, 0.03, 1400, 0);
        break;
      case "tape":
        noiseBurst(0.12, 0.06, 1600, 0);
        tone("triangle", 360, 0.08, 0.04, 300, 0);
        break;
      case "sticker":
        tone("sine", 740, 0.16, 0.09, 520, 0);
        noiseBurst(0.08, 0.05, 2200, 0);
        break;
      case "label":
        tone("triangle", 480, 0.18, 0.1, 260, 0);
        noiseBurst(0.06, 0.04, 1400, 0);
        break;
      case "scan":
        tone("square", 1800, 0.07, 0.08, 1400, 0);
        tone("square", 2200, 0.08, 0.07, 1900, 0.07);
        break;
      case "shipped":
        tone("sine", 523.25, 0.14, 0.1, null, 0);
        tone("sine", 659.25, 0.16, 0.1, null, 0.12);
        tone("sine", 783.99, 0.28, 0.12, 1046.5, 0.26);
        break;
      case "review":
        tone("sine", 784, 0.1, 0.045, null, 0);
        tone("triangle", 988, 0.16, 0.05, null, 0.08);
        break;
      default:
        tone("sine", 500, 0.12, 0.08, 400, 0);
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
