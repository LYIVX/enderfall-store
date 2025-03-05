"use client";
import React from "react";
import Link from "next/link";
import ServerStatus from "./components/ServerStatus";
import { getMinecraftServerHostname } from "@/lib/minecraft-api";

export default function Home() {
  // Define gradient style for server features header
  const gradientStyle = {
    background: "linear-gradient(45deg, #FF6B6B, #4ECDC4)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };

  const serverIp = getMinecraftServerHostname();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--background-gradient-from)] to-[var(--background-gradient-to)] text-[var(--text-color)]">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            Welcome to Our Minecraft Server
          </h1>
          <p className="text-xl text-[var(--text-secondary)]">
            Join thousands of players in an amazing adventure!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-[var(--card-bg)] rounded-lg shadow-lg overflow-hidden">
            <div
              style={gradientStyle}
              className="p-5 text-center rounded-t-lg relative overflow-hidden"
            >
              {/* Add a shine effect overlay */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 opacity-30 bg-white transform -skew-x-12 animate-shine"></div>
              </div>
              <h2 className="text-2xl font-bold text-white relative z-10 drop-shadow-md">
                Server Features
              </h2>
            </div>
            <div className="border-t-0 p-8">
              <ul className="space-y-4">
                <li className="flex items-center">
                  <span className="text-green-500 mr-3 text-xl">✓</span>
                  <span className="text-lg text-[var(--text-color)]">
                    Custom Plugins and Games
                  </span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3 text-xl">✓</span>
                  <span className="text-lg text-[var(--text-color)]">
                    Active Community
                  </span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3 text-xl">✓</span>
                  <span className="text-lg text-[var(--text-color)]">
                    24/7 Uptime
                  </span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3 text-xl">✓</span>
                  <span className="text-lg text-[var(--text-color)]">
                    Regular Events
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <ServerStatus serverIp={serverIp} />
        </div>

        <div className="text-center">
          <Link
            href="/shop"
            className="inline-block bg-[var(--button-primary)] hover:bg-[var(--button-primary-hover)] text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            View Available Ranks
          </Link>
        </div>
      </div>
    </main>
  );
}
