require("dotenv").config();
const fs = require("fs");
const path = require("path");

async function auditEnvFile() {
  console.log("========== ENV FILE AUDIT TOOL ==========");
  console.log("This tool will check your .env file for configuration issues");

  // Check if .env file exists
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found!");
    return;
  }

  // Read .env file
  const envContent = fs.readFileSync(envPath, "utf8");
  const envLines = envContent.split("\n");

  // Define required variables for rank application
  const requiredVars = [
    "MINECRAFT_SERVER_API_URL",
    "MINECRAFT_SERVER_API_KEY",
    "MINECRAFT_PROXY_IP",
    "MINECRAFT_PROXY_PORT",
    "MINECRAFT_PROXY_API_PORT",
    "MINECRAFT_LOBBY_IP",
    "MINECRAFT_LOBBY_PORT",
    "MINECRAFT_LOBBY_API_PORT",
    "MINECRAFT_SURVIVAL_IP",
    "MINECRAFT_SURVIVAL_PORT",
    "MINECRAFT_SURVIVAL_API_PORT",
  ];

  // Check for missing variables
  const missingVars = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  if (missingVars.length > 0) {
    console.log("❌ Missing environment variables:");
    missingVars.forEach((varName) => console.log(`  - ${varName}`));
  } else {
    console.log("✅ All required environment variables are present");
  }

  // Check for incorrect URLs
  if (
    process.env.MINECRAFT_SERVER_API_URL &&
    !process.env.MINECRAFT_SERVER_API_URL.startsWith("http")
  ) {
    console.log(
      "❌ MINECRAFT_SERVER_API_URL does not start with http:// or https://"
    );
    console.log(`  Current value: ${process.env.MINECRAFT_SERVER_API_URL}`);
    console.log(
      `  Recommended value: http://${process.env.MINECRAFT_PROXY_IP}:${process.env.MINECRAFT_PROXY_API_PORT}`
    );
  }

  // Check for inconsistencies
  if (
    process.env.MINECRAFT_SERVER_API_URL &&
    process.env.MINECRAFT_PROXY_IP &&
    process.env.MINECRAFT_PROXY_API_PORT
  ) {
    const expectedUrl = `http://${process.env.MINECRAFT_PROXY_IP}:${process.env.MINECRAFT_PROXY_API_PORT}`;
    if (process.env.MINECRAFT_SERVER_API_URL !== expectedUrl) {
      console.log(
        "⚠️ MINECRAFT_SERVER_API_URL does not match MINECRAFT_PROXY_IP and MINECRAFT_PROXY_API_PORT"
      );
      console.log(`  Current value: ${process.env.MINECRAFT_SERVER_API_URL}`);
      console.log(`  Expected value: ${expectedUrl}`);
    }
  }

  // Check API key format
  if (process.env.MINECRAFT_SERVER_API_KEY) {
    if (
      process.env.MINECRAFT_SERVER_API_KEY.includes(" ") ||
      process.env.MINECRAFT_SERVER_API_KEY.includes("\n") ||
      process.env.MINECRAFT_SERVER_API_KEY.includes("\r")
    ) {
      console.log("❌ MINECRAFT_SERVER_API_KEY contains whitespace characters");
      console.log(
        `  Current value length: ${process.env.MINECRAFT_SERVER_API_KEY.length}`
      );
    }
  }

  // Generate fixed .env file if needed
  if (
    missingVars.length > 0 ||
    (process.env.MINECRAFT_SERVER_API_URL &&
      !process.env.MINECRAFT_SERVER_API_URL.startsWith("http"))
  ) {
    console.log("\n----- GENERATING FIXED ENV FILE -----");

    // Create a map of current values
    const currentValues = {};
    envLines.forEach((line) => {
      if (line.trim() && !line.startsWith("#")) {
        const parts = line.split("=");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join("=").trim();
          currentValues[key] = value;
        }
      }
    });

    // Ensure we have default values for missing variables
    if (!currentValues["MINECRAFT_PROXY_IP"])
      currentValues["MINECRAFT_PROXY_IP"] = "185.206.149.79";
    if (!currentValues["MINECRAFT_PROXY_API_PORT"])
      currentValues["MINECRAFT_PROXY_API_PORT"] = "8113";
    if (!currentValues["MINECRAFT_LOBBY_IP"])
      currentValues["MINECRAFT_LOBBY_IP"] = "194.164.96.27";
    if (!currentValues["MINECRAFT_LOBBY_API_PORT"])
      currentValues["MINECRAFT_LOBBY_API_PORT"] = "8090";
    if (!currentValues["MINECRAFT_SURVIVAL_IP"])
      currentValues["MINECRAFT_SURVIVAL_IP"] = "185.206.148.170";
    if (!currentValues["MINECRAFT_SURVIVAL_API_PORT"])
      currentValues["MINECRAFT_SURVIVAL_API_PORT"] = "8137";
    if (!currentValues["MINECRAFT_SERVER_API_KEY"])
      currentValues["MINECRAFT_SERVER_API_KEY"] = "test_minecraft_key_123";

    // Fix MINECRAFT_SERVER_API_URL if needed
    if (
      !currentValues["MINECRAFT_SERVER_API_URL"] ||
      !currentValues["MINECRAFT_SERVER_API_URL"].startsWith("http")
    ) {
      currentValues["MINECRAFT_SERVER_API_URL"] =
        `http://${currentValues["MINECRAFT_PROXY_IP"]}:${currentValues["MINECRAFT_PROXY_API_PORT"]}`;
    }

    // Create fixed .env file content
    const fixedPath = path.join(process.cwd(), ".env.fixed");
    let fixedContent = "";

    // First copy all existing lines
    envLines.forEach((line) => {
      if (line.trim() && !line.startsWith("#")) {
        const parts = line.split("=");
        if (parts.length >= 2) {
          const key = parts[0].trim();

          // Replace with fixed value if needed
          if (requiredVars.includes(key) && currentValues[key]) {
            fixedContent += `${key}=${currentValues[key]}\n`;
            delete currentValues[key]; // Remove from map to avoid duplicates
          } else {
            fixedContent += `${line}\n`;
          }
        } else {
          fixedContent += `${line}\n`;
        }
      } else {
        fixedContent += `${line}\n`;
      }
    });

    // Add any missing variables
    for (const varName of requiredVars) {
      if (currentValues[varName]) {
        fixedContent += `${varName}=${currentValues[varName]}\n`;
      }
    }

    // Write the fixed file
    fs.writeFileSync(fixedPath, fixedContent);

    console.log("✅ Generated fixed .env file at .env.fixed");
    console.log("To use the fixed file, run: mv .env.fixed .env");
  }

  console.log("\n========== END OF AUDIT ==========");
}

auditEnvFile();
