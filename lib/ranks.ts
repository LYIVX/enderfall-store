export interface RankFeature {
  name: string;
  description: string;
}

export interface RankBenefit {
  title: string;
  description?: string;
  icon?: string; // Optional icon class (e.g., FontAwesome)
}

export interface RankCategory {
  id: string;
  name: string;
  description: string;
  order: number; // For controlling display order
}

export interface Rank {
  id: string;
  name: string;
  price: number;
  stripePriceId: string;
  features: string[];
  benefits: RankBenefit[];
  color: string;
  gradient?: string; // Optional custom gradient
  gradientStyle?: {
    // Optional inline style for gradients and shadows
    background: string;
    boxShadow: string;
  };
  categoryId: string; // Reference to a category
  requiredRank?: string;
  command: string;
  order: number; // For controlling display order within a category
}

// Define rank categories
export const rankCategories: RankCategory[] = [
  {
    id: "regular",
    name: "Regular Ranks",
    description: "Standard server ranks with various perks",
    order: 1,
  },
  {
    id: "upgrade",
    name: "Rank Upgrades",
    description: "Upgrade your existing rank at a discounted price",
    order: 2,
  },
  {
    id: "towny",
    name: "Towny Ranks",
    description: "Special ranks for Towny gameplay",
    order: 3,
  },
  {
    id: "townyUpgrade",
    name: "Towny Upgrades",
    description: "Upgrade your existing Towny rank",
    order: 4,
  },
];

// Stripe price IDs from environment variables
const STRIPE_PRICES = {
  // Regular ranks
  shadow_enchanter: process.env.STRIPE_PRICE_SHADOW_ENCHANTER || "",
  void_walker: process.env.STRIPE_PRICE_VOID_WALKER || "",
  ethereal_warden: process.env.STRIPE_PRICE_ETHEREAL_WARDEN || "",
  astral_guardian: process.env.STRIPE_PRICE_ASTRAL_GUARDIAN || "",

  // Regular rank upgrades
  shadow_enchanter_to_void_walker:
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER_TO_VOID_WALKER ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  void_walker_to_ethereal_warden:
    process.env.STRIPE_PRICE_VOID_WALKER_TO_ETHEREAL_WARDEN ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  ethereal_warden_to_astral_guardian:
    process.env.STRIPE_PRICE_ETHEREAL_WARDEN_TO_ASTRAL_GUARDIAN ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",

  // Towny ranks
  citizen:
    process.env.STRIPE_PRICE_CITIZEN ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  merchant:
    process.env.STRIPE_PRICE_MERCHANT ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  councilor:
    process.env.STRIPE_PRICE_COUNCILOR ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  mayor:
    process.env.STRIPE_PRICE_MAYOR ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  governor:
    process.env.STRIPE_PRICE_GOVERNOR ||
    process.env.STRIPE_PRICE_VOID_WALKER ||
    "",
  noble:
    process.env.STRIPE_PRICE_NOBLE ||
    process.env.STRIPE_PRICE_VOID_WALKER ||
    "",
  duke:
    process.env.STRIPE_PRICE_DUKE ||
    process.env.STRIPE_PRICE_ETHEREAL_WARDEN ||
    "",
  king:
    process.env.STRIPE_PRICE_KING ||
    process.env.STRIPE_PRICE_ETHEREAL_WARDEN ||
    "",
  emperor:
    process.env.STRIPE_PRICE_EMPEROR ||
    process.env.STRIPE_PRICE_ASTRAL_GUARDIAN ||
    "",
  divine:
    process.env.STRIPE_PRICE_DIVINE ||
    process.env.STRIPE_PRICE_ASTRAL_GUARDIAN ||
    "",

  // Towny rank upgrades
  citizen_to_merchant:
    process.env.STRIPE_PRICE_CITIZEN_TO_MERCHANT ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  merchant_to_councilor:
    process.env.STRIPE_PRICE_MERCHANT_TO_COUNCILOR ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  councilor_to_mayor:
    process.env.STRIPE_PRICE_COUNCILOR_TO_MAYOR ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  mayor_to_governor:
    process.env.STRIPE_PRICE_MAYOR_TO_GOVERNOR ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  governor_to_noble:
    process.env.STRIPE_PRICE_GOVERNOR_TO_NOBLE ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  noble_to_duke:
    process.env.STRIPE_PRICE_NOBLE_TO_DUKE ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  duke_to_king:
    process.env.STRIPE_PRICE_DUKE_TO_KING ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  king_to_emperor:
    process.env.STRIPE_PRICE_KING_TO_EMPEROR ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
  emperor_to_divine:
    process.env.STRIPE_PRICE_EMPEROR_TO_DIVINE ||
    process.env.STRIPE_PRICE_SHADOW_ENCHANTER ||
    "",
} as const;

// Warn if any price IDs are missing
if (!STRIPE_PRICES.shadow_enchanter)
  console.warn("Missing STRIPE_PRICE_SHADOW_ENCHANTER environment variable");
if (!STRIPE_PRICES.void_walker)
  console.warn("Missing STRIPE_PRICE_VOID_WALKER environment variable");
if (!STRIPE_PRICES.ethereal_warden)
  console.warn("Missing STRIPE_PRICE_ETHEREAL_WARDEN environment variable");
if (!STRIPE_PRICES.astral_guardian)
  console.warn("Missing STRIPE_PRICE_ASTRAL_GUARDIAN environment variable");

// Warn about upgrade price IDs
if (!process.env.STRIPE_PRICE_SHADOW_ENCHANTER_TO_VOID_WALKER)
  console.warn(
    "Missing STRIPE_PRICE_SHADOW_ENCHANTER_TO_VOID_WALKER environment variable, using fallback"
  );
