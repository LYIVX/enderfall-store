package com.mcstore.proxy;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.slf4j.Logger;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;
import java.util.Set;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public class ApiServer {
    private final WebsiteProxyPlugin plugin;
    private HttpServer server;
    private final int port;
    private final String apiKey;
    private final Gson gson;

    public ApiServer(WebsiteProxyPlugin plugin) {
        this.plugin = plugin;
        this.port = plugin.getConfig().getApiPort();
        this.apiKey = plugin.getConfig().getApiKey();
        this.gson = new GsonBuilder().setPrettyPrinting().create();
    }

    public void start() {
        try {
            server = HttpServer.create(new InetSocketAddress(port), 0);
            server.createContext("/api/player", new PlayerHandler());
            server.createContext("/api/players", new PlayersHandler());
            server.createContext("/api/ranks", new RankHandler());
            server.setExecutor(null);
            server.start();
            plugin.getLogger().info("API Server started on port {}", port);
        } catch (IOException e) {
            plugin.getLogger().error("Failed to start API server", e);
        }
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
            plugin.getLogger().info("API server stopped");
        }
    }

    private boolean validateApiKey(HttpExchange exchange) {
        String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return false;
        }
        String providedKey = authHeader.substring(7); // Remove "Bearer " prefix
        return apiKey.equals(providedKey);
    }

    private class PlayerHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!validateApiKey(exchange)) {
                sendResponse(exchange, 401, "{\"error\":\"Unauthorized\"}");
                return;
            }

            String path = exchange.getRequestURI().getPath();
            String username = path.substring(path.lastIndexOf('/') + 1).toLowerCase();

            // Check if player exists (either online or in known players list)
            boolean exists = plugin.getServer().getPlayer(username).isPresent() ||
                           plugin.getPlayerListener().getKnownPlayers().contains(username);
            String response = String.format("{\"exists\":%b,\"username\":\"%s\"}", exists, username);
            
            sendResponse(exchange, 200, response);
        }
    }

    private class PlayersHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!validateApiKey(exchange)) {
                sendResponse(exchange, 401, "{\"error\":\"Unauthorized\"}");
                return;
            }

            if (!exchange.getRequestMethod().equals("GET")) {
                sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            // Get the list of known players directly from the PlayerListener
            Set<String> knownPlayers = plugin.getPlayerListener().getKnownPlayers();

            // Create the response JSON
            Map<String, Object> response = new HashMap<>();
            response.put("players", knownPlayers.stream()
                .map(username -> {
                    Map<String, String> player = new HashMap<>();
                    player.put("username", username);
                    return player;
                })
                .toList());

            String jsonResponse = gson.toJson(response);
            sendResponse(exchange, 200, jsonResponse);
        }
    }

    private class RankHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!validateApiKey(exchange)) {
                sendResponse(exchange, 401, "{\"error\":\"Unauthorized\"}");
                return;
            }

            String path = exchange.getRequestURI().getPath();
            String[] parts = path.split("/");
            if (parts.length < 4) {
                sendResponse(exchange, 400, "{\"error\":\"Invalid request\"}");
                return;
            }

            String username = parts[2].toLowerCase();
            String rankId = parts[3];

            boolean success = plugin.applyRankGlobally(username, rankId);
            String response = String.format("{\"success\":%b}", success);
            
            sendResponse(exchange, success ? 200 : 500, response);
        }
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(statusCode, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes());
        }
    }
} 