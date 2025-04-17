import { NextResponse } from 'next/server';

// Define the expected structure of the Mojang API response
interface MojangProfile {
  id: string;
  name: string;
}

// Define the context for the route handler, which includes params
interface RouteContext {
  params: {
    username: string;
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { username } = context.params;

  if (!username) {
    return NextResponse.json({ error: 'Username parameter is required' }, { status: 400 });
  }

  const mojangApiUrl = `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`;

  try {
    const mojangRes = await fetch(mojangApiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Optional: Add caching strategy if needed
      // next: { revalidate: 3600 } // Revalidate cache every hour
    });

    // Handle cases where Mojang API returns non-OK status (e.g., 404 Not Found, 204 No Content)
    if (!mojangRes.ok) {
      // For 404 or 204, Mojang might return empty body or non-JSON, treat as "Not Found"
      if (mojangRes.status === 404 || mojangRes.status === 204) {
         return NextResponse.json({ error: 'Minecraft username not found' }, { status: 404 });
      }
      // For other errors, try to get text response
      const errorText = await mojangRes.text().catch(() => `Mojang API error status: ${mojangRes.status}`);
      console.error(`Mojang API Error (${mojangApiUrl}): ${mojangRes.status} - ${errorText}`);
      return NextResponse.json({ error: `Mojang API error: ${mojangRes.status}` }, { status: mojangRes.status });
    }

    // Try to parse the JSON response
    const mojangProfile: MojangProfile | null = await mojangRes.json().catch((err) => {
        console.error(`Failed to parse JSON from Mojang API (${mojangApiUrl}):`, err);
        return null; // Return null if JSON parsing fails
    });

    if (!mojangProfile || !mojangProfile.id || !mojangProfile.name) {
       // Handle cases where JSON is valid but doesn't contain expected data (should be rare if status was OK)
       console.error(`Invalid profile data received from Mojang API (${mojangApiUrl}) despite OK status.`);
       return NextResponse.json({ error: 'Invalid profile data received from Mojang' }, { status: 502 }); // Bad Gateway
    }

    // Successfully got the profile, return it to the client
    return NextResponse.json(mojangProfile, { status: 200 });

  } catch (error: any) {
    console.error(`Error fetching from Mojang API proxy (${mojangApiUrl}):`, error);
    return NextResponse.json({ error: 'Internal server error proxying to Mojang API', details: error.message }, { status: 500 });
  }
}

// Optional: Add OPTIONS handler if needed for complex requests/preflight
// export async function OPTIONS(request: Request) {
//   return new NextResponse(null, {
//     status: 204,
//     headers: {
//       'Access-Control-Allow-Origin': '*', // Or specific origin
//       'Access-Control-Allow-Methods': 'GET, OPTIONS',
//       'Access-Control-Allow-Headers': 'Content-Type',
//     },
//   });
// }
