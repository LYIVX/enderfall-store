"use client";
import React from "react";
import type { Rank, RankBenefit } from "@/lib/ranks";
import { ranksConfig } from "@/lib/ranks";
import { Session } from "next-auth";

interface RankCardProps {
  rank: Rank;
  owned: boolean;
  formatPrice: (price: number) => string;
  onPurchase: (rankId: string) => void;
  onGift: (rankId: string) => void;
  canPurchase: boolean;
  canGift: boolean;
  session: Session | null;
  minecraftVerified: boolean;
  serverOnline: boolean;
  highestOwnedRankName?: string;
  highestOwnedTownyRankName?: string;
  purchases?: any[];
  switchToUpgradesTab?: (categoryId: string) => void;
  isGiftMode?: boolean;
  isSelected?: boolean;
  userRanks?: string[];
  isCompact?: boolean;
}

// Extract color codes from gradient classes for use in other elements
const extractMainColor = (gradientClass: string): string => {
  // Simple extraction of the first color in the gradient
  if (gradientClass.includes("green")) return "green";
  if (gradientClass.includes("blue")) return "blue";
  if (gradientClass.includes("purple")) return "purple";
  if (gradientClass.includes("yellow")) return "yellow";
  if (gradientClass.includes("red")) return "red";
  if (gradientClass.includes("orange")) return "orange";
  if (gradientClass.includes("pink")) return "pink";
  return "purple"; // Default
};

// Function to get an icon element based on the benefit's icon property
const getBenefitIcon = (iconName?: string) => {
  // Default icon if none specified
  if (!iconName) {
    return (
      <svg
        className="w-5 h-5 mr-2 mt-0.5 text-green-500 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 13l4 4L19 7"
        ></path>
      </svg>
    );
  }

  // Return specific icons based on the icon name
  switch (iconName) {
    case "palette":
      return (
        <svg
          className="w-5 h-5 mr-2 mt-0.5 text-green-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          ></path>
        </svg>
      );
    case "wings":
      return (
        <svg
          className="w-5 h-5 mr-2 mt-0.5 text-green-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
          ></path>
        </svg>
      );
    case "home":
      return (
        <svg
          className="w-5 h-5 mr-2 mt-0.5 text-green-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          ></path>
        </svg>
      );
    case "crown":
      return (
        <svg
          className="w-5 h-5 mr-2 mt-0.5 text-green-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          ></path>
        </svg>
      );
    case "infinity":
      return (
        <svg
          className="w-5 h-5 mr-2 mt-0.5 text-green-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          ></path>
        </svg>
      );
    // Add more icon cases as needed
    default:
      return (
        <svg
          className="w-5 h-5 mr-2 mt-0.5 text-green-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          ></path>
        </svg>
      );
  }
};

// Function to render a benefit item
const BenefitItem = ({ benefit }: { benefit: RankBenefit }) => {
  return (
    <li className="flex items-start relative py-1">
      <div className="flex-shrink-0">{getBenefitIcon(benefit.icon)}</div>
      <div className="flex-1 relative">
        <span className="text-[var(--text-color)] hover:text-[var(--button-primary)] transition-colors duration-200 cursor-help relative group">
          {benefit.title}
          {benefit.description && (
            <div className="tooltip group-hover:tooltip-visible absolute left-0 top-full mt-2 w-52 max-w-[240px] bg-[var(--card-bg-secondary)] text-xs text-[var(--text-color)] p-3 rounded-md border border-[var(--input-border)] pointer-events-none">
              <p className="text-[var(--text-color)] leading-relaxed">
                {benefit.description}
              </p>
            </div>
          )}
        </span>
      </div>
    </li>
  );
};

