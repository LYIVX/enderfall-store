require("dotenv").config({ path: ".env.test" });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const crypto = require("crypto");
const axios = require("axios");

// Get the webhook secret from environment variable
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

// Test for newlines, spaces, or carriage returns in secret
const containsNewline = webhookSecret?.includes("\n");
const containsSpace = webhookSecret?.includes(" ");
const containsCarriageReturn = webhookSecret?.includes("\r");

console.log("Webhook secret length:", webhookSecret?.length);
console.log("Contains newline:", containsNewline);
console.log("Contains space:", containsSpace);
console.log("Contains carriage return:", containsCarriageReturn);

// Define the test options
const endpoints = [
  // Test our new test endpoint
  "http://localhost:3000/api/webhooks/stripe",

  // Production endpoints
  "https://enderfall.co.uk/api/webhooks/stripe",
  "https://enderfall.co.uk/api/webhooks/stripe/",
  "https://enderfall.co.uk/api/webhook",
];

// For this test, use the local endpoint
const webhookUrl = endpoints[0];

// Check server connectivity first
async function testServerConnectivity() {
  try {
    // Try to hit the home page to check if server is responding
    const homeResponse = await axios.get("http://localhost:3000");
    console.log("Server connected! Status:", homeResponse.status);
    return true;
  } catch (error) {
    console.error("Server connection error:", error.message);
    if (error.response) {
      console.log("Response status:", error.response.status);
      console.log("Response body:", error.response.data);
    }
    return false;
  }
}

// Create test data similar to Stripe's checkout.session.completed event
const timestamp = Math.floor(Date.now() / 1000);
const payload = JSON.stringify({
  id: `evt_${Math.random().toString(36).substring(2, 10)}`,
  object: "event",
  api_version: "2022-11-15",
  created: timestamp,
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_a1bmlotGfkb6UUxwCxrkAsT5ZJ01mhgqoYp591MFAE3EFQDe3WUX4qRZdX",
      object: "checkout.session",
      payment_status: "paid",
      status: "complete",
      customer: `cus_${Math.random().toString(36).substring(2, 10)}`,
      metadata: {
        is_gift: "false",
        minecraft_username: "lyivx",
        rank_id: "shadow_enchanter",
        rank_name: "Shadow Enchanter",
        type: "rank_purchase",
        user_id: "847618421448507415",
      },
    },
  },
});

// Manually generate Stripe signature
const signedPayload = `${timestamp}.${payload}`;
const signature = crypto
  .createHmac("sha256", webhookSecret)
  .update(signedPayload)
  .digest("hex");

const stripeSignature = `t=${timestamp},v1=${signature}`;

console.log("Debug info:");
console.log("- Webhook URL:", webhookUrl);
console.log("- Webhook secret length:", webhookSecret?.length);
console.log("- Webhook secret start:", webhookSecret?.substring(0, 9));
console.log("- Timestamp:", timestamp);
console.log("- Signature length:", signature.length);
console.log("- Signed payload length:", signedPayload.length);
console.log("- Stripe signature:", stripeSignature);
console.log("- Event:", JSON.parse(payload));

async function sendWebhook() {
  await testServerConnectivity();

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": stripeSignature,
      },
    });

    console.log("Response status:", response.status);
    console.log("Response body:", response.data);
    console.log("Parsed response:", response.data);
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.log("Response status:", error.response.status);
      console.log("Response body:", error.response.data);
    }
  }
}

sendWebhook();
