import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Add GET method handler to respond to health checks
export async function GET(req: Request) {
  return NextResponse.json({
    status: "ok",
    message: "Test webhook endpoint is working",
  });
}

export async function POST(req: Request) {
  const correlationId = Math.random().toString(36).substring(7);

  try {
    console.log(
      `[${correlationId}][Test Webhook] Received test webhook request`
    );

    // Log headers
    const headersList = headers();
    const allHeaders = Object.fromEntries(headersList.entries());
    console.log(
      `[${correlationId}][Test Webhook] Request headers:`,
      allHeaders
    );

    // Get body
    const body = await req.text();
    console.log(`[${correlationId}][Test Webhook] Request body:`, {
      length: body.length,
      preview: body.substring(0, 100) + "...",
    });

    // Try to parse body as JSON
    try {
      const jsonBody = JSON.parse(body);
      console.log(`[${correlationId}][Test Webhook] Parsed JSON body:`, {
        keys: Object.keys(jsonBody),
        type: jsonBody.type,
        id: jsonBody.id,
      });
    } catch (err) {
      console.log(`[${correlationId}][Test Webhook] Body is not valid JSON`);
    }

    // Always return success
    return NextResponse.json({
      success: true,
      message: "Test webhook received successfully",
      correlationId,
    });
  } catch (error: any) {
    console.error(`[${correlationId}][Test Webhook] Error:`, {
      message: error.message,
      stack: error.stack,
    });

    // Even on error, return 200 to make sure we're not hitting infrastructure issues
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        correlationId,
      },
      { status: 200 }
    );
  }
}
