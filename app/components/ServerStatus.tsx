"use client";
import { useState, useEffect } from "react";

interface ServerStatusProps {
  serverIp: string;
}

interface ServerData {
  online: boolean;
  version?: string;
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
        // Using https://api.mcsrvstat.us/ to get server status
        const response = await fetch(`https://api.mcsrvstat.us/2/${serverIp}`);
        const data = await response.json();

        if (data && data.online !== undefined) {
          setServerData({
            online: data.online,
            version: data.version,
          });
        } else {
          setError("Could not fetch server status");
        }
      } catch (err) {
        setError("Failed to connect to server status API");
      } finally {
        setLoading(false);
      }
    };

    fetchServerStatus();

    // Refresh server status every 60 seconds
    const intervalId = setInterval(fetchServerStatus, 60000);

    return () => clearInterval(intervalId);
  }, [serverIp]);

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
        <div className="space-y-4">
          {serverData?.online ? (
            <p className="text-green-500 text-lg font-semibold">
              ✓ Server is online
            </p>
          ) : (
            <p className="text-red-500 text-lg font-semibold">
              ✗ Server is offline
            </p>
          )}
          <p className="text-[var(--text-color)] text-lg">
            IP: <span className="font-mono text-cyan-400">{serverIp}</span>
          </p>
          {serverData?.online && serverData.version && (
            <p className="text-[var(--text-color)] text-lg">
              Version:{" "}
              <span className="text-purple-400">{serverData.version}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
