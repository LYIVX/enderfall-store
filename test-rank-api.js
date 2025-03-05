const fetch = require("node-fetch");

async function testRankApplication() {
  const username = process.argv[2] || "lyivx";
  const rankId = process.argv[3] || "shadow_enchanter";
  const server = process.argv[4] || "survival";

  console.log(
    `Testing rank application for user: ${username}, rank: ${rankId}, server: ${server}`
  );

  // Define the API URL for the server
  let apiUrl;
  if (server === "survival") {
    apiUrl = "http://185.206.148.170:8137/api/apply-rank";
  } else if (server === "lobby") {
    apiUrl = "http://194.164.96.27:8090/api/apply-rank";
  } else {
    apiUrl = "http://185.206.149.79:8113/api/apply-rank";
  }

  // API key from environment
  const apiKey = "test_minecraft_key_123";

  try {
    console.log(`Sending request to: ${apiUrl}`);

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
        server: server.toLowerCase(),
      }),
    });

    console.log(`Response status: ${response.status}`);

    const responseText = await response.text();

    try {
      const responseData = JSON.parse(responseText);
      console.log("Response data:", JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log("Raw response (not JSON):", responseText);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

testRankApplication();
