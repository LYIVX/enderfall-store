/**
 * Test script to create a sample users.json file in the Minecraft plugin directory
 * This script can be used during development to create test data
 */

const fs = require("fs");
const path = require("path");

// Get the plugin path from environment variable or use a default
const pluginPath =
  process.env.MINECRAFT_PLUGIN_PATH || "./minecraft-plugin/plugin-data";

// Create the directory if it doesn't exist
if (!fs.existsSync(pluginPath)) {
  console.log(`Creating plugin directory: ${pluginPath}`);
  fs.mkdirSync(pluginPath, { recursive: true });
}

// Sample test users
const testUsers = {
  players: [
    { username: "TestPlayer1" },
    { username: "TestPlayer2" },
    { username: "LYIVX" },
    { username: "Admin" },
    { username: "VIP_User" },
  ],
};

// Create the JSON file
const usersFilePath = path.join(pluginPath, "users.json");
fs.writeFileSync(usersFilePath, JSON.stringify(testUsers, null, 2));

console.log(`Created test users.json file at: ${usersFilePath}`);
console.log("Test users added:");
testUsers.players.forEach((player) => console.log(` - ${player.username}`));

// Create a README file in the same directory to explain the purpose
const readmePath = path.join(pluginPath, "README.txt");
fs.writeFileSync(
  readmePath,
  `
TEST USERS FILE
--------------

This directory contains test data generated for development purposes.
The users.json file contains a list of Minecraft usernames that have "joined" the server.
This simulates the data that would be created by the actual Minecraft plugin when players join.

To use this data with the website:
1. Set MINECRAFT_PLUGIN_PATH environment variable in .env.local to point to this directory
2. Restart the web server
3. The website will now use this data when checking if players exist

In a production environment, this directory would be part of your actual Minecraft server.
`
);

console.log(`Created README.txt file at: ${readmePath}`);
console.log("Done!");
