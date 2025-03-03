"use client";
import React, { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MinecraftVerify() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (session?.user) {
      // Simply redirect to profile after a short delay
      const timer = setTimeout(() => {
        router.push("/profile");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [session, status, router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--background-gradient-from)] to-[var(--background-gradient-to)] text-[var(--text-color)] py-16">
      <div className="container mx-auto px-4">
        <div className="bg-[var(--card-bg)] rounded-lg shadow-lg overflow-hidden max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 text-center">
            <h1 className="text-2xl font-bold text-white">
              Minecraft Verification
            </h1>
          </div>
          <div className="border-t border-[var(--input-border)] p-8">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center bg-green-100 rounded-full p-2 mb-4">
                <svg
                  className="w-6 h-6 text-green-500"
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
              </div>
              <h2 className="text-xl font-semibold mb-2 text-[var(--text-color)]">
                Verification No Longer Required!
              </h2>
              <p className="text-[var(--text-secondary)] mb-4">
                Good news! Minecraft username verification is no longer required
                to make purchases. Simply enter your Minecraft username when
                making a purchase.
              </p>
              <p className="text-[var(--text-secondary)]">
                Redirecting you to your profile page in a moment...
              </p>
            </div>
            <div className="flex justify-center">
              <Link
                href="/profile"
                className="bg-[var(--button-primary)] hover:bg-[var(--button-primary-hover)] text-white py-2 px-4 rounded-md transition-colors"
              >
                Go to Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
