import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// HTTP endpoint to serve files directly
http.route({
  path: "/getImage",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.searchParams.get("id");
    
    if (!storageId) {
      return new Response("Missing file ID", { status: 400 });
    }

    try {
      // Get the file URL from storage
      const fileUrl = await ctx.storage.getUrl(storageId as any);
      
      if (!fileUrl) {
        return new Response("File not found", { status: 404 });
      }

      // Redirect to the actual file URL
      return new Response(null, {
        status: 302,
        headers: {
          Location: fileUrl,
        },
      });
    } catch (error) {
      console.error("Error serving file:", error);
      return new Response("Error serving file", { status: 500 });
    }
  }),
});

// ---------------------------------------------------------------
// AquaGuard AI — REST API Endpoint
// GET  /api/get-water-issues  → returns filtered water/waste issues
// OPTIONS /api/get-water-issues → handles CORS preflight from Python
// SAFE: The /getImage route above is completely untouched.
// ---------------------------------------------------------------

// OPTIONS handler — required so browsers and Python's requests
// library don't get blocked by CORS preflight checks.
http.route({
  path: "/api/get-water-issues",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(null, {
      status: 204, // No Content — standard for OPTIONS preflight
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400", // cache preflight for 24 hours
      },
    });
  }),
});

// GET handler — the actual endpoint AquaGuard Python app calls.
http.route({
  path: "/api/get-water-issues",
  method: "GET",
  handler: httpAction(async (ctx, _request) => {
    try {
      // Call the read-only query defined in convex/export.ts
      const data = await ctx.runQuery(api.export.getWaterIssues, {});

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // CORS headers — allow AquaGuard running on any local port
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    } catch (error) {
      // If the query itself throws, return a structured error response
      // instead of an unhandled 500 crash.
      console.error("[AquaGuard HTTP] Failed to run getWaterIssues:", error);
      return new Response(
        JSON.stringify({
          success: false,
          count: 0,
          issues: [],
          error: "Server error. Check Convex dashboard logs.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  }),
});

export default http;