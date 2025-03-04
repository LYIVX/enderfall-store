package com.mcstore.proxy;

import com.google.inject.Inject;
import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.proxy.ProxyInitializeEvent;
import com.velocitypowered.api.plugin.Plugin;
import com.velocitypowered.api.plugin.annotation.DataDirectory;
import com.velocitypowered.api.proxy.ProxyServer;
import com.velocitypowered.api.proxy.server.RegisteredServer;
import com.velocitypowered.api.proxy.server.ServerPing;
import org.slf4j.Logger;

import java.nio.file.Path;
import java.util.concurrent.ExecutionException;

@Plugin(
    id = "websiteplugin",
    name = "WebsitePlugin",
    version = "1.0-SNAPSHOT",
    description = "EnderFall website integration plugin for Velocity",
    authors = {"MCStore"}
)
public class WebsiteProxyPlugin {
    private final ProxyServer server;
    private final Logger logger;
    private final Path dataDirectory;
    private Config config;
    private RankManager rankManager;
    private ApiServer apiServer;

    @Inject
    public WebsiteProxyPlugin(ProxyServer server, Logger logger, @DataDirectory Path dataDirectory) {
        this.server = server;
        this.logger = logger;
        this.dataDirectory = dataDirectory;
    }

    @Subscribe
    public void onProxyInitialization(ProxyInitializeEvent event) {
        // Load config
        this.config = new Config(this);
        
        // Initialize managers
        this.rankManager = new RankManager(this);
        this.apiServer = new ApiServer(this);
        
        // Start API server
        this.apiServer.start();
        
        // Register event listener
        server.getEventManager().register(this, new PlayerListener(this));
        
        logger.info("WebsitePlugin has been enabled!");
    }

    public void onDisable() {
        if (apiServer != null) {
            apiServer.stop();
        }
        logger.info("WebsitePlugin has been disabled!");
    }

    public ProxyServer getServer() {
        return server;
    }

    public Logger getLogger() {
        return logger;
    }

    public Config getConfig() {
        return config;
    }

    public RankManager getRankManager() {
        return rankManager;
    }

    public Path getDataDirectory() {
        return dataDirectory;
    }

    public void syncRanksAcrossServers(String playerName) {
        server.getAllServers().forEach(registeredServer -> {
            try {
                ServerPing ping = registeredServer.ping().get();
                if (ping != null) {
                    // Server is online, sync ranks
                    rankManager.syncPlayerRanks(playerName, registeredServer);
                }
            } catch (InterruptedException | ExecutionException e) {
                logger.warn("Failed to ping server {}: {}", 
                    registeredServer.getServerInfo().getName(), e.getMessage());
            }
        });
    }

    public boolean applyRankGlobally(String username, String rankId) {
        boolean success = true;
        boolean isTownyRank = config.getTownyRanks().contains(rankId) || 
                            config.getTownyUpgrades().containsKey(rankId);

        for (RegisteredServer server : server.getAllServers()) {
            String serverName = server.getServerInfo().getName().toLowerCase();
            
            // If it's a Towny rank, only apply to Towny server
            if (isTownyRank) {
                if (serverName.contains("towny")) {
                    if (!rankManager.applyRankToServer(server, username, rankId)) {
                        success = false;
                        logger.error("Failed to apply Towny rank {} to player {} on server {}", 
                            rankId, username, serverName);
                    }
                }
            } else {
                // For non-Towny ranks, apply to all servers
                if (!rankManager.applyRankToServer(server, username, rankId)) {
                    success = false;
                    logger.error("Failed to apply rank {} to player {} on server {}", 
                        rankId, username, serverName);
                }
            }
        }
        return success;
    }
} 