export default function RankCard({
  rank,
  owned,
  formatPrice,
  onPurchase,
  onGift,
  canPurchase,
  canGift,
  session,
  minecraftVerified,
  serverOnline,
  highestOwnedRankName,
  highestOwnedTownyRankName,
  purchases,
  switchToUpgradesTab,
  isGiftMode = false,
  isSelected = false,
  userRanks,
  isCompact = false,
}: RankCardProps) {
  // Use the custom gradient if available, otherwise fall back to the color
  const gradientClass = rank.gradient || rank.color;

  // Get the gradient style from the rank object, or use a default if not available
  const getRankGradientStyle = () => {
    if (rank.gradientStyle) {
      return rank.gradientStyle;
    }

    // Default gradient as fallback
    return {
      background: "linear-gradient(to right, #6366f1, #8b5cf6, #d946ef)",
      boxShadow: "0 4px 20px rgba(99, 102, 241, 0.5)",
    };
  };

  // Get solid color for buttons
  const getButtonColor = (type: "purchase" | "gift") => {
    if (type === "purchase") {
      return "bg-green-600 hover:bg-green-700";
    } else {
      return "bg-purple-600 hover:bg-purple-700";
    }
  };

  // Function to switch to the rank upgrades tab
  const goToRankUpgrades = () => {
    // Find the upgrade tab button and click it
    const upgradeTab = document.querySelector(
      'button:contains("Rank Upgrades")'
    ) as HTMLButtonElement;
    if (upgradeTab) {
      upgradeTab.click();
    }
  };

  // Determine button text
  const getPurchaseButtonText = () => {
    if (!serverOnline) return "Server Offline";
    if (!session) return "Sign in to Purchase";

    // Get the appropriate highest owned rank name based on category
    const getAppropriateHighestRankName = () => {
      // Find all the categories that might be relevant
      const currentCategoryId = rank.categoryId;

      // If this is an upgrade category, use the base category's highest rank
      if (ranksConfig.isUpgradeCategory(currentCategoryId)) {
        const baseCategory = ranksConfig.getBaseCategory(currentCategoryId);
        if (baseCategory === "regular") return highestOwnedRankName;
        if (baseCategory === "towny") return highestOwnedTownyRankName;
        // For future categories, we'll need to add more specialized names
        // But for now, we'll use a generic approach
        return undefined;
      }

      // If this is a base category, use its corresponding highest rank name
      if (currentCategoryId === "regular") return highestOwnedRankName;
      if (currentCategoryId === "towny") return highestOwnedTownyRankName;

      // If we don't have a specialized variable for this category yet,
      // we'll need a more generic approach to find the highest rank
      return undefined;
    };

    const appropriateHighestRankName = getAppropriateHighestRankName();

    if (!canPurchase) {
      // Check if it's because of a rank requirement or because they have a higher rank
      if (rank.requiredRank) {
        // For rank upgrades that require a specific rank to purchase
        const requiredRankObj = ranksConfig.getRankById(rank.requiredRank);
        const requiredRankName =
          requiredRankObj?.name || rank.requiredRank?.toUpperCase() || "";

        // Check if user is missing the required rank (rather than having a higher rank already)
        // Update to check userRanks directly instead of purchases
        const hasRequiredRank =
          owned ||
          (rank.requiredRank && userRanks?.includes(rank.requiredRank));

        if (!hasRequiredRank) {
          return `Requires ${requiredRankName} Rank`;
        }

        // If user has the required rank, but can't purchase, it must be because they already have a higher rank
        if (
          ranksConfig.isUpgradeCategory(rank.categoryId) &&
          appropriateHighestRankName
        ) {
          return `Already Have Higher Rank (${appropriateHighestRankName})`;
        }

        return `You Own ${appropriateHighestRankName || "This Rank"}`;
      } else {
        // For ranks they already have (or have a higher rank)
        return appropriateHighestRankName
          ? `You Own ${appropriateHighestRankName}`
          : "Already Owned";
      }
    }

    // For regular ranks, check if the user already owns a lower rank and could use an upgrade
    if (
      !ranksConfig.isUpgradeCategory(rank.categoryId) &&
      appropriateHighestRankName &&
      !owned
    ) {
      // Get the user's highest owned rank
      const ownedRank = ranksConfig.getRankByName(appropriateHighestRankName);

      if (ownedRank) {
        // Check if the categories match
        const sameCategory = ownedRank.categoryId === rank.categoryId;

        if (sameCategory && ownedRank.order < rank.order) {
          // Check if there's a direct upgrade path available
          const upgradeExists = ranksConfig.getUpgradeFromTo(
            ownedRank.id,
            rank.id
          );

          if (upgradeExists) {
            return `Use Rank Upgrades (Save Money)`;
          }

          // Get the upgrade category for this base category
          const upgradeCategory = ranksConfig.getUpgradeCategory(
            rank.categoryId
          );
          if (upgradeCategory) {
            // Find the name of the upgrade category
            const upgradeCategoryObj =
              ranksConfig.getCategoryById(upgradeCategory);
            return `Check ${upgradeCategoryObj?.name || "Upgrades"} Tab`;
          }

          return `Check Upgrades Tab`;
        }
      }
    }

    return `Purchase ${rank.name}`;
  };

  // Get button action - either purchase or redirect to upgrades
  const handlePurchaseClick = () => {
    const buttonText = getPurchaseButtonText();

    if (
      buttonText.includes("Rank Upgrades") ||
      buttonText.includes("Use Rank Upgrades") ||
      (buttonText.includes("Check") && buttonText.includes("Tab"))
    ) {
      if (switchToUpgradesTab) {
        // Find the right upgrade category for this rank's category
        const upgradeCategory = ranksConfig.getUpgradeCategory(rank.categoryId);
        if (upgradeCategory) {
          switchToUpgradesTab(upgradeCategory);
        } else {
          // Default to the regular upgrade category if we can't determine the right one
          switchToUpgradesTab("upgrade");
        }
      }
    } else {
      // Normal purchase
      onPurchase(rank.id);
    }
  };

  return (
    <div
      className={`bg-[var(--card-bg)] rounded-lg shadow-lg overflow-visible transition-transform ${isGiftMode ? "cursor-pointer" : ""} ${isSelected ? "ring-4 ring-blue-500 scale-[1.01]" : "hover:scale-[1.01]"} duration-300`}
    >
      {/* Use inline style for guaranteed gradient visibility */}
      <div
        style={getRankGradientStyle()}
        className={`${isCompact ? "p-3" : "p-5"} text-center rounded-t-lg relative overflow-hidden`}
      >
        {/* Add a shine effect overlay */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-white transform -skew-x-12 animate-shine"></div>
        </div>

        <h3
          className={`${isCompact ? "text-xl" : "text-2xl"} font-bold text-white relative z-10 drop-shadow-md`}
        >
          {rank.name}
        </h3>
      </div>

      <div className={`border-t-0 ${isCompact ? "p-3" : "p-6"}`}>
        <p
          className={`${isCompact ? "text-lg mb-2" : "text-3xl mb-6"} font-bold text-center text-[var(--text-color)]`}
        >
          {formatPrice(rank.price)}
        </p>

        {isCompact ? (
          // Compact version - show only a few key benefits
          <ul className="mb-2 space-y-1">
            {(rank.benefits && rank.benefits.length > 0
              ? rank.benefits.slice(0, 2)
              : rank.features.slice(0, 2)
            ).map((item, index) => (
              <li key={index} className="flex items-start py-0.5 text-sm">
                {getBenefitIcon()}
                <span className="text-[var(--text-color)]">
                  {typeof item === "string" ? item : item.title}
                </span>
              </li>
            ))}
            {((rank.benefits && rank.benefits.length > 2) ||
              (!rank.benefits && rank.features.length > 2)) && (
              <li className="text-xs text-center italic text-[var(--text-secondary)]">
                + more benefits
              </li>
            )}
          </ul>
        ) : (
          // Regular full-size version
          <ul className="mb-6 space-y-2 relative">
            {rank.benefits && rank.benefits.length > 0
              ? rank.benefits.map((benefit, index) => (
                  <BenefitItem key={index} benefit={benefit} />
                ))
              : // Fallback to simple features if benefits are not defined
                rank.features.map((feature, index) => (
                  <li key={index} className="flex items-start py-1">
                    {getBenefitIcon()}
                    <span className="text-[var(--text-color)]">{feature}</span>
                  </li>
                ))}
          </ul>
        )}

        {isGiftMode ? (
          <div className={`${isCompact ? "mt-2" : "mt-6"} text-center`}>
            {isSelected ? (
              <div
                className={`bg-green-700 text-white ${isCompact ? "py-1.5 px-2 text-xs" : "py-3 px-4"} rounded-lg`}
              >
                <span className="text-yellow-300">✓</span> Selected for gift
              </div>
            ) : (
              <div
                className={`bg-blue-700 text-white ${isCompact ? "py-1.5 px-2 text-xs" : "py-3 px-4"} rounded-lg`}
              >
                Click to select this rank
              </div>
            )}
          </div>
        ) : owned ? (
          <div className="mt-6 text-center">
            <div className="bg-blue-900 text-white py-3 px-4 rounded-lg mb-3">
              <span className="text-yellow-300">✓</span> You own this rank
            </div>
            <button
              onClick={() => onGift(rank.id)}
              className={`w-full ${getButtonColor("gift")} text-white font-bold py-3 px-4 rounded-lg transition-colors ${!serverOnline || !canGift ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!serverOnline || !canGift}
            >
              {serverOnline
                ? canGift
                  ? "Gift to a Friend"
                  : "Cannot Gift This Rank"
                : "Server Offline"}
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3">
            <button
              onClick={handlePurchaseClick}
              className={`w-full ${getButtonColor("purchase")} text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={!canPurchase || !session || !serverOnline}
            >
              {getPurchaseButtonText()}
            </button>

            {session && (
              <button
                onClick={() => onGift(rank.id)}
                className={`w-full ${getButtonColor("gift")} text-white font-bold py-3 px-4 rounded-lg transition-colors ${!serverOnline || !canGift ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={!serverOnline || !canGift}
              >
                {serverOnline
                  ? canGift
                    ? "Gift to a Friend"
                    : "Cannot Gift This Rank"
                  : "Server Offline"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
