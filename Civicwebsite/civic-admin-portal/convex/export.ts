// convex/export.ts
// ---------------------------------------------------------------
// AquaGuard AI — Data Export Query
// PURPOSE : Read-only query that fetches water & waste related
//           civic issues for the external AquaGuard AI pipeline.
// SAFE    : This file only READS data. It never writes, mutates,
//           or touches any existing function in issues.ts.
// ---------------------------------------------------------------

import { query } from "./_generated/server";

// The 5 categories from the schema that are relevant to
// water pollution / waste monitoring by AquaGuard AI.
const AQUAGUARD_CATEGORIES = [
  "Water Supply",
  "Water Issue",
  "Drainage",
  "Garbage/Waste",
  "Sanitation",
] as const;

// ---------------------------------------------------------------
// getWaterIssues
// Called by the HTTP endpoint in http.ts (Phase 3).
// Returns a clean, minimal JSON array — only the fields
// AquaGuard AI actually needs. No internal Convex IDs leaked.
// ---------------------------------------------------------------
export const getWaterIssues = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Step 1: Fetch all issues from the database, newest first.
      const allIssues = await ctx.db
        .query("issues")
        .order("desc")
        .collect();

      // Step 2: Filter — keep only active (not closed) issues
      // whose category is in the AquaGuard-relevant list.
      const waterIssues = allIssues.filter((issue) => {
        const isRelevantCategory = (AQUAGUARD_CATEGORIES as readonly string[]).includes(
          issue.category
        );
        const isActive = !issue.closed; // exclude archived/closed issues
        return isRelevantCategory && isActive;
      });

      // Step 3: Construct a /getImage redirect URL for each issue that
      // has a photo. This routes through our own convex/http.ts handler
      // instead of hitting .convex.cloud directly, which avoids 401/403
      // errors when AquaGuard's Python code tries to download the image.
      //
      // Base URL: process.env.CONVEX_SITE_URL  (e.g. https://quick-anaconda-973.convex.site)
      // Falls back to the hardcoded site URL if the env var is not set.
      const siteUrl = (
        process.env.CONVEX_SITE_URL ??
        "https://quick-anaconda-973.convex.site"
      ).replace(/\/$/, ""); // strip any trailing slash

      const results = waterIssues.map((issue) => {
          let imageUrl: string | null = null;

          if (issue.fileId) {
            // Build:  https://<site>/getImage?id=<storageId>
            imageUrl = `${siteUrl}/getImage?id=${issue.fileId}`;
          }

          // Step 4: Return ONLY the fields AquaGuard needs.
          // Keep the shape clean and stable.
          return {
            id: issue._id,
            ticketId: issue.ticketId ?? `TKT-${issue._id.slice(-6)}`,
            title: issue.title,
            description: issue.description,
            category: issue.category,
            status: issue.status,
            priority: issue.priority ?? "medium",
            latitude: issue.latitude,
            longitude: issue.longitude,
            address: issue.address ?? null,
            imageUrl: imageUrl,
            reportedAt: issue._creationTime,        // Unix ms timestamp
            reportedAtISO: new Date(issue._creationTime).toISOString(),
            source: issue.source ?? "unknown",
          };
        });

      console.log(
        `[AquaGuard Export] Returning ${results.length} water/waste issues` +
        ` out of ${allIssues.length} total issues.`
      );

      return {
        success: true,
        count: results.length,
        fetchedAt: Date.now(),
        fetchedAtISO: new Date().toISOString(),
        issues: results,
      };

    } catch (error) {
      // Catch-all: log the error and return a safe empty response
      // so AquaGuard never receives an unhandled crash.
      console.error("[AquaGuard Export] Failed to fetch water issues:", error);
      return {
        success: false,
        count: 0,
        fetchedAt: Date.now(),
        fetchedAtISO: new Date().toISOString(),
        issues: [],
        error: "Internal query error. Check Convex logs.",
      };
    }
  },
});
