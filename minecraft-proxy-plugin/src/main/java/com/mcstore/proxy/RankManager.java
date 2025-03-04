package com.mcstore.proxy;

import com.velocitypowered.api.proxy.server.RegisteredServer;
import org.slf4j.Logger;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.io.IOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public class RankManager {
    private final WebsiteProxyPlugin plugin;
    private final Map<String, Set<String>> playerRanks; // username -> ranks
    private final Path rankDataFile;
    private final Logger logger;

    public RankManager(WebsiteProxyPlugin plugin) {
        this.plugin = plugin;
        this.playerRanks = new ConcurrentHashMap<>();
        this.rankDataFile = plugin.getDataDirectory().resolve("ranks.json");
        this.logger = plugin.getLogger();
        loadRankData();
    }

    /**
     * Load rank data from file
     */
    private void loadRankData() {
        if (!Files.exists(rankDataFile)) {
            return;
        }

        try (BufferedReader reader = Files.newBufferedReader(rankDataFile)) {
            // TODO: Implement JSON parsing of rank data
            // This is a placeholder for the actual implementation
        } catch (IOException e) {
            logger.error("Failed to load rank data", e);
        }
    }

    /**
     * Save rank data to file
     */
    private void saveRankData() {
        try (BufferedWriter writer = Files.newBufferedWriter(rankDataFile)) {
            // TODO: Implement JSON writing of rank data
            // This is a placeholder for the actual implementation
        } catch (IOException e) {
            logger.error("Failed to save rank data", e);
        }
    }

    public void syncPlayerRanks(String playerName, RegisteredServer server) {
        String serverName = server.getServerInfo().getName().toLowerCase();
        Config.ServerConfig serverConfig = null;

        // Get the correct server configuration
        if (serverName.equals("lobby")) {
            serverConfig = plugin.getConfig().getLobbyServer();
        } else if (serverName.equals("survival")) {
            serverConfig = plugin.getConfig().getSurvivalServer();
        }

        // Skip if server is not configured
        if (serverConfig == null) {
            logger.debug("Skipping rank sync for unconfigured server: {}", serverName);
            return;
        }

        // Get the actual server IP from Velocity
        String serverHost = server.getServerInfo().getAddress().getHostString();
        
        // Use the API endpoint that matches the server plugin's endpoints
        String apiUrl = String.format("http://%s:%d/api/apply-rank",
            serverHost,
            serverConfig.getApiPort());

        logger.debug("Attempting to sync ranks for {} to {} ({}:{})",
            playerName, serverName, serverHost, serverConfig.getApiPort());

        CompletableFuture.runAsync(() -> {
            try {
                URL url = new URL(apiUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + plugin.getConfig().getApiKey());
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                conn.setDoOutput(true);

                // Get player ranks
                Set<String> ranks = getPlayerRanks(playerName);
                if (ranks.isEmpty()) {
                    logger.debug("No ranks to sync for player {}", playerName);
                    return;
                }

                // Sync each rank individually as the server plugin expects
                for (String rankId : ranks) {
                    // Match the JSON format expected by the server plugin
                    String jsonInput = String.format("{\"username\":\"%s\",\"rank\":\"%s\"}",
                        playerName,
                        rankId);

                    try (OutputStream os = conn.getOutputStream()) {
                        byte[] input = jsonInput.getBytes(StandardCharsets.UTF_8);
                        os.write(input, 0, input.length);
                    }

                    int responseCode = conn.getResponseCode();
                    if (responseCode != 200) {
                        // Read error response if available
                        try (BufferedReader br = new BufferedReader(new InputStreamReader(
                                responseCode >= 400 ? conn.getErrorStream() : conn.getInputStream()))) {
                            StringBuilder response = new StringBuilder();
                            String line;
                            while ((line = br.readLine()) != null) {
                                response.append(line);
                            }
                            logger.error("Error syncing rank {} for player {} on server {}: HTTP {} - {}",
                                rankId, playerName, serverName, responseCode, response.toString());
                        }
                        continue;
                    }

                    logger.info("Successfully synced rank {} for player {} on server {}",
                        rankId, playerName, serverName);
                }

            } catch (IOException e) {
                logger.error("Error syncing ranks for player {} on server {}: {}",
                    playerName, serverName, e.getMessage());
            }
        }).orTimeout(10, TimeUnit.SECONDS)
          .exceptionally(throwable -> {
              logger.error("Timeout or error syncing ranks for player {} on server {}: {}",
                  playerName, serverName, throwable.getMessage());
              return null;
          });
    }

    private String getPlayerRanksJson(String username) {
        Set<String> ranks = getPlayerRanks(username);
        if (ranks.isEmpty()) {
            return "[]";
        }
        return "[\"" + String.join("\",\"", ranks) + "\"]";
    }

    public boolean applyRankToServer(RegisteredServer server, String username, String rankId) {
        String serverName = server.getServerInfo().getName();
        String serverHost = server.getServerInfo().getAddress().getHostString();
        int apiPort = plugin.getConfig().getSurvivalServer().getApiPort();

        try {
            URL url = new URL(String.format("http://%s:%d/api/ranks/apply", serverHost, apiPort));
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("X-API-Key", plugin.getConfig().getApiKey());
            conn.setDoOutput(true);

            String jsonInput = String.format("{\"username\":\"%s\",\"rankId\":\"%s\"}", username, rankId);
            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = jsonInput.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int responseCode = conn.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                logger.info("Successfully applied rank {} to player {} on server {}", 
                    rankId, username, serverName);
                playerRanks.computeIfAbsent(username.toLowerCase(), k -> new HashSet<>()).add(rankId);
                saveRankData();
                return true;
            } else {
                logger.error("Failed to apply rank {} to player {} on server {}: HTTP {}", 
                    rankId, username, serverName, responseCode);
                return false;
            }
        } catch (IOException e) {
            logger.error("Error applying rank {} to player {} on server {}: {}", 
                rankId, username, serverName, e.getMessage());
            return false;
        }
    }

    /**
     * Sync ranks for all players to a specific server
     */
    public void syncRanksToServer(RegisteredServer server) {
        for (Map.Entry<String, Set<String>> entry : playerRanks.entrySet()) {
            String username = entry.getKey();
            Set<String> ranks = entry.getValue();
            
            for (String rankId : ranks) {
                applyRankToServer(server, username, rankId);
            }
        }
    }

    /**
     * Get all ranks for a player
     */
    public Set<String> getPlayerRanks(String username) {
        return new HashSet<>(playerRanks.getOrDefault(username.toLowerCase(), new HashSet<>()));
    }

    /**
     * Check if a player has a specific rank
     */
    public boolean hasRank(String username, String rankId) {
        Set<String> ranks = playerRanks.get(username.toLowerCase());
        return ranks != null && ranks.contains(rankId);
    }

    /**
     * Remove a rank from a player
     */
    public boolean removeRank(String username, String rankId) {
        Set<String> ranks = playerRanks.get(username.toLowerCase());
        if (ranks != null && ranks.remove(rankId)) {
            saveRankData();
            return true;
        }
        return false;
    }
} 