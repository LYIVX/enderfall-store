"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/verify-purchase?session_id=${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setStatus("success");
          } else {
            setStatus("error");
            setErrorDetails(data.error || "Unknown error");
            console.error("Verification error details:", data);
          }
        })
        .catch((err) => {
          setStatus("error");
          setErrorDetails("Network error occurred");
          console.error("Fetch error:", err);
        });
    }
  }, [sessionId]);

  useEffect(() => {
    if (status === "success" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (status === "success" && countdown === 0) {
      router.push("/shop");
    }
  }, [status, countdown, router]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">
            Processing your purchase...
          </h1>
          <p className="text-gray-300">
            Please wait while we confirm your payment.
          </p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
        <div className="text-center max-w-lg mx-auto">
          <h1 className="text-3xl font-bold mb-4 text-orange-500">
            Purchase Notification
          </h1>
          <p className="text-gray-300 mb-4">
            Your purchase was processed, but we couldn&apos;t confirm website
            verification.
          </p>
          <div className="bg-gray-800 p-4 rounded-lg mb-6">
            <p className="text-gray-300 mb-2">
              <strong>Important:</strong> If you received your rank in-game,
              everything is working correctly.
            </p>
            <p className="text-gray-300 mb-2">
              This message simply means our website couldn&apos;t verify with
              the game server, but this doesn&apos;t affect your purchase.
            </p>
            <p className="text-gray-300">
              You don&apos;t need to contact support unless your rank is not
              showing up in-game.
            </p>
          </div>
          <Link
            href="/shop"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Return to Shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-green-500">
          Thank you for your purchase!
        </h1>
        <p className="text-xl text-gray-300 mb-4">
          Your rank has been activated on the server.
        </p>
        <p className="text-gray-400 mb-8">
          You can now enjoy your new privileges!
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Redirecting to shop in {countdown} seconds...
        </p>
        <Link
          href="/shop"
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
        >
          Return to Shop Now
        </Link>
      </div>
    </main>
  );
}

export default function Success() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
