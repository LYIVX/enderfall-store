const axios = require("axios");

async function testEndpoint() {
  try {
    // Test with a trailing slash
    const baseUrl1 = "http://localhost:8080/";
    const apiUrl1 = baseUrl1.endsWith("/")
      ? `${baseUrl1}activate-rank`
      : `${baseUrl1}/activate-rank`;

    console.log(`Testing URL construction with trailing slash:`);
    console.log(`Base URL: ${baseUrl1}`);
    console.log(`Constructed API URL: ${apiUrl1}`);
    console.log(`Expected: http://localhost:8080/activate-rank`);
    console.log(
      `Result: ${apiUrl1 === "http://localhost:8080/activate-rank" ? "PASS" : "FAIL"}`
    );
    console.log();

    // Test without a trailing slash
    const baseUrl2 = "http://localhost:8080";
    const apiUrl2 = baseUrl2.endsWith("/")
      ? `${baseUrl2}activate-rank`
      : `${baseUrl2}/activate-rank`;

    console.log(`Testing URL construction without trailing slash:`);
    console.log(`Base URL: ${baseUrl2}`);
    console.log(`Constructed API URL: ${apiUrl2}`);
    console.log(`Expected: http://localhost:8080/activate-rank`);
    console.log(
      `Result: ${apiUrl2 === "http://localhost:8080/activate-rank" ? "PASS" : "FAIL"}`
    );
    console.log();

    // Test with a direct request to the mock server
    console.log(`Testing direct request to mock server...`);
    try {
      const response = await axios.post(
        "http://localhost:8080/activate-rank",
        {
          userId: "847618421448507415",
          rankId: "vip",
        },
        {
          headers: {
            Authorization: "Bearer test_minecraft_key_123",
            "Content-Type": "application/json",
          },
        }
      );

      console.log(`Status: ${response.status}`);
      console.log(`Response data:`, response.data);
      console.log(`Direct request test: PASS`);
    } catch (error) {
      console.error(`Error making direct request:`, error.message);
      console.log(`Direct request test: FAIL`);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testEndpoint();
