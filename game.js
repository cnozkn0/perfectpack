/**
 * Perfect Pack — vanilla JS packing prototype
 * Wrapped in an IIFE so gameplay stays off the global scope.
 *
 * V1_FEATURE_FREEZE — browser playtest build.
 * Do not add major gameplay features. Prefer bugfixes, balance tweaks,
 * ASMR polish, and save/mobile stability until native migration.
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
    SOUND_STORAGE_KEY: "perfect-pack-audio",
    SAVE_STORAGE_KEY: "perfect-pack-save",
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
  // VIRAL_EVENT
  // Rare cozy-to-rush spike. Tunables live here; call sites use viralCfg()
  // and followerProgress() so volume / shop hooks stay in one place.
  // ===========================================================================
  const VIRAL_EVENT = {
    FIRST_AFTER: 4,
    COOLDOWN: 14,
    MIN_RATING: 3.4,
    DURATION_MIN_MS: 180000,
    DURATION_MAX_MS: 300000,
    QUEUE_MIN: 20,
    QUEUE_MAX: 28,
    MAX_ITEMS: 2,
    SKIP_FINISH: true,
    // When true with SKIP_FINISH: short tissue→tape→scan ASMR (~2–4s).
    // When false: keep sealed-snapshot skip (shipViralOrder) behavior.
    QUICK_FINISH: true,
    AUTO_PACK: true,
    BETWEEN_MS: 900,
    BURST_ORDERS: [22, 28],
    BURST_FOLLOWERS: [720, 980],
    FOLLOWERS_PER_SHIP: 42,
    FOLLOWERS_PER_PERFECT: 70,
    FOLLOWERS_ON_FAIL: -18,
    BONUS_PER_SHIP: 14,
    BONUS_PER_PERFECT: 16,
    BONUS_SCORE_REF: 80,
    FOLLOWER_TIERS: [
      { min: 0, id: "local", orderVolumeMult: 1, shopCostMult: 1 },
      { min: 500, id: "known", orderVolumeMult: 1.04, shopCostMult: 1 },
      { min: 2000, id: "popular", orderVolumeMult: 1.1, shopCostMult: 0.98 },
      { min: 8000, id: "famous", orderVolumeMult: 1.18, shopCostMult: 0.95 },
    ],
  };

  // ===========================================================================
  // SHOP_UPGRADES
  // levels[n] is the purchase that raises the upgrade TO level n+1.
  // effects are cumulative for that owned level (not stacked deltas).
  // Call sites read values only through upgradeEffect(key, fallback).
  // ===========================================================================
  const SHOP_UPGRADE_IDS = [
    "packing_table",
    "label_printer",
    "tape_gun",
    "scanner",
    "material_storage",
    "product_shelf",
    "studio_decor",
  ];

  const SHOP_UPGRADES = {
    packing_table: {
      id: "packing_table",
      name: "Packing Table",
      icon: "🪵",
      blurb: "A wider bench. The carton sits larger on the wood.",
      levels: [
        { cost: 35, perk: "Roomier table view", effects: { tableScale: 1.06 } },
        { cost: 95, perk: "Box fills more of the bench", effects: { tableScale: 1.11 } },
        { cost: 240, perk: "Broad studio table", effects: { tableScale: 1.16 } },
        { cost: 520, perk: "Full-span packing desk", effects: { tableScale: 1.21 } },
      ],
    },
    label_printer: {
      id: "label_printer",
      name: "Label Printer",
      icon: "🖨️",
      blurb: "Prints shipping labels faster and helps them catch the lid.",
      levels: [
        {
          cost: 45,
          perk: "Quicker print + magnet snap",
          effects: { labelSnapBoost: 1.35, labelPrintMs: 720 },
        },
        {
          cost: 130,
          perk: "Fast print + wide catch zone",
          effects: { labelSnapBoost: 1.7, labelPrintMs: 520 },
        },
        {
          cost: 310,
          perk: "Near-instant print + sticky labels",
          effects: { labelSnapBoost: 2.1, labelPrintMs: 320 },
        },
      ],
    },
    tape_gun: {
      id: "tape_gun",
      name: "Tape Gun",
      icon: "📎",
      blurb: "A proper dispenser. Less swipe to seal the seam.",
      levels: [
        { cost: 40, perk: "Shorter tape swipe", effects: { tapeEase: 1.35 } },
        { cost: 120, perk: "Fast pull across the lid", effects: { tapeEase: 1.7 } },
        { cost: 300, perk: "One smooth stroke", effects: { tapeEase: 2.2 } },
      ],
    },
    scanner: {
      id: "scanner",
      name: "Scanner",
      icon: "📟",
      blurb: "Cleaner reads. Accuracy gets a small floor bump — it will not save a messy pack.",
      levels: [
        { cost: 50, perk: "+3 Accuracy", effects: { accuracyBonus: 3 } },
        { cost: 140, perk: "+6 Accuracy", effects: { accuracyBonus: 6 } },
        { cost: 320, perk: "+9 Accuracy", effects: { accuracyBonus: 9 } },
        { cost: 600, perk: "+12 Accuracy", effects: { accuracyBonus: 12 } },
      ],
    },
    material_storage: {
      id: "material_storage",
      name: "Material Storage",
      icon: "🗃️",
      blurb: "Bulk wrap. Tissue, bubble, paper, and foam cost less.",
      levels: [
        { cost: 55, perk: "10% off packing materials", effects: { materialCostMult: 0.9 } },
        { cost: 150, perk: "20% off packing materials", effects: { materialCostMult: 0.8 } },
        { cost: 340, perk: "30% off packing materials", effects: { materialCostMult: 0.7 } },
        { cost: 640, perk: "40% off packing materials", effects: { materialCostMult: 0.6 } },
      ],
    },
    product_shelf: {
      id: "product_shelf",
      name: "Product Shelf",
      icon: "🪴",
      blurb: "Stock more SKUs. New catalog items start showing up in orders.",
      levels: [
        { cost: 60, perk: "Beauty + fashion SKUs", effects: { catalogTier: 1 } },
        { cost: 180, perk: "Jewelry + stationery SKUs", effects: { catalogTier: 2 } },
        { cost: 400, perk: "Tech + collectible SKUs", effects: { catalogTier: 3 } },
      ],
    },
    studio_decor: {
      id: "studio_decor",
      name: "Studio Decor",
      icon: "🎀",
      blurb: "A prettier bench. Presentation scores a little higher.",
      levels: [
        { cost: 30, perk: "+4 Aesthetic", effects: { aestheticBonus: 4 } },
        { cost: 95, perk: "+8 Aesthetic", effects: { aestheticBonus: 8 } },
        { cost: 240, perk: "+12 Aesthetic", effects: { aestheticBonus: 12 } },
        { cost: 520, perk: "+16 Aesthetic", effects: { aestheticBonus: 16 } },
      ],
    },
  };

  const UPGRADE_EFFECT_DEFAULTS = {
    tableScale: 1,
    labelSnapBoost: 1,
    labelPrintMs: 900,
    tapeEase: 1,
    accuracyBonus: 0,
    materialCostMult: 1,
    catalogTier: 0,
    aestheticBonus: 0,
  };

  // Matches packing_table Lv4 so Lv0 leaves headroom and Lv4 can fill the viewport.
  const TABLE_SCALE_MAX_BOOST = 1.21;

  function emptyUpgrades() {
    const out = {};
    SHOP_UPGRADE_IDS.forEach(function (id) {
      out[id] = 0;
    });
    return out;
  }

  function upgradeLevel(id) {
    return (gameState.upgrades && gameState.upgrades[id]) || 0;
  }

  function upgradeEffects() {
    const out = Object.assign({}, UPGRADE_EFFECT_DEFAULTS);
    SHOP_UPGRADE_IDS.forEach(function (id) {
      const spec = SHOP_UPGRADES[id];
      const lv = upgradeLevel(id);
      if (!spec || lv <= 0) return;
      const row = spec.levels[lv - 1];
      const effects = row && row.effects;
      if (!effects) return;
      Object.keys(effects).forEach(function (key) {
        out[key] = effects[key];
      });
    });
    return out;
  }

  function upgradeEffect(key, fallback) {
    const effects = upgradeEffects();
    if (Object.prototype.hasOwnProperty.call(effects, key)) return effects[key];
    return fallback;
  }

  function followerProgress() {
    const n = Math.max(0, (gameState && gameState.followers) || 0);
    const tiers = VIRAL_EVENT.FOLLOWER_TIERS;
    let tier = tiers[0];
    for (let i = 0; i < tiers.length; i += 1) {
      if (n >= tiers[i].min) tier = tiers[i];
    }
    return {
      count: n,
      tier: tier.id,
      orderVolumeMult: tier.orderVolumeMult,
      shopCostMult: tier.shopCostMult,
      extraViralQueue: Math.floor(n / 2000),
    };
  }

  function formatFollowers(n) {
    const v = Math.max(0, Math.round(n || 0));
    if (v < 1000) return String(v);
    if (v < 10000) return (Math.round(v / 100) / 10).toFixed(1).replace(/\.0$/, "") + "k";
    return Math.round(v / 1000) + "k";
  }

  
  // ===========================================================================
  // COSMETICS
  // Brand / style unlocks. Separate from SHOP_UPGRADES (no gameplay power).
  // Visuals apply via data-* on #app — never inline styles for cosmetics.
  // Theme-match scoring hook exists but stays OFF in v1.
  // ===========================================================================
  const COSMETIC_CATEGORIES = ["box", "tissue", "sticker", "tape", "table", "background"];

  const COSMETIC_CATEGORY_LABELS = {
    box: "Box Style",
    tissue: "Tissue Style",
    sticker: "Sticker Style",
    tape: "Tape Style",
    table: "Table Style",
    background: "Background / Studio",
  };

  const THEME_MATCH = {
    enabled: false,
    aestheticBonus: 2,
  };

  const COSMETICS = {
    kraft: {
      id: "kraft",
      category: "box",
      name: "Kraft",
      price: 0,
      unlockLevel: 1,
      defaultUnlocked: true,
      previewClass: "preview-box-kraft",
    },
    white_box: {
      id: "white_box",
      category: "box",
      name: "White",
      price: 45,
      unlockLevel: 1,
      defaultUnlocked: false,
      previewClass: "preview-box-white",
    },
    soft_pink_box: {
      id: "soft_pink_box",
      category: "box",
      name: "Soft Pink",
      price: 70,
      unlockLevel: 2,
      defaultUnlocked: false,
      previewClass: "preview-box-soft-pink",
    },
    black_box: {
      id: "black_box",
      category: "box",
      name: "Black",
      price: 95,
      unlockLevel: 3,
      defaultUnlocked: false,
      previewClass: "preview-box-black",
    },
    plain: {
      id: "plain",
      category: "tissue",
      name: "Plain",
      price: 0,
      unlockLevel: 1,
      defaultUnlocked: true,
      previewClass: "preview-tissue-plain",
    },
    hearts: {
      id: "hearts",
      category: "tissue",
      name: "Hearts",
      price: 35,
      unlockLevel: 1,
      defaultUnlocked: false,
      previewClass: "preview-tissue-hearts",
    },
    stars: {
      id: "stars",
      category: "tissue",
      name: "Stars",
      price: 40,
      unlockLevel: 2,
      defaultUnlocked: false,
      previewClass: "preview-tissue-stars",
    },
    minimal_lines: {
      id: "minimal_lines",
      category: "tissue",
      name: "Minimal Lines",
      price: 55,
      unlockLevel: 3,
      defaultUnlocked: false,
      previewClass: "preview-tissue-lines",
    },
    default: {
      id: "default",
      category: "sticker",
      name: "PP Default",
      price: 0,
      unlockLevel: 1,
      defaultUnlocked: true,
      previewClass: "preview-sticker-default",
      stickerLabel: "PP",
    },
    thank_you: {
      id: "thank_you",
      category: "sticker",
      name: "Thank You",
      price: 30,
      unlockLevel: 1,
      defaultUnlocked: false,
      previewClass: "preview-sticker-thanks",
      stickerLabel: "TY",
    },
    heart: {
      id: "heart",
      category: "sticker",
      name: "Heart",
      price: 40,
      unlockLevel: 2,
      defaultUnlocked: false,
      previewClass: "preview-sticker-heart",
      stickerLabel: "♥",
    },
    smile: {
      id: "smile",
      category: "sticker",
      name: "Smile",
      price: 40,
      unlockLevel: 2,
      defaultUnlocked: false,
      previewClass: "preview-sticker-smile",
      stickerLabel: ":)",
    },
    clear: {
      id: "clear",
      category: "tape",
      name: "Clear",
      price: 0,
      unlockLevel: 1,
      defaultUnlocked: true,
      previewClass: "preview-tape-clear",
    },
    pink_tape: {
      id: "pink_tape",
      category: "tape",
      name: "Pink",
      price: 35,
      unlockLevel: 1,
      defaultUnlocked: false,
      previewClass: "preview-tape-pink",
    },
    kraft_tape: {
      id: "kraft_tape",
      category: "tape",
      name: "Kraft",
      price: 45,
      unlockLevel: 2,
      defaultUnlocked: false,
      previewClass: "preview-tape-kraft",
    },
    branded_tape: {
      id: "branded_tape",
      category: "tape",
      name: "Branded",
      price: 80,
      unlockLevel: 4,
      defaultUnlocked: false,
      previewClass: "preview-tape-branded",
    },
    wood: {
      id: "wood",
      category: "table",
      name: "Wood",
      price: 0,
      unlockLevel: 1,
      defaultUnlocked: true,
      previewClass: "preview-table-wood",
    },
    white_table: {
      id: "white_table",
      category: "table",
      name: "White",
      price: 60,
      unlockLevel: 2,
      defaultUnlocked: false,
      previewClass: "preview-table-white",
    },
    pink_table: {
      id: "pink_table",
      category: "table",
      name: "Pink",
      price: 75,
      unlockLevel: 3,
      defaultUnlocked: false,
      previewClass: "preview-table-pink",
    },
    bedroom: {
      id: "bedroom",
      category: "background",
      name: "Bedroom",
      price: 0,
      unlockLevel: 1,
      defaultUnlocked: true,
      previewClass: "preview-bg-bedroom",
    },
    small_studio: {
      id: "small_studio",
      category: "background",
      name: "Small Studio",
      price: 90,
      unlockLevel: 3,
      defaultUnlocked: false,
      previewClass: "preview-bg-small",
    },
    boutique_studio: {
      id: "boutique_studio",
      category: "background",
      name: "Boutique Studio",
      price: 160,
      unlockLevel: 5,
      defaultUnlocked: false,
      previewClass: "preview-bg-boutique",
    },
  };

  const DEFAULT_EQUIPPED_COSMETICS = {
    box: "kraft",
    tissue: "plain",
    sticker: "default",
    tape: "clear",
    table: "wood",
    background: "bedroom",
  };

  function emptyUnlockedCosmetics() {
    const out = {};
    Object.keys(COSMETICS).forEach(function (id) {
      if (COSMETICS[id].defaultUnlocked) out[id] = true;
    });
    return out;
  }

  function defaultEquippedCosmetics() {
    return Object.assign({}, DEFAULT_EQUIPPED_COSMETICS);
  }

  function cosmeticsInCategory(category) {
    return Object.keys(COSMETICS)
      .map(function (id) {
        return COSMETICS[id];
      })
      .filter(function (c) {
        return c.category === category;
      });
  }

  function isCosmeticUnlocked(id) {
    return !!(gameState.unlockedCosmetics && gameState.unlockedCosmetics[id]);
  }

  function equippedCosmeticId(category) {
    const eq = gameState.equippedCosmetics || DEFAULT_EQUIPPED_COSMETICS;
    return eq[category] || DEFAULT_EQUIPPED_COSMETICS[category];
  }

  function equippedCosmetic(category) {
    return COSMETICS[equippedCosmeticId(category)] || null;
  }

  function stickerLabelText() {
    const c = equippedCosmetic("sticker");
    return (c && c.stickerLabel) || "PP";
  }

  function themeMatchAestheticBonus() {
    if (!THEME_MATCH.enabled) return 0;
    // Reserved for customer-request theme matches (gift/birthday/premium).
    return 0;
  }

  function applyEquippedCosmetics() {
    if (!dom.app) return;
    const eq = gameState.equippedCosmetics || DEFAULT_EQUIPPED_COSMETICS;
    COSMETIC_CATEGORIES.forEach(function (cat) {
      const id = eq[cat] || DEFAULT_EQUIPPED_COSMETICS[cat];
      dom.app.setAttribute("data-" + cat, id);
    });
    if (dom.finishSticker) {
      const label = stickerLabelText();
      const span = dom.finishSticker.querySelector("span");
      if (span) span.textContent = label;
      else dom.finishSticker.textContent = label;
    }
  }


  // ===========================================================================
  // PRODUCT_TYPES
  // Booleans default false. Instance state (protection, compress) lives on
  // each spawned product, not on the type.
  // `category` drives generator themes / variety (not a gameplay rule).
  // Keep legacy ids (jewelry_box, poster, …) so curated ORDERS stay valid.
  // ===========================================================================
  const PRODUCT_CATEGORIES = [
    "fashion",
    "beauty",
    "home",
    "jewelry",
    "stationery",
    "tech",
    "collectible",
  ];

  const PRODUCT_TYPES = {
    // —— Tier 0: basic lifestyle ——
    candle: productType({
      id: "candle",
      name: "Candle",
      category: "beauty",
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
    soap: productType({
      id: "soap",
      name: "Soap",
      category: "beauty",
      width: 58,
      height: 38,
      icon: "🧼",
      soft: true,
      weight: 0.2,
      salePrice: 9,
      productCost: 3,
    }),
    mug: productType({
      id: "mug",
      name: "Mug",
      category: "home",
      width: 75,
      height: 75,
      icon: "☕",
      fragile: true,
      requiredProtection: 8,
      weight: 0.95,
      salePrice: 18,
      productCost: 7,
    }),
    small_plush: productType({
      id: "small_plush",
      name: "Plush",
      category: "home",
      width: 78,
      height: 70,
      icon: "🧸",
      soft: true,
      compressible: true,
      weight: 0.22,
      salePrice: 16,
      productCost: 6,
    }),
    tshirt: productType({
      id: "tshirt",
      name: "T-Shirt",
      category: "fashion",
      width: 110,
      height: 70,
      icon: "👕",
      soft: true,
      compressible: true,
      weight: 0.25,
      salePrice: 22,
      productCost: 8,
    }),
    socks: productType({
      id: "socks",
      name: "Socks",
      category: "fashion",
      width: 70,
      height: 50,
      icon: "🧦",
      soft: true,
      compressible: true,
      weight: 0.15,
      salePrice: 10,
      productCost: 3,
    }),
    tote_bag: productType({
      id: "tote_bag",
      name: "Tote Bag",
      category: "fashion",
      width: 100,
      height: 80,
      icon: "👜",
      soft: true,
      compressible: true,
      weight: 0.28,
      salePrice: 20,
      productCost: 7,
    }),

    // —— Tier 1: beauty + fashion (+ a few home gifts) ——
    perfume: productType({
      id: "perfume",
      name: "Perfume",
      category: "beauty",
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
      unlockTier: 1,
    }),
    lip_gloss: productType({
      id: "lip_gloss",
      name: "Lip Gloss",
      category: "beauty",
      width: 28,
      height: 62,
      icon: "💄",
      liquid: true,
      uprightOnly: true,
      requiredProtection: 3,
      weight: 0.08,
      salePrice: 14,
      productCost: 5,
      unlockTier: 1,
    }),
    cosmetic_pouch: productType({
      id: "cosmetic_pouch",
      name: "Pouch",
      category: "beauty",
      width: 88,
      height: 52,
      icon: "👛",
      soft: true,
      compressible: true,
      weight: 0.18,
      salePrice: 18,
      productCost: 6,
      unlockTier: 1,
    }),
    hoodie: productType({
      id: "hoodie",
      name: "Hoodie",
      category: "fashion",
      width: 128,
      height: 86,
      icon: "🧥",
      soft: true,
      compressible: true,
      weight: 0.55,
      salePrice: 38,
      productCost: 14,
      unlockTier: 1,
    }),
    cap: productType({
      id: "cap",
      name: "Cap",
      category: "fashion",
      width: 82,
      height: 48,
      icon: "🧢",
      soft: true,
      compressible: true,
      weight: 0.16,
      salePrice: 18,
      productCost: 6,
      unlockTier: 1,
    }),
    scarf: productType({
      id: "scarf",
      name: "Scarf",
      category: "fashion",
      width: 140,
      height: 36,
      icon: "🧣",
      soft: true,
      compressible: true,
      weight: 0.2,
      salePrice: 24,
      productCost: 8,
      unlockTier: 1,
    }),
    ceramic_bowl: productType({
      id: "ceramic_bowl",
      name: "Bowl",
      category: "home",
      width: 96,
      height: 48,
      icon: "🥣",
      fragile: true,
      requiredProtection: 7,
      weight: 0.7,
      salePrice: 22,
      productCost: 8,
      unlockTier: 1,
    }),
    small_vase: productType({
      id: "small_vase",
      name: "Vase",
      category: "home",
      width: 42,
      height: 88,
      icon: "🏺",
      fragile: true,
      uprightOnly: true,
      requiredProtection: 8,
      weight: 0.55,
      salePrice: 28,
      productCost: 10,
      unlockTier: 1,
    }),
    photo_frame: productType({
      id: "photo_frame",
      name: "Frame",
      category: "home",
      width: 100,
      height: 72,
      icon: "🖼️",
      fragile: true,
      bendable: false,
      requiredProtection: 5,
      weight: 0.4,
      salePrice: 20,
      productCost: 7,
      unlockTier: 1,
    }),

    // —— Tier 2: jewelry + stationery ——
    jewelry_box: productType({
      id: "jewelry_box",
      name: "Ring Box",
      category: "jewelry",
      width: 44,
      height: 36,
      icon: "💍",
      weight: 0.2,
      salePrice: 48,
      productCost: 18,
      unlockTier: 2,
    }),
    necklace_box: productType({
      id: "necklace_box",
      name: "Necklace",
      category: "jewelry",
      width: 72,
      height: 42,
      icon: "📿",
      weight: 0.25,
      salePrice: 52,
      productCost: 20,
      unlockTier: 2,
    }),
    earrings: productType({
      id: "earrings",
      name: "Earrings",
      category: "jewelry",
      width: 34,
      height: 34,
      icon: "✨",
      fragile: true,
      requiredProtection: 3,
      weight: 0.05,
      salePrice: 30,
      productCost: 11,
      unlockTier: 2,
    }),
    notebook: productType({
      id: "notebook",
      name: "Notebook",
      category: "stationery",
      width: 80,
      height: 100,
      icon: "📓",
      bendable: false,
      weight: 0.5,
      salePrice: 16,
      productCost: 6,
      unlockTier: 2,
    }),
    pen_set: productType({
      id: "pen_set",
      name: "Pen Set",
      category: "stationery",
      width: 120,
      height: 32,
      icon: "🖊️",
      bendable: false,
      weight: 0.18,
      salePrice: 15,
      productCost: 5,
      unlockTier: 2,
    }),
    sticker_pack: productType({
      id: "sticker_pack",
      name: "Stickers",
      category: "stationery",
      width: 64,
      height: 64,
      icon: "🏷️",
      soft: true,
      compressible: true,
      weight: 0.06,
      salePrice: 8,
      productCost: 2,
      unlockTier: 2,
    }),

    // —— Tier 3: tech + collectibles ——
    phone_case: productType({
      id: "phone_case",
      name: "Phone Case",
      category: "tech",
      width: 52,
      height: 90,
      icon: "📱",
      bendable: false,
      weight: 0.12,
      salePrice: 19,
      productCost: 6,
      unlockTier: 3,
    }),
    charging_cable: productType({
      id: "charging_cable",
      name: "Cable",
      category: "tech",
      width: 130,
      height: 30,
      icon: "🔌",
      soft: true,
      compressible: true,
      weight: 0.1,
      salePrice: 12,
      productCost: 4,
      unlockTier: 3,
    }),
    earbuds_case: productType({
      id: "earbuds_case",
      name: "Earbuds",
      category: "tech",
      width: 48,
      height: 48,
      icon: "🎧",
      fragile: true,
      requiredProtection: 4,
      weight: 0.15,
      salePrice: 28,
      productCost: 10,
      unlockTier: 3,
    }),
    power_bank: productType({
      id: "power_bank",
      name: "Power Bank",
      category: "tech",
      width: 70,
      height: 110,
      icon: "🔋",
      bendable: false,
      weight: 0.85,
      salePrice: 32,
      productCost: 12,
      unlockTier: 3,
    }),
    blind_box: productType({
      id: "blind_box",
      name: "Blind Box",
      category: "collectible",
      width: 60,
      height: 70,
      icon: "🎁",
      fragile: true,
      requiredProtection: 3,
      weight: 0.3,
      salePrice: 26,
      productCost: 9,
      unlockTier: 3,
    }),
    mini_figure: productType({
      id: "mini_figure",
      name: "Figure",
      category: "collectible",
      width: 40,
      height: 58,
      icon: "🗽",
      fragile: true,
      uprightOnly: true,
      requiredProtection: 5,
      weight: 0.14,
      salePrice: 24,
      productCost: 8,
      unlockTier: 3,
    }),
    trading_card_pack: productType({
      id: "trading_card_pack",
      name: "Cards",
      category: "collectible",
      width: 58,
      height: 80,
      icon: "🃏",
      soft: true,
      compressible: true,
      weight: 0.08,
      salePrice: 14,
      productCost: 4,
      unlockTier: 3,
    }),
    poster: productType({
      id: "poster",
      name: "Poster",
      category: "collectible",
      width: 168,
      height: 28,
      icon: "📜",
      bendable: false,
      weight: 0.12,
      salePrice: 14,
      productCost: 4,
      unlockTier: 3,
    }),
  };

  function productType(spec) {
    return Object.assign(
      {
        category: "home",
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
        unlockTier: 0,
        silhouette: true,
        soundFamily: null,
        prep: null,
      },
      spec
    );
  }

  function productSoundFamily(type) {
    if (!type) return "hard";
    if (type.soundFamily) return type.soundFamily;
    if (type.soft || type.compressible) return "soft";
    if (type.liquid || type.fragile) return "glass";
    if (
      type.category === "stationery" ||
      type.id === "poster" ||
      type.id === "trading_card_pack"
    ) {
      return "paper";
    }
    return "hard";
  }

  function productPrepKind(type) {
    if (!type) return null;
    if (type.prep) return type.prep;
    if (
      type.id === "tshirt" ||
      type.id === "hoodie" ||
      type.id === "scarf" ||
      type.id === "tote_bag"
    ) {
      return "fold";
    }
    if (type.id === "jewelry_box" || type.id === "necklace_box") return "lid";
    if (type.id === "perfume" || type.id === "lip_gloss") return "cap";
    if (type.id === "notebook" || type.id === "pen_set" || type.id === "sticker_pack") {
      return "paper";
    }
    return null;
  }

  const PREP_SOUNDS = {
    fold: "prep_fold",
    lid: "prep_lid",
    cap: "prep_cap",
    paper: "prep_paper",
  };

  const WRAP_SOUNDS = {
    bubble: "wrap_bubble",
    paper_fill: "wrap_paper",
    tissue: "wrap_tissue",
    foam: "wrap_foam",
  };

  const PICK_SOUNDS = {
    soft: "soft_pick",
    hard: "hard_pick",
    glass: "glass_pick",
    paper: "paper_pick",
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
  // HYBRID PROCEDURAL ORDER GENERATOR
  // Curated ORDERS stay as showcase / early-game pool. After CURATED_FIRST
  // shipped orders, normal play increasingly uses generateProceduralOrder().
  // Fit check runs only at generation time (never per frame).
  // ===========================================================================
  const ORDER_GEN = {
    CURATED_FIRST: 3,
    SHOWCASE_EVERY: 6,
    SIGNATURE_MEMORY: 5,
    CATEGORY_MEMORY: 3,
    MAX_ATTEMPTS: 28,
    GRID_STEP: 8,
    // Soft area slack so packing still feels intentional, not razor-tight.
    AREA_SLACK: 1.08,
  };

  // Themed procedural beats — not separate game modes.
  const ORDER_THEMES = {
    MIXED: { id: "MIXED", categories: null },
    BEAUTY: { id: "BEAUTY", categories: ["beauty"] },
    FASHION: { id: "FASHION", categories: ["fashion"] },
    GIFT: { id: "GIFT", categories: ["beauty", "jewelry", "home"] },
    STATIONERY: { id: "STATIONERY", categories: ["stationery"] },
  };

  // Difficulty 1–10 bands. catalogMax is a soft preference; unlockTier still wins.
  const ORDER_RULES = {
    1: { minItems: 1, maxItems: 2, fragileBias: 0.15, requestChance: 0.08, multiFragile: false, hardSpatial: false },
    2: { minItems: 1, maxItems: 2, fragileBias: 0.2, requestChance: 0.12, multiFragile: false, hardSpatial: false },
    3: { minItems: 2, maxItems: 3, fragileBias: 0.35, requestChance: 0.2, multiFragile: false, hardSpatial: false },
    4: { minItems: 2, maxItems: 3, fragileBias: 0.4, requestChance: 0.28, multiFragile: true, hardSpatial: false },
    5: { minItems: 3, maxItems: 4, fragileBias: 0.5, requestChance: 0.35, multiFragile: true, hardSpatial: true },
    6: { minItems: 3, maxItems: 4, fragileBias: 0.55, requestChance: 0.4, multiFragile: true, hardSpatial: true },
    7: { minItems: 4, maxItems: 5, fragileBias: 0.6, requestChance: 0.45, multiFragile: true, hardSpatial: true },
    8: { minItems: 4, maxItems: 5, fragileBias: 0.65, requestChance: 0.5, multiFragile: true, hardSpatial: true },
    9: { minItems: 4, maxItems: 6, fragileBias: 0.7, requestChance: 0.55, multiFragile: true, hardSpatial: true },
    10: { minItems: 5, maxItems: 6, fragileBias: 0.75, requestChance: 0.65, multiFragile: true, hardSpatial: true },
  };

  const ORDER_GEN_REQUEST_POOL = [
    "GIFT",
    "ECO",
    "DISCREET",
    "FRAGILE_PLUS",
    "EXPRESS",
    "NO_INVOICE",
    "BIRTHDAY",
    "PREMIUM",
  ];

  function orderRulesForDifficulty(difficulty) {
    const d = clamp(Math.round(difficulty), 1, 10);
    return ORDER_RULES[d] || ORDER_RULES[1];
  }

  function computeOrderDifficulty() {
    const level = Math.max(1, gameState.level || 1);
    const orders = Math.max(0, gameState.totalOrders || 0);
    const rating = clamp(gameState.shopRating || 5, 1, 5);
    // Slow curve: level + order volume, tempered by healthy rating.
    let d = 1;
    d += Math.min(4, (level - 1) * 0.55);
    d += Math.min(4, orders / 7);
    d += (rating - 3.5) * 0.45;
    return clamp(Math.round(d), 1, 10);
  }

  function catalogTierUnlocked() {
    return upgradeEffect("catalogTier", 0);
  }

  function unlockedProductIds() {
    const tier = catalogTierUnlocked();
    return Object.keys(PRODUCT_TYPES).filter(function (id) {
      return ((PRODUCT_TYPES[id] && PRODUCT_TYPES[id].unlockTier) || 0) <= tier;
    });
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function orderRng() {
    const seed =
      ((gameState.totalOrders || 0) + 1) * 9973 +
      (gameState.level || 1) * 131 +
      Math.round((gameState.shopRating || 5) * 10) * 17 +
      (gameState.orderGenSalt || 0);
    return mulberry32(seed >>> 0);
  }

  function pickWeighted(list, weightFn, rand) {
    let total = 0;
    const weights = list.map(function (item) {
      const w = Math.max(0, weightFn(item));
      total += w;
      return w;
    });
    if (total <= 0) return list[Math.floor(rand() * list.length)] || null;
    let roll = rand() * total;
    for (let i = 0; i < list.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  function orderSignature(template) {
    const items = template && template.items ? template.items : {};
    const keys = Object.keys(items).sort();
    const body = keys
      .map(function (id) {
        return id + ":" + items[id];
      })
      .join(",");
    // Items + request only — idealBox is derived and should not inflate variety.
    return body + "|" + (template.request || "-");
  }

  function rememberOrderSignature(sig) {
    if (!sig) return;
    if (!Array.isArray(gameState.recentOrderSignatures)) {
      gameState.recentOrderSignatures = [];
    }
    gameState.recentOrderSignatures.unshift(sig);
    if (gameState.recentOrderSignatures.length > ORDER_GEN.SIGNATURE_MEMORY) {
      gameState.recentOrderSignatures.length = ORDER_GEN.SIGNATURE_MEMORY;
    }
  }

  function isRecentOrderSignature(sig) {
    const list = gameState.recentOrderSignatures || [];
    return list.indexOf(sig) !== -1;
  }

  function dominantCategoriesFromItems(items) {
    const tallies = {};
    Object.keys(items || {}).forEach(function (id) {
      const type = PRODUCT_TYPES[id];
      const cat = (type && type.category) || "home";
      tallies[cat] = (tallies[cat] || 0) + (items[id] || 0);
    });
    return Object.keys(tallies).sort(function (a, b) {
      return tallies[b] - tallies[a];
    });
  }

  function rememberOrderCategories(items) {
    if (!Array.isArray(gameState.recentOrderCategories)) {
      gameState.recentOrderCategories = [];
    }
    const cats = dominantCategoriesFromItems(items);
    if (!cats.length) return;
    gameState.recentOrderCategories.unshift(cats[0]);
    if (gameState.recentOrderCategories.length > ORDER_GEN.CATEGORY_MEMORY) {
      gameState.recentOrderCategories.length = ORDER_GEN.CATEGORY_MEMORY;
    }
  }

  function recentCategoryCounts() {
    const counts = {};
    (gameState.recentOrderCategories || []).forEach(function (cat) {
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }

  function pickOrderTheme(pool, rand) {
    const unlockedCats = {};
    pool.forEach(function (id) {
      const cat = PRODUCT_TYPES[id] && PRODUCT_TYPES[id].category;
      if (cat) unlockedCats[cat] = true;
    });
    const recent = recentCategoryCounts();
    const themeIds = Object.keys(ORDER_THEMES);
    return pickWeighted(
      themeIds,
      function (themeId) {
        const theme = ORDER_THEMES[themeId];
        let w = themeId === "MIXED" ? 1.35 : 1;
        if (theme.categories) {
          const available = theme.categories.filter(function (c) {
            return unlockedCats[c];
          });
          if (!available.length) return 0;
          // If last 3 orders shared a category this theme leans on, down-weight it.
          let overlap = 0;
          available.forEach(function (c) {
            overlap += recent[c] || 0;
          });
          if (overlap >= ORDER_GEN.CATEGORY_MEMORY) w *= 0.15;
          else if (overlap >= 2) w *= 0.4;
          else if (overlap === 1) w *= 0.75;
        } else {
          // MIXED: slightly prefer when recent orders were mono-category.
          const mono = Object.keys(recent).some(function (c) {
            return (recent[c] || 0) >= 2;
          });
          if (mono) w *= 1.4;
        }
        return w;
      },
      rand
    );
  }

  function poolForTheme(pool, themeId) {
    const theme = ORDER_THEMES[themeId] || ORDER_THEMES.MIXED;
    if (!theme.categories) return pool.slice();
    const filtered = pool.filter(function (id) {
      const cat = PRODUCT_TYPES[id] && PRODUCT_TYPES[id].category;
      return theme.categories.indexOf(cat) !== -1;
    });
    // Need enough SKUs for variety; otherwise fall back to mixed pool.
    if (filtered.length < 2) return pool.slice();
    return filtered;
  }

  function logGeneratedOrder(entry) {
    if (!Array.isArray(gameState.orderGenLog)) gameState.orderGenLog = [];
    gameState.orderGenLog.unshift(entry);
    if (gameState.orderGenLog.length > 24) gameState.orderGenLog.length = 24;
    if (typeof refreshOrdersDebugPanel === "function") refreshOrdersDebugPanel();
  }

  function itemOrientationsForType(type, padExtra) {
    const pad = Math.max(0, padExtra || 0) * 2;
    const w = type.width + pad;
    const h = type.height + pad;
    if (type.uprightOnly) return [{ w: w, h: h }];
    if (w === h) return [{ w: w, h: h }];
    return [
      { w: w, h: h },
      { w: h, h: w },
    ];
  }

  /** Estimate one wrap's pad so generated ideal boxes stay wrap-feasible. */
  function estimatedProtectionPad(type) {
    if (!type) return 0;
    const need = type.requiredProtection || 0;
    if (need <= 0 && !type.fragile) return 0;
    if (need <= 5) return 7;
    if (need <= 8) return 10;
    return 12;
  }

  // Deterministic grid backtracking. Generation / score-time only (never per frame).
  function canPackTypeListInBox(typeIds, box, options) {
    const opts = options || {};
    const step = opts.step || ORDER_GEN.GRID_STEP;
    const assumePad = !!opts.assumeProtectionPad;
    const pieces = typeIds.map(function (id, index) {
      const type = PRODUCT_TYPES[id];
      const pad = assumePad ? estimatedProtectionPad(type) : 0;
      return {
        index: index,
        id: id,
        orients: itemOrientationsForType(type, pad),
      };
    });
    // Largest first reduces branching.
    pieces.sort(function (a, b) {
      const aa = a.orients[0].w * a.orients[0].h;
      const bb = b.orients[0].w * b.orients[0].h;
      return bb - aa;
    });

    const placed = [];
    let visits = 0;
    const maxVisits = opts.maxVisits || 60000;
    function overlaps(x, y, w, h) {
      for (let i = 0; i < placed.length; i += 1) {
        const p = placed[i];
        if (x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y) return true;
      }
      return false;
    }

    function solve(idx) {
      if (idx >= pieces.length) return true;
      if (++visits > maxVisits) return false;
      const piece = pieces[idx];
      for (let o = 0; o < piece.orients.length; o += 1) {
        const ori = piece.orients[o];
        if (ori.w > box.width || ori.h > box.height) continue;
        for (let y = 0; y <= box.height - ori.h; y += step) {
          for (let x = 0; x <= box.width - ori.w; x += step) {
            if (overlaps(x, y, ori.w, ori.h)) continue;
            placed.push({ x: x, y: y, w: ori.w, h: ori.h });
            if (solve(idx + 1)) return true;
            placed.pop();
          }
        }
      }
      return false;
    }

    // Quick rejection: area.
    let area = 0;
    typeIds.forEach(function (id) {
      const type = PRODUCT_TYPES[id];
      const pad = assumePad ? estimatedProtectionPad(type) : 0;
      const orients = itemOrientationsForType(type, pad);
      let bestArea = Infinity;
      orients.forEach(function (ori) {
        const a = ori.w * ori.h;
        if (a < bestArea) bestArea = a;
      });
      area += bestArea;
    });
    if (area * ORDER_GEN.AREA_SLACK > box.width * box.height) return false;
    for (let i = 0; i < typeIds.length; i += 1) {
      const type = PRODUCT_TYPES[typeIds[i]];
      const pad = assumePad ? estimatedProtectionPad(type) : 0;
      const orients = itemOrientationsForType(type, pad);
      const fitsOne = orients.some(function (ori) {
        return ori.w <= box.width && ori.h <= box.height;
      });
      if (!fitsOne) return false;
    }
    return solve(0);
  }

  function canPackAabbsInBox(sizes, box, options) {
    const opts = options || {};
    const step = opts.step || ORDER_GEN.GRID_STEP;
    const pieces = sizes.map(function (s, index) {
      const upright = !!s.uprightOnly;
      const orients =
        upright || s.w === s.h
          ? [{ w: s.w, h: s.h }]
          : [
              { w: s.w, h: s.h },
              { w: s.h, h: s.w },
            ];
      return { index: index, orients: orients };
    });
    pieces.sort(function (a, b) {
      return b.orients[0].w * b.orients[0].h - a.orients[0].w * a.orients[0].h;
    });
    const placed = [];
    let visits = 0;
    function overlaps(x, y, w, h) {
      for (let i = 0; i < placed.length; i += 1) {
        const p = placed[i];
        if (x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y) return true;
      }
      return false;
    }
    function solve(idx) {
      if (idx >= pieces.length) return true;
      if (++visits > 60000) return false;
      const piece = pieces[idx];
      for (let o = 0; o < piece.orients.length; o += 1) {
        const ori = piece.orients[o];
        if (ori.w > box.width || ori.h > box.height) continue;
        for (let y = 0; y <= box.height - ori.h; y += step) {
          for (let x = 0; x <= box.width - ori.w; x += step) {
            if (overlaps(x, y, ori.w, ori.h)) continue;
            placed.push({ x: x, y: y, w: ori.w, h: ori.h });
            if (solve(idx + 1)) return true;
            placed.pop();
          }
        }
      }
      return false;
    }
    let area = 0;
    for (let i = 0; i < sizes.length; i += 1) area += sizes[i].w * sizes[i].h;
    if (area * ORDER_GEN.AREA_SLACK > box.width * box.height) return false;
    return solve(0);
  }

  function flattenItemsMap(items) {
    const list = [];
    Object.keys(items).forEach(function (id) {
      const n = items[id] || 0;
      for (let i = 0; i < n; i += 1) list.push(id);
    });
    return list;
  }

  function findIdealBoxForItems(items, options) {
    const list = flattenItemsMap(items);
    if (!list.length) return "small";
    const opts = Object.assign({ assumeProtectionPad: true }, options || {});
    const ids = ["small", "medium", "large"];
    for (let i = 0; i < ids.length; i += 1) {
      const box = BOX_TYPES[ids[i]];
      if (canPackTypeListInBox(list, box, opts)) return box.id;
    }
    return null;
  }

  function orderHasFragile(items) {
    return Object.keys(items).some(function (id) {
      return PRODUCT_TYPES[id] && PRODUCT_TYPES[id].fragile;
    });
  }

  function countFragile(items) {
    let n = 0;
    Object.keys(items).forEach(function (id) {
      if (PRODUCT_TYPES[id] && PRODUCT_TYPES[id].fragile) n += items[id] || 0;
    });
    return n;
  }

  function ecoProtectionFeasible(items) {
    // Non-plastic mats: tissue(1) + paper_fill(5). Max 3 wraps.
    const maxEco = 5 * CONFIG.MAX_WRAPS;
    return Object.keys(items).every(function (id) {
      const type = PRODUCT_TYPES[id];
      const need = (type && type.requiredProtection) || 0;
      return need <= maxEco;
    });
  }

  function requestCompatibleWithItems(requestId, items) {
    if (!requestId || !REQUEST_TYPES[requestId]) return false;
    if (requestId === "FRAGILE_PLUS" && !orderHasFragile(items)) return false;
    if (requestId === "ECO" && !ecoProtectionFeasible(items)) return false;
    // PREMIUM / GIFT / BIRTHDAY never require locked cosmetics — finish card + wraps suffice.
    return true;
  }

  function pickRequestForItems(items, rules, rand) {
    if (rand() > rules.requestChance) return null;
    const pool = ORDER_GEN_REQUEST_POOL.filter(function (id) {
      return requestCompatibleWithItems(id, items);
    });
    if (!pool.length) return null;
    // Bias FRAGILE_PLUS when fragile-heavy.
    return pickWeighted(
      pool,
      function (id) {
        if (id === "FRAGILE_PLUS") return countFragile(items) >= 2 ? 3 : 1.4;
        if (id === "ECO") return 1.1;
        if (id === "PREMIUM") return rules.hardSpatial ? 1.3 : 0.9;
        return 1;
      },
      rand
    );
  }

  function buildItemsCandidate(rules, pool, rand, themeId) {
    const themePool = poolForTheme(pool, themeId);
    const recent = recentCategoryCounts();
    const target = rules.minItems + Math.floor(rand() * (rules.maxItems - rules.minItems + 1));
    const items = {};
    let count = 0;
    let fragileCount = 0;
    let guard = 0;
    while (count < target && guard < 40) {
      guard += 1;
      const id = pickWeighted(
        themePool,
        function (pid) {
          const type = PRODUCT_TYPES[pid];
          let w = 1;
          if (type.fragile) w += rules.fragileBias * 2;
          else w += (1 - rules.fragileBias) * 0.8;
          if (
            rules.hardSpatial &&
            (type.width >= 100 || type.height >= 100 || type.width >= 150 || type.id === "poster")
          ) {
            w += 0.8;
          }
          const cat = type.category || "home";
          if ((recent[cat] || 0) >= 2) w *= 0.35;
          else if ((recent[cat] || 0) === 1) w *= 0.7;
          if ((items[pid] || 0) >= 2) w *= 0.35;
          if ((items[pid] || 0) >= 3) w *= 0.15;
          return w;
        },
        rand
      );
      if (!id) break;
      if (PRODUCT_TYPES[id].fragile && !rules.multiFragile && fragileCount >= 1 && rand() > 0.35) {
        continue;
      }
      items[id] = (items[id] || 0) + 1;
      count += 1;
      if (PRODUCT_TYPES[id].fragile) fragileCount += 1;
    }
    return items;
  }

  function generateProceduralOrder() {
    const difficulty = computeOrderDifficulty();
    const rules = orderRulesForDifficulty(difficulty);
    const pool = unlockedProductIds();
    if (!pool.length) return null;
    const rand = orderRng();
    gameState.orderGenSalt = (gameState.orderGenSalt || 0) + 1;
    const themeId = pickOrderTheme(pool, rand) || "MIXED";

    for (let attempt = 0; attempt < ORDER_GEN.MAX_ATTEMPTS; attempt += 1) {
      const items = buildItemsCandidate(rules, pool, rand, themeId);
      if (!itemCount(items)) continue;
      if (rules.multiFragile && difficulty >= 5 && countFragile(items) < 2 && attempt < 12) {
        continue;
      }
      const idealBox = findIdealBoxForItems(items);
      if (!idealBox) continue;
      // Hard spatial: prefer when small is impossible (needs M/L).
      if (rules.hardSpatial && idealBox === "small" && difficulty >= 7 && attempt < 16) {
        continue;
      }
      const request = pickRequestForItems(items, rules, rand);
      if (request && !requestCompatibleWithItems(request, items)) continue;
      const template = {
        id: "gen-" + (gameState.totalOrders + 1) + "-" + attempt,
        items: items,
        idealBox: idealBox,
        request: request,
        source: "generated",
        difficulty: difficulty,
        theme: themeId,
      };
      const sig = orderSignature(template);
      if (isRecentOrderSignature(sig) && attempt < ORDER_GEN.MAX_ATTEMPTS - 3) continue;
      logGeneratedOrder({
        at: Date.now(),
        difficulty: difficulty,
        theme: themeId,
        signature: sig,
        idealBox: idealBox,
        request: request,
        items: Object.assign({}, items),
      });
      return template;
    }
    return null;
  }

  function shouldUseOrderGenerator() {
    const shipped = gameState.totalOrders || 0;
    if (shipped < ORDER_GEN.CURATED_FIRST) return false;
    // Periodic curated showcase beat.
    if (ORDER_GEN.SHOWCASE_EVERY > 0 && (shipped + 1) % ORDER_GEN.SHOWCASE_EVERY === 0) {
      return false;
    }
    const d = computeOrderDifficulty();
    const chance = clamp(0.35 + d * 0.055, 0.35, 0.88);
    return orderRng()() < chance;
  }

  function pickCuratedOrder() {
    const n = ORDERS.length;
    for (let i = 0; i < n; i += 1) {
      const idx = (gameState.orderIndex + i) % n;
      const template = ORDERS[idx];
      if (!orderUnlocked(template)) continue;
      const sig = orderSignature(template);
      if (isRecentOrderSignature(sig) && i < n - 1) continue;
      gameState.orderIndex = idx;
      return Object.assign({ source: "curated" }, template);
    }
    // Fallback: first unlocked, even if signature repeats.
    for (let j = 0; j < n; j += 1) {
      const idx = (gameState.orderIndex + j) % n;
      if (orderUnlocked(ORDERS[idx])) {
        gameState.orderIndex = idx;
        return Object.assign({ source: "curated" }, ORDERS[idx]);
      }
    }
    return Object.assign({ source: "curated" }, ORDERS[gameState.orderIndex % n]);
  }

  function ordersDebugEnabled() {
    try {
      return new URLSearchParams(window.location.search).get("orders") === "1";
    } catch (err) {
      return false;
    }
  }

  function ensureOrdersDebugPanel() {
    if (!ordersDebugEnabled()) return null;
    let panel = document.getElementById("orders-debug");
    if (panel) return panel;
    panel = document.createElement("aside");
    panel.id = "orders-debug";
    panel.className = "orders-debug";
    panel.innerHTML =
      '<header><strong>ORDER GEN</strong><button type="button" id="orders-debug-close" aria-label="Close">×</button></header>' +
      '<p class="orders-debug-meta" id="orders-debug-meta"></p>' +
      '<ol id="orders-debug-list"></ol>';
    document.body.appendChild(panel);
    const closeBtn = panel.querySelector("#orders-debug-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        panel.hidden = true;
      });
    }
    return panel;
  }

  function refreshOrdersDebugPanel() {
    if (!ordersDebugEnabled()) return;
    const panel = ensureOrdersDebugPanel();
    if (!panel) return;
    panel.hidden = false;
    const meta = panel.querySelector("#orders-debug-meta");
    const list = panel.querySelector("#orders-debug-list");
    const d = computeOrderDifficulty();
    const rules = orderRulesForDifficulty(d);
    if (meta) {
      meta.textContent =
        "diff " +
        d +
        " · items " +
        rules.minItems +
        "–" +
        rules.maxItems +
        " · req " +
        Math.round(rules.requestChance * 100) +
        "% · tier " +
        catalogTierUnlocked() +
        " · gen=" +
        (shouldUseOrderGenerator() ? "likely" : "curated-bias") +
        " · cats " +
        ((gameState.recentOrderCategories || []).join(">") || "—");
    }
    if (!list) return;
    list.innerHTML = "";
    const rows = gameState.orderGenLog || [];
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.textContent = "No generated orders yet.";
      list.appendChild(empty);
      return;
    }
    rows.forEach(function (row) {
      const li = document.createElement("li");
      const parts = Object.keys(row.items || {})
        .map(function (id) {
          return id + "×" + row.items[id];
        })
        .join(", ");
      li.textContent =
        "D" +
        row.difficulty +
        (row.theme ? " · " + row.theme : "") +
        " · " +
        (row.idealBox || "?") +
        " · " +
        (row.request || "—") +
        " · " +
        parts;
      list.appendChild(li);
    });
  }

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
    recentOrderSignatures: [],
    recentOrderCategories: [],
    orderGenLog: [],
    orderGenSalt: 0,
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
    asmrMode: false,
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
    stage: "desk",
    upgrades: emptyUpgrades(),
    unlockedCosmetics: emptyUnlockedCosmetics(),
    equippedCosmetics: defaultEquippedCosmetics(),
    shopTab: "upgrades",
    styleFilter: "all",
    followers: 0,
    lastViralAt: 0,
    viralPending: false,
    viral: null,
    statistics: createDefaultStatistics(),
    dailyChallenge: createDefaultDailyChallenge(),
    orderHistory: [],
    pendingReturns: [],
    activeReturn: null,
    suppressSave: false,
    timers: {
      reject: 0,
      snap: 0,
      confetti: 0,
      scoreRaf: 0,
      dragRaf: 0,
      express: 0,
      toast: 0,
      review: 0,
      finishAdvance: 0,
      finishAuto: 0,
      viral: 0,
      viralPulse: 0,
      viralBetween: 0,
      returnReveal: 0,
      floatCash: 0,
      juice: 0,
    },
    uiBound: false,
    finishUiBound: false,
  };

  // ===========================================================================
  // DOM REFERENCES
  // ===========================================================================
  const dom = {};

  function cacheDom() {
    dom.app = $("app");
    dom.cashValue = $("cash-value");
    dom.cashChip = $("cash-chip");
    dom.floatLayer = $("float-layer");
    dom.levelValue = $("level-value");
    dom.xpValue = $("xp-value");
    dom.xpBar = $("xp-bar");
    dom.shopRating = $("shop-rating");
    dom.shopOrders = $("shop-orders");
    dom.shopPerfects = $("shop-perfects");
    dom.shopStats = $("shop-stats");
    dom.shopVip = $("shop-vip");
    dom.soundToggle = $("sound-toggle");
    dom.soundIcon = $("sound-icon");
    dom.settingsBtn = $("settings-btn");
    dom.settingsOverlay = $("settings-overlay");
    dom.settingsClose = $("settings-close");
    dom.settingsSoundToggle = $("settings-sound-toggle");
    dom.settingsSoundValue = $("settings-sound-value");
    dom.settingsAsmrToggle = $("settings-asmr-toggle");
    dom.settingsAsmrValue = $("settings-asmr-value");
    dom.settingsResetBtn = $("settings-reset-btn");
    dom.settingsResetConfirm = $("settings-reset-confirm");
    dom.settingsResetCancel = $("settings-reset-cancel");
    dom.settingsResetConfirmBtn = $("settings-reset-confirm-btn");
    dom.shopBtn = $("shop-btn");
    dom.shopOverlay = $("shop-overlay");
    dom.shopList = $("shop-list");
    dom.shopTabUpgrades = $("shop-tab-upgrades");
    dom.shopTabStyle = $("shop-tab-style");
    dom.shopPanelUpgrades = $("shop-panel-upgrades");
    dom.shopPanelStyle = $("shop-panel-style");
    dom.styleFilters = $("style-filters");
    dom.styleList = $("style-list");
    dom.shopTitle = $("shop-title");
    dom.shopCash = $("shop-cash");
    dom.shopClose = $("shop-close");
    dom.shopOpenResult = $("shop-open-result");
    dom.shopFollowers = $("shop-followers");
    dom.viralBanner = $("viral-banner");
    dom.viralClock = $("viral-clock");
    dom.viralShippedLine = $("viral-shipped-line");
    dom.viralSplash = $("viral-splash");
    dom.viralGo = $("viral-go");
    dom.viralLater = $("viral-later");
    dom.viralBurstOrders = $("viral-burst-orders");
    dom.viralBurstFollowers = $("viral-burst-followers");
    dom.viralRecap = $("viral-recap");
    dom.viralRecapShipped = $("viral-recap-shipped");
    dom.viralRecapPerfect = $("viral-recap-perfect");
    dom.viralRecapFollowers = $("viral-recap-followers");
    dom.viralRecapBonus = $("viral-recap-bonus");
    dom.viralRecapDone = $("viral-recap-done");
    dom.viralPulse = $("viral-pulse");
    dom.orderTitle = $("order-title");
    dom.orderCount = $("order-count");
    dom.orderCard = $("order-card");
    dom.orderItems = $("order-items");
    dom.orderRequest = $("order-request");
    dom.requestTitle = $("request-title");
    dom.requestQuote = $("request-quote");
    dom.requestTimer = $("request-timer");
    dom.packTimer = $("pack-timer");
    dom.packTitle = $("pack-title");
    dom.packItems = $("pack-items");
    dom.packRequestLine = $("pack-request-line");
    dom.startPackBtn = $("start-pack-btn");
    dom.deskBack = $("desk-back");
    dom.packingStage = $("packing-stage");
    dom.deskPreview = $("desk-preview-label");
    dom.packSoundToggle = $("pack-sound-toggle");
    dom.packSoundIcon = $("pack-sound-icon");
    dom.requestToast = $("request-toast");
    dom.returnToast = $("return-toast");
    dom.returnToastQuote = $("return-toast-quote");
    dom.returnToastMeta = $("return-toast-meta");
    dom.returnToastOpen = $("return-toast-open");
    dom.returnOverlay = $("return-overlay");
    dom.returnClose = $("return-close");
    dom.returnQuote = $("return-quote");
    dom.returnItemIcon = $("return-item-icon");
    dom.returnItemName = $("return-item-name");
    dom.returnPackScore = $("return-pack-score");
    dom.returnProtection = $("return-protection");
    dom.returnMaterials = $("return-materials");
    dom.returnBox = $("return-box");
    dom.returnCause = $("return-cause");
    dom.returnRefund = $("return-refund");
    dom.returnResolve = $("return-resolve");
    dom.dailyChip = $("daily-chip");
    dom.dailyChipProgress = $("daily-chip-progress");
    dom.dailyOverlay = $("daily-overlay");
    dom.dailyClose = $("daily-close");
    dom.dailyIcon = $("daily-icon");
    dom.dailyTitle = $("daily-title");
    dom.dailyBlurb = $("daily-blurb");
    dom.dailyProgress = $("daily-progress");
    dom.dailyReward = $("daily-reward");
    dom.dailyStreak = $("daily-streak");
    dom.dailyStatus = $("daily-status");
    dom.dailyClaim = $("daily-claim");
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
    dom.finishLabelPrinter = $("finish-label-printer");
    dom.finishBarcode = $("finish-barcode");
    dom.finishScanFlash = $("finish-scan-flash");
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

  // ===========================================================================
  // SAVE SYSTEM
  // Versioned localStorage snapshot of persistent progress only.
  // Runtime packing / finish / viral queue state is never written.
  // ===========================================================================
  const SAVE_VERSION = 7;
  const ORDER_HISTORY_LIMIT = 20;

  function isFreshBoot() {
    try {
      return new URLSearchParams(window.location.search).get("fresh") === "1";
    } catch (err) {
      return false;
    }
  }

  function createDefaultStatistics() {
    return {
      viralCompletions: 0,
      lifetimeProfit: 0,
      returnsReceived: 0,
      damageRate: 0,
    };
  }

  function createDefaultDailyChallenge() {
    return {
      date: "",
      challengeId: null,
      progress: 0,
      target: 0,
      completed: false,
      claimed: false,
      streak: 0,
      lastCompletedDate: "",
    };
  }

  function createDefaultSave() {
    return {
      version: SAVE_VERSION,
      cash: CONFIG.STARTING_CASH,
      xp: 0,
      level: 1,
      shopRating: 5,
      ratingSum: 0,
      ratingCount: 0,
      totalOrders: 0,
      perfectPacks: 0,
      followers: 0,
      lastViralAt: 0,
      vipUnlocked: false,
      upgrades: emptyUpgrades(),
      unlockedCosmetics: emptyUnlockedCosmetics(),
      equippedCosmetics: defaultEquippedCosmetics(),
      statistics: createDefaultStatistics(),
      orderHistory: [],
      pendingReturns: [],
      recentOrderSignatures: [],
      recentOrderCategories: [],
      orderGenSalt: 0,
      settings: {
        soundEnabled: true,
        asmrMode: false,
      },
      dailyChallenge: createDefaultDailyChallenge(),
    };
  }

  function cloneSaveJson(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return null;
    }
  }

  function sanitizeNumber(value, fallback, min, max) {
    let n = typeof value === "number" ? value : parseFloat(value);
    if (!Number.isFinite(n)) n = fallback;
    if (typeof min === "number") n = Math.max(min, n);
    if (typeof max === "number") n = Math.min(max, n);
    return n;
  }

  function sanitizeBoolean(value, fallback) {
    if (typeof value === "boolean") return value;
    if (value === 0 || value === "0" || value === "false") return false;
    if (value === 1 || value === "1" || value === "true") return true;
    return !!fallback;
  }

  function sanitizeUpgrades(raw) {
    const out = emptyUpgrades();
    if (!raw || typeof raw !== "object") return out;
    SHOP_UPGRADE_IDS.forEach(function (id) {
      const spec = SHOP_UPGRADES[id];
      const max = spec && spec.levels ? spec.levels.length : 0;
      out[id] = Math.round(sanitizeNumber(raw[id], 0, 0, max));
    });
    return out;
  }

  function sanitizeUnlockedCosmetics(raw) {
    const out = emptyUnlockedCosmetics();
    if (!raw || typeof raw !== "object") return out;
    Object.keys(COSMETICS).forEach(function (id) {
      if (raw[id]) out[id] = true;
    });
    return out;
  }

  function sanitizeEquippedCosmetics(raw) {
    const out = defaultEquippedCosmetics();
    if (!raw || typeof raw !== "object") return out;
    COSMETIC_CATEGORIES.forEach(function (cat) {
      const id = raw[cat];
      if (typeof id === "string" && COSMETICS[id] && COSMETICS[id].category === cat) {
        out[cat] = id;
      }
    });
    return out;
  }

  function sanitizeStatistics(raw) {
    const out = createDefaultStatistics();
    if (!raw || typeof raw !== "object") return out;
    out.viralCompletions = Math.round(sanitizeNumber(raw.viralCompletions, 0, 0));
    out.lifetimeProfit = cents(sanitizeNumber(raw.lifetimeProfit, 0));
    out.returnsReceived = Math.round(sanitizeNumber(raw.returnsReceived, 0, 0));
    out.damageRate = sanitizeNumber(raw.damageRate, 0, 0, 1);
    return out;
  }

  function sanitizeMaterialCounts(raw) {
    const out = {};
    Object.keys(PROTECTION_MATERIALS).forEach(function (id) {
      out[id] = 0;
    });
    if (!raw || typeof raw !== "object") return out;
    Object.keys(out).forEach(function (id) {
      out[id] = Math.round(sanitizeNumber(raw[id], 0, 0, 99));
    });
    return out;
  }

  function sanitizeOrderHistoryRecord(raw) {
    if (!raw || typeof raw !== "object") return null;
    const products = Array.isArray(raw.products) ? raw.products : [];
    const cleanProducts = [];
    products.forEach(function (p) {
      if (!p || typeof p !== "object") return;
      cleanProducts.push({
        typeId: typeof p.typeId === "string" ? p.typeId : "",
        name: typeof p.name === "string" ? p.name : "Item",
        icon: typeof p.icon === "string" ? p.icon : "📦",
        fragile: !!p.fragile,
        requiredProtection: Math.round(sanitizeNumber(p.requiredProtection, 0, 0, 99)),
        effectiveProtection: Math.round(sanitizeNumber(p.effectiveProtection, 0, 0, 99)),
        wraps: Array.isArray(p.wraps)
          ? p.wraps.filter(function (id) {
              return typeof id === "string" && PROTECTION_MATERIALS[id];
            })
          : [],
        salePrice: cents(sanitizeNumber(p.salePrice, 0, 0)),
      });
    });
    return {
      id: typeof raw.id === "string" ? raw.id : "ord_" + Date.now(),
      orderNumber: Math.round(sanitizeNumber(raw.orderNumber, 0, 0)),
      products: cleanProducts,
      boxType: typeof raw.boxType === "string" ? raw.boxType : "medium",
      packScore: Math.round(sanitizeNumber(raw.packScore, 0, 0, 100)),
      protectionScore: Math.round(sanitizeNumber(raw.protectionScore, 0, 0, 100)),
      materialsUsed: sanitizeMaterialCounts(raw.materialsUsed),
      request: typeof raw.request === "string" || raw.request === null ? raw.request : null,
      profit: cents(sanitizeNumber(raw.profit, 0)),
      timestamp: Math.round(sanitizeNumber(raw.timestamp, Date.now(), 0)),
      returned: !!raw.returned,
    };
  }

  function sanitizePendingReturn(raw) {
    if (!raw || typeof raw !== "object") return null;
    return {
      id: typeof raw.id === "string" ? raw.id : "ret_" + Date.now(),
      orderId: typeof raw.orderId === "string" ? raw.orderId : "",
      orderNumber: Math.round(sanitizeNumber(raw.orderNumber, 0, 0)),
      itemName: typeof raw.itemName === "string" ? raw.itemName : "Item",
      itemIcon: typeof raw.itemIcon === "string" ? raw.itemIcon : "📦",
      packScore: Math.round(sanitizeNumber(raw.packScore, 0, 0, 100)),
      protectionScore: Math.round(sanitizeNumber(raw.protectionScore, 0, 0, 100)),
      materialsUsed: sanitizeMaterialCounts(raw.materialsUsed),
      boxType: typeof raw.boxType === "string" ? raw.boxType : "medium",
      cause: typeof raw.cause === "string" ? raw.cause : "Insufficient protection",
      customerLine: typeof raw.customerLine === "string" ? raw.customerLine : "My order arrived damaged.",
      refund: cents(sanitizeNumber(raw.refund, 0, 0)),
      revealAfterOrder: Math.round(sanitizeNumber(raw.revealAfterOrder, 0, 0)),
      resolved: !!raw.resolved,
    };
  }

  function sanitizeOrderHistory(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    raw.forEach(function (row) {
      const clean = sanitizeOrderHistoryRecord(row);
      if (clean) out.push(clean);
    });
    return out.slice(-ORDER_HISTORY_LIMIT);
  }

  function sanitizePendingReturns(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    raw.forEach(function (row) {
      const clean = sanitizePendingReturn(row);
      if (clean && !clean.resolved) out.push(clean);
    });
    return out.slice(0, 12);
  }

  function sanitizeDailyChallenge(raw) {
    const out = createDefaultDailyChallenge();
    if (!raw || typeof raw !== "object") return out;
    // Accept legacy id / dayKey from SAVE_VERSION < 3.
    const challengeId =
      typeof raw.challengeId === "string"
        ? raw.challengeId
        : typeof raw.id === "string"
          ? raw.id
          : null;
    const date =
      typeof raw.date === "string" && raw.date
        ? raw.date
        : typeof raw.dayKey === "string"
          ? raw.dayKey
          : "";
    out.date = date;
    out.challengeId = challengeId;
    out.progress = Math.round(sanitizeNumber(raw.progress, 0, 0));
    out.target = Math.round(sanitizeNumber(raw.target, 0, 0));
    out.completed = sanitizeBoolean(raw.completed, false);
    out.claimed = sanitizeBoolean(raw.claimed, false);
    out.streak = Math.round(sanitizeNumber(raw.streak, 0, 0));
    out.lastCompletedDate =
      typeof raw.lastCompletedDate === "string" ? raw.lastCompletedDate : "";
    if (out.completed && out.claimed) {
      /* ok */
    } else if (out.claimed && !out.completed) {
      out.claimed = false;
    }
    return out;
  }

  function migrateSave(raw) {
    const save = raw && typeof raw === "object" ? cloneSaveJson(raw) || {} : {};
    let version = Math.round(sanitizeNumber(save.version, 0, 0));
    if (version < 1) version = 1;
    if (version < 2) {
      if (!Array.isArray(save.orderHistory)) save.orderHistory = [];
      if (!Array.isArray(save.pendingReturns)) save.pendingReturns = [];
      if (!save.statistics || typeof save.statistics !== "object") {
        save.statistics = createDefaultStatistics();
      }
      save.statistics.returnsReceived = save.statistics.returnsReceived || 0;
      save.statistics.damageRate = save.statistics.damageRate || 0;
      version = 2;
    }
    if (version < 3) {
      if (!save.dailyChallenge || typeof save.dailyChallenge !== "object") {
        save.dailyChallenge = createDefaultDailyChallenge();
      } else {
        const d = save.dailyChallenge;
        if (!d.date && d.dayKey) d.date = d.dayKey;
        if (!d.challengeId && d.id) d.challengeId = d.id;
        if (typeof d.claimed === "undefined") d.claimed = false;
        if (typeof d.streak === "undefined") d.streak = 0;
        if (typeof d.lastCompletedDate === "undefined") d.lastCompletedDate = "";
        if (typeof d.target === "undefined") d.target = 0;
      }
      version = 3;
    }
    if (version < 4) {
      version = 4;
    }
    if (version < 5) {
      if (!Array.isArray(save.recentOrderSignatures)) save.recentOrderSignatures = [];
      if (typeof save.orderGenSalt !== "number") save.orderGenSalt = 0;
      version = 5;
    }
    if (version < 6) {
      if (!Array.isArray(save.recentOrderCategories)) save.recentOrderCategories = [];
      version = 6;
    }
    if (version < 7) {
      if (!save.settings || typeof save.settings !== "object") save.settings = {};
      if (typeof save.settings.asmrMode === "undefined") save.settings.asmrMode = false;
      version = 7;
    }
    save.version = version;
    return save;
  }

  function sanitizeSave(raw) {
    const migrated = migrateSave(raw || {});
    const defaults = createDefaultSave();
    const soundFallback =
      migrated.settings && typeof migrated.settings.soundEnabled !== "undefined"
        ? migrated.settings.soundEnabled
        : typeof migrated.soundEnabled !== "undefined"
          ? migrated.soundEnabled
          : defaults.settings.soundEnabled;

    const save = {
      version: SAVE_VERSION,
      cash: cents(sanitizeNumber(migrated.cash, defaults.cash, 0)),
      xp: Math.round(sanitizeNumber(migrated.xp, defaults.xp, 0)),
      level: Math.round(sanitizeNumber(migrated.level, defaults.level, 1, 99)),
      shopRating: sanitizeNumber(migrated.shopRating, defaults.shopRating, 1, 5),
      ratingSum: sanitizeNumber(migrated.ratingSum, defaults.ratingSum, 0),
      ratingCount: Math.round(sanitizeNumber(migrated.ratingCount, defaults.ratingCount, 0)),
      totalOrders: Math.round(sanitizeNumber(migrated.totalOrders, defaults.totalOrders, 0)),
      perfectPacks: Math.round(sanitizeNumber(migrated.perfectPacks, defaults.perfectPacks, 0)),
      followers: Math.round(sanitizeNumber(migrated.followers, defaults.followers, 0)),
      lastViralAt: Math.round(sanitizeNumber(migrated.lastViralAt, defaults.lastViralAt, 0)),
      vipUnlocked: sanitizeBoolean(migrated.vipUnlocked, defaults.vipUnlocked),
      upgrades: sanitizeUpgrades(migrated.upgrades),
      unlockedCosmetics: sanitizeUnlockedCosmetics(migrated.unlockedCosmetics),
      equippedCosmetics: sanitizeEquippedCosmetics(migrated.equippedCosmetics),
      statistics: sanitizeStatistics(migrated.statistics),
      settings: {
        soundEnabled: sanitizeBoolean(soundFallback, true),
        asmrMode: sanitizeBoolean(
          migrated.settings && migrated.settings.asmrMode,
          defaults.settings.asmrMode
        ),
      },
      dailyChallenge: sanitizeDailyChallenge(migrated.dailyChallenge),
      orderHistory: sanitizeOrderHistory(migrated.orderHistory),
      pendingReturns: sanitizePendingReturns(migrated.pendingReturns),
      recentOrderSignatures: Array.isArray(migrated.recentOrderSignatures)
        ? migrated.recentOrderSignatures
            .filter(function (s) {
              return typeof s === "string" && s.length > 0 && s.length < 200;
            })
            .slice(0, ORDER_GEN.SIGNATURE_MEMORY)
        : [],
      recentOrderCategories: Array.isArray(migrated.recentOrderCategories)
        ? migrated.recentOrderCategories
            .filter(function (c) {
              return typeof c === "string" && PRODUCT_CATEGORIES.indexOf(c) !== -1;
            })
            .slice(0, ORDER_GEN.CATEGORY_MEMORY)
        : [],
      orderGenSalt: Math.round(sanitizeNumber(migrated.orderGenSalt, 0, 0, 1e9)),
    };

    // Equipped cosmetics must be unlocked.
    COSMETIC_CATEGORIES.forEach(function (cat) {
      const id = save.equippedCosmetics[cat];
      if (!save.unlockedCosmetics[id]) {
        save.equippedCosmetics[cat] = defaults.equippedCosmetics[cat];
      }
    });

    if (save.ratingCount > 0) {
      save.shopRating =
        Math.round((save.ratingSum / save.ratingCount) * 10) / 10;
      save.shopRating = clamp(save.shopRating, 1, 5);
    } else {
      save.shopRating = 5;
      save.ratingSum = 0;
    }
    return save;
  }

  function readLegacySoundEnabled() {
    try {
      const saved = window.localStorage.getItem(CONFIG.SOUND_STORAGE_KEY);
      if (saved === "0") return false;
      if (saved === "1") return true;
    } catch (err) {
      /* ignore */
    }
    return null;
  }

  function buildSaveFromState() {
    const stats = gameState.statistics || createDefaultStatistics();
    return sanitizeSave({
      version: SAVE_VERSION,
      cash: gameState.cash,
      xp: gameState.xp,
      level: gameState.level,
      shopRating: gameState.shopRating,
      ratingSum: gameState.ratingSum,
      ratingCount: gameState.ratingCount,
      totalOrders: gameState.totalOrders,
      perfectPacks: gameState.perfectPacks,
      followers: gameState.followers,
      lastViralAt: gameState.lastViralAt,
      vipUnlocked: gameState.vipUnlocked,
      upgrades: gameState.upgrades,
      unlockedCosmetics: gameState.unlockedCosmetics,
      equippedCosmetics: gameState.equippedCosmetics,
      statistics: stats,
      settings: {
        soundEnabled: !!gameState.soundEnabled,
        asmrMode: !!gameState.asmrMode,
      },
      dailyChallenge: gameState.dailyChallenge || createDefaultDailyChallenge(),
      orderHistory: gameState.orderHistory || [],
      pendingReturns: gameState.pendingReturns || [],
      recentOrderSignatures: gameState.recentOrderSignatures || [],
      recentOrderCategories: gameState.recentOrderCategories || [],
      orderGenSalt: gameState.orderGenSalt || 0,
    });
  }

  function saveGame() {
    if (gameState.suppressSave) return false;
    const payload = buildSaveFromState();
    try {
      window.localStorage.setItem(CONFIG.SAVE_STORAGE_KEY, JSON.stringify(payload));
      // Keep legacy sound key in sync for older builds / soft migration.
      window.localStorage.setItem(
        CONFIG.SOUND_STORAGE_KEY,
        payload.settings.soundEnabled ? "1" : "0"
      );
      return true;
    } catch (err) {
      return false;
    }
  }

  function loadGame() {
    if (isFreshBoot()) {
      const fresh = createDefaultSave();
      const legacy = readLegacySoundEnabled();
      if (legacy !== null) fresh.settings.soundEnabled = legacy;
      return fresh;
    }
    let parsed = null;
    try {
      const raw = window.localStorage.getItem(CONFIG.SAVE_STORAGE_KEY);
      if (raw) parsed = JSON.parse(raw);
    } catch (err) {
      parsed = null;
    }
    if (!parsed || typeof parsed !== "object") {
      const fallback = createDefaultSave();
      const legacy = readLegacySoundEnabled();
      if (legacy !== null) fallback.settings.soundEnabled = legacy;
      return sanitizeSave(fallback);
    }
    return sanitizeSave(parsed);
  }

  function applySave(save) {
    const data = sanitizeSave(save || createDefaultSave());
    gameState.cash = data.cash;
    gameState.xp = data.xp;
    gameState.level = data.level;
    gameState.shopRating = data.shopRating;
    gameState.ratingSum = data.ratingSum;
    gameState.ratingCount = data.ratingCount;
    gameState.totalOrders = data.totalOrders;
    gameState.perfectPacks = data.perfectPacks;
    gameState.followers = data.followers;
    gameState.lastViralAt = data.lastViralAt;
    gameState.vipUnlocked = data.vipUnlocked;
    gameState.upgrades = data.upgrades;
    gameState.unlockedCosmetics = data.unlockedCosmetics;
    gameState.equippedCosmetics = data.equippedCosmetics;
    gameState.statistics = data.statistics;
    gameState.dailyChallenge = data.dailyChallenge;
    gameState.orderHistory = data.orderHistory || [];
    gameState.pendingReturns = data.pendingReturns || [];
    gameState.recentOrderSignatures = data.recentOrderSignatures || [];
    gameState.recentOrderCategories = data.recentOrderCategories || [];
    gameState.orderGenSalt = data.orderGenSalt || 0;
    gameState.orderGenLog = [];
    gameState.activeReturn = null;
    gameState.soundEnabled = !!data.settings.soundEnabled;
    gameState.asmrMode = !!(data.settings && data.settings.asmrMode);
    // Persistent only — clear transient runtime slots.
    gameState.reviews = [];
    gameState.vipUnlockPending = false;
    gameState.viralPending = false;
    gameState.viral = null;
    gameState.drag = null;
    gameState.packing = false;
    gameState.finish = null;
    gameState.pendingResult = null;
    gameState.expressDeadline = 0;
    gameState.expressFailed = false;
    syncLevel();
    return data;
  }

  function resetSave() {
    try {
      window.localStorage.removeItem(CONFIG.SAVE_STORAGE_KEY);
    } catch (err) {
      /* ignore */
    }
    try {
      window.localStorage.setItem(CONFIG.SOUND_STORAGE_KEY, "1");
    } catch (err2) {
      /* ignore */
    }
    gameState.suppressSave = false;
    applySave(createDefaultSave());
    saveGame();
  }

  function renderPersistentUi() {
    renderCash();
    renderShopStats();
    renderSoundButton();
    applyEquippedCosmetics();
    if (typeof renderOrder === "function" && gameState.currentOrder) {
      renderOrder();
    } else if (dom.levelValue || dom.xpValue) {
      const progress = levelProgress(gameState.xp);
      if (dom.levelValue) dom.levelValue.textContent = "Lv " + progress.level;
      if (dom.xpValue) dom.xpValue.textContent = progress.into + "/" + progress.need;
    }
    renderShop();
    paintViralBanner();
    renderDailyChallengeUi();
  }

  // ===========================================================================
  // RETURNS & DAMAGE
  // Delayed, educational shipping claims. Plain JSON only — no DOM/product refs.
  // Never interrupt Viral Rush; queue until the studio is calm again.
  // ===========================================================================
  function hashSeed(n) {
    let x = (Math.round(n) ^ 0x9e3779b9) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
    return (x ^ (x >>> 16)) >>> 0;
  }

  function tallyMaterialsUsed(products) {
    const used = {};
    Object.keys(PROTECTION_MATERIALS).forEach(function (id) {
      used[id] = 0;
    });
    (products || []).forEach(function (p) {
      (p.wraps || []).forEach(function (id) {
        if (used[id] == null) used[id] = 0;
        used[id] += 1;
      });
    });
    return used;
  }

  function formatMaterialsUsed(used) {
    const labels = {
      tissue: "Tissue",
      bubble: "Bubble",
      paper_fill: "Paper Fill",
      foam: "Foam",
    };
    const parts = [];
    Object.keys(PROTECTION_MATERIALS).forEach(function (id) {
      const n = (used && used[id]) || 0;
      parts.push((labels[id] || PROTECTION_MATERIALS[id].short) + " x" + n);
    });
    return parts.join(" · ");
  }

  function formatReturnBoxLabel(boxType) {
    const names = { small: "Small", medium: "Medium", large: "Large" };
    if (names[boxType]) return names[boxType];
    const box = BOX_TYPES[boxType];
    return box ? box.label : String(boxType || "Box");
  }

  function returnChanceForProtection(score) {
    if (score >= 85) return 0;
    if (score >= 70) return 0.02;
    if (score >= 55) return 0.08;
    if (score >= 40) return 0.2;
    return 0.45;
  }

  function findGuaranteedDamageProduct(products) {
    let worst = null;
    (products || []).forEach(function (p) {
      if (!p.fragile) return;
      if ((p.requiredProtection || 0) <= 0) return;
      if ((p.effectiveProtection || 0) > 0) return;
      if (!worst || (p.salePrice || 0) > (worst.salePrice || 0)) worst = p;
    });
    return worst;
  }

  function pickDamagedProduct(products, seed) {
    const guaranteed = findGuaranteedDamageProduct(products);
    if (guaranteed) return guaranteed;
    const fragile = (products || []).filter(function (p) {
      return p.fragile && (p.requiredProtection || 0) > 0;
    });
    const pool = fragile.length ? fragile : products || [];
    if (!pool.length) return null;
    return pool[seed % pool.length];
  }

  function buildReturnCause(product, protectionScore, guaranteed) {
    if (guaranteed) {
      return "Fragile " + product.name + " shipped with no protection.";
    }
    if (protectionScore < 40) {
      return "Protection was far too weak for a fragile shipment.";
    }
    if (protectionScore < 55) {
      return "Not enough wrap for the fragile items in this order.";
    }
    if ((product.effectiveProtection || 0) < (product.requiredProtection || 0)) {
      return (
        product.name +
        " needed more padding (got " +
        (product.effectiveProtection || 0) +
        ", needed " +
        (product.requiredProtection || 0) +
        ")."
      );
    }
    return "Pack protection was too thin for shipping.";
  }

  function buildReturnCustomerLine(product, guaranteed) {
    const name = (product && product.name) || "order";
    if (guaranteed) {
      return "My " + name.toLowerCase() + " arrived broken — it had no protection.";
    }
    const lines = [
      "My " + name.toLowerCase() + " arrived damaged.",
      "Something cracked in transit. The packing felt thin.",
      "The " + name.toLowerCase() + " didn't survive the trip.",
    ];
    return lines[hashSeed((product && product.salePrice) || 1) % lines.length];
  }

  function buildShippedOrderRecord(breakdown) {
    const order = gameState.currentOrder;
    const box = getSelectedBox();
    const placed = gameState.products.filter(function (p) {
      return p.inBox;
    });
    refreshProtection(placed);
    const products = placed.map(function (p) {
      const type = getType(p.typeId) || {};
      return {
        typeId: p.typeId,
        name: type.name || p.typeId,
        icon: type.icon || "📦",
        fragile: !!type.fragile,
        requiredProtection: getRequiredProtection(type),
        effectiveProtection: Math.round(p.effectiveProtection || 0),
        wraps: (p.wraps || []).slice(),
        salePrice: cents(type.salePrice || 0),
      };
    });
    const protectionScore = Math.round(
      (breakdown && breakdown.categories && breakdown.categories.protection) || 0
    );
    const packScore = Math.round((breakdown && breakdown.total) || 0);
    const profit = cents(
      (breakdown && breakdown.economy && breakdown.economy.profit) || 0
    );
    const request =
      order && order.request
        ? order.request
        : breakdown && breakdown.request && breakdown.request.id
          ? breakdown.request.id
          : null;
    return {
      id: "ord_" + Date.now() + "_" + ((order && order.number) || gameState.totalOrders),
      orderNumber: (order && order.number) || gameState.totalOrders,
      products: products,
      boxType: (box && box.id) || gameState.selectedBoxId || "medium",
      packScore: packScore,
      protectionScore: protectionScore,
      materialsUsed: tallyMaterialsUsed(placed),
      request: request,
      profit: profit,
      timestamp: Date.now(),
      returned: false,
    };
  }

  function pushOrderHistory(record) {
    if (!record) return;
    if (!Array.isArray(gameState.orderHistory)) gameState.orderHistory = [];
    gameState.orderHistory.push(record);
    if (gameState.orderHistory.length > ORDER_HISTORY_LIMIT) {
      gameState.orderHistory = gameState.orderHistory.slice(-ORDER_HISTORY_LIMIT);
    }
  }

  function evaluateReturnForRecord(record) {
    if (!record || record.returned) return null;
    if (!record.products || !record.products.length) return null;
    const seed = hashSeed(record.orderNumber * 97 + record.protectionScore * 13 + record.timestamp);
    const guaranteedProduct = findGuaranteedDamageProduct(record.products);
    const chance = returnChanceForProtection(record.protectionScore);
    const roll = (seed % 1000) / 1000;
    if (!guaranteedProduct && roll >= chance) return null;

    const damaged = pickDamagedProduct(record.products, seed);
    if (!damaged) return null;
    const guaranteed = !!guaranteedProduct;
    const delay = 1 + (seed % 3); // 1–3 orders later
    return {
      id: "ret_" + record.id,
      orderId: record.id,
      orderNumber: record.orderNumber,
      itemName: damaged.name,
      itemIcon: damaged.icon || "📦",
      packScore: record.packScore,
      protectionScore: record.protectionScore,
      materialsUsed: record.materialsUsed,
      boxType: record.boxType,
      cause: buildReturnCause(damaged, record.protectionScore, guaranteed),
      customerLine: buildReturnCustomerLine(damaged, guaranteed),
      refund: cents(Math.max(damaged.salePrice || 0, 4)),
      revealAfterOrder: gameState.totalOrders + delay,
      resolved: false,
    };
  }

  function queueReturnIfNeeded(record) {
    const pending = evaluateReturnForRecord(record);
    if (!pending) return;
    record.returned = true;
    if (!Array.isArray(gameState.pendingReturns)) gameState.pendingReturns = [];
    // Avoid duplicate queue entries for the same order.
    const exists = gameState.pendingReturns.some(function (row) {
      return row.orderId === pending.orderId;
    });
    if (!exists) gameState.pendingReturns.push(pending);
  }

  function recordShippedOrder(breakdown) {
    const record = buildShippedOrderRecord(breakdown);
    pushOrderHistory(record);
    queueReturnIfNeeded(record);
  }

  function recomputeDamageRate() {
    if (!gameState.statistics) gameState.statistics = createDefaultStatistics();
    const shipped = Math.max(1, gameState.totalOrders || 0);
    const returns = gameState.statistics.returnsReceived || 0;
    gameState.statistics.damageRate =
      Math.round((returns / shipped) * 1000) / 1000;
  }

  function applyReturnRatingNudge() {
    // Mild rating softening without adding a second customer review.
    if ((gameState.ratingCount || 0) < 1) return;
    gameState.ratingSum = Math.max(0, gameState.ratingSum - 0.55);
    gameState.shopRating =
      Math.round((gameState.ratingSum / gameState.ratingCount) * 10) / 10;
    gameState.shopRating = clamp(gameState.shopRating, 1, 5);
  }

  function canShowReturnUi() {
    if (isViralActive()) return false;
    if (gameState.finish && gameState.finish.active && !gameState.finish.completed) return false;
    if (gameState.packing) return false;
    if (gameState.drag) return false;
    if (dom.resultOverlay && dom.resultOverlay.classList.contains("is-open")) return false;
    if (dom.viralSplash && dom.viralSplash.classList.contains("is-open")) return false;
    if (dom.viralRecap && dom.viralRecap.classList.contains("is-open")) return false;
    if (dom.returnOverlay && dom.returnOverlay.classList.contains("is-open")) return false;
    return true;
  }

  function nextPendingReturnReady() {
    const list = gameState.pendingReturns || [];
    for (let i = 0; i < list.length; i += 1) {
      const row = list[i];
      if (!row || row.resolved) continue;
      if ((row.revealAfterOrder || 0) <= (gameState.totalOrders || 0)) return row;
    }
    return null;
  }

  function hideReturnToast() {
    window.clearTimeout(gameState.timers.returnReveal);
    gameState.timers.returnReveal = 0;
    if (!dom.returnToast) return;
    dom.returnToast.classList.remove("is-on");
    dom.returnToast.hidden = true;
  }

  function showReturnToast(ret) {
    if (!dom.returnToast || !ret) return;
    hideReturnToast();
    if (dom.returnToastQuote) {
      dom.returnToastQuote.textContent = '"' + ret.customerLine + '"';
    }
    if (dom.returnToastMeta) {
      dom.returnToastMeta.textContent = "Order #" + String(ret.orderNumber).padStart(3, "0");
    }
    dom.returnToast.hidden = false;
    window.requestAnimationFrame(function () {
      dom.returnToast.classList.add("is-on");
    });
  }

  function openReturnInspection(ret) {
    const data = ret || gameState.activeReturn || nextPendingReturnReady();
    if (!data) return;
    gameState.activeReturn = data;
    hideReturnToast();
    if (dom.returnItemIcon) dom.returnItemIcon.textContent = data.itemIcon || "📦";
    if (dom.returnItemName) dom.returnItemName.textContent = data.itemName || "Item";
    if (dom.returnPackScore) dom.returnPackScore.textContent = String(data.packScore);
    if (dom.returnProtection) dom.returnProtection.textContent = String(data.protectionScore);
    if (dom.returnMaterials) dom.returnMaterials.textContent = formatMaterialsUsed(data.materialsUsed);
    if (dom.returnBox) dom.returnBox.textContent = formatReturnBoxLabel(data.boxType);
    if (dom.returnCause) dom.returnCause.textContent = data.cause || "Insufficient protection";
    if (dom.returnRefund) {
      dom.returnRefund.textContent = "-" + formatMoney(data.refund || 0);
    }
    if (dom.returnQuote) {
      dom.returnQuote.textContent = '"' + (data.customerLine || "") + '"';
    }
    setOverlayOpen(dom.returnOverlay, true);
  }

  function closeReturnInspection() {
    setOverlayOpen(dom.returnOverlay, false);
    // Keep the claim pending — toast can return when the desk is calm again.
    if (gameState.activeReturn && !gameState.activeReturn.resolved) {
      window.setTimeout(maybeRevealReturn, 280);
    }
  }

  function resolveActiveReturn() {
    const data = gameState.activeReturn;
    if (!data || data.resolved) {
      closeReturnInspection();
      return;
    }
    data.resolved = true;
    gameState.cash = cents(Math.max(0, gameState.cash - (data.refund || 0)));
    if (!gameState.statistics) gameState.statistics = createDefaultStatistics();
    gameState.statistics.returnsReceived =
      (gameState.statistics.returnsReceived || 0) + 1;
    recomputeDamageRate();
    applyReturnRatingNudge();
    gameState.pendingReturns = (gameState.pendingReturns || []).filter(function (row) {
      return row && row.id !== data.id && !row.resolved;
    });
    // Mark matching history row.
    (gameState.orderHistory || []).forEach(function (row) {
      if (row && row.id === data.orderId) row.returned = true;
    });
    gameState.activeReturn = null;
    closeReturnInspection();
    renderCash();
    renderShopStats();
    saveGame();
    showRequestToast("Refund sent · learn & wrap safer");
    playSound("error");
    haptic(14);
    window.setTimeout(function () {
      maybeRevealReturn();
    }, 600);
  }

  function maybeRevealReturn() {
    if (!canShowReturnUi()) {
      hideReturnToast();
      return;
    }
    if (dom.returnOverlay && dom.returnOverlay.classList.contains("is-open")) return;
    const ready =
      gameState.activeReturn && !gameState.activeReturn.resolved
        ? gameState.activeReturn
        : nextPendingReturnReady();
    if (!ready) {
      hideReturnToast();
      gameState.activeReturn = null;
      return;
    }
    gameState.activeReturn = ready;
    showReturnToast(ready);
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

  function clearFinishTimers() {
    window.clearTimeout(gameState.timers.finishAdvance);
    window.clearTimeout(gameState.timers.finishAuto);
    gameState.timers.finishAdvance = 0;
    gameState.timers.finishAuto = 0;
  }

  // Order-local timers only. Viral session clocks (viral / viralPulse / viralBetween)
  // must survive resetOrder between rush ships — clear those via clearViralSessionTimers.
  function clearTimers() {
    window.clearTimeout(gameState.timers.reject);
    window.clearTimeout(gameState.timers.snap);
    window.clearTimeout(gameState.timers.confetti);
    window.clearTimeout(gameState.timers.toast);
    window.clearTimeout(gameState.timers.review);
    window.clearTimeout(gameState.timers.returnReveal);
    window.clearTimeout(gameState.timers.floatCash);
    window.clearTimeout(gameState.timers.juice);
    window.clearInterval(gameState.timers.express);
    window.cancelAnimationFrame(gameState.timers.scoreRaf);
    window.cancelAnimationFrame(gameState.timers.dragRaf);
    if (gameState.drag && gameState.drag.raf) {
      window.cancelAnimationFrame(gameState.drag.raf);
      gameState.drag.raf = 0;
    }
    clearFinishTimers();
    hideReturnToast();
    hideReviewToast();
    if (dom.confetti) dom.confetti.innerHTML = "";
    gameState.timers.reject = 0;
    gameState.timers.snap = 0;
    gameState.timers.confetti = 0;
    gameState.timers.toast = 0;
    gameState.timers.review = 0;
    gameState.timers.floatCash = 0;
    gameState.timers.juice = 0;
    gameState.timers.express = 0;
    gameState.timers.scoreRaf = 0;
    gameState.timers.dragRaf = 0;
  }

  function clearViralSessionTimers() {
    stopViralClock();
    window.clearTimeout(gameState.timers.viralPulse);
    window.clearTimeout(gameState.timers.viralBetween);
    gameState.timers.viralPulse = 0;
    gameState.timers.viralBetween = 0;
    if (dom.viralPulse) {
      dom.viralPulse.classList.remove("is-on");
      dom.viralPulse.hidden = true;
    }
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
    const deadline = gameState.expressDeadline;
    const remaining = deadline ? deadline - Date.now() : 0;
    paintTimer(dom.requestTimer, deadline, remaining);
    paintTimer(dom.packTimer, deadline, remaining);
    if (deadline && remaining <= 0) {
      gameState.expressFailed = true;
      stopExpressTimer();
    }
  }

  function paintTimer(el, deadline, remaining) {
    if (!el) return;
    if (!deadline) {
      el.hidden = true;
      el.classList.remove("is-late");
      return;
    }
    el.hidden = false;
    if (remaining <= 0) {
      el.textContent = "TIME'S UP";
      el.classList.add("is-late");
    } else {
      el.textContent = formatCountdown(remaining);
      el.classList.toggle("is-late", remaining <= 8000);
    }
  }

  function startExpressTimer() {
    stopExpressTimer();
    const req = getOrderRequest();
    const seconds = req && req.timerSeconds;
    if (!seconds) {
      gameState.expressDeadline = 0;
      gameState.expressFailed = false;
      paintTimer(dom.requestTimer, 0, 0);
      paintTimer(dom.packTimer, 0, 0);
      return;
    }
    gameState.expressFailed = false;
    gameState.expressDeadline = Date.now() + seconds * 1000;
    tickExpressTimer();
    gameState.timers.express = window.setInterval(tickExpressTimer, 250);
  }

  // ===========================================================================
  // ORDER FUNCTIONS
  // ===========================================================================
  function orderUnlocked(template) {
    const tier = upgradeEffect("catalogTier", 0);
    return Object.keys(template.items).every(function (id) {
      const type = PRODUCT_TYPES[id];
      return ((type && type.unlockTier) || 0) <= tier;
    });
  }

  function pickOrderTemplate() {
    if (shouldUseOrderGenerator()) {
      const generated = generateProceduralOrder();
      if (generated) return generated;
    }
    return pickCuratedOrder();
  }

  function createOrder() {
    let template;
    if (isViralActive()) {
      template = takeViralOrder();
      if (template) template = Object.assign({ source: "viral" }, template);
    }
    if (!template) template = pickOrderTemplate();
    let idealBox = template.idealBox || "medium";
    // Re-validate curated/viral idealBox against feasibility when possible.
    if (template.source !== "generated") {
      const fitted = findIdealBoxForItems(template.items);
      if (fitted) idealBox = fitted;
    }
    // VIP catalog hook: when shouldOfferVipOrder() is true, future VIP_ORDERS
    // can replace `template`. For now the flag rides on the same SKUs.
    gameState.currentOrder = {
      id: template.id,
      number: gameState.totalOrders + 1,
      items: Object.assign({}, template.items),
      idealBox: idealBox,
      request: template.request || null,
      quote: template.quote || null,
      timerSeconds: isViralActive() ? null : template.timerSeconds || null,
      vip: shouldOfferVipOrder(),
      viral: isViralActive(),
      source: template.source || "curated",
      difficulty: template.difficulty || computeOrderDifficulty(),
      theme: template.theme || null,
    };
    rememberOrderSignature(orderSignature(gameState.currentOrder));
    rememberOrderCategories(gameState.currentOrder.items);
    applySelectedBox(idealBox, { dumpItems: false });
    playOrderArrival();
    if (ordersDebugEnabled()) refreshOrdersDebugPanel();
  }

  function playOrderArrival() {
    const card = dom.orderCard || $("order-card");
    if (card) {
      card.classList.remove("is-printing");
      void card.offsetWidth;
      card.classList.add("is-printing");
      window.setTimeout(function () {
        card.classList.remove("is-printing");
      }, 820);
    }
    playSound("printer");
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
    if (gameState.stage !== "packing") return;
    if (!dom.box || !dom.packArea) return;
    const surface = document.querySelector(".table-surface");
    if (!surface) return;
    const box = getSelectedBox();
    // Include 2.5D walls + open flaps so scaled carton still fits the table.
    const wallPadX = box.id === "large" ? 68 : box.id === "small" ? 44 : 54;
    const wallPadY = box.id === "large" ? 96 : box.id === "small" ? 68 : 80;
    const outerW = box.width + wallPadX;
    const outerH = box.height + wallPadY;
    const availW = Math.max(120, surface.clientWidth - 16);
    const availH = Math.max(120, surface.clientHeight - 16);
    // 1) Max scale that still fits the viewport
    const fitScale = Math.min(availW / outerW, availH / outerH);
    // 2) Lv0 base leaves headroom so upgrades grow the carton visibly
    const softCap = Math.min(Number.isFinite(fitScale) ? fitScale : 1, 1.75);
    const baseScale = softCap / TABLE_SCALE_MAX_BOOST;
    // 3) Apply packing_table multiplier, then clamp to safe viewport fit
    const tableBoost = upgradeEffect("tableScale", 1);
    let scale = baseScale * tableBoost;
    scale = clamp(Number.isFinite(scale) ? scale : 1, 0.72, fitScale);
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
    const same = gameState.selectedBoxId === boxId;
    if (same) {
      return;
    }

    if (!same) {
      if (gameState.drag) {
        const drag = gameState.drag;
        drag.done = true;
        restoreLastPosition(drag.product, drag);
        finishDrag();
      }

      applySelectedBox(boxId, { dumpItems: true });
      playSound("place");
      updatePackButton();
    } else {
      playSound("place");
    }
  }

  function returnPackedItemsToShelf() {
    gameState.products.forEach(function (product) {
      if (product.inBox) {
        returnToShelf(product);
      }
    });
  }

  function fillOrderPills(list) {
    if (!list) return;
    const order = gameState.currentOrder;
    list.innerHTML = "";
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
      list.appendChild(li);
    });
  }

  function renderOrder() {
    const order = gameState.currentOrder;
    const n = String(order.number).padStart(3, "0");
    const title = "ORDER #" + n;
    dom.orderTitle.textContent = title;
    if (dom.packTitle) dom.packTitle.textContent = title;

    const total = itemCount(order.items);
    dom.orderCount.textContent = total + (total === 1 ? " item" : " items");

    fillOrderPills(dom.orderItems);
    fillOrderPills(dom.packItems);

    renderRequestBlock();
    renderShopStats();
    scheduleFitBox();

    renderCash();
    renderXpProgress();
  }

  function renderCash() {
    const text = formatMoney(gameState.cash);
    if (dom.cashValue) dom.cashValue.textContent = text;
    if (dom.shopCash) dom.shopCash.textContent = text;
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
    if (dom.shopFollowers) {
      dom.shopFollowers.textContent = formatFollowers(gameState.followers);
    }
    if (dom.shopStats) {
      dom.shopStats.classList.toggle("is-vip", !!gameState.vipUnlocked);
    }
    if (dom.shopVip) {
      dom.shopVip.hidden = !gameState.vipUnlocked;
    }
  }

  function openShop() {
    if (gameState.finish && gameState.finish.active && !gameState.finish.completed) return;
    if (gameState.drag) return;
    if (isViralActive()) return;
    closeSettings();
    if (!gameState.shopTab) gameState.shopTab = "upgrades";
    if (!gameState.styleFilter) gameState.styleFilter = "all";
    renderShop();
    setOverlayOpen(dom.shopOverlay, true);
    playSound("place");
  }

  function closeShop() {
    setOverlayOpen(dom.shopOverlay, false);
  }

  function setShopTab(tab) {
    gameState.shopTab = tab === "style" ? "style" : "upgrades";
    renderShop();
  }

  function setStyleFilter(cat) {
    gameState.styleFilter = cat || "all";
    renderStyleShop();
  }

  function renderShop() {
    renderCash();
    const tab = gameState.shopTab === "style" ? "style" : "upgrades";
    if (dom.shopTabUpgrades) {
      dom.shopTabUpgrades.classList.toggle("is-on", tab === "upgrades");
      dom.shopTabUpgrades.setAttribute("aria-selected", tab === "upgrades" ? "true" : "false");
    }
    if (dom.shopTabStyle) {
      dom.shopTabStyle.classList.toggle("is-on", tab === "style");
      dom.shopTabStyle.setAttribute("aria-selected", tab === "style" ? "true" : "false");
    }
    if (dom.shopPanelUpgrades) {
      dom.shopPanelUpgrades.classList.toggle("is-on", tab === "upgrades");
      dom.shopPanelUpgrades.hidden = tab !== "upgrades";
    }
    if (dom.shopPanelStyle) {
      dom.shopPanelStyle.classList.toggle("is-on", tab === "style");
      dom.shopPanelStyle.hidden = tab !== "style";
    }
    if (dom.shopTitle) {
      dom.shopTitle.textContent = tab === "style" ? "Style Shop" : "Shop Upgrades";
    }
    if (dom.shopOverlay) {
      dom.shopOverlay.classList.toggle("is-style", tab === "style");
    }
    if (tab === "style") renderStyleShop();
    else renderUpgradeShop();
  }

  function renderUpgradeShop() {
    if (!dom.shopList) return;
    dom.shopList.innerHTML = "";
    SHOP_UPGRADE_IDS.forEach(function (id) {
      const spec = SHOP_UPGRADES[id];
      const lv = upgradeLevel(id);
      const max = spec.levels.length;
      const next = spec.levels[lv];
      const owned = lv ? spec.levels[lv - 1] : null;
      const li = document.createElement("li");
      const price = next ? upgradeListPrice(next) : 0;
      const canBuy = !!(next && gameState.cash + 1e-9 >= price);
      li.className =
        "shop-card" + (lv >= max ? " is-max" : "") + (next && !canBuy ? " is-locked" : "");
      li.setAttribute("data-upgrade", id);

      let pips = "";
      for (let i = 0; i < max; i += 1) {
        pips += '<span class="shop-pip' + (i < lv ? " is-on" : "") + '"></span>';
      }

      const perk = next ? "Next · " + next.perk : owned ? "Max · " + owned.perk : spec.blurb;
      const btnLabel = next
        ? "LV" + (lv + 1) + "  " + formatMoney(price)
        : "MAXED";

      li.innerHTML =
        '<div class="shop-card-icon" aria-hidden="true">' +
        spec.icon +
        '</div><div class="shop-card-top"><p class="shop-card-name">' +
        spec.name +
        '</p><span class="shop-card-lv">LV ' +
        lv +
        "/" +
        max +
        '</span></div><div class="shop-pips" aria-hidden="true">' +
        pips +
        '</div><p class="shop-card-blurb">' +
        spec.blurb +
        '</p><p class="shop-card-perk">' +
        perk +
        '</p><button class="shop-buy" type="button" data-upgrade="' +
        id +
        '"' +
        (next ? "" : " disabled") +
        ">" +
        btnLabel +
        "</button>";
      dom.shopList.appendChild(li);
    });
  }

  function renderStyleShop() {
    if (!dom.styleList) return;
    const filter = gameState.styleFilter || "all";
    if (dom.styleFilters) {
      Array.prototype.forEach.call(dom.styleFilters.querySelectorAll("[data-style-cat]"), function (btn) {
        btn.classList.toggle("is-on", btn.getAttribute("data-style-cat") === filter);
      });
    }
    dom.styleList.innerHTML = "";
    const ids = Object.keys(COSMETICS).filter(function (id) {
      const c = COSMETICS[id];
      return filter === "all" || c.category === filter;
    });
    ids.forEach(function (id) {
      const c = COSMETICS[id];
      const unlocked = isCosmeticUnlocked(id);
      const equipped = equippedCosmeticId(c.category) === id;
      const levelOk = gameState.level >= (c.unlockLevel || 1);
      const canBuy = !unlocked && levelOk && gameState.cash + 1e-9 >= c.price;
      const li = document.createElement("li");
      let state = "locked";
      if (equipped) state = "equipped";
      else if (unlocked) state = "owned";
      else if (levelOk) state = "available";
      li.className = "style-card is-" + state;
      li.setAttribute("data-cosmetic", id);
      li.setAttribute("data-category", c.category);

      let action = "";
      if (equipped) {
        action =
          '<button class="style-action is-equipped" type="button" disabled>EQUIPPED</button>';
      } else if (unlocked) {
        action =
          '<button class="style-action style-equip" type="button" data-equip="' +
          id +
          '">EQUIP</button>';
      } else if (!levelOk) {
        action =
          '<button class="style-action is-locked" type="button" disabled>LV ' +
          c.unlockLevel +
          "</button>";
      } else {
        action =
          '<button class="style-action style-buy" type="button" data-buy-cosmetic="' +
          id +
          '"' +
          (canBuy ? "" : " disabled") +
          ">" +
          formatMoney(c.price) +
          "</button>";
      }

      li.innerHTML =
        '<div class="style-preview ' +
        c.previewClass +
        '" aria-hidden="true"></div><div class="style-card-body"><p class="style-card-cat">' +
        (COSMETIC_CATEGORY_LABELS[c.category] || c.category) +
        '</p><p class="style-card-name">' +
        c.name +
        "</p>" +
        (equipped ? '<p class="style-card-status">Equipped</p>' : "") +
        (!unlocked && !levelOk
          ? '<p class="style-card-status">Unlocks at level ' + c.unlockLevel + "</p>"
          : "") +
        action +
        "</div>";
      dom.styleList.appendChild(li);
    });
  }

  function upgradeListPrice(row) {
    return cents(row.cost * followerProgress().shopCostMult);
  }

  function buyUpgrade(id) {
    const spec = SHOP_UPGRADES[id];
    if (!spec) return;
    const lv = upgradeLevel(id);
    const next = spec.levels[lv];
    const card = dom.shopList && dom.shopList.querySelector('[data-upgrade="' + id + '"]');
    if (!next) return;
    const price = upgradeListPrice(next);
    if (gameState.cash + 1e-9 < price) {
      playSound("error");
      haptic(10);
      showRequestToast("Not enough cash");
      if (card) {
        card.classList.remove("is-broke");
        void card.offsetWidth;
        card.classList.add("is-broke");
      }
      return;
    }
    gameState.cash = cents(gameState.cash - price);
    gameState.upgrades[id] = lv + 1;
    playSound("complete");
    haptic(12);
    renderShop();
    renderCash();
    scheduleFitBox();
    saveGame();
  }

  function buyCosmetic(id) {
    const c = COSMETICS[id];
    if (!c || isCosmeticUnlocked(id)) return;
    if (gameState.level < (c.unlockLevel || 1)) {
      playSound("error");
      showRequestToast("Reach level " + c.unlockLevel + " first");
      return;
    }
    if (gameState.cash + 1e-9 < c.price) {
      playSound("error");
      haptic(10);
      showRequestToast("Not enough cash");
      return;
    }
    gameState.cash = cents(gameState.cash - c.price);
    gameState.unlockedCosmetics[id] = true;
    gameState.equippedCosmetics[c.category] = id;
    applyEquippedCosmetics();
    playSound("complete");
    haptic(12);
    renderShop();
    renderCash();
    saveGame();
  }

  function equipCosmetic(id) {
    const c = COSMETICS[id];
    if (!c || !isCosmeticUnlocked(id)) return;
    gameState.equippedCosmetics[c.category] = id;
    applyEquippedCosmetics();
    playSound("place");
    haptic(8);
    renderStyleShop();
    saveGame();
  }

  function isViralActive() {
    return !!(gameState.viral && gameState.viral.active);
  }

  function viralTimeLeft() {
    const v = gameState.viral;
    if (!v || !v.active) return 0;
    return Math.max(0, v.endsAt - Date.now());
  }

  function viralHasQueue() {
    return !!(gameState.viral && gameState.viral.queue && gameState.viral.queue.length);
  }

  function viralPreviewMode() {
    try {
      return new URLSearchParams(window.location.search).get("viral") === "1";
    } catch (err) {
      return false;
    }
  }

  function shouldOfferViralEvent() {
    if (isViralActive() || gameState.viralPending) return false;
    if (viralPreviewMode() && gameState.totalOrders >= 1) return true;
    if (gameState.totalOrders < VIRAL_EVENT.FIRST_AFTER) return false;
    if (gameState.shopRating < VIRAL_EVENT.MIN_RATING) return false;
    if (!gameState.lastViralAt) return gameState.totalOrders >= VIRAL_EVENT.FIRST_AFTER;
    return gameState.totalOrders - gameState.lastViralAt >= VIRAL_EVENT.COOLDOWN;
  }

  function viralRoll(min, max) {
    const span = Math.max(0, max - min);
    const seed = ((gameState.totalOrders + 3) * 17 + (gameState.followers || 0) * 5) % 1000;
    return min + Math.round((seed / 999) * span);
  }

  function buildViralQueue(size) {
    const pool = ORDERS.filter(function (template) {
      return orderUnlocked(template) && itemCount(template.items) <= VIRAL_EVENT.MAX_ITEMS;
    });
    const source = pool.length ? pool : ORDERS.filter(orderUnlocked);
    const queue = [];
    for (let i = 0; i < size; i += 1) {
      queue.push(source[i % source.length]);
    }
    return queue;
  }

  function takeViralOrder() {
    if (!viralHasQueue()) return null;
    return gameState.viral.queue.shift();
  }

  function paintViralBanner() {
    if (!dom.viralBanner) return;
    const on = isViralActive();
    dom.viralBanner.hidden = !on;
    if (dom.app) dom.app.classList.toggle("is-viral", on);
    if (!on) return;
    const left = viralTimeLeft();
    if (dom.viralClock) {
      dom.viralClock.textContent = formatCountdown(left);
      dom.viralClock.classList.toggle("is-late", left <= 20000);
    }
    if (dom.viralShippedLine) {
      const n = gameState.viral.shipped || 0;
      dom.viralShippedLine.textContent = n + " shipped";
    }
  }

  function tickViral() {
    if (!isViralActive()) return;
    paintViralBanner();
    if (viralTimeLeft() > 0 && viralHasQueue()) return;
    gameState.viral.expired = true;
    if (gameState.packing) return;
    if (gameState.finish && gameState.finish.active && !gameState.finish.completed) return;
    endViralEvent();
  }

  function startViralClock() {
    window.clearInterval(gameState.timers.viral);
    tickViral();
    gameState.timers.viral = window.setInterval(tickViral, 250);
  }

  function stopViralClock() {
    window.clearInterval(gameState.timers.viral);
    gameState.timers.viral = 0;
  }

  function sealedFinishSnapshot() {
    const req = getOrderRequest();
    const banCard = !!(req && req.banCard);
    const banSticker = !!(req && req.banSticker);
    const needsCard = !!(req && req.needsCard);
    return {
      tissue: 1,
      cardPlaced: banCard ? false : true,
      cardSkipped: banCard,
      flapL: true,
      flapR: true,
      stickerPlaced: !banSticker,
      stickerSkipped: banSticker,
      tape: 1,
      labelPlaced: true,
      scanned: true,
      needsCard: needsCard,
    };
  }

  function openViralSplash() {
    const cfg = VIRAL_EVENT;
    const queueN = viralRoll(cfg.QUEUE_MIN, cfg.QUEUE_MAX) + followerProgress().extraViralQueue;
    const burstF = viralRoll(cfg.BURST_FOLLOWERS[0], cfg.BURST_FOLLOWERS[1]);
    gameState.viralPending = {
      queue: queueN,
      followers: burstF,
      duration: viralPreviewMode()
        ? 28000
        : viralRoll(cfg.DURATION_MIN_MS, cfg.DURATION_MAX_MS),
    };
    if (dom.viralBurstOrders) {
      dom.viralBurstOrders.textContent = "+" + queueN;
    }
    if (dom.viralBurstFollowers) {
      dom.viralBurstFollowers.textContent = "+" + burstF.toLocaleString("en-US");
    }
    closeShop();
    hideReturnToast();
    setOverlayOpen(dom.viralSplash, true);
    playSound("viral");
    haptic(18);
  }

  function dismissViralSplash() {
    setOverlayOpen(dom.viralSplash, false);
  }

  function declineViralEvent() {
    gameState.viralPending = false;
    gameState.lastViralAt = gameState.totalOrders;
    dismissViralSplash();
    gameState.orderIndex += 1;
    createOrder();
    resetOrder();
    window.setTimeout(maybeRevealReturn, 480);
  }

  function acceptViralEvent() {
    const pending = gameState.viralPending;
    if (!pending || typeof pending !== "object") return;
    dismissViralSplash();
    const queueN = pending.queue;
    const burstF = pending.followers;
    const duration = pending.duration;
    gameState.viralPending = false;
    gameState.followers += burstF;
    gameState.viral = {
      active: true,
      expired: false,
      endsAt: Date.now() + duration,
      queue: buildViralQueue(queueN),
      shipped: 0,
      perfect: 0,
      scoreSum: 0,
      followersGained: burstF,
      burstFollowers: burstF,
    };
    startViralClock();
    renderShopStats();
    paintViralBanner();
    gameState.orderIndex += 1;
    createOrder();
    resetOrder();
    if (VIRAL_EVENT.AUTO_PACK) enterPacking();
  }

  function noteViralShip(breakdown) {
    const v = gameState.viral;
    if (!v) return;
    v.shipped += 1;
    v.scoreSum += breakdown.total || 0;
    if (breakdown.perfect) v.perfect += 1;
    const stars = breakdown.review ? breakdown.review.stars : 5;
    const bad = stars <= 2 || breakdown.total < 50 || (breakdown.request && breakdown.request.id && !breakdown.request.honored);
    let fans = bad ? VIRAL_EVENT.FOLLOWERS_ON_FAIL : VIRAL_EVENT.FOLLOWERS_PER_SHIP;
    if (!bad && breakdown.perfect) fans += VIRAL_EVENT.FOLLOWERS_PER_PERFECT;
    v.followersGained += fans;
    gameState.followers = Math.max(0, gameState.followers + fans);
    renderShopStats();
    trackDailyChallengeViralShip();
  }

  function viralBonusCash(session) {
    const avg = session.shipped ? session.scoreSum / session.shipped : 0;
    const quality = clamp(avg / VIRAL_EVENT.BONUS_SCORE_REF, 0.45, 1.25);
    const raw =
      session.shipped * VIRAL_EVENT.BONUS_PER_SHIP +
      session.perfect * VIRAL_EVENT.BONUS_PER_PERFECT;
    return cents(raw * quality);
  }

  function showViralPulse(breakdown) {
    if (!dom.viralPulse) return;
    window.clearTimeout(gameState.timers.viralPulse);
    const fans = gameState.viral ? gameState.viral.followersGained : 0;
    dom.viralPulse.hidden = false;
    dom.viralPulse.textContent =
      (breakdown.perfect ? "PERFECT  " : "SHIPPED  ") +
      breakdown.total +
      "  ·  " +
      formatFollowers(gameState.followers) +
      " fans";
    window.requestAnimationFrame(function () {
      dom.viralPulse.classList.add("is-on");
    });
    gameState.timers.viralPulse = window.setTimeout(function () {
      dom.viralPulse.classList.remove("is-on");
      gameState.timers.viralPulse = 0;
    }, 720);
    void fans;
  }

  function shipViralOrder() {
    const snap = sealedFinishSnapshot();
    const breakdown = calculateScoreBreakdown(snap);
    applyRunRewards(breakdown);
    noteViralShip(breakdown);
    if (breakdown.perfect) {
      spawnConfetti();
      haptic(18);
    } else {
      haptic(10);
    }
    playSound(breakdown.perfect ? "perfect" : "shipped");
    gameState.pendingResult = null;
    hideFinishSequence();
    showViralPulse(breakdown);
    renderOrder();
    paintViralBanner();
    window.clearTimeout(gameState.timers.viralBetween);
    gameState.timers.viralBetween = window.setTimeout(function () {
      gameState.timers.viralBetween = 0;
      if (!isViralActive()) return;
      nextOrder();
    }, VIRAL_EVENT.BETWEEN_MS);
  }

  function endViralEvent() {
    const session = gameState.viral;
    if (!session || !session.active) return;
    clearViralSessionTimers();
    clearFinishTimers();
    session.active = false;
    gameState.packing = false;
    gameState.pendingResult = null;
    gameState.lastViralAt = gameState.totalOrders;
    const bonus = viralBonusCash(session);
    gameState.cash = cents(gameState.cash + bonus);
    renderCash();
    renderXpProgress();
    if (bonus) floatCashDelta(bonus);
    hideResult();
    hideFinishSequence();
    if (dom.viralRecapShipped) dom.viralRecapShipped.textContent = String(session.shipped);
    if (dom.viralRecapPerfect) dom.viralRecapPerfect.textContent = String(session.perfect);
    if (dom.viralRecapFollowers) {
      const gained = session.followersGained;
      dom.viralRecapFollowers.textContent = (gained >= 0 ? "+" : "") + gained.toLocaleString("en-US");
    }
    if (dom.viralRecapBonus) dom.viralRecapBonus.textContent = formatMoneyDelta(bonus);
    enterDesk();
    setOverlayOpen(dom.viralRecap, true);
    playSound("viral");
    haptic(20);
    gameState.viral = session;
    gameState.viral.active = false;
    if (!gameState.statistics) gameState.statistics = createDefaultStatistics();
    gameState.statistics.viralCompletions =
      (gameState.statistics.viralCompletions || 0) + 1;
    paintViralBanner();
    renderCash();
    renderShopStats();
    saveGame();
  }

  function closeViralRecap() {
    setOverlayOpen(dom.viralRecap, false);
    gameState.viral = null;
    paintViralBanner();
    gameState.orderIndex += 1;
    createOrder();
    resetOrder();
    enterDesk();
    window.setTimeout(maybeRevealReturn, 520);
  }

  function renderRequestBlock() {
    const block = dom.orderRequest;
    const req = getOrderRequest();
    if (dom.packRequestLine) {
      if (!req) {
        dom.packRequestLine.hidden = true;
        dom.packRequestLine.textContent = "";
      } else {
        dom.packRequestLine.hidden = false;
        dom.packRequestLine.textContent = req.icon + " " + req.name;
      }
    }
    if (!block) return;
    if (!req) {
      block.hidden = true;
      paintTimer(dom.requestTimer, 0, 0);
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
    if (!req.timerSeconds) {
      paintTimer(dom.requestTimer, 0, 0);
    }
  }

  function setStage(stage) {
    gameState.stage = stage;
    if (dom.app) dom.app.setAttribute("data-stage", stage);
    if (dom.packingStage) {
      dom.packingStage.setAttribute("aria-hidden", stage === "packing" ? "false" : "true");
    }
  }

  function enterPacking() {
    if (gameState.packing) return;
    closeShop();
    hideReturnToast();
    unlockAudio();
    setStage("packing");
    playSound("place");
    haptic(8);
    scheduleFitBox();
    window.setTimeout(scheduleFitBox, 240);
  }

  function enterDesk() {
    if (isViralActive() && VIRAL_EVENT.AUTO_PACK) return;
    if (gameState.packing) return;
    if (gameState.drag) {
      const drag = gameState.drag;
      drag.done = true;
      restoreLastPosition(drag.product, drag);
      finishDrag();
    }
    setStage("desk");
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
    if (isViralActive() && VIRAL_EVENT.SKIP_FINISH) {
      if (VIRAL_EVENT.QUICK_FINISH) {
        beginBoxSealTransition(function () {
          startViralQuickFinish();
        });
      } else {
        shipViralOrder();
      }
      return;
    }
    beginBoxSealTransition(function () {
      startFinishSequence();
    });
  }

  /** Short open→closed flap beat before the existing finish overlay. */
  function beginBoxSealTransition(done) {
    const next = typeof done === "function" ? done : function () {};
    if (!dom.box) {
      next();
      return;
    }
    dom.box.classList.add("is-open");
    dom.box.classList.remove("is-sealing");
    // Force style flush so the sealing transition always plays.
    void dom.box.offsetWidth;
    dom.box.classList.add("is-sealing");
    dom.box.classList.remove("is-open");
    playSound("flap");
    haptic(8);
    window.clearTimeout(gameState.timers.juice);
    gameState.timers.juice = window.setTimeout(function () {
      gameState.timers.juice = 0;
      next();
    }, 300);
  }

  function resetBoxOpenVisual() {
    if (!dom.box) return;
    dom.box.classList.add("is-open");
    dom.box.classList.remove("is-sealing");
  }

  function nextOrder() {
    hideResult();
    closeShop();
    if (gameState.viralPending) {
      openViralSplash();
      return;
    }
    if (isViralActive() && (gameState.viral.expired || viralTimeLeft() <= 0 || !viralHasQueue())) {
      endViralEvent();
      return;
    }
    gameState.orderIndex += 1;
    createOrder();
    resetOrder();
    window.setTimeout(maybeRevealReturn, 480);
  }

  function resetOrder() {
    clearTimers();
    clearDragVisuals();
    gameState.drag = null;
    gameState.packing = false;
    dom.confetti.innerHTML = "";
    dom.dragLayer.innerHTML = "";
    dom.box.classList.remove("is-hot", "is-invalid");
    resetBoxOpenVisual();
    applyBoxSize();
    renderBoxPicker();
    spawnProducts();
    clearSelection();
    hideFinishSequence();
    hideRequestToast();
    updatePackButton();
    startExpressTimer();
    if (isViralActive() && VIRAL_EVENT.AUTO_PACK) {
      setStage("packing");
      scheduleFitBox();
      return;
    }
    enterDesk();
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
      prepped: false,
      protectionLevel: 0,
      softProtection: 0,
      effectiveProtection: 0,
      el: null,
    };
    gameState.nextInstanceId += 1;

    const el = document.createElement("div");
    el.className =
      "product type-" +
      type.id +
      (type.compressible ? " is-compressible" : "") +
      (type.silhouette !== false ? " has-silhouette" : "");
    el.dataset.instanceId = String(product.id);
    el.dataset.typeId = type.id;
    if (type.category) el.dataset.category = type.category;
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

  function materialUnitCost(mat) {
    if (!mat) return 0;
    return mat.cost * upgradeEffect("materialCostMult", 1);
  }

  function sumWrapCost(product) {
    return (product.wraps || []).reduce(function (sum, id) {
      const mat = PROTECTION_MATERIALS[id];
      return sum + materialUnitCost(mat);
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
      applyProductFloorDepth(product);
    } else {
      clearProductFloorDepth(product);
    }
  }

  /** Visual-only floor cue from Y. Does not change gameplay AABB / collision. */
  function applyProductFloorDepth(product) {
    if (!product || !product.el) return;
    const box = getSelectedBox();
    const h = Math.max(1, (box && box.height) || 1);
    const t = clamp(product.y / h, 0, 1);
    // Near front (higher y) → slightly larger + stronger contact shadow
    product.el.style.setProperty("--depth-y", String(Math.round(t * 100) / 100));
    product.el.style.setProperty("--depth-scale", String(Math.round((0.975 + t * 0.04) * 1000) / 1000));
  }

  function clearProductFloorDepth(product) {
    if (!product || !product.el) return;
    product.el.style.removeProperty("--depth-y");
    product.el.style.removeProperty("--depth-scale");
  }

  function playPickSound(type) {
    const family = productSoundFamily(type);
    playSound(PICK_SOUNDS[family] || "hard_pick");
  }

  function playWrapSound(materialId) {
    playSound(WRAP_SOUNDS[materialId] || "place");
  }

  function maybeRunProductPrep(product) {
    if (!product || product.prepped || product.inBox) return;
    const type = getType(product.typeId);
    const kind = productPrepKind(type);
    if (!kind) {
      product.prepped = true;
      return;
    }
    product.prepped = true;
    const el = product.el;
    if (!el) return;
    const cls = "is-prep-" + kind;
    el.classList.add("is-prepping", cls);
    playSound(PREP_SOUNDS[kind] || "place");
    window.setTimeout(function () {
      el.classList.remove("is-prepping", cls);
    }, kind === "fold" ? 720 : 540);
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
    const box = getBoxSize();
    const maxX = box.width - next.w;
    const maxY = box.height - next.h;
    if (maxX < 0 || maxY < 0) return false;

    const cx = product.x + previousAABB.w / 2;
    const cy = product.y + previousAABB.h / 2;
    const nextX = snapValue(clamp(cx - next.w / 2, 0, maxX));
    const nextY = snapValue(clamp(cy - next.h / 2, 0, maxY));
    const candidate = clonePose(product, { x: nextX, y: nextY, inBox: true });
    if (isInsideBox(candidate) && !isOverlapping(candidate)) {
      product.x = nextX;
      product.y = nextY;
      applyProductMetrics(product);
      return true;
    }
    const slot = findFreeSlot(product, nextX, nextY);
    if (!slot) return false;
    product.x = slot.x;
    product.y = slot.y;
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
      showRequestToast("No room to wrap — nudge items or pick a bigger box");
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
      hapticFor("error");
      showRequestToast(failLabelFor(req));
    } else {
      playWrapSound(materialId);
    }
    playSnapAnimation(product.el);
    pulseWrapSettle(product, materialId);
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
    el.style.transform = "";
    el.style.willChange = "";
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
    el.style.transform = "";
    el.style.willChange = "";
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

    const type = getType(product.typeId);
    if (!product.inBox) {
      playPickSound(type);
      maybeRunProductPrep(product);
    }

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

  function cacheDragGeometry(drag) {
    const br = dom.packArea.getBoundingClientRect();
    const box = getBoxSize();
    const bw = box.width || 1;
    const bh = box.height || 1;
    drag.packLeft = br.left;
    drag.packTop = br.top;
    drag.packRight = br.right;
    drag.packBottom = br.bottom;
    drag.scaleX = br.width / bw || 1;
    drag.scaleY = br.height / bh || 1;
    drag.boxW = bw;
    drag.boxH = bh;
  }

  function buildDragBlockers(skipId) {
    const blocked = [];
    const products = gameState.products;
    for (let i = 0; i < products.length; i += 1) {
      const other = products[i];
      if (!other.inBox || other.id === skipId) continue;
      const size = getAABB(other);
      blocked.push(other.x, other.y, size.w, size.h);
    }
    return blocked;
  }

  function dragOverlapsBlocked(x, y, w, h, blocked) {
    const x2 = x + w;
    const y2 = y + h;
    for (let i = 0; i < blocked.length; i += 4) {
      const ox = blocked[i];
      const oy = blocked[i + 1];
      const ow = blocked[i + 2];
      const oh = blocked[i + 3];
      if (x < ox + ow && x2 > ox && y < oy + oh && y2 > oy) return true;
    }
    return false;
  }

  function cancelDragRaf(drag) {
    if (drag && drag.raf) {
      window.cancelAnimationFrame(drag.raf);
      drag.raf = 0;
    }
    if (gameState.timers.dragRaf) {
      window.cancelAnimationFrame(gameState.timers.dragRaf);
      gameState.timers.dragRaf = 0;
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
    el.style.transform = "translate3d(0,0,0) scale(1.04)";
    el.style.willChange = "transform";
    el.style.margin = "0";
    el.style.zIndex = "80";
    drag.reparenting = false;

    drag.originLeft = rect.left;
    drag.originTop = rect.top;
    drag.clientX = drag.startX;
    drag.clientY = drag.startY;
    drag.raf = 0;
    drag.geomTick = 0;
    drag.lastHot = null;
    drag.lastInvalid = null;
    cacheDragGeometry(drag);
    const aabb = getAABB(product);
    drag.pw = aabb.w;
    drag.ph = aabb.h;
    drag.blocked = buildDragBlockers(product.id);

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

    drag.clientX = event.clientX;
    drag.clientY = event.clientY;
    if (!drag.raf) {
      drag.raf = window.requestAnimationFrame(flushDragFrame);
      gameState.timers.dragRaf = drag.raf;
    }
  }

  function flushDragFrame() {
    const drag = gameState.drag;
    if (!drag) return;
    drag.raf = 0;
    gameState.timers.dragRaf = 0;
    if (drag.done || !drag.moved) return;

    const el = drag.product.el;
    const x = drag.clientX - drag.offsetX;
    const y = drag.clientY - drag.offsetY;
    el.style.transform =
      "translate3d(" +
      (x - drag.originLeft) +
      "px," +
      (y - drag.originTop) +
      "px,0) scale(1.04)";

    drag.geomTick = (drag.geomTick || 0) + 1;
    if (drag.geomTick === 1 || drag.geomTick % 8 === 0) {
      cacheDragGeometry(drag);
    }

    const localX = (x - drag.packLeft) / drag.scaleX;
    const localY = (y - drag.packTop) / drag.scaleY;
    const inside =
      localX >= 0 &&
      localY >= 0 &&
      localX + drag.pw <= drag.boxW &&
      localY + drag.ph <= drag.boxH;
    const overlap = dragOverlapsBlocked(localX, localY, drag.pw, drag.ph, drag.blocked);
    const overBox =
      inside ||
      (drag.clientX >= drag.packLeft &&
        drag.clientX <= drag.packRight &&
        drag.clientY >= drag.packTop &&
        drag.clientY <= drag.packBottom);
    const hot = inside && !overlap;
    const invalid = overBox && (!inside || overlap);
    if (drag.lastHot !== hot) {
      dom.box.classList.toggle("is-hot", hot);
      drag.lastHot = hot;
    }
    if (drag.lastInvalid !== invalid) {
      dom.box.classList.toggle("is-invalid", invalid);
      el.classList.toggle("is-invalid", invalid);
      drag.lastInvalid = invalid;
    }
  }

  function dropProduct(event) {
    const drag = gameState.drag;
    if (!drag || drag.done || event.pointerId !== drag.pointerId) return;
    if (drag.reparenting) return;
    drag.done = true;
    event.preventDefault();
    cancelDragRaf(drag);

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

    // Prefer pointer math over another layout read of the dragged node.
    cacheDragGeometry(drag);
    const dropX = event.clientX - drag.offsetX;
    const dropY = event.clientY - drag.offsetY;
    let snappedX = snapValue((dropX - drag.packLeft) / drag.scaleX);
    let snappedY = snapValue((dropY - drag.packTop) / drag.scaleY);
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
    hapticFor("snap");
    playSnapAnimation(el);
    finishDrag();
  }

  function rejectPlacement(product, el) {
    playSound("error");
    hapticFor("error");
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
    cancelDragRaf(gameState.drag);
    clearDragVisuals();
    gameState.drag = null;
    updatePackButton();
  }

  function clearDragVisuals() {
    const drag = gameState.drag;
    cancelDragRaf(drag);
    if (drag && drag.placeholder && drag.placeholder.parentElement) {
      drag.placeholder.remove();
    }
    if (dom.box) {
      dom.box.classList.remove("is-hot", "is-invalid");
    }
    gameState.products.forEach(function (p) {
      if (!p.el) return;
      p.el.classList.remove("dragging", "is-invalid");
      if (!p.inBox) {
        p.el.style.transform = "";
        p.el.style.willChange = "";
      }
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

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function pulseWrapSettle(product, materialId) {
    if (!product || !product.el || prefersReducedMotion()) return;
    const layers = product.el.querySelectorAll(".wrap-layer");
    const last = layers[layers.length - 1];
    if (!last) return;
    const cls =
      materialId === "bubble"
        ? "is-settle-bubble"
        : materialId === "paper_fill"
          ? "is-settle-paper"
          : "is-settle-soft";
    last.classList.remove("is-settle-bubble", "is-settle-paper", "is-settle-soft");
    void last.offsetWidth;
    last.classList.add(cls);
  }

  function floatCashDelta(amount) {
    if (!amount || !dom.floatLayer || prefersReducedMotion()) return;
    const node = document.createElement("div");
    node.className = "float-cash" + (amount < 0 ? " is-loss" : "");
    node.textContent = (amount > 0 ? "+" : "") + formatMoney(amount);
    dom.floatLayer.appendChild(node);
    if (dom.cashChip) {
      dom.cashChip.classList.remove("is-cash-pop");
      void dom.cashChip.offsetWidth;
      dom.cashChip.classList.add("is-cash-pop");
    }
    window.clearTimeout(gameState.timers.floatCash);
    gameState.timers.floatCash = window.setTimeout(function () {
      gameState.timers.floatCash = 0;
      if (dom.floatLayer) dom.floatLayer.innerHTML = "";
      if (dom.cashChip) dom.cashChip.classList.remove("is-cash-pop");
    }, 1000);
  }

  function renderXpProgress() {
    const progress = levelProgress(gameState.xp);
    if (dom.levelValue) {
      dom.levelValue.textContent = "Lv " + progress.level;
    }
    if (dom.xpValue) {
      dom.xpValue.textContent = progress.into + "/" + progress.need;
    }
    if (dom.xpBar) {
      const pct = progress.need ? clamp((progress.into / progress.need) * 100, 0, 100) : 0;
      dom.xpBar.style.width = pct + "%";
    }
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
    const size = getAABB(product);
    const ax2 = product.x + size.w;
    const ay2 = product.y + size.h;

    if (others) {
      for (let i = 0; i < others.length; i += 1) {
        const other = others[i];
        if (other.id === product.id) continue;
        const b = getAABB(other);
        if (
          product.x < other.x + b.w &&
          ax2 > other.x &&
          product.y < other.y + b.h &&
          ay2 > other.y
        ) {
          return true;
        }
      }
      return false;
    }

    const products = gameState.products;
    for (let i = 0; i < products.length; i += 1) {
      const other = products[i];
      if (!other.inBox || other.id === product.id) continue;
      const b = getAABB(other);
      if (
        product.x < other.x + b.w &&
        ax2 > other.x &&
        product.y < other.y + b.h &&
        ay2 > other.y
      ) {
        return true;
      }
    }
    return false;
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

  const GIFT_CATEGORIES = { beauty: 1, jewelry: 1, home: 1 };
  const EVERYDAY_CATEGORIES = { fashion: 1, stationery: 1, tech: 1, collectible: 1 };

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

    accuracy = roundScore(clamp(accuracy + upgradeEffect("accuracyBonus", 0), 0, 100));
    aesthetic = roundScore(clamp(aesthetic + upgradeEffect("aestheticBonus", 0), 0, 100));
    // Cosmetics stay cosmetic: theme-match bonus is scaffolded but disabled (THEME_MATCH.enabled).
    aesthetic = roundScore(clamp(aesthetic + themeMatchAestheticBonus(), 0, 100));

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
    const profit = eco.profit || 0;
    // Soft-lock guard: cash never goes below $0 (returns already floor refunds).
    gameState.cash = cents(Math.max(0, gameState.cash + profit));
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
    if (!isViralActive() && shouldOfferViralEvent()) {
      gameState.viralPending = true;
    }
    if (!gameState.statistics) gameState.statistics = createDefaultStatistics();
    gameState.statistics.lifetimeProfit = cents(
      (gameState.statistics.lifetimeProfit || 0) + profit
    );
    recordShippedOrder(breakdown);
    recomputeDamageRate();
    trackDailyChallengeFromShip(breakdown);
    saveGame();
    renderCash();
    renderXpProgress();
    if (profit) {
      floatCashDelta(profit);
      if (profit > 0) playSound("cash");
    }
    if (levelInfo && levelInfo.leveled) {
      playSound("levelup");
      haptic(16);
    }
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
    // Score-time only: use actual wrap/compress AABBs so SPACE MASTER / Fit
    // match what the player packed (not bare catalog dims).
    const sizes = [];
    let maxW = 0;
    let maxH = 0;
    let area = 0;
    placed.forEach(function (p) {
      if (!p) return;
      const r = getRect(p);
      const type = getType(p.typeId);
      sizes.push({
        w: r.w,
        h: r.h,
        uprightOnly: !!(type && type.uprightOnly),
      });
      maxW = Math.max(maxW, r.w);
      maxH = Math.max(maxH, r.h);
      area += r.w * r.h;
    });
    const ids = ["small", "medium", "large"];
    for (let i = 0; i < ids.length; i += 1) {
      const box = BOX_TYPES[ids[i]];
      if (sizes.length && canPackAabbsInBox(sizes, box)) return box;
    }
    const needArea = area * 1.12;
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
        search(got + mats[i].protection, cost + materialUnitCost(mats[i]), depth + 1);
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
      const type = PRODUCT_TYPES[id];
      const cat = (type && type.category) || "";
      if (GIFT_CATEGORIES[cat]) gift += n;
      if (EVERYDAY_CATEGORIES[cat]) everyday += n;
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
    if (dom.deskPreview) {
      const box = getSelectedBox();
      dom.deskPreview.textContent = box.label + " ready — tap START PACKING";
    }
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
          materialUnitCost(mat).toFixed(2) +
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
      const meta = btn.querySelector(".wrap-choice-meta");
      if (meta && mat) {
        meta.textContent = "+" + mat.protection + " · $" + materialUnitCost(mat).toFixed(2);
      }
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
      btn.setAttribute("aria-pressed", selected.id === p.id ? "true" : "false");
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
      dom.resultLevelUp.classList.toggle("is-celebrate", !!leveled);
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
    window.clearTimeout(gameState.timers.confetti);
    gameState.timers.confetti = 0;
    if (dom.confetti) dom.confetti.innerHTML = "";
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
    if (prefersReducedMotion()) return;
    const colors = ["#d46a4c", "#6d9a7c", "#e2b15a", "#e5989b", "#83c5be", "#fff8ef"];
    const pieceCount = 18;
    for (let i = 0; i < pieceCount; i += 1) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.setProperty("--c", colors[i % colors.length]);
      piece.style.setProperty("--dx", Math.round(Math.random() * 100 - 50) + "px");
      piece.style.setProperty("--spin", Math.round(360 + Math.random() * 420) + "deg");
      piece.style.setProperty("--dur", 1.4 + Math.random() * 0.7 + "s");
      piece.style.setProperty("--delay", Math.random() * 0.22 + "s");
      dom.confetti.appendChild(piece);
    }
    gameState.timers.confetti = window.setTimeout(function () {
      dom.confetti.innerHTML = "";
    }, 2300);
  }

  function paintSoundButton(btn, icon) {
    if (!btn || !icon) return;
    const on = gameState.soundEnabled;
    icon.textContent = on ? "🔊" : "🔇";
    btn.setAttribute("aria-label", on ? "Mute sound" : "Unmute sound");
    btn.setAttribute("aria-pressed", on ? "false" : "true");
  }

  function renderSoundButton() {
    paintSoundButton(dom.soundToggle, dom.soundIcon);
    paintSoundButton(dom.packSoundToggle, dom.packSoundIcon);
  }


  function syncSettingsSoundUi() {
    if (!dom.settingsSoundToggle) return;
    const on = !!gameState.soundEnabled;
    dom.settingsSoundToggle.setAttribute("aria-pressed", on ? "true" : "false");
    dom.settingsSoundToggle.classList.toggle("is-on", on);
    if (dom.settingsSoundValue) {
      dom.settingsSoundValue.textContent = on ? "On" : "Off";
    }
  }

  function openSettings() {
    if (gameState.finish && gameState.finish.active && !gameState.finish.completed) return;
    if (gameState.drag) return;
    closeShop();
    hideReturnToast();
    hideResetConfirm();
    syncSettingsSoundUi();
    syncSettingsAsmrUi();
    setOverlayOpen(dom.settingsOverlay, true);
    playSound("place");
  }

  function closeSettings() {
    hideResetConfirm();
    setOverlayOpen(dom.settingsOverlay, false);
    window.setTimeout(maybeRevealReturn, 240);
  }

  function hideResetConfirm() {
    if (!dom.settingsResetConfirm) return;
    dom.settingsResetConfirm.hidden = true;
    dom.settingsResetConfirm.classList.remove("is-open");
  }

  function showResetConfirm() {
    if (!dom.settingsResetConfirm) return;
    dom.settingsResetConfirm.hidden = false;
    dom.settingsResetConfirm.classList.add("is-open");
  }

  function confirmResetProgress() {
    hideResetConfirm();
    closeSettings();
    clearTimers();
    clearViralSessionTimers();
    clearFinishTimers();
    hideFinishSequence();
    hideResult();
    setOverlayOpen(dom.viralSplash, false);
    setOverlayOpen(dom.viralRecap, false);
    resetSave();
    renderPersistentUi();
    createOrder();
    resetOrder();
    enterDesk();
    showRequestToast("Progress reset");
  }

  function markDailyChallengeComplete() {
    // Kept as a thin alias for older call sites / tests.
    completeDailyChallenge();
  }

  // ===========================================================================
  // DAILY CHALLENGE
  // Local YYYY-MM-DD seeded challenge. Same day → same challenge.
  // Soft streak only — missing a day resets the fire, no harsh penalty.
  // ===========================================================================
  const DAILY_CHALLENGE_CATALOG = [
    {
      id: "SPACE_MASTER",
      title: "Space Master",
      icon: "📦",
      blurb: "Ship 3 orders in the ideal or minimum box.",
      target: 3,
      cash: 28,
      xp: 45,
    },
    {
      id: "PERFECT_DAY",
      title: "Perfect Day",
      icon: "✨",
      blurb: "Land 2 Perfect Packs today.",
      target: 2,
      cash: 36,
      xp: 60,
    },
    {
      id: "FRAGILE_EXPERT",
      title: "Fragile Expert",
      icon: "🛡️",
      blurb: "Ship 5 fragile items with enough protection.",
      target: 5,
      cash: 32,
      xp: 50,
    },
    {
      id: "ECO_DAY",
      title: "Eco Day",
      icon: "🌱",
      blurb: "Honor 3 ECO packing requests.",
      target: 3,
      cash: 30,
      xp: 48,
    },
    {
      id: "BUDGET_PACKER",
      title: "Budget Packer",
      icon: "💸",
      blurb: "Hit Cost Score 95+ on 3 orders.",
      target: 3,
      cash: 26,
      xp: 42,
    },
    {
      id: "STYLIST",
      title: "Stylist",
      icon: "🎀",
      blurb: "Hit Aesthetic 95+ on 3 orders.",
      target: 3,
      cash: 26,
      xp: 42,
    },
    {
      id: "RUSH_HERO",
      title: "Rush Hero",
      icon: "⚡",
      blurb: "Ship a burst of orders in one Viral Rush.",
      target: 8,
      cash: 40,
      xp: 70,
      rush: true,
    },
  ];

  function localDayKey(dateObj) {
    const d = dateObj || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function shiftDayKey(dayKey, deltaDays) {
    const parts = String(dayKey || "").split("-");
    if (parts.length !== 3) return "";
    const dt = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10)
    );
    if (!Number.isFinite(dt.getTime())) return "";
    dt.setDate(dt.getDate() + deltaDays);
    return localDayKey(dt);
  }

  function hashDayKey(dayKey) {
    let h = 2166136261;
    const s = String(dayKey || "");
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function getDailyChallengeSpec(challengeId) {
    for (let i = 0; i < DAILY_CHALLENGE_CATALOG.length; i += 1) {
      if (DAILY_CHALLENGE_CATALOG[i].id === challengeId) return DAILY_CHALLENGE_CATALOG[i];
    }
    return null;
  }

  function pickDailyChallengeForDate(dayKey) {
    const seed = hashDayKey(dayKey);
    const spec = DAILY_CHALLENGE_CATALOG[seed % DAILY_CHALLENGE_CATALOG.length];
    let target = spec.target;
    if (spec.rush) {
      target = 6 + (seed % 5); // 6–10, stable for the day
    }
    return {
      id: spec.id,
      title: spec.title,
      icon: spec.icon,
      blurb: spec.blurb,
      target: target,
      cash: spec.cash,
      xp: spec.xp,
      rush: !!spec.rush,
    };
  }

  function ensureDailyChallenge() {
    const today = localDayKey();
    if (!gameState.dailyChallenge) {
      gameState.dailyChallenge = createDefaultDailyChallenge();
    }
    const current = gameState.dailyChallenge;
    if (current.date === today && current.challengeId) {
      const spec = pickDailyChallengeForDate(today);
      if (!current.target) current.target = spec.target;
      return current;
    }
    const picked = pickDailyChallengeForDate(today);
    gameState.dailyChallenge = {
      date: today,
      challengeId: picked.id,
      progress: 0,
      target: picked.target,
      completed: false,
      claimed: false,
      streak: current.streak || 0,
      lastCompletedDate: current.lastCompletedDate || "",
    };
    saveGame();
    return gameState.dailyChallenge;
  }

  function getActiveDailyChallenge() {
    return ensureDailyChallenge();
  }

  function countProtectedFragileItems() {
    let n = 0;
    (gameState.products || []).forEach(function (p) {
      if (!p.inBox) return;
      const type = getType(p.typeId);
      if (!type || !type.fragile) return;
      const need = getRequiredProtection(type);
      if (need <= 0) return;
      if ((p.effectiveProtection || 0) >= need) n += 1;
    });
    return n;
  }

  function orderUsesIdealOrMinBox(breakdown) {
    const selected = getSelectedBox();
    if (!selected) return false;
    const ideal = getIdealBox();
    const fitInfo = breakdown && breakdown.fitInfo;
    const minBox = fitInfo && fitInfo.minBox;
    if (ideal && selected.id === ideal.id) return true;
    if (minBox && selected.id === minBox.id) return true;
    return false;
  }

  function dailyChallengeDelta(breakdown) {
    const daily = getActiveDailyChallenge();
    if (!daily || daily.completed || daily.claimed) return 0;
    const spec = getDailyChallengeSpec(daily.challengeId);
    if (!spec) return 0;
    const cats = (breakdown && breakdown.categories) || {};
    const request = breakdown && breakdown.request;

    switch (daily.challengeId) {
      case "SPACE_MASTER":
        return orderUsesIdealOrMinBox(breakdown) ? 1 : 0;
      case "PERFECT_DAY":
        return breakdown && breakdown.perfect ? 1 : 0;
      case "FRAGILE_EXPERT":
        return countProtectedFragileItems();
      case "ECO_DAY":
        return request && request.id === "ECO" && request.honored ? 1 : 0;
      case "BUDGET_PACKER":
        return (cats.cost || 0) >= 95 ? 1 : 0;
      case "STYLIST":
        return (cats.aesthetic || 0) >= 95 ? 1 : 0;
      case "RUSH_HERO":
        return 0; // handled by viral ship tracker
      default:
        return 0;
    }
  }

  function bumpDailyChallengeProgress(amount) {
    const daily = getActiveDailyChallenge();
    if (!daily || daily.completed) return false;
    const add = Math.max(0, Math.round(amount || 0));
    if (!add) return false;
    const target = Math.max(1, daily.target || 1);
    daily.progress = Math.min(target, (daily.progress || 0) + add);
    if (daily.progress >= target) {
      completeDailyChallenge();
      return true;
    }
    saveGame();
    renderDailyChallengeUi();
    return false;
  }

  function setDailyChallengeProgress(value) {
    const daily = getActiveDailyChallenge();
    if (!daily || daily.completed) return false;
    const target = Math.max(1, daily.target || 1);
    const next = Math.min(target, Math.max(0, Math.round(value || 0)));
    if (next <= (daily.progress || 0)) return false;
    daily.progress = next;
    if (daily.progress >= target) {
      completeDailyChallenge();
      return true;
    }
    saveGame();
    renderDailyChallengeUi();
    return false;
  }

  function completeDailyChallenge() {
    const daily = getActiveDailyChallenge();
    if (!daily || daily.completed) return;
    daily.completed = true;
    daily.progress = Math.max(daily.progress || 0, daily.target || 0);
    const today = localDayKey();
    if (daily.lastCompletedDate !== today) {
      const yesterday = shiftDayKey(today, -1);
      if (daily.lastCompletedDate && daily.lastCompletedDate === yesterday) {
        daily.streak = (daily.streak || 0) + 1;
      } else {
        daily.streak = 1;
      }
      daily.lastCompletedDate = today;
    }
    saveGame();
    renderDailyChallengeUi();
    showRequestToast("Daily challenge complete · claim your reward");
    playSound("complete");
    haptic(16);
  }

  function trackDailyChallengeFromShip(breakdown) {
    if (!breakdown) return;
    const daily = getActiveDailyChallenge();
    if (!daily || daily.completed) return;
    if (daily.challengeId === "RUSH_HERO") {
      if (isViralActive() && gameState.viral) {
        setDailyChallengeProgress(gameState.viral.shipped || 0);
      }
      return;
    }
    bumpDailyChallengeProgress(dailyChallengeDelta(breakdown));
  }

  function trackDailyChallengeViralShip() {
    const daily = getActiveDailyChallenge();
    if (!daily || daily.completed) return;
    if (daily.challengeId !== "RUSH_HERO") return;
    if (!gameState.viral) return;
    setDailyChallengeProgress(gameState.viral.shipped || 0);
  }

  function claimDailyChallengeReward() {
    const daily = getActiveDailyChallenge();
    if (!daily || !daily.completed || daily.claimed) return false;
    const spec = getDailyChallengeSpec(daily.challengeId) || pickDailyChallengeForDate(daily.date || localDayKey());
    const cash = cents(spec.cash || 0);
    const xp = Math.round(spec.xp || 0);
    daily.claimed = true;
    gameState.cash = cents(gameState.cash + cash);
    gameState.xp += xp;
    syncLevel();
    saveGame();
    renderCash();
    renderShopStats();
    renderDailyChallengeUi();
    closeDailyChallenge();
    showRequestToast(
      "Reward claimed · +" + formatMoney(cash) + " · +" + xp + " XP"
    );
    playSound("complete");
    haptic(18);
    return true;
  }

  function renderDailyChallengeUi() {
    const daily = getActiveDailyChallenge();
    const picked = daily.challengeId
      ? pickDailyChallengeForDate(daily.date || localDayKey())
      : null;
    const target = Math.max(1, daily.target || (picked && picked.target) || 1);
    const progress = Math.min(target, daily.progress || 0);
    if (dom.dailyChipProgress) {
      dom.dailyChipProgress.textContent = progress + " / " + target;
    }
    if (dom.dailyChip) {
      dom.dailyChip.classList.toggle("is-done", !!daily.completed);
      dom.dailyChip.classList.toggle("is-claimable", !!daily.completed && !daily.claimed);
      dom.dailyChip.hidden = false;
    }
    if (dom.dailyOverlay && dom.dailyOverlay.classList.contains("is-open")) {
      paintDailyChallengeModal();
    }
  }

  function paintDailyChallengeModal() {
    const daily = getActiveDailyChallenge();
    const picked = pickDailyChallengeForDate(daily.date || localDayKey());
    const target = Math.max(1, daily.target || picked.target || 1);
    const progress = Math.min(target, daily.progress || 0);
    if (dom.dailyIcon) dom.dailyIcon.textContent = picked.icon || "🎯";
    if (dom.dailyTitle) dom.dailyTitle.textContent = picked.title || "Daily Challenge";
    if (dom.dailyBlurb) {
      let blurb = picked.blurb || "";
      if (picked.rush) {
        blurb = "Ship " + target + " orders in one Viral Rush.";
      }
      dom.dailyBlurb.textContent = blurb;
    }
    if (dom.dailyProgress) dom.dailyProgress.textContent = progress + " / " + target;
    if (dom.dailyReward) {
      dom.dailyReward.textContent =
        formatMoney(picked.cash || 0) + " · +" + (picked.xp || 0) + " XP";
    }
    if (dom.dailyStreak) {
      const streak = daily.streak || 0;
      dom.dailyStreak.textContent = streak > 0 ? "🔥 " + streak + " day streak" : "🔥 Start a streak";
    }
    if (dom.dailyStatus) {
      if (daily.claimed) dom.dailyStatus.textContent = "Reward claimed for today";
      else if (daily.completed) dom.dailyStatus.textContent = "Complete — claim your reward";
      else dom.dailyStatus.textContent = "In progress";
    }
    if (dom.dailyClaim) {
      const canClaim = !!daily.completed && !daily.claimed;
      dom.dailyClaim.hidden = !canClaim;
      dom.dailyClaim.disabled = !canClaim;
    }
  }

  function openDailyChallenge() {
    ensureDailyChallenge();
    paintDailyChallengeModal();
    setOverlayOpen(dom.dailyOverlay, true);
    playSound("place");
    haptic(8);
  }

  function closeDailyChallenge() {
    if (!dom.dailyOverlay) return;
    dom.dailyOverlay.classList.remove("is-open");
    dom.dailyOverlay.setAttribute("aria-hidden", "true");
  }

  function bindUi() {
    if (gameState.uiBound) return;
    gameState.uiBound = true;

    dom.soundToggle.addEventListener("click", toggleSound);
    if (dom.settingsBtn) {
      dom.settingsBtn.addEventListener("click", openSettings);
    }
    if (dom.settingsClose) {
      dom.settingsClose.addEventListener("click", closeSettings);
    }
    if (dom.settingsOverlay) {
      dom.settingsOverlay.addEventListener("pointerup", function (event) {
        if (event.target === dom.settingsOverlay) closeSettings();
      });
    }
    if (dom.settingsSoundToggle) {
      dom.settingsSoundToggle.addEventListener("click", toggleSound);
    }
    if (dom.settingsAsmrToggle) {
      dom.settingsAsmrToggle.addEventListener("click", toggleAsmrMode);
    }
    if (dom.settingsResetBtn) {
      dom.settingsResetBtn.addEventListener("click", showResetConfirm);
    }
    if (dom.settingsResetCancel) {
      dom.settingsResetCancel.addEventListener("click", hideResetConfirm);
    }
    if (dom.settingsResetConfirmBtn) {
      dom.settingsResetConfirmBtn.addEventListener("click", confirmResetProgress);
    }
    if (dom.shopBtn) {
      dom.shopBtn.addEventListener("click", openShop);
    }
    if (dom.shopClose) {
      dom.shopClose.addEventListener("click", closeShop);
    }
    if (dom.shopOpenResult) {
      dom.shopOpenResult.addEventListener("click", openShop);
    }
    if (dom.shopOverlay) {
      dom.shopOverlay.addEventListener("pointerup", function (event) {
        if (event.target === dom.shopOverlay) closeShop();
      });
    }
    if (dom.shopTabUpgrades) {
      dom.shopTabUpgrades.addEventListener("click", function () {
        setShopTab("upgrades");
      });
    }
    if (dom.shopTabStyle) {
      dom.shopTabStyle.addEventListener("click", function () {
        setShopTab("style");
      });
    }
    if (dom.styleFilters) {
      dom.styleFilters.addEventListener("click", function (event) {
        const btn = event.target.closest("[data-style-cat]");
        if (!btn) return;
        setStyleFilter(btn.getAttribute("data-style-cat"));
      });
    }
    if (dom.shopList) {
      dom.shopList.addEventListener("pointerup", function (event) {
        const btn = event.target.closest("[data-upgrade].shop-buy");
        if (!btn || btn.disabled) return;
        event.preventDefault();
        buyUpgrade(btn.getAttribute("data-upgrade"));
      });
    }
    if (dom.styleList) {
      dom.styleList.addEventListener("pointerup", function (event) {
        const buyBtn = event.target.closest("[data-buy-cosmetic]");
        if (buyBtn && !buyBtn.disabled) {
          event.preventDefault();
          buyCosmetic(buyBtn.getAttribute("data-buy-cosmetic"));
          return;
        }
        const eqBtn = event.target.closest("[data-equip]");
        if (eqBtn && !eqBtn.disabled) {
          event.preventDefault();
          equipCosmetic(eqBtn.getAttribute("data-equip"));
        }
      });
    }
    if (dom.viralGo) {
      dom.viralGo.addEventListener("click", acceptViralEvent);
    }
    if (dom.viralLater) {
      dom.viralLater.addEventListener("click", declineViralEvent);
    }
    if (dom.viralRecapDone) {
      dom.viralRecapDone.addEventListener("click", closeViralRecap);
    }
    if (dom.returnToastOpen) {
      dom.returnToastOpen.addEventListener("click", function () {
        openReturnInspection(gameState.activeReturn || nextPendingReturnReady());
      });
    }
    if (dom.returnResolve) {
      dom.returnResolve.addEventListener("click", resolveActiveReturn);
    }
    if (dom.returnClose) {
      dom.returnClose.addEventListener("click", closeReturnInspection);
    }
    if (dom.returnOverlay) {
      dom.returnOverlay.addEventListener("pointerup", function (event) {
        if (event.target === dom.returnOverlay) closeReturnInspection();
      });
    }
    if (dom.dailyChip) {
      dom.dailyChip.addEventListener("click", openDailyChallenge);
    }
    if (dom.dailyClose) {
      dom.dailyClose.addEventListener("click", closeDailyChallenge);
    }
    if (dom.dailyClaim) {
      dom.dailyClaim.addEventListener("click", claimDailyChallengeReward);
    }
    if (dom.dailyOverlay) {
      dom.dailyOverlay.addEventListener("pointerup", function (event) {
        if (event.target === dom.dailyOverlay) closeDailyChallenge();
      });
    }
    if (dom.packSoundToggle) {
      dom.packSoundToggle.addEventListener("click", toggleSound);
    }
    if (dom.startPackBtn) {
      dom.startPackBtn.addEventListener("click", enterPacking);
    }
    if (dom.deskBack) {
      dom.deskBack.addEventListener("click", enterDesk);
    }
    if (dom.packingStage) {
      dom.packingStage.addEventListener("transitionend", function (event) {
        if (event.target !== dom.packingStage) return;
        if (event.propertyName !== "transform" && event.propertyName !== "opacity") return;
        if (gameState.stage === "packing") scheduleFitBox();
      });
    }
    dom.packBtn.addEventListener("click", completeOrder);
    dom.nextBtn.addEventListener("click", nextOrder);
    if (dom.wrapOptions) {
      dom.wrapOptions.addEventListener("pointerup", function (event) {
        const btn = event.target.closest("[data-wrap]");
        if (!btn) return;
        event.preventDefault();
        event.stopPropagation();
        let product = getSelectedProduct();
        if (!product || !product.inBox) {
          const packed = gameState.products.filter(function (p) {
            return p.inBox;
          });
          product = packed.length === 1 ? packed[0] : null;
        }
        if (!product || !product.inBox) {
          showRequestToast("Tap an item in the box, then wrap it");
          return;
        }
        selectProduct(product);
        applyWrap(product, btn.getAttribute("data-wrap"));
      });
    }
    if (dom.wrapTargets) {
      dom.wrapTargets.addEventListener("pointerup", function (event) {
        const btn = event.target.closest("[data-product]");
        if (!btn) return;
        event.preventDefault();
        event.stopPropagation();
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

    document.addEventListener("pointerdown", function () {
      unlockAudio();
    }, true);
    document.addEventListener("keydown", function () {
      unlockAudio();
    }, true);

    document.addEventListener("pointermove", moveProduct, { passive: false });
    document.addEventListener("pointerup", dropProduct);
    document.addEventListener("pointercancel", dropProduct);

    document.addEventListener(
      "touchmove",
      function (event) {
        if (event.target.closest && event.target.closest("#shop-overlay.is-open")) {
          return;
        }
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
    { id: "label", title: "Shipping Label", hint: "Print, then place the label" },
    { id: "scan", title: "Barcode Scan", hint: "Aim, then beep the barcode" },
    { id: "shipped", title: "Shipped", hint: "On its way" },
  ];

  const VIRAL_QUICK_STEPS = [
    { id: "tissue", title: "Quick Fill", hint: "Tissue tucks — rush pack" },
    { id: "tape", title: "Tape", hint: "Seal it fast" },
    { id: "scan", title: "Scan", hint: "Scan and ship" },
  ];

  function activeFinishSteps() {
    return gameState.finish && gameState.finish.quick ? VIRAL_QUICK_STEPS : FINISH_STEPS;
  }

  function emptyFinishState() {
    return {
      active: false,
      quick: false,
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
      labelPrinted: false,
      labelPrinting: false,
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

  function scheduleFinishAdvance(delayMs) {
    window.clearTimeout(gameState.timers.finishAdvance);
    gameState.timers.finishAdvance = window.setTimeout(function () {
      gameState.timers.finishAdvance = 0;
      advanceFinish();
    }, delayMs);
  }

  function startFinishSequence() {
    const overlay = dom.finishOverlay || $("finish-overlay");
    if (!overlay) return;
    dom.finishOverlay = overlay;
    hideReturnToast();
    clearFinishTimers();
    gameState.finish = emptyFinishState();
    gameState.finish.active = true;
    resetFinishVisuals();
    if (dom.finishBoxTag) {
      dom.finishBoxTag.textContent = getSelectedBox().key;
    }
    overlay.removeAttribute("data-mode");
    setOverlayOpen(dom.resultOverlay, false);
    setOverlayOpen(overlay, true);
    if (dom.app) dom.app.classList.add("is-finishing");
    gameState.finish.ignoreUntil = Date.now() + 220;
    showFinishStep(0);
    playSound("complete");
  }

  function startViralQuickFinish() {
    const overlay = dom.finishOverlay || $("finish-overlay");
    if (!overlay) {
      shipViralOrder();
      return;
    }
    dom.finishOverlay = overlay;
    clearFinishTimers();
    gameState.finish = emptyFinishState();
    gameState.finish.active = true;
    gameState.finish.quick = true;
    resetFinishVisuals();
    if (dom.finishBoxTag) {
      dom.finishBoxTag.textContent = getSelectedBox().key;
    }
    overlay.setAttribute("data-mode", "quick");
    setOverlayOpen(dom.resultOverlay, false);
    setOverlayOpen(overlay, true);
    if (dom.app) dom.app.classList.add("is-finishing", "is-viral-quick");
    gameState.finish.ignoreUntil = Date.now() + 120;
    showFinishStep(0);
    playSound("complete");
  }

  function hideFinishSequence() {
    clearFinishTimers();
    stopContinuousSound();
    setOverlayOpen(dom.finishOverlay, false);
    if (dom.finishOverlay) dom.finishOverlay.removeAttribute("data-mode");
    if (dom.app) dom.app.classList.remove("is-finishing", "is-viral-quick");
    if (dom.finishSkip) dom.finishSkip.hidden = true;
    gameState.finish = emptyFinishState();
    resetFinishVisuals();
    resetBoxOpenVisual();
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
      dom.finishLabelSpot.classList.remove("is-on", "is-target");
      dom.finishLabelSpot.innerHTML = "";
    }
    if (dom.finishLabelPrinter) {
      dom.finishLabelPrinter.hidden = true;
      dom.finishLabelPrinter.classList.remove("is-printing");
    }
    clearClass(dom.finishBarcode, "is-scanned");
    clearClass(dom.finishBarcode, "is-aiming");
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
    const steps = activeFinishSteps();
    const step = steps[index];
    if (!step) return;
    const id = step.id;
    const req = getOrderRequest();
    const copy = cardCopy();
    if (dom.finishOverlay) {
      dom.finishOverlay.dataset.step = id;
      setOverlayOpen(dom.finishOverlay, true);
    }
    if (dom.finishStep) {
      dom.finishStep.textContent = String(index + 1).padStart(2, "0") + " / " + steps.length;
    }
    if (dom.finishHint) {
      if (id === "card") dom.finishHint.textContent = copy.hint;
      else if (id === "sticker" && req && req.banSticker) {
        dom.finishHint.textContent = "Skip the sticker — no branding on this box.";
      } else if (id === "label" && !finish.labelPrinted) {
        dom.finishHint.textContent = "Printing shipping label…";
      } else if (id === "label") {
        dom.finishHint.textContent = "Place the label on the box";
      } else {
        dom.finishHint.textContent = step.hint;
      }
    }
    if (dom.finishTitle) {
      if (id === "shipped") {
        dom.finishTitle.textContent = "SHIPPED ✓";
      } else if (id === "card") {
        dom.finishTitle.textContent = copy.title;
      } else if (id === "sticker" && req && req.banSticker) {
        dom.finishTitle.textContent = "Shop Sticker";
      } else if (id === "label" && !finish.labelPrinted) {
        dom.finishTitle.textContent = "Print Label";
      } else {
        dom.finishTitle.textContent = step.title;
      }
    }
    if (dom.finishCardText) dom.finishCardText.textContent = copy.label;
    if (dom.finishSkip) {
      const showSkip =
        !finish.quick &&
        ((id === "card" && req && req.banCard && !finish.cardPlaced && !finish.cardSkipped) ||
          (id === "sticker" && req && req.banSticker && !finish.stickerPlaced && !finish.stickerSkipped));
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
        const stepIndex = steps.findIndex(function (s) {
          return s.id === key;
        });
        el.classList.toggle("is-current", stepIndex === index);
        el.classList.toggle("is-done", stepIndex >= 0 && stepIndex < index);
        el.hidden = finish.quick && stepIndex < 0;
      });
    }

    if (dom.finishCard) {
      dom.finishCard.classList.toggle("is-hidden", id !== "card" || finish.cardPlaced);
    }
    if (dom.finishSticker) {
      dom.finishSticker.classList.toggle("is-hidden", id !== "sticker" || finish.stickerPlaced);
    }
    if (dom.finishLabel) {
      const showLabel = id === "label" && finish.labelPrinted && !finish.labelPlaced;
      dom.finishLabel.classList.toggle("is-hidden", !showLabel);
    }
    if (dom.finishLabelSpot) {
      const showTarget = id === "label" && finish.labelPrinted && !finish.labelPlaced;
      dom.finishLabelSpot.classList.toggle("is-target", showTarget);
      if (!finish.labelPlaced) {
        dom.finishLabelSpot.classList.remove("is-on");
        dom.finishLabelSpot.innerHTML = showTarget ? "<span>DROP</span>" : "";
      }
    }
    if (dom.finishScanner) {
      dom.finishScanner.classList.toggle("is-hidden", id !== "scan" || finish.scanned);
    }
    if (dom.finishBarcode) {
      dom.finishBarcode.classList.toggle("is-aiming", id === "scan" && !finish.scanned);
    }
    if (dom.finishBox) {
      const closing = finish.quick ? id === "tape" || id === "scan" : id === "close" || index > 2;
      const scanning = finish.quick ? id === "scan" : id === "scan" || index >= 6;
      dom.finishBox.classList.toggle("is-closing", closing);
      dom.finishBox.classList.toggle("is-scan", scanning);
    }
    if ((index > 0 || (finish.quick && id !== "tissue")) && dom.finishTissue) {
      dom.finishTissue.classList.add("is-tucked");
      dom.finishTissue.style.transform = "translateY(0)";
    }
    if (id === "label" && !finish.quick && !finish.labelPrinted && !finish.labelPrinting) {
      beginLabelPrint();
    }
    if (id === "shipped") {
      if (finish.scanned) completeShipped();
    }
    if (finish.quick) {
      runViralQuickAuto(id);
    }
  }

  function beginLabelPrint() {
    const finish = gameState.finish;
    if (!finish || finish.labelPrinted || finish.labelPrinting) return;
    finish.labelPrinting = true;
    const printToken = (finish.printToken = (finish.printToken || 0) + 1);
    const ms = Math.round(upgradeEffect("labelPrintMs", 900));
    if (dom.finishLabel) dom.finishLabel.classList.add("is-hidden");
    if (dom.finishLabelPrinter) {
      dom.finishLabelPrinter.hidden = false;
      dom.finishLabelPrinter.classList.remove("is-printing");
      void dom.finishLabelPrinter.offsetWidth;
      dom.finishLabelPrinter.classList.add("is-printing");
    }
    playSound("label_print");
    window.clearTimeout(gameState.timers.finishAuto);
    gameState.timers.finishAuto = window.setTimeout(function () {
      gameState.timers.finishAuto = 0;
      if (!gameState.finish || !gameState.finish.active) return;
      if (gameState.finish !== finish || finish.printToken !== printToken) return;
      if (finishStepId() !== "label") {
        finish.labelPrinting = false;
        return;
      }
      finish.labelPrinting = false;
      finish.labelPrinted = true;
      if (dom.finishLabelPrinter) {
        dom.finishLabelPrinter.classList.remove("is-printing");
        dom.finishLabelPrinter.hidden = true;
      }
      if (dom.finishTitle) dom.finishTitle.textContent = "Shipping Label";
      if (dom.finishHint) dom.finishHint.textContent = "Place the label on the box";
      if (dom.finishLabel) dom.finishLabel.classList.remove("is-hidden");
      if (dom.finishLabelSpot) {
        dom.finishLabelSpot.classList.add("is-target");
        dom.finishLabelSpot.innerHTML = "<span>DROP</span>";
      }
      playSound("label");
    }, clamp(ms, 280, 1200));
  }

  function advanceFinish() {
    const finish = gameState.finish;
    if (!finish || !finish.active) return;
    stopContinuousSound();
    const steps = activeFinishSteps();
    const next = finish.step + 1;
    if (finish.quick && next >= steps.length) {
      completeViralQuickPack();
      return;
    }
    if (next >= steps.length) return;
    showFinishStep(next);
  }

  function popFinishBox() {
    if (!dom.finishBox) return;
    dom.finishBox.classList.remove("is-pop");
    void dom.finishBox.offsetWidth;
    dom.finishBox.classList.add("is-pop");
  }

  function succeedFinish(soundId) {
    window.clearTimeout(gameState.timers.finishAuto);
    gameState.timers.finishAuto = 0;
    stopContinuousSound();
    if (soundId === "tape" || soundId === "tape_cut" || soundId === "tapeCut") {
      if (dom.finishTape) {
        dom.finishTape.classList.remove("is-drawing");
        dom.finishTape.classList.remove("is-cut");
        void dom.finishTape.offsetWidth;
        dom.finishTape.classList.add("is-cut");
      }
      playSound("tape_cut");
      hapticFor("tapeCut");
    } else {
      playSound(soundId);
      if (soundId === "sticker") hapticFor("sticker");
      else if (soundId === "tissue" || soundId === "card" || soundId === "label") {
        /* soft ASMR — no haptic spam */
      } else if (soundId === "flap") {
        hapticFor("flap");
      }
    }
    popFinishBox();
    const delay = gameState.finish && gameState.finish.quick ? 180 : 280;
    scheduleFinishAdvance(delay);
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
    window.clearTimeout(gameState.timers.finishAdvance);
    gameState.timers.finishAdvance = window.setTimeout(function () {
      gameState.timers.finishAdvance = 0;
      if (!gameState.pendingResult) return;
      applyRunRewards(breakdown);
      if (breakdown.perfect) {
        spawnConfetti();
        hapticFor("perfect");
      }
      hideFinishSequence();
      showResult(breakdown);
      renderOrder();
      gameState.pendingResult = null;
    }, 1300);
  }

  function bindFinishUi() {
    if (!dom.finishOverlay || gameState.finishUiBound) return;
    gameState.finishUiBound = true;
    const root = dom.finishOverlay;
    root.addEventListener("pointerdown", onFinishPointerDown, { passive: false });
    document.addEventListener("pointermove", onFinishPointerMove, { passive: false });
    document.addEventListener("pointerup", onFinishPointerUp);
    document.addEventListener("pointercancel", onFinishPointerUp);
  }

  function finishStepId() {
    if (!gameState.finish || !gameState.finish.active) return "";
    const steps = activeFinishSteps();
    const step = steps[gameState.finish.step];
    return step ? step.id : "";
  }

  function runViralQuickAuto(stepId) {
    const finish = gameState.finish;
    if (!finish || !finish.quick || !finish.active || finish.completed) return;
    window.clearTimeout(gameState.timers.finishAuto);
    if (stepId === "tissue") {
      if (dom.finishTissue) {
        dom.finishTissue.style.transition = "transform 0.55s ease";
        dom.finishTissue.style.transform = "translateY(0)";
        dom.finishTissue.classList.add("is-tucked");
      }
      finish.tissue = 1;
      gameState.timers.finishAuto = window.setTimeout(function () {
        gameState.timers.finishAuto = 0;
        if (!gameState.finish || !gameState.finish.quick || !gameState.finish.active) return;
        if (finishStepId() !== "tissue") return;
        succeedFinish("tissue");
      }, 700);
      return;
    }
    if (stepId === "tape") {
      finish.flapL = true;
      finish.flapR = true;
      if (dom.finishFlapL) dom.finishFlapL.classList.add("is-closed");
      if (dom.finishFlapR) dom.finishFlapR.classList.add("is-closed");
      if (dom.finishBox) dom.finishBox.classList.add("is-closing");
      if (dom.finishTape) {
        dom.finishTape.style.transition = "right 0.55s ease";
        dom.finishTape.classList.add("is-on", "is-drawing");
        dom.finishTape.style.right = "8%";
      }
      finish.tape = 1;
      startContinuousSound("tape_drag");
      gameState.timers.finishAuto = window.setTimeout(function () {
        gameState.timers.finishAuto = 0;
        stopContinuousSound();
        if (!gameState.finish || !gameState.finish.quick || !gameState.finish.active) return;
        if (finishStepId() !== "tape") return;
        succeedFinish("tape");
      }, 750);
      return;
    }
    if (stepId === "scan") {
      gameState.timers.finishAuto = window.setTimeout(function () {
        gameState.timers.finishAuto = 0;
        if (!gameState.finish || !gameState.finish.quick || !gameState.finish.active) return;
        if (finishStepId() !== "scan") return;
        finishScan();
      }, 650);
    }
  }

  function completeViralQuickPack() {
    const finish = gameState.finish;
    if (!finish || finish.completed) return;
    finish.completed = true;
    finish.scanned = true;
    clearFinishTimers();
    playSound("shipped");
    haptic(16);
    gameState.timers.finishAdvance = window.setTimeout(function () {
      gameState.timers.finishAdvance = 0;
      hideFinishSequence();
      shipViralOrder();
    }, 280);
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
      startContinuousSound("tape_drag");
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
    }
    const rect = prop.getBoundingClientRect();
    prop.classList.add("dragging");
    prop.style.position = "fixed";
    prop.style.left = rect.left + "px";
    prop.style.top = rect.top + "px";
    prop.style.zIndex = "90";
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
      const ease = upgradeEffect("tapeEase", 1);
      const progress = clamp(g.startProgress + dx / (g.boxWidth / ease), 0, 1);
      finish.tape = progress;
      dom.finishTape.classList.add("is-on", "is-drawing");
      dom.finishTape.style.right = 100 - progress * 92 + "%";
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
      stopContinuousSound();
      if (dom.finishTape) dom.finishTape.classList.remove("is-drawing");
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
      if (id === "card") {
        // Slot is display:none until filled (0×0). Accept near-misses on the box.
        const boxHit = expandClientRect(dom.finishBox.getBoundingClientRect(), 1.35);
        const overCard =
          clientPointInRect(event.clientX, event.clientY, boxHit) ||
          clientRectsOverlap(propRect, boxHit);
        if (overCard) {
          finish.cardPlaced = true;
          finish.cardSkipped = false;
          prop.classList.add("is-hidden");
          dom.finishCardSlot.classList.add("is-filled");
          dom.finishCardSlot.innerHTML = "<span>" + cardCopy().label + "</span>";
          succeedFinish("card");
        } else {
          playSound("error");
          haptic(8);
        }
        return;
      }
      if (id === "sticker" && overBox && finish.stickerPeeled) {
        finish.stickerPlaced = true;
        prop.classList.add("is-hidden");
        dom.finishStickerSpot.classList.add("is-on");
        dom.finishStickerSpot.textContent = stickerLabelText();
        succeedFinish("sticker");
        return;
      }
      if (id === "label") {
        // Label spot is display:none until placed (0×0 rect). Always hit-test the box,
        // with a generous pad + label-printer snap boost.
        const boost = Math.max(upgradeEffect("labelSnapBoost", 1), 1.5);
        const boxHit = expandClientRect(dom.finishBox.getBoundingClientRect(), boost);
        // Also accept near-misses around the release point using the dragged prop rect.
        const overLabel =
          overBox ||
          clientPointInRect(event.clientX, event.clientY, boxHit) ||
          clientRectsOverlap(propRect, boxHit);
        if (overLabel) {
          finish.labelPlaced = true;
          prop.classList.add("is-hidden");
          if (dom.finishLabelSpot) {
            dom.finishLabelSpot.classList.remove("is-target");
            dom.finishLabelSpot.classList.add("is-on");
            dom.finishLabelSpot.innerHTML = "<span>SHIP TO</span><em>Cozy Shop</em>";
          }
          succeedFinish("label");
        } else {
          playSound("error");
          haptic(8);
        }
        return;
      }
    }
  }

  function domRectsOverlap(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  function expandClientRect(r, boost) {
    const pad = Math.max(0, (boost - 1) * 36);
    return {
      left: r.left - pad,
      right: r.right + pad,
      top: r.top - pad,
      bottom: r.bottom + pad,
    };
  }

  function clientPointInRect(x, y, r) {
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function clientRectsOverlap(a, b) {
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
    hapticFor("flap");
    popFinishBox();
    if (finish.flapL && finish.flapR) {
      scheduleFinishAdvance(280);
    }
  }

  function finishScan() {
    const finish = gameState.finish;
    if (!finish || finish.scanned || finish.completed) return;
    window.clearTimeout(gameState.timers.finishAuto);
    gameState.timers.finishAuto = 0;
    finish.scanned = true;
    finish.gesture = null;
    dom.finishBarcode.classList.add("is-scanned");
    dom.finishBarcode.classList.remove("is-aiming");
    if (dom.finishScanFlash) {
      dom.finishScanFlash.classList.remove("is-on");
      void dom.finishScanFlash.offsetWidth;
      dom.finishScanFlash.classList.add("is-on");
    }
    if (dom.finishScanner) dom.finishScanner.classList.add("is-hidden");
    playSound("scan");
    hapticFor("scan");
    popFinishBox();
    scheduleFinishAdvance(finish.quick ? 220 : 360);
  }

  function init() {
    cacheDom();
    bindUi();

    // 1) DOM ready  2) load save  3) apply  4) render UI  5) create order
    gameState.suppressSave = isFreshBoot();
    applySave(loadGame());
    ensureDailyChallenge();
    applyAsmrClass();
    syncSettingsAsmrUi();
    renderPersistentUi();
    renderBoxPicker();

    createOrder();
    spawnProducts();
    renderOrder();
    updatePackButton();
    startExpressTimer();
    enterDesk();
    applyEquippedCosmetics();
    renderShop();
    renderDailyChallengeUi();
    if (ordersDebugEnabled()) {
      ensureOrdersDebugPanel();
      refreshOrdersDebugPanel();
    }
    if (viralPreviewMode()) {
      window.setTimeout(openViralSplash, 480);
    } else {
      window.setTimeout(maybeRevealReturn, 700);
    }
  }

  // ===========================================================================
  // AUDIO
  // Central manager: playSound("tape_drag") etc. Placeholder synths now.
  // Drop a file path into SOUND_BANK[id].src later (e.g. "sounds/tape.mp3")
  // and call sites stay the same. ASMR Mode boosts packing mix, quiets UI.
  // ===========================================================================
  let audioCtx = null;
  let audioUnlocking = false;
  const audioBuffers = Object.create(null);
  let continuousSound = null;

  const SOUND_BANK = {
    place: { src: null, synth: "place", mix: "ui" },
    error: { src: null, synth: "error", mix: "ui" },
    complete: { src: null, synth: "complete", mix: "pack" },
    perfect: { src: null, synth: "perfect", mix: "pack" },
    rotate: { src: null, synth: "rotate", mix: "pack" },
    printer: { src: null, synth: "printer", mix: "pack" },
    soft_pick: { src: null, synth: "soft_pick", mix: "pack" },
    hard_pick: { src: null, synth: "hard_pick", mix: "pack" },
    glass_pick: { src: null, synth: "glass_pick", mix: "pack" },
    paper_pick: { src: null, synth: "paper_pick", mix: "pack" },
    prep_fold: { src: null, synth: "prep_fold", mix: "pack" },
    prep_lid: { src: null, synth: "prep_lid", mix: "pack" },
    prep_cap: { src: null, synth: "prep_cap", mix: "pack" },
    prep_paper: { src: null, synth: "prep_paper", mix: "pack" },
    wrap_bubble: { src: null, synth: "wrap_bubble", mix: "pack" },
    wrap_paper: { src: null, synth: "wrap_paper", mix: "pack" },
    wrap_tissue: { src: null, synth: "wrap_tissue", mix: "pack" },
    wrap_foam: { src: null, synth: "wrap_foam", mix: "pack" },
    tissue: { src: null, synth: "tissue", mix: "pack" },
    card: { src: null, synth: "card", mix: "pack" },
    flap: { src: null, synth: "flap", mix: "pack" },
    peel: { src: null, synth: "peel", mix: "pack" },
    tape: { src: null, synth: "tape_drag", mix: "pack" },
    tape_drag: { src: null, synth: "tape_drag", mix: "pack" },
    tape_cut: { src: null, synth: "tape_cut", mix: "pack" },
    tapeCut: { src: null, synth: "tape_cut", mix: "pack" },
    sticker: { src: null, synth: "sticker", mix: "pack" },
    label_print: { src: null, synth: "label_print", mix: "pack" },
    label: { src: null, synth: "label", mix: "pack" },
    scan: { src: null, synth: "scan", mix: "pack" },
    shipped: { src: null, synth: "shipped", mix: "pack" },
    review: { src: null, synth: "review", mix: "ui" },
    viral: { src: null, synth: "viral", mix: "ui" },
    cash: { src: null, synth: "cash", mix: "ui" },
    levelup: { src: null, synth: "levelup", mix: "ui" },
  };

  const HAPTIC_MAP = {
    snap: 8,
    sticker: 10,
    tapeCut: 14,
    flap: 10,
    scan: 16,
    error: 14,
    perfect: [28, 160, 14, 300, 10],
  };

  function getAudioContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    return audioCtx;
  }

  function blipUnlock(ctx) {
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } catch (err) {
      /* some browsers reject start() while still suspended */
    }
  }

  function unlockAudio() {
    const ctx = getAudioContext();
    if (!ctx) return;
    blipUnlock(ctx);
    if (ctx.state === "suspended" || ctx.state === "interrupted") {
      if (audioUnlocking) return;
      audioUnlocking = true;
      ctx
        .resume()
        .catch(function () {})
        .then(function () {
          audioUnlocking = false;
          blipUnlock(ctx);
        });
    }
  }

  function resumeAudio() {
    unlockAudio();
  }

  function soundMixGain(entry) {
    const mix = (entry && entry.mix) || "pack";
    if (!gameState.asmrMode) return mix === "pack" ? 0.9 : 0.82;
    // ASMR: packing sounds forward, UI quieter. Music reserved for later.
    if (mix === "pack") return 1.18;
    return 0.42;
  }

  function applyAsmrClass() {
    if (dom.app) dom.app.classList.toggle("is-asmr", !!gameState.asmrMode);
  }

  function playSound(kind) {
    if (!gameState.soundEnabled) return;
    const entry = SOUND_BANK[kind];
    if (!entry) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const gainMul = soundMixGain(entry);
    const run = function () {
      if (!gameState.soundEnabled) return;
      if (ctx.state === "suspended" || ctx.state === "interrupted") return;
      if (entry.src) {
        playFileSound(ctx, kind, entry.src, entry.synth, gainMul);
        return;
      }
      playSynth(ctx, entry.synth || kind, gainMul);
    };
    if (ctx.state === "suspended" || ctx.state === "interrupted") {
      ctx.resume().then(run).catch(function () {});
      return;
    }
    run();
  }

  function playFileSound(ctx, kind, src, fallback, gainMul) {
    const mul = typeof gainMul === "number" ? gainMul : 0.85;
    const playBuffer = function (buffer) {
      const srcNode = ctx.createBufferSource();
      const gain = ctx.createGain();
      srcNode.buffer = buffer;
      gain.gain.value = mul;
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
        playSynth(ctx, fallback || kind, mul);
      });
  }

  function stopContinuousSound() {
    if (!continuousSound) return;
    const node = continuousSound;
    continuousSound = null;
    try {
      const now = node.ctx.currentTime;
      node.gain.gain.cancelScheduledValues(now);
      node.gain.gain.setValueAtTime(Math.max(0.0001, node.gain.gain.value), now);
      node.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
      node.src.stop(now + 0.1);
    } catch (err) {
      /* ignore */
    }
  }

  function startContinuousSound(kind) {
    stopContinuousSound();
    if (!gameState.soundEnabled) return;
    const entry = SOUND_BANK[kind] || SOUND_BANK.tape_drag;
    if (!entry) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const run = function () {
      if (!gameState.soundEnabled || continuousSound) return;
      if (ctx.state === "suspended" || ctx.state === "interrupted") return;
      const frames = Math.floor(ctx.sampleRate * 0.35);
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < frames; i += 1) {
        const white = Math.random() * 2 - 1;
        prev = prev * 0.82 + white * 0.18;
        data[i] = prev * 0.55;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1450;
      filter.Q.value = 0.7;
      const gain = ctx.createGain();
      const peak = 0.045 * soundMixGain(entry);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.05);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      continuousSound = { ctx: ctx, src: src, gain: gain };
    };
    if (ctx.state === "suspended" || ctx.state === "interrupted") {
      ctx.resume().then(run).catch(function () {});
      return;
    }
    run();
  }

  function playSynth(ctx, synth, gainMul) {
    const now = ctx.currentTime;
    const gMul = typeof gainMul === "number" ? gainMul : 1;

    function tone(type, freq, dur, peak, slideTo, delay) {
      const start = now + (delay || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(Math.max(freq * 2.2, 900), start);
      filter.Q.value = 0.55;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + dur);
      }
      const amp = Math.min(0.24, peak * 1.8 * gMul);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(amp, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.03);
    }

    function noiseBurst(dur, peak, filterFreq, delay, q) {
      const start = now + (delay || 0);
      const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let prev = 0;
      for (let i = 0; i < frames; i += 1) {
        const white = Math.random() * 2 - 1;
        prev = prev * 0.75 + white * 0.25;
        data[i] = prev * (1 - i / frames);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = filterFreq;
      filter.Q.value = typeof q === "number" ? q : 0.55;
      const gain = ctx.createGain();
      const amp = Math.min(0.2, peak * 1.6 * gMul);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(amp, start + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(start);
      src.stop(start + dur + 0.03);
    }

    switch (synth) {
      case "place":
        tone("sine", 640, 0.09, 0.04, 420, 0);
        noiseBurst(0.05, 0.025, 1800, 0.01);
        break;
      case "error":
        tone("triangle", 210, 0.12, 0.04, 140, 0);
        tone("sine", 160, 0.1, 0.028, null, 0.04);
        break;
      case "complete":
        tone("sine", 392, 0.12, 0.04, null, 0);
        tone("sine", 523, 0.12, 0.04, null, 0.09);
        break;
      case "perfect":
        tone("sine", 523, 0.12, 0.04, null, 0);
        tone("sine", 659, 0.12, 0.04, null, 0.09);
        tone("sine", 784, 0.14, 0.045, null, 0.18);
        tone("triangle", 988, 0.22, 0.035, 1174, 0.28);
        noiseBurst(0.08, 0.022, 2600, 0.3);
        break;
      case "rotate":
        tone("sine", 760, 0.06, 0.028, 920, 0);
        break;
      case "printer":
        noiseBurst(0.08, 0.04, 2200, 0, 1.2);
        tone("square", 180, 0.06, 0.02, null, 0.05);
        noiseBurst(0.07, 0.035, 2400, 0.14, 1.1);
        tone("square", 170, 0.05, 0.018, null, 0.2);
        noiseBurst(0.1, 0.03, 2000, 0.32, 0.9);
        break;
      case "soft_pick":
        noiseBurst(0.14, 0.04, 900, 0, 0.4);
        tone("sine", 280, 0.1, 0.02, 220, 0.02);
        break;
      case "hard_pick":
        tone("triangle", 520, 0.05, 0.04, 300, 0);
        noiseBurst(0.04, 0.03, 1600, 0);
        break;
      case "glass_pick":
        tone("sine", 1240, 0.07, 0.035, 980, 0);
        tone("sine", 1860, 0.05, 0.02, null, 0.04);
        break;
      case "paper_pick":
        noiseBurst(0.12, 0.045, 2100, 0, 0.7);
        tone("triangle", 420, 0.06, 0.015, 360, 0.02);
        break;
      case "prep_fold":
        noiseBurst(0.2, 0.045, 1100, 0, 0.45);
        noiseBurst(0.12, 0.03, 900, 0.18, 0.4);
        break;
      case "prep_lid":
        tone("triangle", 640, 0.05, 0.04, 400, 0);
        tone("sine", 320, 0.08, 0.03, null, 0.05);
        break;
      case "prep_cap":
        tone("sine", 980, 0.05, 0.03, 720, 0);
        noiseBurst(0.04, 0.02, 2400, 0.03);
        break;
      case "prep_paper":
        noiseBurst(0.16, 0.04, 2300, 0, 0.8);
        break;
      case "wrap_bubble":
        noiseBurst(0.08, 0.05, 3200, 0, 1.4);
        noiseBurst(0.06, 0.035, 2800, 0.05, 1.2);
        noiseBurst(0.05, 0.025, 3400, 0.1, 1.5);
        break;
      case "wrap_paper":
        noiseBurst(0.18, 0.05, 1800, 0, 0.6);
        tone("triangle", 360, 0.08, 0.015, 280, 0.04);
        break;
      case "wrap_tissue":
        noiseBurst(0.32, 0.05, 2000, 0, 0.5);
        tone("sine", 700, 0.18, 0.02, 340, 0.04);
        break;
      case "wrap_foam":
        tone("sine", 140, 0.14, 0.05, 90, 0);
        noiseBurst(0.1, 0.03, 500, 0.02, 0.35);
        break;
      case "tissue":
        noiseBurst(0.3, 0.05, 2050, 0, 0.5);
        tone("sine", 760, 0.16, 0.025, 360, 0.02);
        break;
      case "card":
        tone("triangle", 480, 0.12, 0.05, 300, 0);
        noiseBurst(0.07, 0.028, 1500, 0.01);
        break;
      case "flap":
        tone("sine", 190, 0.16, 0.055, 120, 0);
        noiseBurst(0.1, 0.03, 380, 0);
        break;
      case "peel":
        noiseBurst(0.22, 0.055, 3000, 0, 0.9);
        tone("sine", 920, 0.12, 0.02, 1280, 0.02);
        break;
      case "tape_drag":
        noiseBurst(0.16, 0.05, 1500, 0, 0.65);
        tone("triangle", 260, 0.1, 0.02, 220, 0.02);
        break;
      case "tape_cut":
        noiseBurst(0.045, 0.07, 2600, 0, 1.6);
        tone("sine", 980, 0.05, 0.035, 480, 0.01);
        noiseBurst(0.03, 0.04, 1800, 0.04, 1.1);
        break;
      case "tape":
        noiseBurst(0.12, 0.04, 1500, 0, 0.65);
        break;
      case "tapeCut":
        noiseBurst(0.045, 0.07, 2600, 0, 1.6);
        tone("sine", 980, 0.05, 0.035, 480, 0.01);
        break;
      case "sticker":
        tone("sine", 700, 0.1, 0.05, 480, 0);
        noiseBurst(0.05, 0.028, 1900, 0.02);
        break;
      case "label_print":
        noiseBurst(0.1, 0.04, 2100, 0, 1.1);
        tone("square", 160, 0.08, 0.018, null, 0.06);
        noiseBurst(0.12, 0.035, 1900, 0.16, 1);
        tone("square", 150, 0.07, 0.015, null, 0.28);
        noiseBurst(0.14, 0.03, 1700, 0.4, 0.9);
        break;
      case "label":
        tone("triangle", 440, 0.1, 0.045, 260, 0);
        noiseBurst(0.05, 0.025, 1200, 0.04);
        tone("sine", 660, 0.07, 0.025, null, 0.1);
        break;
      case "scan":
        tone("sine", 1680, 0.06, 0.05, 1320, 0);
        tone("sine", 2100, 0.08, 0.045, 1680, 0.07);
        break;
      case "shipped":
        tone("sine", 523.25, 0.12, 0.055, null, 0);
        tone("sine", 659.25, 0.14, 0.055, null, 0.1);
        tone("triangle", 783.99, 0.22, 0.06, 988, 0.2);
        break;
      case "review":
        tone("sine", 740, 0.1, 0.03, null, 0);
        tone("triangle", 920, 0.12, 0.035, null, 0.08);
        break;
      case "viral":
        tone("sine", 523, 0.1, 0.04, null, 0);
        tone("triangle", 698, 0.12, 0.045, null, 0.08);
        tone("sine", 880, 0.16, 0.05, 1046, 0.16);
        break;
      case "cash":
        tone("sine", 880, 0.07, 0.035, null, 0);
        tone("triangle", 1174, 0.1, 0.04, null, 0.05);
        break;
      case "levelup":
        tone("sine", 523, 0.09, 0.04, null, 0);
        tone("sine", 659, 0.09, 0.04, null, 0.07);
        tone("sine", 784, 0.14, 0.045, null, 0.14);
        break;
      default:
        tone("sine", 480, 0.1, 0.04, 360, 0);
    }
  }

  function hapticFor(kind) {
    if (typeof navigator.vibrate !== "function") return;
    const pattern = HAPTIC_MAP[kind];
    if (!pattern) return;
    if (Array.isArray(pattern)) {
      navigator.vibrate(pattern);
      return;
    }
    navigator.vibrate(pattern);
  }

  function haptic(ms) {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  }

  function syncSettingsAsmrUi() {
    if (!dom.settingsAsmrToggle) return;
    const on = !!gameState.asmrMode;
    dom.settingsAsmrToggle.setAttribute("aria-pressed", on ? "true" : "false");
    dom.settingsAsmrToggle.classList.toggle("is-on", on);
    if (dom.settingsAsmrValue) {
      dom.settingsAsmrValue.textContent = on ? "On" : "Off";
    }
  }

  function toggleAsmrMode() {
    unlockAudio();
    gameState.asmrMode = !gameState.asmrMode;
    applyAsmrClass();
    syncSettingsAsmrUi();
    saveGame();
    if (gameState.soundEnabled) playSound(gameState.asmrMode ? "tissue" : "place");
  }

  function toggleSound() {
    unlockAudio();
    gameState.soundEnabled = !gameState.soundEnabled;
    if (!gameState.soundEnabled) stopContinuousSound();
    renderSoundButton();
    syncSettingsSoundUi();
    saveGame();
    if (gameState.soundEnabled) playSound("place");
  }

  init();
})();
