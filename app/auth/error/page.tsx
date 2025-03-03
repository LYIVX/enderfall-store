"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl text-center">
          <h1 className="text-3xl font-bold mb-4 text-red-500">
            Authentication Error
          </h1>

          <p className="text-gray-300 mb-6">
            {error === "AccessDenied"
              ? "You do not have permission to sign in."
              : "There was a problem signing you in."}
          </p>

          <div className="space-y-4">
            <Link
              href="/auth/signin"
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Try Again
            </Link>

            <Link
              href="/"
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
