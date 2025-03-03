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
  if (req.url === "/activate-rank" && req.method === "POST") {
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
        if (!data.userId || !data.rankId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing userId or rankId" }));
          return;
        }

        // Check if the authorization header is correct
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== "Bearer test_minecraft_key_123") {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }

        // Simulate successful rank activation
        console.log(`Activating rank ${data.rankId} for user ${data.userId}`);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            message: "Rank activated successfully",
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

// Start the server
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Mock Minecraft server running at http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  POST /activate-rank - Activate a rank for a user`);
});
