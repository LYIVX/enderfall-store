package com.mcstore.proxy;

import com.moandjiezana.toml.Toml;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

public class Config {
    private final WebsiteProxyPlugin plugin;
    private Toml config;

    public Config(WebsiteProxyPlugin plugin) {
        this.plugin = plugin;
        if (!loadConfig()) {
            plugin.getLogger().error("Failed to load configuration. Using default values.");
            setDefaultConfig();
        }
    }

    private void setDefaultConfig() {
        String defaultToml = """
            [api]
            port=8113
            key="your_secure_api_key_here"

            [servers.lobby]
            name="lobby"
            host="localhost"
            port=25565
            api_port=8113

            [servers.towny]
            name="towny"
            host="localhost"
            port=25566
            api_port=8114

            [ranks]
            towny_ranks=["citizen","merchant","councilor","mayor","governor","noble","duke","king","emperor","divine"]

            [ranks.towny_upgrades]
            citizen_to_merchant="merchant"
            merchant_to_councilor="councilor"
            councilor_to_mayor="mayor"
            mayor_to_governor="governor"
            governor_to_noble="noble"
            noble_to_duke="duke"
            duke_to_king="king"
            king_to_emperor="emperor"
            emperor_to_divine="divine"

            [settings]
            debug=false
            save_interval=300
            sync_interval=300""";
        
        try {
            // Create a temporary file with the default config
            Path tempFile = Files.createTempFile("default_config", ".toml");
            Files.writeString(tempFile, defaultToml);
            
            // Read the config from the temporary file
            this.config = new Toml().read(tempFile.toFile());
            
            // Clean up
            Files.delete(tempFile);
        } catch (IOException e) {
            plugin.getLogger().error("Failed to create default config", e);
            // Create an empty config as last resort
            this.config = new Toml();
        }
    }

    private boolean loadConfig() {
        Path dataDir = plugin.getDataDirectory();
        Path configPath = dataDir.resolve("config.toml");

        plugin.getLogger().info("Loading configuration from: " + configPath);

        // Create plugin directory if it doesn't exist
        try {
            Files.createDirectories(dataDir);
        } catch (IOException e) {
            plugin.getLogger().error("Failed to create plugin directory", e);
            return false;
        }

        // Create default config if it doesn't exist
        if (!Files.exists(configPath)) {
            try (InputStream in = getClass().getClassLoader().getResourceAsStream("config.toml")) {
                if (in != null) {
                    plugin.getLogger().info("Creating default configuration file");
                    Files.copy(in, configPath);
                } else {
                    plugin.getLogger().error("Default config.toml not found in resources");
                    return false;
                }
            } catch (IOException e) {
                plugin.getLogger().error("Failed to create default config", e);
                return false;
            }
        }

        // Load config
        try {
            this.config = new Toml().read(configPath.toFile());
            plugin.getLogger().info("Configuration loaded successfully");
            return true;
        } catch (Exception e) {
            plugin.getLogger().error("Failed to load config", e);
            return false;
        }
    }

    public int getApiPort() {
        return config.getLong("api.port", 8113L).intValue();
    }

    public String getApiKey() {
        return config.getString("api.key", "your_secure_api_key_here");
    }

    public List<String> getTownyRanks() {
        return config.getList("ranks.towny_ranks");
    }

    @SuppressWarnings("unchecked")
    public Map<String, String> getTownyUpgrades() {
        Map<String, Object> rawMap = config.getTable("ranks.towny_upgrades").toMap();
        Map<String, String> upgrades = new HashMap<>();
        
        for (Map.Entry<String, Object> entry : rawMap.entrySet()) {
            if (entry.getValue() instanceof String) {
                upgrades.put(entry.getKey(), (String) entry.getValue());
            }
        }
        
        return upgrades;
    }

    public boolean isDebugEnabled() {
        return config.getBoolean("settings.debug", false);
    }

    public int getSaveInterval() {
        return config.getLong("settings.save_interval", 300L).intValue();
    }

    public int getSyncInterval() {
        return config.getLong("settings.sync_interval", 300L).intValue();
    }

    public static class ServerConfig {
        private final String name;
        private final String host;
        private final int port;
        private final int apiPort;

        public ServerConfig(String name, String host, int port, int apiPort) {
            this.name = name;
            this.host = host;
            this.port = port;
            this.apiPort = apiPort;
        }

        public String getName() { return name; }
        public String getHost() { return host; }
        public int getPort() { return port; }
        public int getApiPort() { return apiPort; }
    }

    public ServerConfig getLobbyServer() {
        try {
            Toml serverConfig = config.getTable("servers.lobby");
            if (serverConfig == null) {
                plugin.getLogger().warn("Lobby server configuration not found");
                return null;
            }

            String name = serverConfig.getString("name", "lobby");
            String host = serverConfig.getString("host");
            if (host == null) {
                plugin.getLogger().error("Lobby server host not configured");
                return null;
            }

            long port = serverConfig.getLong("port", 25610L);
            long apiPort = serverConfig.getLong("api_port", 8090L);

            plugin.getLogger().debug("Loaded lobby server config: {}:{} (API port: {})", 
                host, port, apiPort);

            return new ServerConfig(name, host, (int)port, (int)apiPort);
        } catch (Exception e) {
            plugin.getLogger().error("Error loading lobby server config", e);
            return null;
        }
    }

    public ServerConfig getSurvivalServer() {
        try {
            Toml serverConfig = config.getTable("servers.survival");
            if (serverConfig == null) {
                plugin.getLogger().warn("Survival server configuration not found in config.toml");
                return null;
            }

            String name = serverConfig.getString("name", "survival");
            String host = serverConfig.getString("host");
            if (host == null) {
                plugin.getLogger().error("Survival server host not configured");
                return null;
            }

            long port = serverConfig.getLong("port", 25579L);
            long apiPort = serverConfig.getLong("api_port", 8137L);

            plugin.getLogger().debug("Loaded survival server config: {}:{} (API port: {})", 
                host, port, apiPort);

            return new ServerConfig(name, host, (int)port, (int)apiPort);
        } catch (Exception e) {
            plugin.getLogger().error("Error loading survival server config", e);
            return null;
        }
    }
} 