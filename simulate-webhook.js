const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
require("dotenv").config();

// Read the event payload
const eventPayload = fs.readFileSync("stripe-event.json", "utf8");

// Webhook secret from .env file
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
console.log("Using webhook secret:", webhookSecret);
console.log("Webhook secret length:", webhookSecret.length);

// Create a signature
const timestamp = Math.floor(Date.now() / 1000);
const payload = `${timestamp}.${eventPayload}`;
console.log("Payload preview:", payload.substring(0, 100) + "...");
console.log("Payload length:", payload.length);

const signature = crypto
  .createHmac("sha256", webhookSecret)
  .update(payload)
  .digest("hex");
console.log("Generated signature:", signature);

const signatureHeader = `t=${timestamp},v1=${signature}`;
console.log("Simulating webhook event...");
console.log("Full signature header:", signatureHeader);

// Send the webhook event to the Next.js API route
const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/webhooks/stripe",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(eventPayload),
    "Stripe-Signature": signatureHeader,
  },
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);

  res.setEncoding("utf8");
  let responseData = "";

  res.on("data", (chunk) => {
    responseData += chunk;
  });

  res.on("end", () => {
    console.log("Response body:", responseData);
    console.log("Webhook simulation complete");
  });
});

req.on("error", (e) => {
  console.error(`Problem with request: ${e.message}`);
});

// Write the event payload to the request body
req.write(eventPayload);
req.end();
