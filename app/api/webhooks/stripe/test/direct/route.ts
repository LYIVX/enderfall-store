import { NextRequest, NextResponse } from "next/server";
import { processStripeEvent } from "../../route";
import { v4 as uuidv4 } from "uuid";

// This is a special test endpoint that allows direct testing of the Stripe webhook
// handler without going through the signature verification process.
// THIS SHOULD NEVER BE DEPLOYED IN PRODUCTION!

export async function POST(req: NextRequest) {
  const correlationId = uuidv4().substring(0, 8);
  console.log(
    `[${correlationId}][TEST Direct Webhook] Received direct test webhook`
  );

  try {
    // Parse the event from the request body
    const event = await req.json();

    console.log(`[${correlationId}][TEST Direct Webhook] Parsed event:`, {
      id: event.id,
      type: event.type,
      hasData: !!event.data,
      hasObject: !!(event.data && event.data.object),
    });

    // Process the event directly, bypassing signature verification
    const result = await processStripeEvent(event, correlationId);

    // Return the result
    return NextResponse.json({
      received: true,
      processed: true,
      success: result.success,
      message: result.message,
    });
  } catch (error: any) {
    console.error(`[${correlationId}][TEST Direct Webhook] Error:`, error);
    return NextResponse.json(
      {
        received: true,
        processed: false,
        error: error.message,
      },
      { status: 400 }
    );
  }
}
