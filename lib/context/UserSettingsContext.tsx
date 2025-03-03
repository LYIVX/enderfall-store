"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface UserSettings {
  preferredCurrency: string;
  emailNotifications: boolean;
  theme: string;
}

interface UserSettingsContextType {
  userSettings: UserSettings;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
}

const defaultSettings: UserSettings = {
  preferredCurrency: "GBP",
  emailNotifications: true,
  theme: "dark",
};

const UserSettingsContext = createContext<UserSettingsContextType>({
  userSettings: defaultSettings,
  updateUserSettings: () => {},
});

export const useUserSettings = () => useContext(UserSettingsContext);

export const UserSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [userSettings, setUserSettings] =
    useState<UserSettings>(defaultSettings);

  // Load settings from localStorage on initial render
  useEffect(() => {
    const savedSettings = localStorage.getItem("userSettings");
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setUserSettings(parsedSettings);
      } catch (error) {
        console.error("Failed to parse saved settings:", error);
      }
    }
  }, []);

  // Apply theme whenever it changes
  useEffect(() => {
    if (userSettings.theme === "light") {
      document.documentElement.classList.add("light-theme");
      document.documentElement.classList.remove("dark-theme");
    } else {
      document.documentElement.classList.add("dark-theme");
      document.documentElement.classList.remove("light-theme");
    }
  }, [userSettings.theme]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("userSettings", JSON.stringify(userSettings));
  }, [userSettings]);

  const updateUserSettings = (newSettings: Partial<UserSettings>) => {
    setUserSettings((prevSettings) => ({
      ...prevSettings,
      ...newSettings,
    }));

    // In a real app, you would also save to the backend
    // fetch('/api/user-settings', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ settings: { ...userSettings, ...newSettings } }),
    // });
  };

  return (
    <UserSettingsContext.Provider value={{ userSettings, updateUserSettings }}>
      {children}
    </UserSettingsContext.Provider>
  );
};
