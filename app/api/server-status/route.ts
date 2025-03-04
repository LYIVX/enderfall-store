import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // No caching

interface ServerConfig {
  name: string;
  ip: string;
  port: number;
  apiPort: number;
}

const servers: ServerConfig[] = [
  {
    name: "Lobby",
    ip: process.env.MINECRAFT_LOBBY_IP || "",
    port: parseInt(process.env.MINECRAFT_LOBBY_PORT || "25610"),
    apiPort: parseInt(process.env.MINECRAFT_LOBBY_API_PORT || "8081"),
  },
  {
    name: "Towny",
    ip: process.env.MINECRAFT_TOWNY_IP || "",
    port: parseInt(process.env.MINECRAFT_TOWNY_PORT || "25579"),
    apiPort: parseInt(process.env.MINECRAFT_TOWNY_API_PORT || "8082"),
  },
];

async function checkServerStatus(server: ServerConfig) {
  try {
    const apiUrl = `http://${server.ip}:${server.apiPort}/status`;
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${process.env.MINECRAFT_SERVER_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Server ${server.name} returned ${response.status}`);
    }

    const data = await response.json();
    return {
      name: server.name,
      online: data.online ?? false,
      version: data.version,
      players: {
        online: data.players?.online ?? 0,
        max: data.players?.max ?? 0,
      },
    };
  } catch (error) {
    console.error(`Failed to fetch ${server.name} status:`, error);
    return {
      name: server.name,
      online: false,
      players: { online: 0, max: 0 },
    };
  }
}

export async function GET() {
  try {
    // Check all servers in parallel
    const serverStatuses = await Promise.all(
      servers.map((server) => checkServerStatus(server))
    );

    // Calculate total players across all servers
    const totalPlayers = serverStatuses.reduce(
      (acc, server) => acc + (server.players?.online || 0),
      0
    );

    const maxPlayers = serverStatuses.reduce(
      (acc, server) => acc + (server.players?.max || 0),
      0
    );

    return NextResponse.json({
      online: serverStatuses.some((server) => server.online),
      version: serverStatuses.find((s) => s.version)?.version,
      players: {
        online: totalPlayers,
        max: maxPlayers,
      },
      servers: serverStatuses,
    });
  } catch (error) {
    console.error("Failed to fetch server statuses:", error);
    return NextResponse.json(
      {
        online: false,
        error: "Failed to fetch server status",
      },
      { status: 500 }
    );
  }
}
