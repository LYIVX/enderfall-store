import { NextResponse } from "next/server";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { processStripeEvent } from "../route";

// TEST ONLY ROUTE - NOT FOR PRODUCTION USE
// This route bypasses signature verification and should only be used for testing

export async function POST(req: Request) {
  // Generate a correlation ID for tracking this request
  const correlationId = uuidv4().substring(0, 8);
  console.log(`[${correlationId}][TEST] Received test webhook event`);

  try {
    // Parse the request body
    const body = await req.text();
    console.log(`[${correlationId}][TEST] Request body:`, body);

    const event = JSON.parse(body);

    // Skip signature verification for testing

    console.log(
      `[${correlationId}][TEST] Processing event type: ${event.type}`
    );

    // Process the event
    const result = await processStripeEvent(event, correlationId);

    // Return the result
    return NextResponse.json(
      {
        received: true,
        message: result.message,
        event: { id: event.data?.object?.id, type: event.type },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(`[${correlationId}][TEST] Error processing webhook:`, err);

    return NextResponse.json(
      { error: `Error processing webhook: ${err.message}` },
      { status: 400 }
    );
  }
}
