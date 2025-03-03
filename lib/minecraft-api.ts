/**
 * API functions for interacting with the Minecraft server
 */

import axios from "axios";

// Types
interface PlayerExistsResponse {
  exists: boolean;
  username?: string;
  ranks?: string[];
}

/**
 * Get the endpoint for player API requests
 */
function getPlayerApiEndpoint(): string {
  return process.env.MINECRAFT_API_URL || "http://localhost:8080/api";
}

/**
 * Check if a player exists on the Minecraft server and get their ranks
 * @param username Minecraft username to check
 * @returns Response with exists flag and player ranks if exists
 */
export async function checkPlayerExists(
  username: string,
  fetch = globalThis.fetch
): Promise<PlayerExistsResponse> {
  try {
    // Browser environment: Use the API route
    if (typeof window !== "undefined") {
      const apiUrl = `/api/check-minecraft-player?username=${encodeURIComponent(
        username
      )}`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      return {
        exists: data.exists,
        username: data.username,
        ranks: data.ranks || [],
      };
    }
    // Server environment: Direct Minecraft lookup
    else {
      const requestUrl = `${getPlayerApiEndpoint()}/player/${encodeURIComponent(
        username
      )}`;

      const response = await fetch(requestUrl);

      if (response.status === 404) {
        return { exists: false };
      }

      if (response.ok) {
        const data = await response.json();
        return {
          exists: true,
          username: data.username,
          ranks: data.ranks || [],
        };
      }

      return { exists: false };
    }
  } catch (error) {
    // If the server is unreachable, return exists: false
    return { exists: false };
  }
}

/**
 * Convert a rank ID to its category (e.g., "shadow_enchanter_plus" → "shadow_enchanter")
 * @param rankId The rank ID to get the category for
 * @returns The category of the rank
 */
export function getRankCategory(rankId: string): string {
  // For upgrades like "shadow_enchanter_to_void_walker", extract the target rank
  if (rankId.includes("_to_")) {
    rankId = rankId.split("_to_")[1];
  }

  // Check for known categories
  if (rankId.startsWith("shadow_enchanter")) {
    return "shadow_enchanter";
  } else if (rankId.startsWith("void_walker")) {
    return "void_walker";
  } else if (rankId.startsWith("ethereal_warden")) {
    return "ethereal_warden";
  } else if (rankId.startsWith("astral_guardian")) {
    return "astral_guardian";
  } else if (rankId.startsWith("towny")) {
    return "towny";
  }

  // Default to the rank ID itself if no category matches
  return rankId;
}
