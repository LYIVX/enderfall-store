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

// Stripe price IDs
const STRIPE_PRICES = {
  vip: "price_1QxTikGOFqnNirWjwG7PLoLe",
  mvp: "price_1QxTaCGOFqnNirWjK1VhvZR6",
  elite: "price_1QxTjVGOFqnNirWj57F9DTNS",
  mega: "price_1QyUbVGOFqnNirWjX8Y6zPm9",
} as const;

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
    id: "vip",
    name: "VIP",
    price: 9.99,
    stripePriceId: STRIPE_PRICES.vip,
    features: [
      "Colored chat",
      "Access to /fly",
      "Custom join messages",
      "5 home locations",
    ],
    benefits: [
      BENEFITS.coloredChat,
      BENEFITS.fly,
      BENEFITS.customJoinMessages,
      BENEFITS.homeLocations(5),
    ],
    color: "from-green-500 to-green-700",
    gradient: "from-green-500 via-emerald-500 to-teal-600",
    gradientStyle: {
      background: "linear-gradient(to right, #10b981, #059669, #0d9488)",
      boxShadow: "0 4px 20px rgba(16, 185, 129, 0.5)",
    },
    categoryId: "regular",
    command: "lp user %player% parent add vip",
    order: 1,
  },
  {
    id: "mvp",
    name: "MVP",
    price: 19.99,
    stripePriceId: STRIPE_PRICES.mvp,
    features: [
      "All VIP features",
      "Access to /nick",
      "Custom particle effects",
      "10 home locations",
    ],
    benefits: [
      {
        title: "All VIP Benefits",
        description: "Includes all benefits from the VIP rank",
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
    categoryId: "regular",
    command: "lp user %player% parent add mvp",
    order: 2,
  },
  {
    id: "elite",
    name: "Elite",
    price: 29.99,
    stripePriceId: STRIPE_PRICES.elite,
    features: [
      "All MVP features",
      "Priority server access",
      "Custom armor effects",
      "Unlimited homes",
    ],
    benefits: [
      {
        title: "All MVP Benefits",
        description: "Includes all benefits from the MVP rank",
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
    categoryId: "regular",
    command: "lp user %player% parent add elite",
    order: 3,
  },

  {
    id: "mega",
    name: "Mega",
    price: 39.99,
    stripePriceId: STRIPE_PRICES.mega,
    features: [
      "All Elite features",
      "Priority server access",
      "Custom armor effects",
      "Unlimited homes",
    ],
    benefits: [
      {
        title: "All Elite Benefits",
        description: "Includes all benefits from the Elite rank",
      },
      BENEFITS.priorityAccess,
      BENEFITS.armorEffects,
      BENEFITS.unlimitedHomes,
    ],
    color: "from-purple-500 to-purple-700",
    gradient: "from-purple-500 via-fuchsia-500 to-pink-600",
    gradientStyle: {
      background: "linear-gradient(to right, #ef4444, #d946ef, #ec4899)",
      boxShadow: "0 4px 20px rgba(239, 68, 68, 0.5)",
    },
    categoryId: "regular",
    command: "lp user %player% parent add elite",
    order: 4,
  },

  // Rank upgrades
  {
    id: "vip_to_mvp",
    name: "VIP to MVP",
    price: 9.99,
    stripePriceId: STRIPE_PRICES.vip,
    features: [
      "Upgrade from VIP to MVP",
      "Keep all VIP features",
      "Get MVP exclusive features",
      "Discounted upgrade price",
    ],
    benefits: [
      {
        title: "VIP to MVP Upgrade",
        description: "Upgrade from VIP to MVP at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your VIP rank",
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
    requiredRank: "vip",
    command: "lp user %player% parent add mvp",
    order: 1,
  },
  {
    id: "mvp_to_elite",
    name: "MVP to Elite",
    price: 9.99,
    stripePriceId: STRIPE_PRICES.vip,
    features: [
      "Upgrade from MVP to Elite",
      "Keep all MVP features",
      "Get Elite exclusive features",
      "Discounted upgrade price",
    ],
    benefits: [
      {
        title: "MVP to Elite Upgrade",
        description: "Upgrade from MVP to Elite at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your MVP rank",
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
    requiredRank: "mvp",
    command: "lp user %player% parent add elite",
    order: 2,
  },
  {
    id: "elite_to_mega",
    name: "Elite to Mega",
    price: 9.99,
    stripePriceId: STRIPE_PRICES.vip,
    features: [
      "Upgrade from Elite to Mega",
      "Keep all Elite features",
      "Get Mega exclusive features",
      "Discounted upgrade price",
    ],
    benefits: [
      {
        title: "Elite to Mega Upgrade",
        description: "Upgrade from Elite to Mega at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your Elite rank",
      },
      {
        title: "Mega Special Features",
        description: "Access to exclusive Mega-only features and perks",
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
    requiredRank: "elite",
    command: "lp user %player% parent add mega",
    order: 3,
  },

  // Towny ranks (keeping the existing ones)
  {
    id: "mayor",
    name: "Mayor",
    price: 14.99,
    stripePriceId: STRIPE_PRICES.vip,
    features: [
      "Create and manage towns",
      "Set town taxes",
      "Manage town plots",
      "Town-wide announcements",
    ],
    benefits: [
      {
        title: "Town Creation",
        description: "Create and manage your own town",
      },
      {
        title: "Tax Management",
        description: "Set custom tax rates for your town",
      },
      {
        title: "Plot Control",
        description: "Full control over town plots and claims",
      },
      {
        title: "Town Announcements",
        description: "Send announcements to all town members",
      },
    ],
    color: "from-yellow-500 to-yellow-700",
    gradient: "from-yellow-400 via-amber-500 to-orange-600",
    gradientStyle: {
      background: "linear-gradient(to right, #facc15, #f59e0b, #f97316)",
      boxShadow: "0 4px 20px rgba(250, 204, 21, 0.5)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add towny",
    order: 1,
  },
  {
    id: "noble",
    name: "Noble",
    price: 24.99,
    stripePriceId: STRIPE_PRICES.mvp,
    features: [
      "All Mayor features",
      "Create nation alliances",
      "Set nation taxes",
      "Nation-wide announcements",
    ],
    benefits: [
      {
        title: "All Mayor Benefits",
        description: "Includes all benefits from the Mayor rank",
      },
      {
        title: "Nation Alliances",
        description: "Form powerful alliances between nations",
      },
      {
        title: "Nation Taxation",
        description: "Set and collect nation-wide taxes",
      },
      {
        title: "Nation Announcements",
        description: "Send announcements to all nation members",
      },
    ],
    color: "from-red-500 to-red-700",
    gradient: "from-red-500 via-rose-500 to-pink-600",
    gradientStyle: {
      background: "linear-gradient(to right, #ef4444, #e11d48, #ec4899)",
      boxShadow: "0 4px 20px rgba(239, 68, 68, 0.5)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add mayor",
    order: 2,
  },
  {
    id: "king",
    name: "King",
    price: 34.99,
    stripePriceId: STRIPE_PRICES.elite,
    features: [
      "All Noble features",
      "Rule multiple nations",
      "Global announcements",
      "Special king commands",
    ],
    benefits: [
      {
        title: "All Noble Benefits",
        description: "Includes all benefits from the Noble rank",
      },
      {
        title: "Multi-Nation Rule",
        description: "Control multiple nations simultaneously",
      },
      {
        title: "Global Announcements",
        description: "Send server-wide announcements",
      },
      {
        title: "Royal Commands",
        description: "Access to special king-only commands",
      },
    ],
    color: "from-orange-500 to-orange-700",
    gradient: "from-orange-500 via-amber-500 to-yellow-400",
    gradientStyle: {
      background: "linear-gradient(to right, #f97316, #f59e0b, #facc15)",
      boxShadow: "0 4px 20px rgba(249, 115, 22, 0.5)",
    },
    categoryId: "towny",
    command: "lp user %player% parent add noble",
    order: 3,
  },

  // Towny rank upgrades
  {
    id: "mayor_to_noble",
    name: "Mayor to Noble",
    price: 9.99,
    stripePriceId: STRIPE_PRICES.vip,
    features: ["Upgrade from Mayor to Noble", "Keep all Mayor features"],
    benefits: [
      {
        title: "Mayor to Noble Upgrade",
        description: "Upgrade from Mayor to Noble at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your Mayor rank",
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
    requiredRank: "mayor",
    command: "lp user %player% parent add noble",
    order: 1,
  },
  {
    id: "noble_to_king",
    name: "Noble to King",
    price: 9.99,
    stripePriceId: STRIPE_PRICES.vip,
    features: ["Upgrade from Noble to King", "Keep all Noble features"],
    benefits: [
      {
        title: "Noble to King Upgrade",
        description: "Upgrade from Noble to King at a discounted price",
      },
      {
        title: "Keep All Existing Benefits",
        description: "You'll retain all benefits from your Noble rank",
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
    requiredRank: "noble",
    command: "lp user %player% parent add king",
    order: 2,
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

      // Extract destination rank name from upgrade id (e.g., "vip_to_mvp" -> "mvp")
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
