"use client";
import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { loadStripe } from "@stripe/stripe-js";
import Link from "next/link";
import { ranksConfig, type Rank } from "@/lib/ranks";
import { useUserSettings } from "@/lib/context/UserSettingsContext";
import RankCard from "../components/RankCard";
import { isServerOnline } from "@/lib/serverStatus";
import { checkPlayerExists, getRankCategory } from "@/lib/minecraft-api";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Currency conversion rates with GBP as base
const currencyRates = {
  GBP: 1,
  USD: 1.27,
  EUR: 1.17,
  CAD: 1.73,
  AUD: 1.93,
  JPY: 193.76,
};

// Currency symbols
const currencySymbols = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
};

type CurrencyCode = keyof typeof currencyRates;

interface MinecraftProfile {
  username: string;
  verified: boolean;
  verifiedAt?: string;
}

interface Purchase {
  id: string;
  rankId: string;
  rankName: string;
  timestamp: string;
  formattedDate: string;
  formattedTime: string;
  status: "completed" | "pending";
  isGift?: boolean;
  recipient?: string;
}

// Change type definition from TabType to CategoryId
type CategoryId = string;

function ShopContent() {
  const { data: session, status } = useSession();
  const { userSettings, updateUserSettings } = useUserSettings();
  const [minecraftProfile, setMinecraftProfile] =
    useState<MinecraftProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [userRanks, setUserRanks] = useState<string[]>([]);
  const [purchaseMinecraftUsername, setPurchaseMinecraftUsername] =
    useState("");
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [selectedRankForPurchase, setSelectedRankForPurchase] = useState("");

  // New state for username search and player data
  const [searchUsername, setSearchUsername] = useState("");
  const [searchedUsername, setSearchedUsername] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [availableRanks, setAvailableRanks] = useState<Rank[]>([]);
  const [playerExists, setPlayerExists] = useState(false);
  const [searchedUserRanks, setSearchedUserRanks] = useState<string[]>([]);
  const [serverHostname, setServerHostname] = useState<string>("");

  // Add state for saved Minecraft accounts
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [isLoadingSavedAccounts, setIsLoadingSavedAccounts] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] =
    useState<CategoryId>("regular");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(
    (userSettings.preferredCurrency as CurrencyCode) || "GBP"
  );
  const [serverOnline, setServerOnline] = useState<boolean>(true);
  const [checkingServerStatus, setCheckingServerStatus] =
    useState<boolean>(false);

  // State variable for error modal
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("Error");

  const searchParams = useSearchParams();

  // Update selectedCurrency when userSettings change
  useEffect(() => {
    setSelectedCurrency(
      (userSettings.preferredCurrency as CurrencyCode) || "GBP"
    );
  }, [userSettings.preferredCurrency]);

  // Update userSettings when selectedCurrency changes
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value as CurrencyCode;
    setSelectedCurrency(newCurrency);
    updateUserSettings({ preferredCurrency: newCurrency });
  };

  // Fetch Minecraft profile and purchase data
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      setIsLoadingSavedAccounts(true);

      Promise.all([
        fetch("/api/minecraft-profile").then((res) =>
          res.ok ? res.json() : { profile: null }
        ),
        fetch("/api/purchases").then((res) =>
          res.ok ? res.json() : { purchases: [], userRanks: [] }
        ),
        fetch("/api/minecraft-accounts").then((res) =>
          res.ok ? res.json() : { accounts: [] }
        ),
      ])
        .then(([profileData, purchasesData, savedAccountsData]) => {
          if (profileData.profile) {
            setMinecraftProfile(profileData.profile);
            if (profileData.profile.username) {
              setPurchaseMinecraftUsername(profileData.profile.username);
              // Auto-set the search username to the logged in user's Minecraft username
              setSearchUsername(profileData.profile.username);
              handleUsernameSearch(profileData.profile.username);
            }
          }

          if (purchasesData.purchases) {
            const formatPurchases = purchasesData.purchases.map(
              (purchase: any) => ({
                ...purchase,
                formattedDate: new Date(
                  purchase.timestamp
                ).toLocaleDateString(),
                formattedTime: new Date(
                  purchase.timestamp
                ).toLocaleTimeString(),
              })
            );
            setPurchases(formatPurchases);
          }

          if (purchasesData.userRanks) {
            setUserRanks(purchasesData.userRanks);
          }

          // Set saved accounts
          if (
            savedAccountsData.accounts &&
            Array.isArray(savedAccountsData.accounts)
          ) {
            setSavedAccounts(savedAccountsData.accounts);
          }

          setIsLoadingSavedAccounts(false);
          setLoading(false);
        })
        .catch((error) => {
          // Silent error handling
          setIsLoadingSavedAccounts(false);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    checkServerStatus();
  }, [status, session]);

  const checkServerStatus = async () => {
    try {
      setCheckingServerStatus(true);
      // Set server as online without calling the API
      setServerOnline(true);
      setCheckingServerStatus(false);
    } catch (error) {
      // Always set server as online
      setServerOnline(true);
      setCheckingServerStatus(false);
    }
  };

  // Updated to use new ranksConfig helper functions
  const getRanksForCategory = (): Rank[] => {
    // If player has been searched but doesn't exist, always return empty array
    if (searchedUsername && !playerExists) {
      return [];
    }

    if (!searchedUsername) {
      // If no player is selected, show all ranks for the current category
      return ranksConfig.getRanksByCategory(selectedCategoryId).filter(
        (rank) =>
          // Filter out upgrade ranks, as they require a player to have a specific rank
          !rank.id.includes("_to_")
      );
    }

    if (!playerExists) {
      // If player doesn't exist, return an empty array
      return [];
    }

    // Filter available ranks by the selected category
    return availableRanks.filter(
      (rank) => rank.categoryId === selectedCategoryId
    );
  };

  // Helper function to get all ranks
  const getAllRanks = (): Rank[] => {
    return ranksConfig.rankCategories.reduce((allRanks: Rank[], category) => {
      const categoryRanks = ranksConfig.getRanksByCategory(category.id);
      return [...allRanks, ...categoryRanks];
    }, []);
  };

  // Filter ranks based on player's existing ranks
  const filterAvailableRanks = (
    allRanks: Rank[],
    playerRanks: string[]
  ): Rank[] => {
    // If player has no ranks, return all non-upgrade ranks
    if (!playerRanks || playerRanks.length === 0) {
      return allRanks.filter((rank) => !rank.id.includes("_to_"));
    }

    // Group player ranks by category for easier lookup
    const playerRanksByCategory: Record<string, string[]> = {};

    playerRanks.forEach((rankId) => {
      const rank = ranksConfig.getRankById(rankId);
      if (rank) {
        const category = rank.categoryId;
        if (!playerRanksByCategory[category]) {
          playerRanksByCategory[category] = [];
        }
        playerRanksByCategory[category].push(rankId);
      }
    });

    const result: Rank[] = [];

    // For each rank in all ranks
    allRanks.forEach((rank) => {
      const rankCategory = rank.categoryId;

      // If it's an upgrade rank (contains _to_)
      if (rank.id.includes("_to_")) {
        const [fromRank, toRank] = rank.id.split("_to_");

        // Get the category of the 'from' rank
        const fromRankObj = ranksConfig.getRankById(fromRank);
        if (!fromRankObj) return; // Skip if from rank doesn't exist

        // Check if player has the "from" rank but not the "to" rank
        const hasFromRank = playerRanks.includes(fromRank);
        const hasToRank = playerRanks.includes(toRank);

        if (hasFromRank && !hasToRank) {
          result.push(rank);
        }
      }
      // If it's a regular rank (not an upgrade)
      else {
        // If player doesn't have any ranks in this category, include it
        if (!playerRanksByCategory[rankCategory]) {
          result.push(rank);
        }
        // For all categories, we now hide regular ranks if player has any rank in that category
        // This makes the behavior consistent across all categories
      }
    });

    return result;
  };

  // Format price with currency symbol
  const formatPrice = (price: number): string => {
    const convertedPrice = convertPrice(price);
    return `${currencySymbols[selectedCurrency]}${convertedPrice}`;
  };

  // Convert price from GBP to selected currency
  const convertPrice = (priceInGBP: number): string => {
    const convertedPrice = priceInGBP * currencyRates[selectedCurrency];
    return selectedCurrency === "JPY"
      ? Math.round(convertedPrice).toFixed(0)
      : convertedPrice.toFixed(2);
  };

  // Update handlePurchase to prompt for Minecraft username if not provided
  const handlePurchase = async (rankId: string, recipientUsername?: string) => {
    // If no recipient username, use the searched username
    const username = recipientUsername || searchedUsername;

    if (!username) {
      setErrorTitle("Username Required");
      setErrorMessage("Please search for a valid Minecraft username first.");
      setIsErrorModalOpen(true);
      return;
    }

    try {
      // Create Stripe checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rankId,
          minecraftUsername: username,
          isGift: !!recipientUsername,
        }),
      });

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      // Silent error handling
      setErrorTitle("Payment Error");
      setErrorMessage(
        "There was an error processing your payment. Please try again."
      );
      setIsErrorModalOpen(true);
    }
  };

  // Update canPurchaseRank to use userRanks instead of purchases
  const canPurchaseRank = (rankId: string): boolean => {
    return ranksConfig.canPurchaseRank(rankId, userRanks);
  };

  // Also update canGiftRank to use userRanks
  const canGiftRank = (rankId: string): boolean => {
    return ranksConfig.canPurchaseRank(rankId, userRanks, true);
  };

  // Get ordered categories for display
  const categories = ranksConfig.getOrderedCategories();

  // Update getHighestOwnedRankForCategory to use userRanks instead of purchases
  const getHighestOwnedRankForCategory = (categoryId: string) => {
    if (!userRanks || !Array.isArray(userRanks) || userRanks.length === 0) {
      return undefined;
    }

    // Get base category if this is an upgrade category
    const baseCategory = ranksConfig.isUpgradeCategory(categoryId)
      ? ranksConfig.getBaseCategory(categoryId)
      : categoryId;

    if (!baseCategory) return undefined;

    // Get all ranks from this category
    const categoryRanks = ranksConfig.getRanksByCategory(baseCategory);

    // Find owned ranks from this category
    const ownedRanksFromCategory = categoryRanks.filter((rank) =>
      userRanks.includes(rank.id)
    );

    // Sort owned ranks by order to find the highest
    const sortedRanks = [...ownedRanksFromCategory].sort(
      (a, b) => b.order - a.order
    );

    // Return the name of the highest owned rank, or undefined if none
    return sortedRanks.length > 0 ? sortedRanks[0].name : undefined;
  };

  // Get highest owned rank names for each category
  const highestOwnedRankName = getHighestOwnedRankForCategory("regular");
  const highestOwnedTownyRankName = getHighestOwnedRankForCategory("towny");

  // Function to switch to the upgrades tab
  const switchToUpgradesTab = (categoryId: string = "upgrade") => {
    setSelectedCategoryId(categoryId);
  };

  // Add an effect to close the error modal when selected category changes
  useEffect(() => {
    // Close error modal when category changes
    setIsErrorModalOpen(false);
  }, [selectedCategoryId]);

  // Add an effect to close modals when user navigates away
  useEffect(() => {
    // Close modals on unmount
    return () => {
      setIsErrorModalOpen(false);
      setIsUsernameModalOpen(false);
    };
  }, []);

  const handleUsernameSearch = useCallback(
    async (username?: string) => {
      if (!username && !searchUsername.trim()) {
        setSearchError("Please enter a username");
        return;
      }

      // Clear previous search results first
      setSearchedUsername("");
      setPlayerExists(false);
      setSearchedUserRanks([]);
      setServerHostname("");
      setAvailableRanks([]);

      setIsSearching(true);
      setSearchError("");
      const usernameToSearch = username || searchUsername;

      try {
        const response = await fetch(
          `/api/check-minecraft-user?username=${usernameToSearch}`
        );
        const data = await response.json();

        if (response.ok) {
          setPlayerExists(data.exists);
          setSearchedUsername(usernameToSearch);
          if (data.exists) {
            setSearchedUserRanks(data.ranks || []);
            setServerHostname(data.serverHostname || "");
          } else {
            setServerHostname(data.serverHostname || "");
          }
        } else {
          setSearchError(data.error || "Failed to check username");
          setPlayerExists(false);
        }
      } catch (error) {
        setSearchError("Failed to check username");
        setPlayerExists(false);
      }

      setIsSearching(false);
    },
    [searchUsername]
  );

  // Effect to handle URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const username = params.get("username");
    if (username) {
      handleUsernameSearch(username);
    }
  }, [handleUsernameSearch]);

  // Effect to update available ranks when searchedUserRanks changes
  useEffect(() => {
    if (searchedUsername && playerExists) {
      // Get all ranks
      const allRanks = getAllRanks();
      // Filter available ranks based on player's existing ranks
      const filteredRanks = filterAvailableRanks(allRanks, searchedUserRanks);
      // Update state
      setAvailableRanks(filteredRanks);

      // After updating available ranks, check if the current category is visible
      // If not, switch to the first available category
      setTimeout(() => {
        // First check upgrade categories - they have priority for players with ranks
        const upgradeCategories = ranksConfig
          .getOrderedCategories()
          .filter(
            (cat) =>
              cat.id.toLowerCase().includes("upgrade") &&
              isCategoryVisible(cat.id)
          );

        // Then check regular categories
        const regularCategories = ranksConfig
          .getOrderedCategories()
          .filter(
            (cat) =>
              !cat.id.toLowerCase().includes("upgrade") &&
              isCategoryVisible(cat.id)
          );

        // If current category is not visible
        if (!isCategoryVisible(selectedCategoryId)) {
          // First try to show upgrade categories as they're more relevant for existing players
          if (upgradeCategories.length > 0) {
            setSelectedCategoryId(upgradeCategories[0].id);
          }
          // Otherwise show a regular category
          else if (regularCategories.length > 0) {
            setSelectedCategoryId(regularCategories[0].id);
          }
        }
      }, 0);
    }
  }, [searchedUserRanks, playerExists, searchedUsername, selectedCategoryId]);

  // Helper to determine if a category should be visible based on available ranks
  const isCategoryVisible = (categoryId: string): boolean => {
    // If a username has been searched but player doesn't exist, don't show any categories
    if (searchedUsername && !playerExists) {
      return false;
    }

    // If no username has been searched, show all categories that have ranks
    if (!searchedUsername) {
      // Show all categories except those that are upgrade categories
      if (categoryId.toLowerCase().includes("upgrade")) return false;

      // Check if this category has any non-upgrade ranks
      return ranksConfig
        .getRanksByCategory(categoryId)
        .some((rank) => !rank.id.includes("_to_"));
    }

    // If username has been searched but player doesn't exist, don't show any categories
    if (!playerExists) return false;

    // First, determine if this is a regular category or an upgrade category
    const isUpgradeCategory = categoryId.toLowerCase().includes("upgrade");

    if (!isUpgradeCategory) {
      // This is a regular category (like "regular", "towny", etc.)
      // Check if player has any ranks in this category
      const playerRanksInCategory = searchedUserRanks || [];
      const hasRankInCategory = playerRanksInCategory.some((rankId: string) => {
        const rank = ranksConfig.getRankById(rankId);
        return rank && rank.categoryId === categoryId;
      });

      // For any regular category, if player has ranks in it, we'll hide it and
      // show the corresponding upgrade category instead
      if (hasRankInCategory) {
        return false;
      }
    } else {
      // This is an upgrade category

      // Find the corresponding normal category for this upgrade category
      let normalCategoryId: string;

      // Special case for the main "upgrade" category which corresponds to "regular"
      if (categoryId === "upgrade") {
        normalCategoryId = "regular";
      } else {
        // For other upgrade categories like "townyUpgrade", extract the base name
        // This works for patterns like "townyUpgrade" → "towny" or "factionUpgrade" → "faction"
        normalCategoryId = categoryId.replace(/upgrade/i, "");
      }

      // Check if player has ranks in the corresponding normal category
      const playerHasRanksInNormalCategory = (searchedUserRanks || []).some(
        (rankId: string) => {
          const rank = ranksConfig.getRankById(rankId);
          return rank && rank.categoryId === normalCategoryId;
        }
      );

      // Only show upgrade category if user has a rank in the corresponding normal category
      return playerHasRanksInNormalCategory;
    }

    // For all other cases, check if the category has any available ranks for this player
    const ranksInCategory = availableRanks.filter(
      (rank) => rank.categoryId === categoryId
    );
    return ranksInCategory.length > 0;
  };

  // Handle selecting a saved account
  const handleSelectSavedAccount = (username: string) => {
    setSearchUsername(username);
    handleUsernameSearch(username);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--background-gradient-from)] to-[var(--background-gradient-to)] text-[var(--text-color)] py-16">
      {/* Minecraft Username Modal */}
      {isUsernameModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-[var(--card-bg)] rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4 text-[var(--text-color)]">
              Enter Your Minecraft Username
            </h3>
            <p className="text-[var(--text-secondary)] mb-4">
              Please enter your Minecraft username to continue with this
              purchase.
            </p>

            <div className="mb-4">
              <label
                htmlFor="minecraft-username"
                className="block text-[var(--text-secondary)] text-sm font-medium mb-2"
              >
                Minecraft Username
              </label>
              <input
                type="text"
                id="minecraft-username"
                value={purchaseMinecraftUsername}
                onChange={(e) => setPurchaseMinecraftUsername(e.target.value)}
                placeholder="Your Minecraft username"
                className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isSearching}
              />
              {searchError && (
                <p className="text-red-500 text-sm mt-1">{searchError}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsUsernameModalOpen(false)}
                className="px-4 py-2 bg-[var(--button-secondary)] text-[var(--text-color)] rounded-md hover:bg-[var(--button-secondary-hover)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsUsernameModalOpen(false);
                  setIsSearching(true);
                }}
                className="px-4 py-2 bg-[var(--button-primary)] text-white rounded-md hover:bg-[var(--button-primary-hover)] transition-colors flex items-center"
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  "Search"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {isErrorModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card-bg)] rounded-lg shadow-lg overflow-hidden max-w-md w-full">
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-3 text-center">
              <h2 className="text-xl font-bold text-white">{errorTitle}</h2>
            </div>
            <div className="p-5 flex flex-col">
              <p className="text-[var(--text-primary)] mb-6">{errorMessage}</p>
              <div className="flex justify-end space-x-3">
                {errorTitle === "Rank Already Owned" && (
                  <button
                    onClick={() => {
                      setIsErrorModalOpen(false);
                      // Get the rank to determine the category
                      const rank = ranksConfig.getRankById(
                        selectedRankForPurchase
                      );
                      if (!rank) return;

                      // Check if we're in gift mode based on the error message
                      const isGiftMode =
                        errorMessage.includes("Consider gifting");

                      if (isGiftMode) {
                        // For gifts, we need to switch to gift mode with the appropriate category
                        setIsUsernameModalOpen(true);
                        setSelectedRankForPurchase("");
                      } else {
                        // For regular purchases, just switch to the upgrades tab
                        if (
                          rank.categoryId === "regular" ||
                          rank.categoryId === "towny"
                        ) {
                          switchToUpgradesTab(rank.categoryId);
                        } else {
                          switchToUpgradesTab("regular");
                        }
                      }
                    }}
                    className="px-4 py-2 bg-[var(--button-secondary)] text-[var(--text-color)] rounded-md hover:bg-[var(--button-secondary-hover)] transition-colors"
                  >
                    View Upgrades
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsErrorModalOpen(false);
                  }}
                  className="px-4 py-2 bg-[var(--button-primary)] text-white rounded-md hover:bg-[var(--button-primary-hover)] transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-8">Server Ranks</h1>

        {/* Server Status Indicator */}
        <div className="flex justify-center mb-4">
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
              serverOnline
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full mr-2 ${
                serverOnline ? "bg-green-500" : "bg-red-500"
              }`}
            ></span>
            {serverOnline
              ? "Server Online"
              : "Server Offline - Purchases Disabled"}
            {checkingServerStatus && (
              <span className="ml-2 animate-spin h-3 w-3 border border-current rounded-full border-t-transparent"></span>
            )}
          </div>
        </div>

        {/* Username Search Bar */}
        <div className="mb-8 bg-[var(--card-bg)] p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">
            Find Your Minecraft Account
          </h2>
          <p className="text-[var(--text-secondary)] mb-4">
            Enter your Minecraft username to see available ranks and upgrades.
            You must have joined the server at least once.
          </p>

          {/* Add saved accounts dropdown */}
          {session && (
            <div className="mb-4">
              {isLoadingSavedAccounts ? (
                <div className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
                  <span className="inline-block w-4 h-4 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin"></span>
                  <span>Loading saved accounts...</span>
                </div>
              ) : savedAccounts.length > 0 ? (
                <>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Select a saved account:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {savedAccounts.map((account) => (
                      <button
                        key={account}
                        onClick={() => handleSelectSavedAccount(account)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          searchUsername === account
                            ? "bg-[var(--button-primary)] text-white"
                            : "bg-[var(--card-bg-secondary)] text-[var(--text-color)] hover:bg-[var(--card-bg-hover)]"
                        }`}
                      >
                        <Image
                          src={`https://mc-heads.net/avatar/${account}/24.png`}
                          alt={`${account}'s avatar`}
                          width={24}
                          height={24}
                          className="rounded"
                        />
                        {account}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              <div className={`${savedAccounts.length > 0 ? "mt-2" : ""}`}>
                <Link
                  href="/profile#minecraft-accounts"
                  className="text-sm text-[var(--button-primary)] hover:underline"
                >
                  {savedAccounts.length > 0
                    ? "Manage saved accounts"
                    : "Save your Minecraft accounts"}
                </Link>
                {!savedAccounts.length && (
                  <span className="text-sm text-[var(--text-secondary)]">
                    {" "}
                    to quickly select them when searching
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <input
                type="text"
                placeholder="Minecraft Username"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                disabled={isSearching}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUsernameSearch();
                  }
                }}
              />
            </div>
            <button
              onClick={() => handleUsernameSearch()}
              className="bg-[var(--button-primary)] text-white px-6 py-2 rounded-lg font-medium hover:bg-[var(--button-primary-hover)] transition-colors disabled:bg-[var(--button-disabled)]"
              disabled={isSearching || !searchUsername.trim()}
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>

          {searchError && (
            <div className="mt-4 text-red-500">{searchError}</div>
          )}

          {searchedUsername && (
            <div className="mt-4 bg-[var(--card-bg)] p-4 rounded-lg border border-[var(--card-border)]">
              <div className="flex items-center gap-3">
                <Image
                  src={`https://mc-heads.net/avatar/${searchedUsername}/48.png`}
                  alt={`${searchedUsername}'s avatar`}
                  width={48}
                  height={48}
                  className="rounded"
                />
                <div>
                  <h3 className="text-lg font-semibold">{searchedUsername}</h3>
                  {playerExists ? (
                    <p className="text-sm text-[var(--text-secondary)]">
                      {searchedUserRanks.length > 0 ? (
                        <>
                          Current ranks:{" "}
                          {searchedUserRanks
                            .map((rankId) => {
                              const rank = ranksConfig.getRankById(rankId);
                              return rank ? rank.name : rankId;
                            })
                            .join(", ")}
                        </>
                      ) : (
                        "No ranks yet"
                      )}
                    </p>
                  ) : (
                    <p className="text-sm text-red-500">
                      Player has never joined the server
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Heading - Replaced currency selector with centered heading */}
        <div className="flex justify-center items-center mb-6">
          <h2 className="text-2xl font-bold">Available Purchases</h2>
        </div>

        {/* Improved Category Tabs */}
        <div className="mb-8">
          <div className="flex justify-center overflow-x-auto bg-[var(--card-bg)] rounded-lg shadow-md p-1">
            {categories.map(
              (category) =>
                // Only render the tab if there are available ranks in this category
                isCategoryVisible(category.id) && (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`py-3 px-6 font-medium text-sm rounded-md whitespace-nowrap transition-all duration-200 mx-1 ${
                      selectedCategoryId === category.id
                        ? "bg-[var(--button-primary)] text-white shadow-md"
                        : "text-[var(--text-secondary)] hover:bg-[var(--card-accent-bg)] hover:text-[var(--text-color)]"
                    }`}
                  >
                    {category.name}
                  </button>
                )
            )}
          </div>
        </div>

        {/* Conditional messaging for search results */}
        {searchedUsername && !playerExists && (
          <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 p-6 rounded-lg shadow-md mb-8">
            <h3 className="text-lg font-bold mb-2">No Results Found</h3>
            <p>
              We couldn&apos;t find a player named &quot;{searchedUsername}
              &quot; on our Minecraft server. Players must join the server at
              least once before you can purchase ranks for them.
            </p>
          </div>
        )}

        {/* Rank Cards - Centered */}
        <div className="flex justify-center">
          <div
            className={`grid gap-8 max-w-6xl ${
              getRanksForCategory().length === 1
                ? "grid-cols-1 place-items-center"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {getRanksForCategory().map((rank) => (
              <RankCard
                key={rank.id}
                rank={rank}
                formatPrice={formatPrice}
                canPurchase={serverOnline}
                canGift={false}
                onPurchase={() => handlePurchase(rank.id)}
                onGift={() => {}}
                session={session}
                minecraftVerified={true}
                serverOnline={serverOnline}
                userRanks={userRanks}
                switchToUpgradesTab={switchToUpgradesTab}
                owned={false}
              />
            ))}
          </div>
        </div>

        {/* No ranks available message */}
        {getRanksForCategory().length === 0 && (
          <div className="bg-[var(--card-accent-bg)] p-6 rounded-lg shadow-md mx-auto max-w-2xl">
            <h3 className="text-lg font-bold mb-2">No Ranks Available</h3>
            <p className="text-[var(--text-secondary)]">
              {searchedUsername
                ? "There are no ranks available for purchase in this category. This may be because you already own all available ranks."
                : "There are no ranks available for purchase in this category."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ShopContent />
    </Suspense>
  );
}
