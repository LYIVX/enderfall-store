const http = require("http");

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  console.log(`Received request: ${req.method} ${req.url}`);

  // Log headers
  console.log("Headers:");
  Object.entries(req.headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  // Handle different endpoints
  if (req.url === "/api/apply-rank" && req.method === "POST") {
    // Read the request body
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      console.log("Request body:", body);

      try {
        const data = JSON.parse(body);
        console.log("Parsed data:", data);

        // Check if the request has the required fields
        if (!data.username || !(data.rankId || data.rank)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing username or rank" }));
          return;
        }

        // Check if the authorization header is correct
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== "Bearer test_minecraft_key_123") {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }

        // Simulate successful rank application
        const rankId = data.rankId || data.rank;
        console.log(`Applying rank ${rankId} for user ${data.username}`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            message: "Rank applied successfully",
            details: {
              username: data.username,
              rankId: rankId,
              server: "mock-server",
            },
          })
        );
      } catch (error) {
        console.error("Error parsing request body:", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  } else {
    // Handle unknown endpoints
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

// Start two servers to simulate lobby and towny
const LOBBY_PORT = 8090;
const TOWNY_PORT = 8137;

// Clone the server for each port
const lobbyServer = http.createServer(server.listeners("request")[0]);
const townyServer = http.createServer(server.listeners("request")[0]);

lobbyServer.listen(LOBBY_PORT, () => {
  console.log(`Mock Lobby server running at http://localhost:${LOBBY_PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /api/apply-rank - Apply a rank for a user`);
});

townyServer.listen(TOWNY_PORT, () => {
  console.log(`Mock Towny server running at http://localhost:${TOWNY_PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /api/apply-rank - Apply a rank for a user`);
});
