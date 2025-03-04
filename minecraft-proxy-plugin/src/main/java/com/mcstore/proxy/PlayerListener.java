package com.mcstore.proxy;

import com.velocitypowered.api.event.Subscribe;
import com.velocitypowered.api.event.connection.PostLoginEvent;
import com.velocitypowered.api.event.player.ServerConnectedEvent;
import org.slf4j.Logger;

public class PlayerListener {
    private final WebsiteProxyPlugin plugin;
    private final Logger logger;

    public PlayerListener(WebsiteProxyPlugin plugin) {
        this.plugin = plugin;
        this.logger = plugin.getLogger();
    }

    @Subscribe
    public void onPlayerJoin(PostLoginEvent event) {
        String playerName = event.getPlayer().getUsername();
        logger.info("Player {} has joined the proxy", playerName);
    }

    @Subscribe
    public void onServerConnected(ServerConnectedEvent event) {
        String playerName = event.getPlayer().getUsername();
        String serverName = event.getServer().getServerInfo().getName();
        logger.info("Player {} has connected to server {}", playerName, serverName);

        // Sync ranks when player connects to a server
        plugin.syncRanksAcrossServers(playerName);
    }
} 