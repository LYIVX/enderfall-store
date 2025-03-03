"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useUserSettings } from "@/lib/context/UserSettingsContext";
import Image from "next/image";

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

interface DiscordProfile {
  username: string;
  avatar: string;
  id: string;
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { userSettings, updateUserSettings } = useUserSettings();
  const [discordProfile, setDiscordProfile] = useState<DiscordProfile | null>(
    null
  );
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(
    (userSettings.preferredCurrency as CurrencyCode) || "GBP"
  );

  // State for dropdowns
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Refs for dropdown containers
  const currencyMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Update selectedCurrency when userSettings change
  useEffect(() => {
    setSelectedCurrency(
      (userSettings.preferredCurrency as CurrencyCode) || "GBP"
    );
  }, [userSettings.preferredCurrency]);

  // Update userSettings when selectedCurrency changes
  const handleCurrencyChange = (currency: CurrencyCode) => {
    setSelectedCurrency(currency);
    updateUserSettings({ preferredCurrency: currency });
    setIsCurrencyMenuOpen(false);
  };

  const isActive = (path: string) => {
    return pathname === path;
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

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (session?.user) {
      // Fetch Discord profile with no-cache headers
      fetch("/api/discord-profile", {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch profile");
          return res.json();
        })
        .then((data) => {
          if (data.profile) {
            setDiscordProfile(data.profile);
          }
        })
        .catch((error) => {
          // Set fallback profile using session data
          if (session.user) {
            setDiscordProfile({
              id: session.user.id,
              username: session.user.name?.split("#")[0] || "User",
              avatar: session.user.image || "/default-avatar.png",
            });
          }
        });
    }
  }, [session]);

  return (
    <nav className="bg-[var(--card-bg)] border-b border-[var(--input-border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-[var(--text-color)] font-bold text-xl"
            >
              Enderfall Store
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-center space-x-4">
                <Link
                  href="/"
                  className={`${
                    isActive("/")
                      ? "bg-[var(--button-primary)] text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--card-bg-secondary)] hover:text-[var(--text-color)]"
                  } px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  Home
                </Link>
                <Link
                  href="/shop"
                  className={`${
                    isActive("/shop")
                      ? "bg-[var(--button-primary)] text-white"
                      : "text-[var(--text-secondary)] hover:bg-[var(--card-bg-secondary)] hover:text-[var(--text-color)]"
                  } px-3 py-2 rounded-md text-sm font-medium transition-colors`}
                >
                  Shop
                </Link>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {/* Currency Dropdown */}
            <div className="relative" ref={currencyMenuRef}>
              <button
                onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)}
                className="bg-[var(--input-bg)] hover:bg-[var(--card-bg-secondary)] border border-[var(--input-border)] text-[var(--text-color)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-32 h-10 transition-colors"
              >
                <div className="flex items-center">
                  <span className="truncate">
                    {selectedCurrency} ({currencySymbols[selectedCurrency]})
                  </span>
                </div>
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
                <div className="absolute right-0 mt-1 w-32 bg-[var(--input-bg)] rounded-md shadow-lg py-1 z-10 border border-[var(--input-border)]">
                  {(Object.keys(currencySymbols) as Array<CurrencyCode>).map(
                    (currency) => (
                      <button
                        key={currency}
                        onClick={() => handleCurrencyChange(currency)}
                        className="block w-full text-left px-3 py-2 text-sm text-[var(--text-color)] hover:bg-[var(--button-primary)] hover:text-white transition-colors duration-150"
                      >
                        {currency} ({currencySymbols[currency]})
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() =>
                updateUserSettings({
                  theme: userSettings.theme === "dark" ? "light" : "dark",
                })
              }
              className="text-[var(--text-secondary)] hover:text-[var(--text-color)] p-1 rounded-full transition-colors"
              aria-label="Toggle theme"
            >
              {userSettings.theme === "dark" ? (
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
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  ></path>
                </svg>
              ) : (
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
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  ></path>
                </svg>
              )}
            </button>

            {/* User Menu */}
            {status === "authenticated" ? (
              <div className="hidden md:block relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="bg-[var(--input-bg)] hover:bg-[var(--card-bg-secondary)] border border-[var(--input-border)] text-[var(--text-color)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-32 h-10 transition-colors"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-6 h-6 relative flex-shrink-0">
                      <Image
                        src={discordProfile?.avatar || "/default-avatar.png"}
                        alt="User Avatar"
                        width={24}
                        height={24}
                        className="rounded-full"
                        priority
                        unoptimized
                      />
                    </div>
                    <span className="truncate flex-1 text-center">
                      {discordProfile?.username ||
                        session.user?.name?.split("#")[0] ||
                        "User"}
                    </span>
                  </div>
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
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-1 w-32 bg-[var(--input-bg)] rounded-md shadow-lg py-1 z-10 border border-[var(--input-border)]">
                    <Link
                      href="/profile"
                      className="block px-3 py-2 text-sm text-[var(--text-color)] hover:bg-[var(--button-primary)] hover:text-white transition-colors duration-150"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="block w-full text-left px-3 py-2 text-sm text-[var(--text-color)] hover:bg-[var(--button-primary)] hover:text-white transition-colors duration-150"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/api/auth/signin"
                className="bg-[var(--button-primary)] hover:bg-[var(--button-primary-hover)] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-color)] p-1 rounded-full transition-colors"
              aria-label="Toggle mobile menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[var(--card-bg)] border-t border-[var(--input-border)] pb-3 pt-2">
          <div className="px-4 sm:px-6 lg:px-8 space-y-3">
            <Link
              href="/"
              className={`${
                isActive("/")
                  ? "bg-[var(--button-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--card-bg-secondary)] hover:text-[var(--text-color)]"
              } block px-3 py-2 rounded-md text-base font-medium transition-colors`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/shop"
              className={`${
                isActive("/shop")
                  ? "bg-[var(--button-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--card-bg-secondary)] hover:text-[var(--text-color)]"
              } block px-3 py-2 rounded-md text-base font-medium transition-colors`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Shop
            </Link>

            {/* Currency select for mobile */}
            <div className="pt-2 pb-1">
              <p className="px-3 text-sm font-medium text-[var(--text-secondary)]">
                Currency
              </p>
              <div className="mt-1 space-y-1">
                {(Object.keys(currencySymbols) as Array<CurrencyCode>).map(
                  (currency) => (
                    <button
                      key={currency}
                      onClick={() => {
                        handleCurrencyChange(currency);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`${
                        selectedCurrency === currency
                          ? "bg-[var(--button-primary)] text-white"
                          : "text-[var(--text-color)] hover:bg-[var(--card-bg-secondary)]"
                      } block w-full text-left px-3 py-2 text-base transition-colors duration-150`}
                    >
                      {currency} ({currencySymbols[currency]})
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Profile/Login for mobile */}
            <div className="pt-2">
              {status === "authenticated" ? (
                <div className="space-y-1">
                  <div className="flex items-center px-3 py-2">
                    <div className="w-8 h-8 relative mr-3">
                      <Image
                        src={discordProfile?.avatar || "/default-avatar.png"}
                        alt="User Avatar"
                        width={32}
                        height={32}
                        className="rounded-full"
                        priority
                        unoptimized
                      />
                    </div>
                    <span className="text-[var(--text-color)] font-medium">
                      {discordProfile?.username ||
                        session.user?.name?.split("#")[0] ||
                        "User"}
                    </span>
                  </div>
                  <Link
                    href="/profile"
                    className="block px-3 py-2 text-base text-[var(--text-color)] hover:bg-[var(--button-primary)] hover:text-white transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="block w-full text-left px-3 py-2 text-base text-[var(--text-color)] hover:bg-[var(--button-primary)] hover:text-white transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  href="/api/auth/signin"
                  className="block w-full text-center px-3 py-2 bg-[var(--button-primary)] hover:bg-[var(--button-primary-hover)] text-white rounded-md text-base font-medium transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
