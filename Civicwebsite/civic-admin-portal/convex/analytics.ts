import { query } from "./_generated/server";

// Query for the main dashboard statistics
export const getDashboardStats = query({
  handler: async (ctx) => {
    const allIssues = await ctx.db.query("issues").collect();
    
    const totalPending = allIssues.filter(
      (q) => q.status === "pending" || q.status === "in-progress"
    ).length;

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const newToday = allIssues.filter(
      (q) => q._creationTime >= twentyFourHoursAgo
    ).length;

    const todayStart = new Date().setHours(0, 0, 0, 0);
    const resolvedToday = allIssues.filter(
      (q) => q.status === "resolved" && q.resolvedAt && q.resolvedAt >= todayStart
    ).length;

    return {
      totalPending,
      newToday,
      resolvedToday,
    };
  },
});

// Query to get issue counts grouped by category for charts
export const getIssuesByCategory = query({
    handler: async (ctx) => {
        const allIssues = await ctx.db.query("issues").collect();

        const stats = allIssues.reduce((acc, issue) => {
            acc[issue.category] = (acc[issue.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(stats).map(([name, value]) => ({ name, value }));
    },
});