if (!process.env.STRIPE_PRICE_VOID_WALKER_TO_ETHEREAL_WARDEN)
  console.warn(
    "Missing STRIPE_PRICE_VOID_WALKER_TO_ETHEREAL_WARDEN environment variable, using fallback"
  );
if (!process.env.STRIPE_PRICE_ETHEREAL_WARDEN_TO_ASTRAL_GUARDIAN)
  console.warn(
    "Missing STRIPE_PRICE_ETHEREAL_WARDEN_TO_ASTRAL_GUARDIAN environment variable, using fallback"
  );

// Warn about towny rank price IDs
if (!process.env.STRIPE_PRICE_CITIZEN)
  console.warn(
    "Missing STRIPE_PRICE_CITIZEN environment variable, using fallback"
  );
if (!process.env.STRIPE_PRICE_MERCHANT)
  console.warn(
    "Missing STRIPE_PRICE_MERCHANT environment variable, using fallback"
  );
if (!process.env.STRIPE_PRICE_COUNCILOR)
  console.warn(
    "Missing STRIPE_PRICE_COUNCILOR environment variable, using fallback"
  );
if (!process.env.STRIPE_PRICE_MAYOR)
  console.warn(
    "Missing STRIPE_PRICE_MAYOR environment variable, using fallback"
  );
if (!process.env.STRIPE_PRICE_GOVERNOR)
  console.warn(
    "Missing STRIPE_PRICE_GOVERNOR environment variable, using fallback"
  );
if (!process.env.STRIPE_PRICE_NOBLE)
  console.warn(
    "Missing STRIPE_PRICE_NOBLE environment variable, using fallback"
  );
if (!process.env.STRIPE_PRICE_DUKE)
  console.warn(
    "Missing STRIPE_PRICE_DUKE environment variable, using fallback"
  );
if (!process.env.STRIPE_PRICE_KING)
  console.warn(
    "Missing STRIPE_PRICE_KING environment variable, using fallback"
  );
if (!process.env.STRIPE_PRICE_EMPEROR)
  console.warn(
    "Missing STRIPE_PRICE_EMPEROR environment variable, using fallback"
  );
if (!process.env.STRIPE_PRICE_DIVINE)
  console.warn(
    "Missing STRIPE_PRICE_DIVINE environment variable, using fallback"
  );

// Common benefits that can be reused across ranks
const BENEFITS = {
  coloredChat: {
    title: "Colored Chat",
    description: "Express yourself with colored messages in the chat",
    icon: "palette",
  },
  fly: {
    title: "Fly Command",
    description: "Access to /fly command for creative flight",
    icon: "wings",
  },
  homeLocations: (count: number) => ({
    title: `${count} Home Locations`,
    description: `Set up to ${count} home locations for teleportation`,
    icon: "home",
  }),
  customJoinMessages: {
    title: "Custom Join Messages",
    description: "Personalized server join announcements",
    icon: "message",
  },
  nickCommand: {
    title: "Nickname Command",
    description: "Change your display name with /nick",
    icon: "tag",
  },
  particleEffects: {
    title: "Particle Effects",
    description: "Show off with custom particle trails and effects",
    icon: "sparkles",
  },
  priorityAccess: {
    title: "Priority Server Access",
    description: "Join the server even when it's full",
    icon: "crown",
  },
  armorEffects: {
    title: "Custom Armor Effects",
    description: "Apply special visual effects to your armor",
    icon: "shield",
  },
  unlimitedHomes: {
    title: "Unlimited Homes",
    description: "Set as many home locations as you want",
    icon: "infinity",
  },
};

