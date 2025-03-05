const fetch = require("node-fetch");
require("dotenv").config();

async function debugProductionEnvironment() {
  console.log("========== PRODUCTION DEBUGGING TOOL ==========");
  console.log(
    "This tool helps diagnose issues with rank application in production"
  );

  // Step 1: Check environment variables
  console.log("\n----- ENVIRONMENT VARIABLES CHECK -----");
  const requiredVars = [
    "MINECRAFT_SERVER_API_URL",
    "MINECRAFT_SERVER_API_KEY",
    "MINECRAFT_SURVIVAL_IP",
    "MINECRAFT_SURVIVAL_API_PORT",
    "MINECRAFT_LOBBY_IP",
    "MINECRAFT_LOBBY_API_PORT",
    "STRIPE_WEBHOOK_SECRET",
  ];

  let missingVars = false;
  requiredVars.forEach((varName) => {
    const value = process.env[varName];
    const valuePreview = value
      ? `${value.substring(0, 10)}... (length: ${value.length})`
      : "NOT SET";
    console.log(`${varName}: ${valuePreview}`);
    if (!value) {
      missingVars = true;
      console.log(`⚠️ MISSING: ${varName} is not set!`);
    }
  });

  if (missingVars) {
    console.log(
      "❌ Some required environment variables are missing in production"
    );
  } else {
    console.log("✅ All required environment variables are set");
  }

  // Step 2: Test connectivity to Minecraft servers
  console.log("\n----- MINECRAFT SERVER CONNECTIVITY CHECK -----");

  const servers = [
    {
      name: "SURVIVAL",
      ip: process.env.MINECRAFT_SURVIVAL_IP || "185.206.148.170",
      port: process.env.MINECRAFT_SURVIVAL_API_PORT || "8137",
    },
    {
      name: "LOBBY",
      ip: process.env.MINECRAFT_LOBBY_IP || "194.164.96.27",
      port: process.env.MINECRAFT_LOBBY_API_PORT || "8090",
    },
  ];

  for (const server of servers) {
    console.log(
      `Testing connection to ${server.name} server at ${server.ip}:${server.port}...`
    );
    const url = `http://${server.ip}:${server.port}/api/status`;

    try {
      const response = await fetch(url, {
        method: "GET",
        timeout: 5000,
      });

      if (response.ok) {
        console.log(`✅ Successfully connected to ${server.name} server!`);
        try {
          const data = await response.json();
          console.log(`Server response: ${JSON.stringify(data)}`);
        } catch (e) {
          console.log(`Response not JSON: ${await response.text()}`);
        }
      } else {
        console.log(
          `❌ Failed to connect to ${server.name} server: HTTP ${response.status}`
        );
      }
    } catch (error) {
      console.log(
        `❌ Error connecting to ${server.name} server: ${error.message}`
      );
      console.log(
        "This could indicate a firewall issue, network problem, or the server is down"
      );
    }
  }

  // Step 3: Test rank application
  console.log("\n----- RANK APPLICATION TEST -----");

  // We'll use a test username and rank here
  const testUsername = "DEBUG_TEST_USER";
  const testRankId = "shadow_enchanter";

  console.log(
    `Testing direct rank application for user: ${testUsername}, rank: ${testRankId}`
  );

  // First try the main API URL from environment variables
  const mainApiUrl = process.env.MINECRAFT_SERVER_API_URL;
  if (mainApiUrl) {
    console.log(`Testing rank application via main API URL: ${mainApiUrl}`);
    await testRankApiEndpoint(
      `${mainApiUrl}/api/apply-rank`,
      testUsername,
      testRankId
    );
  }

  // Then try each server directly
  for (const server of servers) {
    const apiUrl = `http://${server.ip}:${server.port}/api/apply-rank`;
    console.log(`Testing rank application to ${server.name} server: ${apiUrl}`);
    await testRankApiEndpoint(apiUrl, testUsername, testRankId);
  }

  console.log("\n----- WEBHOOK PROCESSING CHECK -----");
  console.log(
    "For webhook processing, check your server logs when a purchase is made"
  );
  console.log("The webhook logs should show processing steps and any errors");

  console.log("\n----- SUMMARY AND RECOMMENDATIONS -----");
  console.log("If connectivity to the Minecraft servers failed:");
  console.log(
    "1. Ensure firewalls allow outbound connections from your web server to the Minecraft servers"
  );
  console.log("2. Check if the Minecraft server IPs or ports have changed");
  console.log(
    "3. Verify the Minecraft plugin is installed and running correctly"
  );
  console.log("\nIf API authentication failed:");
  console.log(
    "1. Ensure the MINECRAFT_SERVER_API_KEY in production matches the key in the Minecraft plugin"
  );
  console.log(
    "2. Check the API request format in the logs to ensure it matches what the plugin expects"
  );

  console.log("\n========== END OF DEBUGGING ==========");
}

async function testRankApiEndpoint(apiUrl, username, rankId) {
  const apiKey =
    process.env.MINECRAFT_SERVER_API_KEY || "test_minecraft_key_123";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        username,
        rankId,
        rank: rankId, // Include both for backward compatibility
        server: "survival",
      }),
      timeout: 5000,
    });

    console.log(`Response status: ${response.status}`);

    const responseText = await response.text();

    try {
      const responseData = JSON.parse(responseText);
      console.log("Response data:", JSON.stringify(responseData, null, 2));
      if (response.ok) {
        console.log("✅ API request successful!");
      } else {
        console.log("❌ API request failed with error!");
      }
    } catch (e) {
      console.log("Raw response (not JSON):", responseText);
      console.log("❌ API response not in JSON format!");
    }
  } catch (error) {
    console.log(`❌ Error making API request: ${error.message}`);
  }
}

debugProductionEnvironment();
