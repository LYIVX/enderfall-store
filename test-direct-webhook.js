const fetch = require("node-fetch");
const fs = require("fs");

async function testWebhook() {
  try {
    // Load event data from stripe-event.json
    const eventData = JSON.parse(
      fs.readFileSync("./stripe-event.json", "utf8")
    );

    // Update fields if provided via command line
    if (process.argv.length > 2) {
      eventData.data.object.metadata.minecraft_username = process.argv[2];
    }

    if (process.argv.length > 3) {
      eventData.data.object.metadata.rank_id = process.argv[3];
    }

    console.log("Using event data:", {
      username: eventData.data.object.metadata.minecraft_username,
      rankId: eventData.data.object.metadata.rank_id,
      sessionId: eventData.data.object.id,
      eventType: eventData.type,
    });

    // Send the request to the direct webhook endpoint
    const response = await fetch(
      "http://localhost:3000/api/webhooks/stripe/test/direct",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      }
    );

    console.log(`Response status: ${response.status}`);

    const responseData = await response.json();
    console.log("Response data:", responseData);
  } catch (error) {
    console.error("Error:", error);
  }
}

testWebhook();
