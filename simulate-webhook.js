const fs = require("fs");
const crypto = require("crypto");
const http = require("http");

// Read the event payload
const eventPayload = fs.readFileSync("stripe-event.json", "utf8");

// Webhook secret from .env file
const webhookSecret =
  "whsec_b49e84aef5b0e25a516a8e28fd344360a13046fb7bbe8c5473ce2a1fbbdd6949";

// Create a signature
const timestamp = Math.floor(Date.now() / 1000);
const payload = `${timestamp}.${eventPayload}`;
const signature = crypto
  .createHmac("sha256", webhookSecret)
  .update(payload)
  .digest("hex");
const signatureHeader = `t=${timestamp},v1=${signature}`;

console.log("Simulating webhook event...");
console.log("Signature:", signatureHeader);

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
