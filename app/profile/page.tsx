"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  useUserSettings,
  UserSettings,
} from "@/lib/context/UserSettingsContext";

// Purchase History Dropdown Component
const PurchaseHistoryDropdown = ({ purchases }: { purchases: Purchase[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Show only the most recent 3 purchases when collapsed
  const recentPurchases = purchases.slice(0, 3);
  const remainingPurchases = purchases.slice(3);
  const hasMorePurchases = purchases.length > 3;

  return (
    <div className="space-y-4">
      {/* Recent purchases (always visible) */}
      {recentPurchases.map((purchase) => (
        <div
          key={purchase.id}
          className="bg-[var(--card-bg-secondary)] p-4 rounded-lg"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold">{purchase.rankName}</h3>
              <p className="text-gray-400">
                {purchase.formattedDate} at {purchase.formattedTime}
              </p>
              {purchase.isGift && purchase.recipient && (
                <p className="text-purple-400 mt-1">
                  Gifted to: {purchase.recipient}
                </p>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                purchase.status === "completed"
                  ? "bg-green-600 text-white"
                  : "bg-yellow-600 text-white"
              }`}
            >
              {purchase.status}
            </span>
          </div>
        </div>
      ))}

      {/* Toggle button - only show if there are more purchases */}
      {hasMorePurchases && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 px-4 bg-[var(--card-bg-secondary)] hover:bg-[var(--card-accent-bg)] text-[var(--text-color)] rounded-lg flex items-center justify-center transition-colors"
        >
          <span className="mr-2">
            {isExpanded
              ? "Show Less"
              : `Show ${remainingPurchases.length} More`}
          </span>
          <svg
            className={`h-5 w-5 transform transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}

      {/* Remaining purchases (visible when expanded) */}
      {isExpanded && remainingPurchases.length > 0 && (
        <div className="space-y-4 mt-4 border-t border-[var(--border-color)] pt-4">
          {remainingPurchases.map((purchase) => (
            <div
              key={purchase.id}
              className="bg-[var(--card-bg-secondary)] p-4 rounded-lg"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{purchase.rankName}</h3>
                  <p className="text-gray-400">
                    {purchase.formattedDate} at {purchase.formattedTime}
                  </p>
                  {purchase.isGift && purchase.recipient && (
                    <p className="text-purple-400 mt-1">
                      Gifted to: {purchase.recipient}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    purchase.status === "completed"
                      ? "bg-green-600 text-white"
                      : "bg-yellow-600 text-white"
                  }`}
                >
                  {purchase.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Minecraft Account Manager Component
const MinecraftAccountManager = () => {
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  const [newUsername, setNewUsername] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Load saved Minecraft accounts on component mount
  useEffect(() => {
    const fetchSavedAccounts = async () => {
      try {
        const response = await fetch("/api/minecraft-accounts");
        if (response.ok) {
          const data = await response.json();
          setSavedAccounts(data.accounts || []);
        }
      } catch (error) {
        console.error("Error fetching saved Minecraft accounts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSavedAccounts();
  }, []);

  // Handle adding a new Minecraft account
  const handleAddAccount = async () => {
    if (!newUsername.trim()) {
      setVerificationError("Please enter a valid Minecraft username");
      return;
    }

    setIsVerifying(true);
    setVerificationError("");

    try {
      // Verify the username exists on the Minecraft server
      const verifyResponse = await fetch(
        `/api/minecraft/player-exists?username=${encodeURIComponent(newUsername)}`
      );
      const verifyData = await verifyResponse.json();

      if (!verifyData.exists) {
        setVerificationError(
          `Player "${newUsername}" not found on the server. Make sure you've joined the server at least once.`
        );
        setIsVerifying(false);
        return;
      }

      // Add the account to the saved accounts
      const saveResponse = await fetch("/api/minecraft-accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: newUsername }),
      });

      if (saveResponse.ok) {
        const data = await saveResponse.json();
        setSavedAccounts(data.accounts);
        setNewUsername("");
        setVerificationError("");
      } else {
        const errorData = await saveResponse.json();
        setVerificationError(errorData.error || "Failed to save account");
      }
    } catch (error) {
      console.error("Error adding Minecraft account:", error);
      setVerificationError("An error occurred while verifying the account");
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle removing a Minecraft account
  const handleRemoveAccount = async (username: string) => {
    try {
      const response = await fetch("/api/minecraft-accounts", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      if (response.ok) {
        const data = await response.json();
        setSavedAccounts(data.accounts);
      }
    } catch (error) {
      console.error("Error removing Minecraft account:", error);
    }
  };

  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <svg
            className="animate-spin h-6 w-6 text-[var(--button-primary)]"
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
        </div>
      ) : (
        <>
          <div className="mb-4">
            <p className="text-[var(--text-secondary)] mb-2">
              Save your Minecraft accounts to quickly select them when making
              purchases.
            </p>

            {savedAccounts.length > 0 ? (
              <div className="space-y-3 mb-6">
                <h3 className="font-medium">Your Saved Accounts:</h3>
                {savedAccounts.map((username) => (
                  <div
                    key={username}
                    className="flex items-center justify-between bg-[var(--card-bg-secondary)] p-3 rounded-lg"
                  >
                    <div className="flex items-center">
                      <img
                        src={`https://mc-heads.net/avatar/${username}/36`}
                        alt={username}
                        className="w-9 h-9 mr-3 rounded"
                      />
                      <span className="font-medium">{username}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveAccount(username)}
                      className="text-red-400 hover:text-red-500 transition-colors p-1"
                      title="Remove account"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        ></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg mb-6">
                <p className="text-center text-[var(--text-secondary)]">
                  No Minecraft accounts saved yet
                </p>
              </div>
            )}

            <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg">
              <h3 className="font-medium mb-3">Add a Minecraft Account</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-grow relative">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter Minecraft username"
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--button-primary)]"
                    disabled={isVerifying}
                  />
                </div>
                <button
                  onClick={handleAddAccount}
                  disabled={isVerifying || !newUsername.trim()}
                  className="bg-[var(--button-primary)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--button-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                >
                  {isVerifying ? (
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
                      Verifying
                    </>
                  ) : (
                    "Add Account"
                  )}
                </button>
              </div>
              {verificationError && (
                <p className="text-red-500 text-sm mt-2">{verificationError}</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
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

type CurrencyCode = keyof typeof currencySymbols;

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

interface DiscordProfile {
  username: string;
  avatar: string;
  id?: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [discordProfile, setDiscordProfile] = useState<DiscordProfile | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const { userSettings, updateUserSettings } = useUserSettings();
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<UserSettings>({
    preferredCurrency: "GBP",
    emailNotifications: true,
    theme: "dark",
    hideTestPurchases: false,
  });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [resetInProgress, setResetInProgress] = useState(false);
  const [hideTestPurchases, setHideTestPurchases] = useState(false);

  // Dropdown states
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  // Refs for dropdown containers
  const currencyMenuRef = useRef<HTMLDivElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  // Header gradient styles
  const accountHeaderStyle = {
    background: "linear-gradient(to right, #8b5cf6, #6366f1, #3b82f6)",
    boxShadow: "0 4px 20px rgba(139, 92, 246, 0.5)",
  };

  const discordHeaderStyle = {
    background: "linear-gradient(to right, #5865f2, #7984f5, #99a6fa)",
    boxShadow: "0 4px 20px rgba(88, 101, 242, 0.5)",
  };

  const historyHeaderStyle = {
    background: "linear-gradient(to right, #ec4899, #d946ef, #8b5cf6)",
    boxShadow: "0 4px 20px rgba(236, 72, 153, 0.5)",
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        currencyMenuRef.current &&
        !currencyMenuRef.current.contains(target)
      ) {
        setIsCurrencyMenuOpen(false);
      }

      if (themeMenuRef.current && !themeMenuRef.current.contains(target)) {
        setIsThemeMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    // Initialize tempSettings with current userSettings
    setTempSettings(userSettings);
  }, [userSettings]);

  useEffect(() => {
    if (session?.user) {
      // Fetch purchase history
      fetch("/api/purchases")
        .then((res) => res.json())
        .then((data) => {
          setPurchases(data.purchases);
          setHideTestPurchases(data.resetActive === true);
          // Update user settings if necessary
          if (data.resetActive !== userSettings.hideTestPurchases) {
            updateUserSettings({ hideTestPurchases: data.resetActive });
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Failed to fetch purchases:", error);
          setLoading(false);
        });

      // Fetch Discord profile
      fetch("/api/discord-profile")
        .then((res) => res.json())
        .then((data) => {
          setDiscordProfile(data.profile);
        })
        .catch((error) => {
          console.error("Failed to fetch Discord profile:", error);
        });
    }
  }, [session]);

  const handleSettingsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setTempSettings({
      ...tempSettings,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const handleCurrencyChange = (currency: CurrencyCode) => {
    setTempSettings({
      ...tempSettings,
      preferredCurrency: currency,
    });
    setIsCurrencyMenuOpen(false);
  };

  const handleThemeChange = (theme: string) => {
    setTempSettings({
      ...tempSettings,
      theme,
    });
    setIsThemeMenuOpen(false);
  };

  const saveSettings = () => {
    // Check if the test purchases setting has changed
    if (tempSettings.hideTestPurchases !== userSettings.hideTestPurchases) {
      resetPurchasesForTesting(!!tempSettings.hideTestPurchases);
    }

    // Update the context with new settings
    updateUserSettings(tempSettings);
    setIsEditingSettings(false);
  };

  const resetPurchasesForTesting = async (active: boolean) => {
    setResetInProgress(true);
    try {
      const response = await fetch("/api/reset-purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active }),
      });

      if (response.ok) {
        const result = await response.json();
        setHideTestPurchases(result.active);
        updateUserSettings({ hideTestPurchases: result.active });

        // Refresh purchases list
        fetch("/api/purchases")
          .then((res) => res.json())
          .then((data) => {
            setPurchases(data.purchases);
          });
      } else {
        const data = await response.json();
        alert(`Failed to update visibility: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating purchase visibility:", error);
      alert("An error occurred while updating purchase visibility.");
    } finally {
      setResetInProgress(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[var(--background-gradient-from)] to-[var(--background-gradient-to)] text-[var(--text-color)] p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Loading...</h1>
        </div>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--background-gradient-from)] to-[var(--background-gradient-to)] text-[var(--text-color)] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Profile</h1>
          <Link
            href="/shop"
            className="bg-[var(--button-success)] hover:bg-[var(--button-success-hover)] text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Shop
          </Link>
        </div>

        {/* Account Details Section */}
        <div className="bg-[var(--card-bg)] rounded-lg overflow-hidden mb-8">
          <div
            style={accountHeaderStyle}
            className="p-5 text-center rounded-t-lg relative overflow-hidden"
          >
            {/* Add a shine effect overlay */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 opacity-30 bg-white transform -skew-x-12 animate-shine"></div>
            </div>
            <h2 className="text-xl font-semibold flex items-center gap-2 justify-center text-white relative z-10 drop-shadow-md">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                ></path>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                ></path>
              </svg>
              Account Settings
            </h2>
          </div>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              {!isEditingSettings ? (
                <button
                  onClick={() => {
                    setTempSettings(userSettings);
                    setIsEditingSettings(true);
                  }}
                  className="bg-[var(--button-primary)] hover:bg-[var(--button-primary-hover)] text-white px-3 py-1 rounded-md text-sm transition-colors ml-auto"
                >
                  Edit Settings
                </button>
              ) : (
                <div className="flex space-x-2 ml-auto">
                  <button
                    onClick={() => setIsEditingSettings(false)}
                    className="bg-[var(--button-secondary)] hover:bg-[var(--button-secondary-hover)] text-[var(--text-color)] px-3 py-1 rounded-md text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSettings}
                    className="bg-[var(--button-success)] hover:bg-[var(--button-success-hover)] text-white px-3 py-1 rounded-md text-sm transition-colors"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {!isEditingSettings ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg">
                  <h3 className="text-sm text-[var(--text-secondary)] mb-1">
                    Preferred Currency
                  </h3>
                  <p className="font-medium">
                    {userSettings.preferredCurrency}
                  </p>
                </div>
                <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg">
                  <h3 className="text-sm text-[var(--text-secondary)] mb-1">
                    Email Notifications
                  </h3>
                  <p className="font-medium">
                    {userSettings.emailNotifications ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg">
                  <h3 className="text-sm text-[var(--text-secondary)] mb-1">
                    Theme
                  </h3>
                  <p className="font-medium capitalize">{userSettings.theme}</p>
                </div>
                <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg">
                  <h3 className="text-sm text-[var(--text-secondary)] mb-1">
                    Account Created
                  </h3>
                  <p className="font-medium">March 1, 2023</p>
                </div>
                <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg">
                  <h3 className="text-sm text-[var(--text-secondary)] mb-1">
                    Hide Test Purchases
                  </h3>
                  <p className="font-medium">
                    {userSettings.hideTestPurchases ? "Enabled" : "Disabled"}
                    {userSettings.hideTestPurchases && (
                      <span className="ml-2 text-xs text-yellow-400">
                        (Testing mode active)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg">
                  <label
                    htmlFor="preferredCurrency"
                    className="block text-sm text-[var(--text-secondary)] mb-1"
                  >
                    Preferred Currency
                  </label>
                  <div className="relative" ref={currencyMenuRef}>
                    <button
                      onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)}
                      className="w-full bg-[var(--input-bg)] hover:bg-[var(--card-bg-secondary)] border border-[var(--input-border)] text-[var(--text-color)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 h-10 transition-colors flex items-center justify-between"
                    >
                      <span>
                        {tempSettings.preferredCurrency} (
                        {
                          currencySymbols[
                            tempSettings.preferredCurrency as CurrencyCode
                          ]
                        }
                        )
                      </span>
                    </button>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-secondary)]">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                    {isCurrencyMenuOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-[var(--input-bg)] rounded-md shadow-lg py-1 z-10 border border-[var(--input-border)]">
                        {(
                          Object.keys(currencySymbols) as Array<CurrencyCode>
                        ).map((currency) => (
                          <button
                            key={currency}
                            onClick={() => handleCurrencyChange(currency)}
                            className="block w-full text-left px-3 py-2 text-sm text-[var(--text-color)] hover:bg-[var(--button-primary)] hover:text-white transition-colors duration-150"
                          >
                            {currency} ({currencySymbols[currency]})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg">
                  <label
                    htmlFor="emailNotifications"
                    className="block text-sm text-[var(--text-secondary)] mb-1"
                  >
                    Email Notifications
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      name="emailNotifications"
                      checked={tempSettings.emailNotifications}
                      onChange={handleSettingsChange}
                      className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-[var(--input-border)] rounded"
                    />
                    <span className="ml-2">Receive email notifications</span>
                  </div>
                </div>
                <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg">
                  <label
                    htmlFor="theme"
                    className="block text-sm text-[var(--text-secondary)] mb-1"
                  >
                    Theme
                  </label>
                  <div className="relative" ref={themeMenuRef}>
                    <button
                      onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                      className="w-full bg-[var(--input-bg)] hover:bg-[var(--card-bg-secondary)] border border-[var(--input-border)] text-[var(--text-color)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 h-10 transition-colors flex items-center justify-between"
                    >
                      <span className="capitalize">{tempSettings.theme}</span>
                    </button>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[var(--text-secondary)]">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                    {isThemeMenuOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-[var(--input-bg)] rounded-md shadow-lg py-1 z-10 border border-[var(--input-border)]">
                        {["dark", "light", "system"].map((theme) => (
                          <button
                            key={theme}
                            onClick={() => handleThemeChange(theme)}
                            className="block w-full text-left px-3 py-2 text-sm text-[var(--text-color)] hover:bg-[var(--button-primary)] hover:text-white transition-colors duration-150 capitalize"
                          >
                            {theme}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-[var(--card-bg-secondary)] p-4 rounded-lg">
                  <label
                    htmlFor="hideTestPurchases"
                    className="block text-sm text-[var(--text-secondary)] mb-1"
                  >
                    Hide Test Purchases
                  </label>
                  <div className="flex items-center">
                    <div
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${tempSettings.hideTestPurchases ? "bg-purple-600" : "bg-gray-300"}`}
                      onClick={() => {
                        setTempSettings({
                          ...tempSettings,
                          hideTestPurchases: !tempSettings.hideTestPurchases,
                        });
                      }}
                      role="checkbox"
                      aria-checked={tempSettings.hideTestPurchases}
                      tabIndex={0}
                    >
                      <div
                        className={`absolute w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 transform ${tempSettings.hideTestPurchases ? "translate-x-6" : "translate-x-1"} top-0.5`}
                      ></div>
                    </div>
                    <span className="ml-3">
                      {tempSettings.hideTestPurchases
                        ? "Testing mode active"
                        : "Normal mode"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    For testing only.{" "}
                    {tempSettings.hideTestPurchases
                      ? "Toggle off to show all purchases."
                      : "Toggle on to hide purchases and allow repurchasing."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--card-bg)] rounded-lg overflow-hidden mb-8">
          <div
            style={discordHeaderStyle}
            className="p-5 text-center rounded-t-lg relative overflow-hidden"
          >
            {/* Add a shine effect overlay */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 opacity-30 bg-white transform -skew-x-12 animate-shine"></div>
            </div>
            <h2 className="text-xl font-semibold flex items-center gap-2 justify-center text-white relative z-10 drop-shadow-md">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Discord Account
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "Discord Profile"}
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div>
                  <h2 className="text-xl font-bold">{session.user.name}</h2>
                  <p className="text-gray-400">{session.user.email}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout from Discord
              </button>
            </div>
          </div>
        </div>

        {/* Minecraft Account Section */}
        <div
          id="minecraft-accounts"
          className="bg-[var(--card-bg)] rounded-lg overflow-hidden mb-8 mt-8"
        >
          <div
            className="p-5 text-center rounded-t-lg relative overflow-hidden"
            style={{
              background: "linear-gradient(to right, #9A7B4F, #77592c)",
            }}
          >
            {/* Add a shine effect overlay */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 opacity-30 bg-white transform -skew-x-12 animate-shine"></div>
            </div>
            <h2 className="text-xl font-semibold flex items-center gap-2 justify-center text-white relative z-10 drop-shadow-md">
              <svg
                className="w-6 h-6"
                viewBox="0 0 512 512"
                fill="currentColor"
              >
                <path d="M86.2 232.8c19.7 0 34.9-15.7 34.9-35.9s-15.2-36-34.9-36c-19.8 0-35.5 15.8-35.5 36 0 20.2 15.8 35.9 35.5 35.9zm38.1 21.4c-13.4-5.6-24.6-5.3-38.2 0-29.7 11.6-53.5 45.2-53.5 80.9v52.3l30.6 29.1 52.3-12.8L128 393l-19.7-20.2 19.7-23.3 19.7 23.3L128 393l12.5 10.7 52.3 12.8 30.6-29.1v-52.3c0-35.7-23.8-69.3-53.5-80.9zm225.7-133.7c-23.1 0-42 18.9-42 42.2s18.9 42.2 42 42.2 42-18.9 42-42.2-18.9-42.2-42-42-42.2zm0 84.4c-23.1 0-42 18.9-42 42.2s18.9 42.2 42 42.2 42-18.9 42-42.2-18.9-42.2-42-42.2zm-85.1 42.2c0-23.3-18.9-42.2-42-42.2s-42 18.9-42 42.2 18.9 42.2 42 42.2 42-18.9 42-42.2zm85.1 42.2c23.1 0 42-18.9 42-42.2s-18.9-42.2-42-42.2-42 18.9-42 42.2 18.9 42.2 42 42.2zm0 84.4c-23.1 0-42 18.9-42 42.2 0 11.4 4.5 21.5 11.5 29.1l33.4-31.9h15.8c4.6-7.1 7.5-15.5 7.5-24.4 0-10.2-3.4-19.6-9.1-27.1-4.9 7.3-13.2 12.1-22.7 12.1-15.1 0-27.4-12.3-27.4-27.4s12.3-27.4 27.4-27.4c15.1 0 27.4 12.3 27.4 27.4 0 5.2-1.5 10-4 14.2 5.6 7.5 9.1 16.8 9.1 27.1 0 14.2-6.5 26.8-16.7 35.1 12.7 0 32.5 8.7 42 25.8.7-4.7 1.1-9.4 1.1-14.4 0-23.3-18.9-42.2-42-42.2-23.1 0-42 18.9-42 42.2s18.9 42.2 42 42.2h84.4v-84.4c0-23.3-18.9-42.2-42-42.2zm-200.3 35.8l-16.4-27 16.4-27 16.4 27-16.4 27zm85.9-321.2L194.6 60l26.8-45.6L248.2 60l-25 46.4zM264 152c-23.1 0-42 18.9-42 42.2s18.9 42.2 42 42.2 42-18.9 42-42.2S287.1 152 264 152zM92.9 314.9L76.4 296l16.4-18.9 16.4 18.9-16.4 18.9z" />
              </svg>
              Minecraft Account
            </h2>
          </div>
          <div className="p-6">
            <MinecraftAccountManager />
          </div>
        </div>

        {/* Purchase History Section - Moved to bottom */}
        <div className="bg-[var(--card-bg)] rounded-lg overflow-hidden mb-8">
          <div
            style={historyHeaderStyle}
            className="p-5 text-center rounded-t-lg relative overflow-hidden"
          >
            {/* Add a shine effect overlay */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 opacity-30 bg-white transform -skew-x-12 animate-shine"></div>
            </div>
            <h2 className="text-2xl font-bold text-white relative z-10 drop-shadow-md">
              Purchase History
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {purchases.length > 0 ? (
                <>
                  {/* Purchase History Dropdown */}
                  <PurchaseHistoryDropdown purchases={purchases} />
                </>
              ) : (
                <div>
                  <p className="text-gray-400">No purchases found</p>
                  {userSettings.hideTestPurchases && (
                    <p className="text-yellow-400 mt-2">
                      Test mode is active. Purchases are hidden to allow
                      re-purchasing for testing. Click &quot;Edit Settings&quot;
                      above to change this setting.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
