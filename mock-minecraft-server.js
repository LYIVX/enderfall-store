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
          console.log("ERROR: Missing username or rank in request");
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing username or rank" }));
          return;
        }

        // Check if the authorization header is correct
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== "Bearer test_minecraft_key_123") {
          console.log(
            "ERROR: Authorization failed. Expected 'Bearer test_minecraft_key_123', got:",
            authHeader
          );
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }

        // Simulate successful rank application
        const rankId = data.rankId || data.rank;
        console.log(
          `SUCCESS: Applying rank ${rankId} for user ${data.username}`
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            message: "Rank applied successfully",
            details: {
              username: data.username,
              rankId: rankId,
              server: data.server || "mock-server",
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
    console.log(`ERROR: Endpoint not found: ${req.url}`);
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

// Start three servers to simulate main, lobby and towny
const MAIN_PORT = 8113;
const LOBBY_PORT = 8090;
const SURVIVAL_PORT = 8137;

// Clone the server for each port
const mainServer = http.createServer(server.listeners("request")[0]);
const lobbyServer = http.createServer(server.listeners("request")[0]);
const survivalServer = http.createServer(server.listeners("request")[0]);

mainServer.listen(MAIN_PORT, () => {
  console.log(`Mock Main server running at http://localhost:${MAIN_PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /api/apply-rank - Apply a rank for a user`);
});

lobbyServer.listen(LOBBY_PORT, () => {
  console.log(`Mock Lobby server running at http://localhost:${LOBBY_PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /api/apply-rank - Apply a rank for a user`);
});

survivalServer.listen(SURVIVAL_PORT, () => {
  console.log(
    `Mock Survival server running at http://localhost:${SURVIVAL_PORT}`
  );
  console.log(`Endpoints:`);
  console.log(`  POST /api/apply-rank - Apply a rank for a user`);
});
