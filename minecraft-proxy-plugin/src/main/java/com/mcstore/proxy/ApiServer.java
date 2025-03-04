package com.mcstore.proxy;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.slf4j.Logger;

import java.io.IOException;
import java.io.OutputStream;
import java.io.InputStreamReader;
import java.io.BufferedReader;
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
    private final Logger logger;

    public ApiServer(WebsiteProxyPlugin plugin) {
        this.plugin = plugin;
        this.port = plugin.getConfig().getApiPort();
        this.apiKey = plugin.getConfig().getApiKey();
        this.gson = new GsonBuilder().setPrettyPrinting().create();
        this.logger = plugin.getLogger();
    }

    public void start() {
        try {
            server = HttpServer.create(new InetSocketAddress(port), 0);
            server.createContext("/api/player", new PlayerHandler());
            server.createContext("/api/players", new PlayersHandler());
            server.createContext("/api/apply-rank", new ApplyRankHandler());
            server.createContext("/api/status", new StatusHandler());
            server.setExecutor(null);
            server.start();
            logger.info("API Server started on port {}", port);
            logger.info("API Key configured: {}", apiKey);
        } catch (IOException e) {
            logger.error("Failed to start API server", e);
        }
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
            logger.info("API server stopped");
        }
    }

    private boolean validateApiKey(HttpExchange exchange) {
        String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
        logger.debug("Received Authorization header: {}", authHeader);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            logger.warn("Invalid or missing Authorization header");
            return false;
        }
        String providedKey = authHeader.substring(7); // Remove "Bearer " prefix
        boolean isValid = apiKey.equals(providedKey);
        if (!isValid) {
            logger.warn("Invalid API key provided. Expected: {}, Got: {}", apiKey, providedKey);
        }
        return isValid;
    }

    private class PlayerHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            logger.debug("Received request to /api/player endpoint. Method: {}", exchange.getRequestMethod());
            
            if (!validateApiKey(exchange)) {
                sendResponse(exchange, 401, "{\"error\":\"Unauthorized\"}");
                return;
            }

            String path = exchange.getRequestURI().getPath();
            String username = path.substring(path.lastIndexOf('/') + 1).toLowerCase();
            logger.debug("Checking existence for username: {}", username);

            // Check if player exists (either online or in known players list)
            boolean exists = plugin.getServer().getPlayer(username).isPresent() ||
                           plugin.getPlayerListener().getKnownPlayers().contains(username);
            String response = String.format("{\"exists\":%b,\"username\":\"%s\"}", exists, username);
            
            logger.debug("Player check response: {}", response);
            sendResponse(exchange, 200, response);
        }
    }

    private class PlayersHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            logger.debug("Received request to /api/players endpoint. Method: {}", exchange.getRequestMethod());
            
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
            logger.debug("Found {} known players", knownPlayers.size());

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
            logger.debug("Players response: {}", jsonResponse);
            sendResponse(exchange, 200, jsonResponse);
        }
    }

    private class ApplyRankHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            logger.debug("Received request to /api/apply-rank endpoint. Method: {}", exchange.getRequestMethod());
            
            if (!validateApiKey(exchange)) {
                sendResponse(exchange, 401, "{\"error\":\"Unauthorized\"}");
                return;
            }

            if (!exchange.getRequestMethod().equals("POST")) {
                sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            // Read the request body
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(exchange.getRequestBody()))) {
                StringBuilder body = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    body.append(line);
                }
                
                String requestBody = body.toString();
                logger.debug("Received apply-rank request body: {}", requestBody);

                // Parse the JSON request
                Map<String, String> request = gson.fromJson(requestBody, Map.class);
                String username = request.get("username");
                
                // Fix: Check for both "rankId" and "rank" fields to be more flexible
                String rankId = request.get("rankId");
                if (rankId == null) {
                    rankId = request.get("rank"); // Try the alternate field name
                }

                logger.debug("Applying rank. Username: {}, Rank: {}", username, rankId);

                if (username == null || rankId == null) {
                    String errorMsg = "{\"error\":\"Missing username or rank\"}";
                    logger.warn("Invalid request: {}", errorMsg);
                    sendResponse(exchange, 400, errorMsg);
                    return;
                }

                boolean success = plugin.applyRankGlobally(username.toLowerCase(), rankId);
                String response = String.format("{\"success\":%b}", success);
                
                logger.debug("Apply rank response: {}", response);
                sendResponse(exchange, success ? 200 : 500, response);
            } catch (Exception e) {
                logger.error("Error processing apply-rank request", e);
                sendResponse(exchange, 500, "{\"error\":\"Internal server error: " + e.getMessage() + "\"}");
            }
        }
    }

    private class StatusHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            logger.debug("Received request to /api/status endpoint. Method: {}", exchange.getRequestMethod());
            
            if (!validateApiKey(exchange)) {
                sendResponse(exchange, 401, "{\"error\":\"Unauthorized\"}");
                return;
            }

            if (!exchange.getRequestMethod().equals("GET")) {
                sendResponse(exchange, 405, "{\"error\":\"Method not allowed\"}");
                return;
            }

            try {
                // Get server status information
                Map<String, Object> status = new HashMap<>();
                status.put("online", true);
                status.put("version", plugin.getServer().getVersion());
                status.put("players", plugin.getServer().getPlayerCount());
                status.put("maxPlayers", plugin.getServer().getConfiguration().getShowMaxPlayers());

                String response = gson.toJson(status);
                logger.debug("Status response: {}", response);
                sendResponse(exchange, 200, response);
            } catch (Exception e) {
                logger.error("Error getting server status", e);
                sendResponse(exchange, 500, "{\"error\":\"Internal server error: " + e.getMessage() + "\"}");
            }
        }
    }

    private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
        logger.debug("Sending response. Status: {}, Body: {}", statusCode, response);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        
        if (exchange.getRequestMethod().equals("OPTIONS")) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        exchange.sendResponseHeaders(statusCode, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes());
        }
        logger.debug("Response sent successfully");
    }
} 