package com.mcstore.proxy;

import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.connection.PostLoginEvent;
import com.velocitypowered.api.event.player.ServerConnectedEvent;
import org.slf4j.Logger;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

import java.io.*;
import java.nio.file.*;
import java.util.*;

public class PlayerListener {
    private final WebsiteProxyPlugin plugin;
    private final Logger logger;
    private final Path usersFile;
    private final Set<String> knownPlayers;
    private final Gson gson;

    public PlayerListener(WebsiteProxyPlugin plugin) {
        this.plugin = plugin;
        this.logger = plugin.getLogger();
        this.usersFile = plugin.getDataDirectory().resolve("users.json");
        this.knownPlayers = Collections.synchronizedSet(new HashSet<>());
        this.gson = new GsonBuilder().setPrettyPrinting().create();
        
        // Load existing users
        loadUsers();
    }

    private void loadUsers() {
        try {
            if (Files.exists(usersFile)) {
                String content = Files.readString(usersFile);
                Map<String, Object> data = gson.fromJson(content, new TypeToken<Map<String, Object>>(){}.getType());
                if (data != null && data.containsKey("players")) {
                    List<?> players = (List<?>) data.get("players");
                    players.forEach(player -> {
                        if (player instanceof Map) {
                            String username = (String) ((Map<?, ?>) player).get("username");
                            if (username != null) {
                                knownPlayers.add(username.toLowerCase());
                            }
                        }
                    });
                }
                logger.info("Loaded {} known players from users.json", knownPlayers.size());
            }
        } catch (Exception e) {
            logger.error("Failed to load users file", e);
        }
    }

    private void saveUsers() {
        try {
            // Create parent directories if they don't exist
            Files.createDirectories(usersFile.getParent());

            // Create the JSON structure
            Map<String, Object> data = new HashMap<>();
            List<Map<String, String>> players = new ArrayList<>();
            
            synchronized (knownPlayers) {
                for (String username : knownPlayers) {
                    Map<String, String> player = new HashMap<>();
                    player.put("username", username);
                    players.add(player);
                }
            }
            
            data.put("players", players);

            // Write to file
            String json = gson.toJson(data);
            Files.writeString(usersFile, json, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        } catch (Exception e) {
            logger.error("Failed to save users file", e);
        }
    }

    @Subscribe
    public void onPlayerJoin(PostLoginEvent event) {
        String playerName = event.getPlayer().getUsername();
        logger.info("Player {} has joined the proxy", playerName);

        // Add to known players if not already present
        if (knownPlayers.add(playerName.toLowerCase())) {
            logger.info("Added {} to known players list", playerName);
            saveUsers();
        }
    }

    @Subscribe
    public void onServerConnected(ServerConnectedEvent event) {
        String playerName = event.getPlayer().getUsername();
        String serverName = event.getServer().getServerInfo().getName();
        logger.info("Player {} has connected to server {}", playerName, serverName);

        // Sync ranks when player connects to a server
        plugin.syncRanksAcrossServers(playerName);
    }

    public Set<String> getKnownPlayers() {
        return Collections.unmodifiableSet(knownPlayers);
    }
} 