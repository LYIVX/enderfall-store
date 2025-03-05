interface ServerConfig {
  name: string;
  ip: string;
  port: number;
  apiPort: number;
  apiUrl: string;
}

interface ServerConfiguration {
  proxy: ServerConfig;
  lobby: ServerConfig;
  survival: ServerConfig;
}

/**
 * Gets the server configuration based on environment variables
 */
export function getServerConfig(): ServerConfiguration {
  const env = process.env.NODE_ENV || "development";
  const isTest = env === "test";
  const isDev = env === "development";
  const useLocalServers =
    isTest || (isDev && process.env.USE_LOCAL_SERVERS === "true");

  // Base configuration using proxy IP and ports
  const proxyIp = useLocalServers
    ? "localhost"
    : process.env.MINECRAFT_PROXY_IP || "localhost";
  const proxyPort = parseInt(process.env.MINECRAFT_PROXY_PORT || "25674");
  const proxyApiPort = parseInt(process.env.MINECRAFT_PROXY_API_PORT || "8113");

  const getApiUrl = (ip: string, apiPort: number) =>
    useLocalServers ? `http://localhost:${apiPort}` : `http://${ip}:${apiPort}`;

  return {
    proxy: {
      name: "Proxy",
      ip: proxyIp,
      port: proxyPort,
      apiPort: proxyApiPort,
      apiUrl: getApiUrl(proxyIp, proxyApiPort),
    },
    lobby: {
      name: "Lobby",
      ip: useLocalServers
        ? "localhost"
        : process.env.MINECRAFT_LOBBY_IP || proxyIp,
      port: parseInt(process.env.MINECRAFT_LOBBY_PORT || "25610"),
      apiPort: parseInt(process.env.MINECRAFT_LOBBY_API_PORT || "8090"),
      apiUrl: getApiUrl(
        useLocalServers
          ? "localhost"
          : process.env.MINECRAFT_LOBBY_IP || proxyIp,
        parseInt(process.env.MINECRAFT_LOBBY_API_PORT || "8090")
      ),
    },
    survival: {
      name: "Survival",
      ip: useLocalServers
        ? "localhost"
        : process.env.MINECRAFT_SURVIVAL_IP || proxyIp,
      port: parseInt(process.env.MINECRAFT_SURVIVAL_PORT || "25579"),
      apiPort: parseInt(process.env.MINECRAFT_SURVIVAL_API_PORT || "8137"),
      apiUrl: getApiUrl(
        useLocalServers
          ? "localhost"
          : process.env.MINECRAFT_SURVIVAL_IP || proxyIp,
        parseInt(process.env.MINECRAFT_SURVIVAL_API_PORT || "8137")
      ),
    },
  };
}

/**
 * Logs the current server configuration for debugging
 */
export function logServerConfiguration() {
  const config = getServerConfig();
  console.log("Server configuration loaded:", {
    proxy: {
      ip: config.proxy.ip,
      port: config.proxy.port,
      apiPort: config.proxy.apiPort,
      hasIp: !!process.env.MINECRAFT_PROXY_IP,
      hasPort: !!process.env.MINECRAFT_PROXY_PORT,
      hasApiPort: !!process.env.MINECRAFT_PROXY_API_PORT,
    },
    lobby: {
      ip: config.lobby.ip,
      port: config.lobby.port,
      apiPort: config.lobby.apiPort,
      hasIp: !!process.env.MINECRAFT_LOBBY_IP,
      hasPort: !!process.env.MINECRAFT_LOBBY_PORT,
      hasApiPort: !!process.env.MINECRAFT_LOBBY_API_PORT,
    },
    survival: {
      ip: config.survival.ip,
      port: config.survival.port,
      apiPort: config.survival.apiPort,
      hasIp: !!process.env.MINECRAFT_SURVIVAL_IP,
      hasPort: !!process.env.MINECRAFT_SURVIVAL_PORT,
      hasApiPort: !!process.env.MINECRAFT_SURVIVAL_API_PORT,
    },
  });
}
