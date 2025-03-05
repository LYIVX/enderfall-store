// This script tests the webhook endpoint directly without signature verification
// This is only for testing and should not be used in production

const fs = require("fs");
const http = require("http");

// Read the event payload
const eventPayload = fs.readFileSync("stripe-event.json", "utf8");
const parsedEvent = JSON.parse(eventPayload);

// Allow command line arguments to override username and rank_id
const args = process.argv.slice(2);
const username = args[0] || parsedEvent.data.object.metadata.minecraft_username;
const rankId = args[1] || parsedEvent.data.object.metadata.rank_id;

console.log(`Using username: ${username}, rank_id: ${rankId}`);

// Create a simplified checkout event
const simpleEvent = {
  type: "checkout.session.completed",
  data: {
    object: {
      id: parsedEvent.data.object.id,
      metadata: {
        ...parsedEvent.data.object.metadata,
        minecraft_username: username,
        rank_id: rankId,
      },
      status: "complete",
      payment_status: "paid",
      customer_details: parsedEvent.data.object.customer_details,
    },
  },
};

console.log(
  "Sending simplified webhook event:",
  JSON.stringify(simpleEvent, null, 2)
);

// Send the webhook event directly to the route handler's test path
const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/webhooks/stripe/test", // Use a test path that bypasses signature verification
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(JSON.stringify(simpleEvent)),
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
    console.log("Direct webhook test complete");
  });
});

req.on("error", (e) => {
  console.error(`Problem with request: ${e.message}`);
});

// Write the event payload to the request body
req.write(JSON.stringify(simpleEvent));
req.end();
