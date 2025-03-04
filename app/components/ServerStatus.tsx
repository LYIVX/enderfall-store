"use client";
import { useState, useEffect } from "react";

interface ServerStatusProps {
  serverIp: string;
}

interface ServerInfo {
  name: string;
  online: boolean;
  version?: string;
  players?: {
    online: number;
    max: number;
  };
}

interface ServerData {
  online: boolean;
  version?: string;
  players?: {
    online: number;
    max: number;
  };
  servers: ServerInfo[];
}

export default function ServerStatus({ serverIp }: ServerStatusProps) {
  const [serverData, setServerData] = useState<ServerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define gradient style for header
  const headerStyle = {
    background: "linear-gradient(to right, #3b82f6, #4f46e5, #7c3aed)",
    boxShadow: "0 4px 20px rgba(59, 130, 246, 0.5)",
  };

  useEffect(() => {
    const fetchServerStatus = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/server-status");
        const data = await response.json();

        if (data && typeof data.online !== "undefined") {
          setServerData(data);
        } else {
          setError("Could not fetch server status");
        }
      } catch (err) {
        setError("Failed to connect to server API");
      } finally {
        setLoading(false);
      }
    };

    fetchServerStatus();

    // Refresh server status every 60 seconds
    const intervalId = setInterval(fetchServerStatus, 60000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-lg shadow-lg h-full overflow-hidden">
        <div
          style={headerStyle}
          className="p-5 text-center rounded-t-lg relative overflow-hidden"
        >
          {/* Add a shine effect overlay */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 opacity-30 bg-white transform -skew-x-12 animate-shine"></div>
          </div>
          <h2 className="text-2xl font-bold text-white relative z-10 drop-shadow-md">
            Server Status
          </h2>
        </div>
        <div className="border-t-0 p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-[var(--text-color)]">
              Checking server status...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--card-bg)] rounded-lg shadow-lg overflow-hidden">
        <div
          style={headerStyle}
          className="p-5 text-center rounded-t-lg relative overflow-hidden"
        >
          {/* Add a shine effect overlay */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 opacity-30 bg-white transform -skew-x-12 animate-shine"></div>
          </div>
          <h2 className="text-2xl font-bold text-white relative z-10 drop-shadow-md">
            Server Status
          </h2>
        </div>
        <div className="border-t-0 p-8">
          <div className="space-y-4">
            <p className="text-red-500">✗ Error checking server</p>
            <p className="text-[var(--text-color)]">{error}</p>
            <p className="text-[var(--text-color)]">
              IP: <span className="font-mono text-cyan-400">{serverIp}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] rounded-lg shadow-lg overflow-hidden">
      <div
        style={headerStyle}
        className="p-5 text-center rounded-t-lg relative overflow-hidden"
      >
        {/* Add a shine effect overlay */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-white transform -skew-x-12 animate-shine"></div>
        </div>
        <h2 className="text-2xl font-bold text-white relative z-10 drop-shadow-md">
          Server Status
        </h2>
      </div>
      <div className="border-t-0 p-8">
        <div className="space-y-6">
          {/* Overall Status */}
          <div className="space-y-4">
            {serverData?.online ? (
              <p className="text-green-500 text-lg font-semibold">
                ✓ Network is online
              </p>
            ) : (
              <p className="text-red-500 text-lg font-semibold">
                ✗ Network is offline
              </p>
            )}
            <p className="text-[var(--text-color)] text-lg">
              IP: <span className="font-mono text-cyan-400">{serverIp}</span>
            </p>
            {serverData?.players && (
              <p className="text-[var(--text-color)] text-lg">
                Total Players:{" "}
                <span className="text-emerald-400">
                  {serverData.players.online}/{serverData.players.max}
                </span>
              </p>
            )}
          </div>

          {/* Individual Server Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-color)]">
              Server Status:
            </h3>
            <div className="grid gap-4">
              {serverData?.servers.map((server) => (
                <div
                  key={server.name}
                  className="bg-[var(--card-bg-secondary)] p-4 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-color)] font-medium">
                      {server.name}
                    </span>
                    {server.online ? (
                      <span className="text-green-500">✓ Online</span>
                    ) : (
                      <span className="text-red-500">✗ Offline</span>
                    )}
                  </div>
                  {server.online && server.players && (
                    <p className="text-[var(--text-color)] text-sm mt-2">
                      Players:{" "}
                      <span className="text-emerald-400">
                        {server.players.online}/{server.players.max}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