// All ranks in a single array for easier management
export const ranks: Rank[] = [
  // Regular ranks
  {
    id: "shadow_enchanter",
    name: "Shadow Enchanter",
    price: 9.99,
    stripePriceId: STRIPE_PRICES.shadow_enchanter,
    features: [
      "Colored chat with /me and /chat",
      "/tpa and /tpahere teleport",
      "/kit Shadow once per week",
      "5 /sethome locations",
    ],
    benefits: [
      {
        title: "Expressive Chat",
        description:
          "Use colored text in chat and expression commands like /me",
      },
      {
        title: "Player Teleportation",
        description:
          "Teleport to players with /tpa and request players to teleport to you with /tpahere",
      },
      {
        title: "Shadow Kit Access",
        description: "Receive special gear with /kit Shadow once per week",
      },
      {
        title: "Multiple Homes",
        description: "Set up to 5 home locations for quick teleportation",
      },
    ],
    color: "from-green-500 to-green-700",
    gradient: "from-green-500 via-emerald-500 to-teal-600",
    gradientStyle: {
      background: "linear-gradient(to right, #10b981, #059669, #0d9488)",
      boxShadow: "0 4px 20px rgba(16, 185, 129, 0.5)",
    },
    categoryId: "regular",
    command: "lp user %player% parent add shadow_enchanter",
    order: 1,
  },
  {
    id: "void_walker",
    name: "Void Walker",
    price: 19.99,
    stripePriceId: STRIPE_PRICES.void_walker,
    features: [
      "All Shadow Enchanter features",
      "/nick and /realname commands",
      "/ptime and /back commands",
      "10 /sethome locations",
    ],
    benefits: [
      {
        title: "All Shadow Enchanter Benefits",
        description: "Includes all benefits from the Shadow Enchanter rank",
      },
      {
        title: "Identity Masking",
        description:
          "Change your display name with /nick and find player's real names with /realname",
      },
      {
        title: "Time Control & Return",
        description:
          "Set personal time with /ptime and return to your death location with /back",
      },
      {
        title: "Enhanced Homes",
        description: "Set up to 10 home locations for quick teleportation",
      },
    ],
    color: "from-blue-500 to-blue-700",
    gradient: "from-blue-500 via-indigo-500 to-purple-600",
    gradientStyle: {
      background: "linear-gradient(to right, #3b82f6, #4f46e5, #7c3aed)",
      boxShadow: "0 4px 20px rgba(59, 130, 246, 0.5)",
    },
    categoryId: "regular",
    command: "lp user %player% parent add void_walker",
    order: 2,
  },
  {
    id: "ethereal_warden",
    name: "Ethereal Warden",
    price: 29.99,
    stripePriceId: STRIPE_PRICES.ethereal_warden,
    features: [
      "All Void Walker features",
      "/fly and /speed commands",
      "/enderchest and /hat commands",
      "20 /sethome locations",
    ],
    benefits: [
      {
        title: "All Void Walker Benefits",
        description: "Includes all benefits from the Void Walker rank",
      },
      {
        title: "Aerial Movement",
        description:
          "Fly freely with /fly and adjust movement speed with /speed",
      },
      {
        title: "Portable Storage & Style",
        description:
          "Access your enderchest anywhere with /enderchest and wear any item as a hat with /hat",
      },
      {
        title: "Expanded Homes",
        description: "Set up to 20 home locations for quick teleportation",
      },
    ],
    color: "from-purple-500 to-purple-700",
    gradient: "from-purple-500 via-fuchsia-500 to-pink-600",
    gradientStyle: {
      background: "linear-gradient(to right, #8b5cf6, #d946ef, #ec4899)",
      boxShadow: "0 4px 20px rgba(139, 92, 246, 0.5)",
    },
    categoryId: "regular",
    command: "lp user %player% parent add ethereal_warden",
    order: 3,
  },

  {
    id: "astral_guardian",
    name: "Astral Guardian",
    price: 39.99,
    stripePriceId: STRIPE_PRICES.astral_guardian,
    features: [
      "All Ethereal Warden features",
      "/pweather and /heal commands",
      "/condense and /repair commands",
      "Unlimited /sethome locations",
    ],
    benefits: [
      {
        title: "All Ethereal Warden Benefits",
        description: "Includes all benefits from the Ethereal Warden rank",
      },
      {
        title: "Weather & Vitality Control",
        description:
          "Set personal weather with /pweather and restore health with /heal",
      },
      {
        title: "Item Management",
        description:
          "Convert items to blocks with /condense and repair items with /repair",
      },
      {
        title: "Infinite Homes",
        description: "Set unlimited home locations throughout the server",
      },
    ],
    color: "from-purple-500 to-purple-700",
    gradient: "from-purple-500 via-fuchsia-500 to-pink-600",
    gradientStyle: {
      background: "linear-gradient(to right, #ef4444, #d946ef, #ec4899)",
      boxShadow: "0 4px 20px rgba(239, 68, 68, 0.5)",
    },
    categoryId: "regular",
    command: "lp user %player% parent add astral_guardian",
    order: 4,
  },

  // Rank upgrades
  {
    id: "shadow_enchanter_to_void_walker",
    name: "Shadow Enchanter to Void Walker",
    price: 9.99,
    stripePriceId: STRIPE_PRICES.shadow_enchanter_to_void_walker,
    features: [
      "Upgrade from Shadow Enchanter to Void Walker",
      "Keep all Shadow Enchanter features",
      "Get Void Walker exclusive features",
      "Discounted upgrade price",
    ],
    benefits: [
      {
        title: "Shadow Enchanter to Void Walker Upgrade",
        description:
          "Upgrade from Shadow Enchanter to Void Walker at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description:
          "You'll retain all benefits from your Shadow Enchanter rank",
      },
      BENEFITS.nickCommand,
      BENEFITS.particleEffects,
      BENEFITS.homeLocations(10),
    ],
    color: "from-blue-500 to-blue-700",
    gradient: "from-blue-500 via-indigo-500 to-purple-600",
    gradientStyle: {
      background: "linear-gradient(to right, #3b82f6, #4f46e5, #7c3aed)",
      boxShadow: "0 4px 20px rgba(59, 130, 246, 0.5)",
    },
    categoryId: "upgrade",
    requiredRank: "shadow_enchanter",
    command: "lp user %player% parent add void_walker",
    order: 1,
  },
  {
    id: "void_walker_to_ethereal_warden",
    name: "Void Walker to Ethereal Warden",
    price: 9.99,
    stripePriceId: STRIPE_PRICES.void_walker_to_ethereal_warden,
    features: [
      "Upgrade from Void Walker to Ethereal Warden",
      "Keep all Void Walker features",
      "Get Ethereal Warden exclusive features",
      "Discounted upgrade price",
    ],
    benefits: [
      {
        title: "Void Walker to Ethereal Warden Upgrade",
        description:
          "Upgrade from Void Walker to Ethereal Warden at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your Void Walker rank",
      },
      BENEFITS.priorityAccess,
      BENEFITS.armorEffects,
      BENEFITS.unlimitedHomes,
    ],
    color: "from-purple-500 to-purple-700",
    gradient: "from-purple-500 via-fuchsia-500 to-pink-600",
    gradientStyle: {
      background: "linear-gradient(to right, #8b5cf6, #d946ef, #ec4899)",
      boxShadow: "0 4px 20px rgba(139, 92, 246, 0.5)",
    },
    categoryId: "upgrade",
    requiredRank: "void_walker",
    command: "lp user %player% parent add ethereal_warden",
    order: 2,
  },
  {
    id: "ethereal_warden_to_astral_guardian",
    name: "Ethereal Warden to Astral Guardian",
    price: 9.99,
    stripePriceId: STRIPE_PRICES.ethereal_warden_to_astral_guardian,
    features: [
      "Upgrade from Ethereal Warden to Astral Guardian",
      "Keep all Ethereal Warden features",
      "Get Astral Guardian exclusive features",
      "Discounted upgrade price",
    ],
    benefits: [
      {
        title: "Ethereal Warden to Astral Guardian Upgrade",
        description:
          "Upgrade from Ethereal Warden to Astral Guardian at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description:
          "You'll retain all benefits from your Ethereal Warden rank",
      },
      {
        title: "Astral Guardian Special Features",
        description:
          "Access to exclusive Astral Guardian-only features and perks",
      },
      {
        title: "Premium Support",
        description: "Priority support from server staff",
      },
    ],
    color: "from-red-500 to-red-700",
    gradient: "from-red-500 via-rose-500 to-pink-600",
    gradientStyle: {
      background: "linear-gradient(to right, #ef4444, #e11d48, #ec4899)",
      boxShadow: "0 4px 20px rgba(239, 68, 68, 0.5)",
    },
    categoryId: "upgrade",
    requiredRank: "ethereal_warden",
    command: "lp user %player% parent add astral_guardian",
    order: 3,
  },

  // Towny ranks (keeping the existing ones)
  {
    id: "citizen",
    name: "Citizen",
    price: 4.99,
    stripePriceId: STRIPE_PRICES.citizen,
    features: [
      "Basic town membership",
      "Access to /towny and /t",
      "Use /town spawn",
      "2 /sethome locations",
    ],
    benefits: [
      {
        title: "Town Membership",
        description: "Join existing towns with basic plot permissions",
      },
      {
        title: "Town Commands",
        description: "Access to basic town info commands like /town",
      },
      {
        title: "Town Teleportation",
        description: "Use /town spawn to teleport to your town's spawn point",
      },
      {
        title: "Home Points",
        description:
          "Set up to 2 home locations with /sethome and teleport with /home",
      },
    ],
    color: "from-slate-400 to-slate-600",
    gradient: "from-slate-400 via-slate-500 to-slate-600",
    gradientStyle: {
      background: "linear-gradient(to right, #94a3b8, #64748b, #475569)",
      boxShadow: "0 4px 20px rgba(148, 163, 184, 0.5)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add citizen",
    order: 1,
  },
  {
    id: "merchant",
    name: "Merchant",
    price: 9.99,
    stripePriceId: STRIPE_PRICES.merchant,
    features: [
      "All Citizen features",
      "Create shops with /shop",
      "5 /sethome locations",
      "/tpahere command access",
    ],
    benefits: [
      {
        title: "All Citizen Benefits",
        description: "Includes all benefits from the Citizen rank",
      },
      {
        title: "Shop Creation",
        description:
          "Create chest shops in town commercial plots with /shop create",
      },
      {
        title: "Extended Homes",
        description:
          "Set up to 5 home locations with /sethome and teleport with /home",
      },
      {
        title: "Teleport Requests",
        description: "Request others to teleport to you with /tpahere",
      },
    ],
    color: "from-cyan-400 to-cyan-600",
    gradient: "from-cyan-400 via-teal-500 to-cyan-600",
    gradientStyle: {
      background: "linear-gradient(to right, #22d3ee, #14b8a6, #0891b2)",
      boxShadow: "0 4px 20px rgba(34, 211, 238, 0.5)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add merchant",
    order: 2,
  },
  {
    id: "councilor",
    name: "Councilor",
    price: 14.99,
    stripePriceId: STRIPE_PRICES.councilor,
    features: [
      "All Merchant features",
      "Access to /plot commands",
      "/town claim outpost",
      "10 /sethome locations",
    ],
    benefits: [
      {
        title: "All Merchant Benefits",
        description: "Includes all benefits from the Merchant rank",
      },
      {
        title: "Plot Management",
        description:
          "Use /plot commands to help manage town plots and set types",
      },
      {
        title: "Outpost Claiming",
        description: "Claim outposts for your town using /town claim outpost",
      },
      {
        title: "Extended Homes",
        description:
          "Set up to 10 home locations with /sethome and teleport with /home",
      },
    ],
    color: "from-emerald-400 to-emerald-600",
    gradient: "from-emerald-400 via-emerald-500 to-emerald-600",
    gradientStyle: {
      background: "linear-gradient(to right, #34d399, #10b981, #059669)",
      boxShadow: "0 4px 20px rgba(52, 211, 153, 0.5)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add councilor",
    order: 3,
  },
  {
    id: "mayor",
    name: "Mayor",
    price: 19.99,
    stripePriceId: STRIPE_PRICES.mayor,
    features: [
      "All Councilor features",
      "/town new and /town set",
      "/town toggle commands",
      "15 /sethome locations",
    ],
    benefits: [
      {
        title: "All Councilor Benefits",
        description: "Includes all benefits from the Councilor rank",
      },
      {
        title: "Town Creation",
        description:
          "Create your own town with /town new and customize with /town set",
      },
      {
        title: "Town Settings",
        description:
          "Toggle town settings with /town toggle (pvp, fire, explosions, etc.)",
      },
      {
        title: "Extended Homes",
        description:
          "Set up to 15 home locations with /sethome and teleport with /home",
      },
    ],
    color: "from-yellow-500 to-yellow-700",
    gradient: "from-yellow-400 via-amber-500 to-orange-600",
    gradientStyle: {
      background: "linear-gradient(to right, #facc15, #f59e0b, #f97316)",
      boxShadow: "0 4px 20px rgba(250, 204, 21, 0.5)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add mayor",
    order: 4,
  },
  {
    id: "governor",
    name: "Governor",
    price: 24.99,
    stripePriceId: STRIPE_PRICES.governor,
    features: [
      "All Mayor features",
      "Manage multiple towns",
      "/town set homeblock",
      "20 /sethome locations",
    ],
    benefits: [
      {
        title: "All Mayor Benefits",
        description: "Includes all benefits from the Mayor rank",
      },
      {
        title: "Multi-Town Management",
        description: "Create and manage multiple towns simultaneously",
      },
      {
        title: "Home Block Control",
        description:
          "Set custom homeblocks with /town set homeblock for strategic spawns",
      },
      {
        title: "Extended Homes",
        description:
          "Set up to 20 home locations with /sethome and teleport with /home",
      },
    ],
    color: "from-blue-500 to-blue-700",
    gradient: "from-blue-500 via-blue-600 to-indigo-600",
    gradientStyle: {
      background: "linear-gradient(to right, #3b82f6, #2563eb, #4f46e5)",
      boxShadow: "0 4px 20px rgba(59, 130, 246, 0.5)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add governor",
    order: 5,
  },
  {
    id: "noble",
    name: "Noble",
    price: 29.99,
    stripePriceId: STRIPE_PRICES.noble,
    features: [
      "All Governor features",
      "/nation new and /n commands",
      "/baltop and /pay anywhere",
      "25 /sethome locations",
    ],
    benefits: [
      {
        title: "All Governor Benefits",
        description: "Includes all benefits from the Governor rank",
      },
      {
        title: "Nation Creation",
        description:
          "Form nations with /nation new and manage with /nation commands",
      },
      {
        title: "Economy Management",
        description: "Access to /baltop and ability to /pay from anywhere",
      },
      {
        title: "Extended Homes",
        description:
          "Set up to 25 home locations with /sethome and teleport with /home",
      },
    ],
    color: "from-red-500 to-red-700",
    gradient: "from-red-500 via-rose-500 to-pink-600",
    gradientStyle: {
      background: "linear-gradient(to right, #ef4444, #e11d48, #ec4899)",
      boxShadow: "0 4px 20px rgba(239, 68, 68, 0.5)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add noble",
    order: 6,
  },
  {
    id: "duke",
    name: "Duke",
    price: 34.99,
    stripePriceId: STRIPE_PRICES.duke,
    features: [
      "All Noble features",
      "/nation add ally commands",
      "/fly in own territory",
      "35 /sethome locations",
    ],
    benefits: [
      {
        title: "All Noble Benefits",
        description: "Includes all benefits from the Noble rank",
      },
      {
        title: "Alliance Formation",
        description: "Create alliances between nations with /nation add ally",
      },
      {
        title: "Territorial Flight",
        description: "Use /fly within your town and nation territories",
      },
      {
        title: "Extended Homes",
        description:
          "Set up to 35 home locations with /sethome and teleport with /home",
      },
    ],
    color: "from-violet-500 to-violet-700",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-600",
    gradientStyle: {
      background: "linear-gradient(to right, #8b5cf6, #7c3aed, #c026d3)",
      boxShadow: "0 4px 20px rgba(139, 92, 246, 0.5)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add duke",
    order: 7,
  },
  {
    id: "king",
    name: "King",
    price: 39.99,
    stripePriceId: STRIPE_PRICES.king,
    features: [
      "All Duke features",
      "/nation set king and /nationchats",
      "/nick and color codes in chat",
      "50 /sethome locations",
    ],
    benefits: [
      {
        title: "All Duke Benefits",
        description: "Includes all benefits from the Duke rank",
      },
      {
        title: "Royal Authority",
        description:
          "Set other players as kings with /nation set king and use all nation chats",
      },
      {
        title: "Custom Identity",
        description:
          "Change your nickname with /nick and use color codes in chat",
      },
      {
        title: "Extended Homes",
        description:
          "Set up to 50 home locations with /sethome and teleport with /home",
      },
    ],
    color: "from-orange-500 to-orange-700",
    gradient: "from-orange-500 via-amber-500 to-yellow-400",
    gradientStyle: {
      background: "linear-gradient(to right, #f97316, #f59e0b, #facc15)",
      boxShadow: "0 4px 20px rgba(249, 115, 22, 0.5)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add king",
    order: 8,
  },
  {
    id: "emperor",
    name: "Emperor",
    price: 44.99,
    stripePriceId: STRIPE_PRICES.emperor,
    features: [
      "All King features",
      "/townyadmin and admin commands",
      "/eco give and /eco take",
      "Unlimited /sethome locations",
    ],
    benefits: [
      {
        title: "All King Benefits",
        description: "Includes all benefits from the King rank",
      },
      {
        title: "Admin Powers",
        description:
          "Limited access to /townyadmin commands for empire management",
      },
      {
        title: "Economic Control",
        description:
          "Grant and take money with /eco give and /eco take commands",
      },
      {
        title: "Unlimited Homes",
        description:
          "Set unlimited home locations with /sethome and teleport with /home",
      },
    ],
    color: "from-amber-500 to-amber-700",
    gradient: "from-amber-500 via-yellow-500 to-yellow-300",
    gradientStyle: {
      background: "linear-gradient(to right, #f59e0b, #eab308, #fde047)",
      boxShadow: "0 4px 20px rgba(245, 158, 11, 0.5)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add emperor",
    order: 9,
  },
  {
    id: "divine",
    name: "Divine Ruler",
    price: 49.99,
    stripePriceId: STRIPE_PRICES.divine,
    features: [
      "All Emperor features",
      "/gamemode and /god commands",
      "/ptime and /pweather control",
      "/essentials commands",
    ],
    benefits: [
      {
        title: "All Emperor Benefits",
        description: "Includes all benefits from the Emperor rank",
      },
      {
        title: "Divine Powers",
        description:
          "Change your gamemode with /gamemode and enable godmode with /god",
      },
      {
        title: "Weather Control",
        description: "Set personal time with /ptime and weather with /pweather",
      },
      {
        title: "Complete Command Access",
        description:
          "Access to almost all EssentialsX commands for ultimate control",
      },
    ],
    color: "from-indigo-400 to-purple-700",
    gradient: "from-indigo-400 via-purple-500 to-pink-400",
    gradientStyle: {
      background: "linear-gradient(to right, #818cf8, #a855f7, #f472b6)",
      boxShadow: "0 4px 20px rgba(129, 140, 248, 0.6)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add divine",
    order: 10,
  },

  // Towny rank upgrades
  {
    id: "citizen_to_merchant",
    name: "Citizen to Merchant",
    price: 4.99,
    stripePriceId: STRIPE_PRICES.citizen_to_merchant,
    features: ["Upgrade from Citizen to Merchant", "Keep all Citizen features"],
    benefits: [
      {
        title: "Citizen to Merchant Upgrade",
        description: "Upgrade from Citizen to Merchant at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your Citizen rank",
      },
      {
        title: "Town Commerce",
        description: "Establish and run shops within town borders",
      },
      {
        title: "Market Expansion",
        description: "Claim additional market plots for business",
      },
    ],
    color: "from-cyan-400 to-cyan-600",
    gradient: "from-cyan-400 via-teal-500 to-cyan-600",
    gradientStyle: {
      background: "linear-gradient(to right, #22d3ee, #14b8a6, #0891b2)",
      boxShadow: "0 4px 20px rgba(34, 211, 238, 0.5)",
    },
    categoryId: "townyUpgrade",
    requiredRank: "citizen",
    command: "lp user %player% parent add merchant",
    order: 1,
  },
  {
    id: "merchant_to_councilor",
    name: "Merchant to Councilor",
    price: 4.99,
    stripePriceId: STRIPE_PRICES.merchant_to_councilor,
    features: [
      "Upgrade from Merchant to Councilor",
      "Keep all Merchant features",
    ],
    benefits: [
      {
        title: "Merchant to Councilor Upgrade",
        description: "Upgrade from Merchant to Councilor at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your Merchant rank",
      },
      {
        title: "Plot Management",
        description: "Assist in managing and organizing town plots",
      },
      {
        title: "Membership Control",
        description: "Invite and approve new town citizens",
      },
    ],
    color: "from-emerald-400 to-emerald-600",
    gradient: "from-emerald-400 via-emerald-500 to-emerald-600",
    gradientStyle: {
      background: "linear-gradient(to right, #34d399, #10b981, #059669)",
      boxShadow: "0 4px 20px rgba(52, 211, 153, 0.5)",
    },
    categoryId: "townyUpgrade",
    requiredRank: "merchant",
    command: "lp user %player% parent add councilor",
    order: 2,
  },
  {
    id: "councilor_to_mayor",
    name: "Councilor to Mayor",
    price: 4.99,
    stripePriceId: STRIPE_PRICES.councilor_to_mayor,
    features: [
      "Upgrade from Councilor to Mayor",
      "Keep all Councilor features",
    ],
    benefits: [
      {
        title: "Councilor to Mayor Upgrade",
        description: "Upgrade from Councilor to Mayor at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your Councilor rank",
      },
      {
        title: "Town Creation",
        description: "Create and manage your own town",
      },
      {
        title: "Tax Management",
        description: "Set custom tax rates for your town",
      },
    ],
    color: "from-yellow-500 to-yellow-700",
    gradient: "from-yellow-400 via-amber-500 to-orange-600",
    gradientStyle: {
      background: "linear-gradient(to right, #facc15, #f59e0b, #f97316)",
      boxShadow: "0 4px 20px rgba(250, 204, 21, 0.5)",
    },
    categoryId: "townyUpgrade",
    requiredRank: "councilor",
    command: "lp user %player% parent add mayor",
    order: 3,
  },
  {
    id: "mayor_to_governor",
    name: "Mayor to Governor",
    price: 4.99,
    stripePriceId: STRIPE_PRICES.mayor_to_governor,
    features: ["Upgrade from Mayor to Governor", "Keep all Mayor features"],
    benefits: [
      {
        title: "Mayor to Governor Upgrade",
        description: "Upgrade from Mayor to Governor at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your Mayor rank",
      },
      {
        title: "Multi-Town Governance",
        description: "Oversee and manage multiple towns in a region",
      },
      {
        title: "Regional Policy",
        description: "Establish region-wide rules and policies",
      },
    ],
    color: "from-blue-500 to-blue-700",
    gradient: "from-blue-500 via-blue-600 to-indigo-600",
    gradientStyle: {
      background: "linear-gradient(to right, #3b82f6, #2563eb, #4f46e5)",
      boxShadow: "0 4px 20px rgba(59, 130, 246, 0.5)",
    },
    categoryId: "townyUpgrade",
    requiredRank: "mayor",
    command: "lp user %player% parent add governor",
    order: 4,
  },
  {
    id: "governor_to_noble",
    name: "Governor to Noble",
    price: 4.99,
    stripePriceId: STRIPE_PRICES.governor_to_noble,
    features: ["Upgrade from Governor to Noble", "Keep all Governor features"],
    benefits: [
      {
        title: "Governor to Noble Upgrade",
        description: "Upgrade from Governor to Noble at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your Governor rank",
      },
      {
        title: "Nation Alliances",
        description: "Form powerful alliances between nations",
      },
      {
        title: "Nation Taxation",
        description: "Set and collect nation-wide taxes",
      },
    ],
    color: "from-red-500 to-red-700",
    gradient: "from-red-500 via-rose-500 to-pink-600",
    gradientStyle: {
      background: "linear-gradient(to right, #ef4444, #e11d48, #ec4899)",
      boxShadow: "0 4px 20px rgba(239, 68, 68, 0.5)",
    },
    categoryId: "townyUpgrade",
    requiredRank: "governor",
    command: "lp user %player% parent add noble",
    order: 5,
  },
  {
    id: "noble_to_duke",
    name: "Noble to Duke",
    price: 4.99,
    stripePriceId: STRIPE_PRICES.noble_to_duke,
    features: ["Upgrade from Noble to Duke", "Keep all Noble features"],
    benefits: [
      {
        title: "Noble to Duke Upgrade",
        description: "Upgrade from Noble to Duke at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your Noble rank",
      },
      {
        title: "Duchy Management",
        description: "Rule over a large duchy consisting of multiple regions",
      },
      {
        title: "Trade Controls",
        description: "Establish and control profitable trade routes",
      },
    ],
    color: "from-violet-500 to-violet-700",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-600",
    gradientStyle: {
      background: "linear-gradient(to right, #8b5cf6, #7c3aed, #c026d3)",
      boxShadow: "0 4px 20px rgba(139, 92, 246, 0.5)",
    },
    categoryId: "townyUpgrade",
    requiredRank: "noble",
    command: "lp user %player% parent add duke",
    order: 6,
  },
  {
    id: "duke_to_king",
    name: "Duke to King",
    price: 4.99,
    stripePriceId: STRIPE_PRICES.duke_to_king,
    features: ["Upgrade from Duke to King", "Keep all Duke features"],
    benefits: [
      {
        title: "Duke to King Upgrade",
        description: "Upgrade from Duke to King at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your Duke rank",
      },
      {
        title: "Multi-Nation Rule",
        description: "Control multiple nations simultaneously",
      },
      {
        title: "Global Announcements",
        description: "Send server-wide announcements",
      },
    ],
    color: "from-orange-500 to-orange-700",
    gradient: "from-orange-500 via-amber-500 to-yellow-400",
    gradientStyle: {
      background: "linear-gradient(to right, #f97316, #f59e0b, #facc15)",
      boxShadow: "0 4px 20px rgba(249, 115, 22, 0.5)",
    },
    categoryId: "townyUpgrade",
    requiredRank: "duke",
    command: "lp user %player% parent add king",
    order: 7,
  },
  {
    id: "king_to_emperor",
    name: "King to Emperor",
    price: 9.99,
    stripePriceId: STRIPE_PRICES.king_to_emperor,
    features: ["Upgrade from King to Emperor", "Keep all King features"],
    benefits: [
      {
        title: "King to Emperor Upgrade",
        description: "Upgrade from King to Emperor at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your King rank",
      },
      {
        title: "Empire Control",
        description: "Rule over multiple kingdoms as a unified empire",
      },
      {
        title: "Imperial Edicts",
        description: "Issue server-wide edicts that affect all players",
      },
    ],
    color: "from-amber-500 to-amber-700",
    gradient: "from-amber-500 via-yellow-500 to-yellow-300",
    gradientStyle: {
      background: "linear-gradient(to right, #f59e0b, #eab308, #fde047)",
      boxShadow: "0 4px 20px rgba(245, 158, 11, 0.5)",
    },
    categoryId: "townyUpgrade",
    requiredRank: "king",
    command: "lp user %player% parent add emperor",
    order: 8,
  },
  {
    id: "emperor_to_divine",
    name: "Emperor to Divine Ruler",
    price: 4.99,
    stripePriceId: STRIPE_PRICES.emperor_to_divine,
    features: [
      "Upgrade from Emperor to Divine Ruler",
      "Keep all Emperor features",
    ],
    benefits: [
      {
        title: "Emperor to Divine Ruler Upgrade",
        description:
          "Upgrade from Emperor to Divine Ruler at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your Emperor rank",
      },
      {
        title: "Divine Authority",
        description: "Rule with divine right across the entire server",
      },
      {
        title: "Cosmic Powers",
        description: "Access to unique cosmetic and gameplay abilities",
      },
    ],
    color: "from-indigo-400 to-purple-700",
    gradient: "from-indigo-400 via-purple-500 to-pink-400",
    gradientStyle: {
      background: "linear-gradient(to right, #818cf8, #a855f7, #f472b6)",
      boxShadow: "0 4px 20px rgba(129, 140, 248, 0.6)",
    },
    categoryId: "townyUpgrade",
    requiredRank: "emperor",
    command: "lp user %player% parent add divine",
    order: 9,
  },
];

// Helper functions
export function getRankById(id: string): Rank | undefined {
  return ranks.find((rank) => rank.id === id);
}

export function getRanksByCategory(categoryId: string): Rank[] {
  return ranks
    .filter((rank) => rank.categoryId === categoryId)
    .sort((a, b) => a.order - b.order);
}

export function getCategoryById(categoryId: string): RankCategory | undefined {
  return rankCategories.find((category) => category.id === categoryId);
}

export function getOrderedCategories(): RankCategory[] {
  return [...rankCategories].sort((a, b) => a.order - b.order);
}

export function getStripePriceId(rankId: string): string | undefined {
  const rank = getRankById(rankId);
  return rank?.stripePriceId;
}

export function getRankCommand(rankId: string): string | undefined {
  const rank = getRankById(rankId);
  return rank?.command;
}

// Helper function to determine rank hierarchy
function isRankIncludedIn(targetRankId: string, higherRankId: string): boolean {
  // Base case: if they're the same rank
  if (targetRankId === higherRankId) return true;

  // Get both ranks
  const targetRank = getRankById(targetRankId);
  const higherRank = getRankById(higherRankId);

  if (!targetRank || !higherRank) return false;

  // Only compare ranks within the same category
  if (targetRank.categoryId !== higherRank.categoryId) return false;

  // A rank includes another if its order is higher (assuming higher order = higher tier)
  // This means a rank with order 4 includes ranks with orders 1, 2, and 3
  return higherRank.order > targetRank.order;
}

export function canPurchaseRank(
  rankId: string,
  ownedRanks: string[],
  isGift: boolean = false
): boolean {
  // If it's a gift, we allow gifting any rank without restrictions
  if (isGift) {
    return true;
  }

  const rank = getRankById(rankId);
  if (!rank) return false;

  // If the rank requires another rank, check if the user has it
  if (rank.requiredRank) {
    // First check if the user has the required rank
    if (!ownedRanks.includes(rank.requiredRank)) {
      return false;
    }

    // For rank upgrades, check if the user already has a higher rank
    // than the destination rank this upgrade would provide
    if (isUpgradeCategory(rank.categoryId)) {
      // Determine the destination rank of this upgrade
      let destinationRankId = "";

      // Extract destination rank name from upgrade id (e.g., "shadow_enchanter_to_void_walker" -> "void_walker")
      const parts = rank.id.split("_to_");
      if (parts.length === 2) {
        destinationRankId = parts[1];
      }

      // If we could identify a destination rank, check if the user already owns a higher rank
      if (destinationRankId) {
        for (const ownedRankId of ownedRanks) {
          const ownedRank = getRankById(ownedRankId);

          // Only compare against ranks in the appropriate base category
          const baseCategory = isUpgradeCategory(rank.categoryId)
            ? getBaseCategory(rank.categoryId)
            : null;

          if (ownedRank && ownedRank.categoryId === baseCategory) {
            // Check if the owned rank is the same as or higher than the destination
            if (isRankIncludedIn(destinationRankId, ownedRankId)) {
              // The user already owns this rank or higher, so they can't purchase this upgrade
              return false;
            }
          }
        }
      }
    }

    return true;
  }

  // Check if user already owns this rank
  if (ownedRanks.includes(rankId)) {
    return false;
  }

  // If this is a regular rank (non-upgrade category), check if the user already has a rank in this category
  if (!isUpgradeCategory(rank.categoryId)) {
    // For each owned rank, check if it's in the same category
    for (const ownedRankId of ownedRanks) {
      const ownedRank = getRankById(ownedRankId);
      if (ownedRank && ownedRank.categoryId === rank.categoryId) {
        // Check if the owned rank is higher in the hierarchy
        if (isRankIncludedIn(rankId, ownedRankId) && rankId !== ownedRankId) {
          // The user already owns a higher rank that includes this one
          return false;
        }
      }
    }
  }

  // For regular ranks with no requirements, they can always purchase
  return true;
}

// Helper functions to detect category relationships
export function isUpgradeCategory(categoryId: string): boolean {
  return categoryId.toLowerCase().includes("upgrade");
}

export function getBaseCategory(upgradeCategoryId: string): string | undefined {
  if (!isUpgradeCategory(upgradeCategoryId)) return undefined;

  // Try to find a matching base category
  const baseCategories = rankCategories
    .filter((cat) => !isUpgradeCategory(cat.id))
    .sort((a, b) => b.id.length - a.id.length); // Sort by length descending to match longest first

  for (const baseCategory of baseCategories) {
    if (
      upgradeCategoryId.toLowerCase().includes(baseCategory.id.toLowerCase())
    ) {
      return baseCategory.id;
    }
  }

  return undefined;
}

export function getUpgradeCategory(baseCategoryId: string): string | undefined {
  if (isUpgradeCategory(baseCategoryId)) return undefined;

  // Find an upgrade category that matches this base category
  const upgradeCategory = rankCategories
    .filter((cat) => isUpgradeCategory(cat.id))
    .find((cat) => cat.id.toLowerCase().includes(baseCategoryId.toLowerCase()));

  return upgradeCategory?.id;
}

// Export a ranks config object for easy access
export const ranksConfig = {
  ranks,
  rankCategories,
  getRankById,
  getRanksByCategory,
  getCategoryById,
  getOrderedCategories,
  getStripePriceId,
  getRankCommand,
  canPurchaseRank,
  getRankByName,
  getUpgradeFromTo,
  isUpgradeCategory,
  getBaseCategory,
  getUpgradeCategory,
};

// Default gradient style for fallback
export const defaultGradientStyle = {
  background: "linear-gradient(to right, #6366f1, #8b5cf6, #d946ef)",
  boxShadow: "0 4px 20px rgba(99, 102, 241, 0.5)",
};

// Find a rank by its name
export function getRankByName(name: string): Rank | undefined {
  return ranks.find((rank) => rank.name === name);
}

// Check if there's a direct upgrade path from one rank to another
export function getUpgradeFromTo(
  fromRankId: string,
  toRankId: string
): Rank | undefined {
  // Look for an upgrade with the pattern "{fromRankId}_to_{toRankId}"
  const upgradeId = `${fromRankId}_to_${toRankId}`;
  return ranks.find(
    (rank) => rank.id === upgradeId && rank.categoryId === "upgrade"
  );
}
