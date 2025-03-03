#!/usr/bin/env node

/**
 * Simple script to test the cleanup-ranks API endpoint
 */

const http = require("http");

async function testCleanupEndpoint() {
  console.log("Testing cleanup-ranks API endpoint");
  console.log("----------------------------------");

  return new Promise((resolve, reject) => {
    // Make a GET request to the cleanup-ranks API
    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/cleanup-ranks",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    };

    const req = http.request(options, (res) => {
      const statusCode = res.statusCode;
      const contentType = res.headers["content-type"];

      console.log(`Status: ${statusCode}`);
      console.log(`Content-Type: ${contentType}`);
      console.log();

      let rawData = "";

      res.on("data", (chunk) => {
        rawData += chunk;
      });

      res.on("end", () => {
        try {
          const parsedData = JSON.parse(rawData);
          console.log("Response from API:");
          console.log(JSON.stringify(parsedData, null, 2));
          resolve(parsedData);
        } catch (e) {
          console.error("Error parsing JSON response:", e.message);
          reject(e);
        }
      });
    });

    req.on("error", (e) => {
      console.error(`Problem with request: ${e.message}`);
      reject(e);
    });

    req.end();
  });
}

// Execute the function
console.log("Make sure your Next.js development server is running!");
console.log("Press Ctrl+C to abort if server is not running.\n");

// Wait 2 seconds before starting the test
setTimeout(async () => {
  try {
    await testCleanupEndpoint();
  } catch (error) {
    console.error("Test failed:", error);
  }
}, 2000);
