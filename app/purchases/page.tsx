"use client";
import React, { useEffect } from "react";

export default function Purchases() {
  // Auto-cleanup pending purchases
  useEffect(() => {
    if (pendingPurchases.length > 0) {
      cleanupPendingPurchases();
    }
  }, [pendingPurchases]);

  const cleanupPendingPurchases = async () => {
    try {
      const response = await fetch("/api/cleanup-pending-purchases", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        // Update the purchases list with cleaned data
        setPendingPurchases((prev) =>
          prev.filter((p) => !data.cleanedPurchaseIds.includes(p.id))
        );
      }
    } catch (error) {
      // Silently fail, we'll try again later
    }
  };

  return (
    <div>
      <h1>Your Purchases</h1>
      {/* Rest of your component */}
    </div>
  );
}
