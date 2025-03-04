package com.mcstore.proxy;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import org.slf4j.Logger;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;

public class ApiServer {
    private final WebsiteProxyPlugin plugin;
    private HttpServer server;
    private final int port;
    private final String apiKey;

    public ApiServer(WebsiteProxyPlugin plugin) {
        this.plugin = plugin;
        // Get port from config or use default
        this.port = Integer.parseInt(System.getProperty("api.port", "8113"));
        this.apiKey = System.getProperty("api.key", "your_api_key_here");
    }

    public void start() {
        try {
            server = HttpServer.create(new InetSocketAddress(port), 0);
            server.setExecutor(Executors.newFixedThreadPool(10));

            // Register endpoints
            server.createContext("/player/", new PlayerHandler());
            server.createContext("/rank/", new RankHandler());

            server.start();
            plugin.getLogger().info("API server started on port {}", port);
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

            // Check if player exists (has joined the network)
            boolean exists = plugin.getServer().getPlayer(username).isPresent();
            String response = String.format("{\"exists\":%b,\"username\":\"%s\"}", exists, username);
            
            sendResponse(exchange, 200, response);
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