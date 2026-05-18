// In file: convex/issues.ts

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate unique ticket ID in TKT-XXXX format
function generateTicketId(): string {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TKT-${timestamp}${random.slice(-1)}`; // TKT-XXXXXX format
}

// TEST FUNCTION - No auth required
export const testConnection = mutation({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    // No auth required - just return success
    return { success: true, message: args.message, timestamp: Date.now() };
  },
});

// TEST FUNCTION - Simple issue creation without auth
export const createTestIssue = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
  },
  handler: async (ctx, args) => {
    const ticketId = generateTicketId();
    
    // Create issue without authentication for testing
    const issueId = await ctx.db.insert("issues", {
      userId: "test-user-id" as any, // Temporary test user
      ticketId: ticketId,
      title: args.title,
      description: args.description,
      category: args.category as any,
      latitude: args.latitude,
      longitude: args.longitude,
      status: "pending",
      source: "test"
    });
    
    return { success: true, issueId, ticketId, message: "Issue created without auth" };
  },
});

// Function for the map screen to get all issues (excluding closed ones)
export const getAllIssues = query({
  handler: async (ctx) => {
    const allIssues = await ctx.db.query("issues").order("desc").collect();
    // Filter out closed issues from active queue and ensure comments are included
    return allIssues.filter(issue => !issue.closed).map(issue => ({
      ...issue,
      comments: issue.comments || [] // Ensure comments field exists
    }));
  },
});

// RE-ENABLED: Generate upload URL for photos and audio
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      const uploadUrl = await ctx.storage.generateUploadUrl();
      console.log("Upload URL generated successfully");
      return uploadUrl;
    } catch (error) {
      console.error("Failed to generate upload URL:", error);
      throw new Error("Upload URL generation failed");
    }
  },
});

// Function to create a new issue in the database (NO FILE UPLOADS)
export const createIssue = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    priority: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // SAFE: No file uploads to prevent stuck processes
    console.log("Creating issue from mobile app (no files):", args.title);
    
    const ticketId = generateTicketId();
    
    const issueId = await ctx.db.insert("issues", {
      userId: "mobile_user_temp" as any,
      ticketId: ticketId,
      title: args.title,
      description: args.description,
      category: args.category as any,
      latitude: args.latitude,
      longitude: args.longitude,
      address: args.address,
      priority: args.priority as any,
      status: "pending",
      source: "mobile_app",
      comments: [] // Initialize empty comments array
    });
    
    console.log("Issue created successfully:", issueId, "Ticket ID:", ticketId);
    return { success: true, issueId, ticketId };
  },
});

// MOBILE APP COMPATIBLE: Create issue with all possible fields
export const createMobileIssue = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    priority: v.optional(v.string()),
    address: v.optional(v.string()),
    imageFileId: v.optional(v.id("_storage")),
    audioFileId: v.optional(v.id("_storage")),
    userLocation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("Creating mobile issue:", args.title, "Category:", args.category);
    
    const ticketId = generateTicketId();
    
    const issueData: any = {
      userId: "mobile_user_temp" as any,
      ticketId: ticketId,
      title: args.title,
      description: args.description,
      category: args.category as any,
      latitude: args.latitude,
      longitude: args.longitude,
      address: args.address || args.userLocation,
      priority: args.priority as any || "medium",
      status: "pending",
      source: "mobile_app",
      comments: [] // Initialize empty comments array
    };
    
    // Add file IDs if provided
    if (args.imageFileId) {
      issueData.fileId = args.imageFileId;
    }
    if (args.audioFileId) {
      issueData.audioFileId = args.audioFileId;
    }
    
    const issueId = await ctx.db.insert("issues", issueData);
    
    console.log("Mobile issue created successfully:", issueId, "Ticket ID:", ticketId);
    return { 
      success: true, 
      issueId, 
      ticketId,
      message: "Issue created from mobile app"
    };
  },
});

// Update issue status - ENHANCED with admin notes and notifications
export const updateIssueStatus = mutation({
  args: {
    issueId: v.id("issues"),
    status: v.union(v.literal("pending"), v.literal("in-progress"), v.literal("resolved")),
    adminNote: v.optional(v.string()),
    adminName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentIssue = await ctx.db.get(args.issueId);
    if (!currentIssue) {
      throw new Error("Issue not found");
    }
    
    const timestamp = Date.now();
    const adminName = args.adminName || "Admin";
    
    // Create status history entry
    const newHistoryEntry = {
      status: args.status,
      timestamp: timestamp,
      updatedBy: adminName
    };
    
    const updatedHistory = [...(currentIssue.statusHistory || []), newHistoryEntry];
    
    // Update admin notes if provided
    const updatedNotes = args.adminNote 
      ? [...(currentIssue.adminNotes || []), args.adminNote]
      : currentIssue.adminNotes;
    
    // Update issue in database
    await ctx.db.patch(args.issueId, { 
      status: args.status,
      statusHistory: updatedHistory,
      lastUpdated: timestamp,
      lastUpdatedBy: adminName,
      adminNotes: updatedNotes,
      resolvedAt: args.status === "resolved" ? timestamp : undefined
    });
    
    // Add to ticket history
    await ctx.db.insert("ticket_history", {
      ticketId: currentIssue.ticketId || `TKT-${currentIssue._id.slice(-6)}`,
      action: "status_change",
      oldStatus: currentIssue.status,
      newStatus: args.status,
      adminNote: args.adminNote,
      adminName: adminName,
      timestamp: timestamp
    });
    
    // Create notification for mobile app
    const notificationMessage = args.adminNote 
      ? `Status updated to ${args.status.replace('-', ' ')} - Note: ${args.adminNote}`
      : `Status updated to ${args.status.replace('-', ' ')}`;
    
    await ctx.db.insert("notifications", {
      ticketId: currentIssue.ticketId || `TKT-${currentIssue._id.slice(-6)}`,
      message: notificationMessage,
      type: "status_change",
      read: false,
      createdAt: timestamp
    });
    
    console.log(`Status updated for ticket ${currentIssue.ticketId}: ${currentIssue.status} → ${args.status}`);
    return { success: true, message: "Status updated successfully", ticketId: currentIssue.ticketId };
  },
});

// Close resolved issue - ENHANCED with notifications
export const closeIssue = mutation({
  args: {
    issueId: v.id("issues"),
    adminNote: v.optional(v.string()),
    adminName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentIssue = await ctx.db.get(args.issueId);
    if (!currentIssue) {
      throw new Error("Issue not found");
    }
    
    if (currentIssue.status !== "resolved") {
      throw new Error("Only resolved issues can be closed");
    }
    
    const timestamp = Date.now();
    const adminName = args.adminName || "Admin";
    
    // Create history entry for closing
    const closeHistoryEntry = {
      status: "closed",
      timestamp: timestamp,
      updatedBy: adminName
    };
    
    const updatedHistory = [...(currentIssue.statusHistory || []), closeHistoryEntry];
    
    // Update admin notes if provided
    const updatedNotes = args.adminNote 
      ? [...(currentIssue.adminNotes || []), args.adminNote]
      : currentIssue.adminNotes;
    
    // Mark as closed
    await ctx.db.patch(args.issueId, { 
      closed: true,
      statusHistory: updatedHistory,
      lastUpdated: timestamp,
      lastUpdatedBy: adminName,
      adminNotes: updatedNotes
    });
    
    // Add to ticket history
    await ctx.db.insert("ticket_history", {
      ticketId: currentIssue.ticketId || `TKT-${currentIssue._id.slice(-6)}`,
      action: "closure",
      oldStatus: "resolved",
      newStatus: "closed",
      adminNote: args.adminNote,
      adminName: adminName,
      timestamp: timestamp
    });
    
    // Create notification
    const notificationMessage = args.adminNote 
      ? `Issue closed - Note: ${args.adminNote}`
      : "Issue has been closed and completed";
    
    await ctx.db.insert("notifications", {
      ticketId: currentIssue.ticketId || `TKT-${currentIssue._id.slice(-6)}`,
      message: notificationMessage,
      type: "closure",
      read: false,
      createdAt: timestamp
    });
    
    console.log(`Issue closed: ${currentIssue.ticketId}`);
    return { success: true, message: "Issue closed successfully", ticketId: currentIssue.ticketId };
  },
});

// Get issues for map markers (mobile app)
export const getIssuesForMap = query({
  handler: async (ctx) => {
    const issues = await ctx.db.query("issues").collect();
    return issues.map(issue => ({
      _id: issue._id,
      title: issue.title,
      category: issue.category,
      status: issue.status,
      latitude: issue.latitude,
      longitude: issue.longitude,
      address: issue.address,
      _creationTime: issue._creationTime,
      comments: issue.comments || [] // Include comments for mobile sync
    }));
  },
});

// Get user's own issues (mobile app)
export const getMyIssues = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const user = await ctx.db
      .query("users")
      .withIndex("by_token_identifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) return [];

    return await ctx.db
      .query("issues")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// OPTIMIZED: High-performance function for mobile app with indexing
export const getAllIssuesForMobile = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Use optimized query with limit for better performance
      const allIssues = await ctx.db
        .query("issues")
        .order("desc")
        .take(100); // Limit for performance
      
      console.log(`Mobile app requesting issues: ${allIssues.length} found (optimized with index)`);
      
      // Return normalized issues with consistent field mapping and closed status
      return allIssues.map(issue => ({
        _id: issue._id,
        _creationTime: issue._creationTime,
        title: issue.title || issue.category, // Fallback for matching
        description: issue.description,
        category: issue.category,
        status: issue.status,
        closed: issue.closed || false, // Include closed status for mobile
        latitude: issue.latitude,
        longitude: issue.longitude,
        priority: issue.priority,
        source: issue.source || "web_portal",
        imageFileId: issue.fileId || null, // Consistent naming
        audioFileId: issue.audioFileId || null,
        comments: issue.comments || [] // Include comments for mobile sync
      }));
    } catch (error) {
      console.error("Error fetching issues for mobile:", error);
      return [];
    }
  },
});

// OPTIMIZED: High-performance endpoint for mobile app sync
export const getMobileIssuesHTTP = query({
  args: {},
  handler: async (ctx) => {
    // Use optimized query with limit for better performance
    const allIssues = await ctx.db
      .query("issues")
      .order("desc")
      .take(100); // Limit to recent 100 issues
    
    console.log(`Returning ${allIssues.length} issues for mobile sync (optimized)`);
    
    // Normalize all issues with consistent field mapping and closed status
    const normalizedIssues = allIssues.map(issue => ({
      _id: issue._id,
      _creationTime: issue._creationTime,
      ticketId: issue.ticketId || `TKT-${issue._id.slice(-6)}`, // Fallback for old issues
      title: issue.title || issue.category, // Fallback for matching
      category: issue.category,
      description: issue.description,
      status: issue.status,
      closed: issue.closed || false, // Include closed status for mobile
      latitude: issue.latitude,
      longitude: issue.longitude,
      priority: issue.priority,
      imageFileId: issue.fileId || null, // Consistent naming
      audioFileId: issue.audioFileId || null,
      source: issue.source || "web_portal",
      comments: issue.comments || [] // Include comments for mobile sync
    }));
    
    return { 
      success: true, 
      issues: normalizedIssues,
      count: normalizedIssues.length,
      timestamp: Date.now()
    };
  },
});

// FIXED: Enhanced createIssue with truly optional file support
export const createIssueWithFiles = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    latitude: v.float64(),
    longitude: v.float64(),
    priority: v.string(),
    imageFileId: v.optional(v.id("_storage")), // Truly optional
    audioFileId: v.optional(v.id("_storage"))  // Truly optional
  },
  handler: async (ctx, args) => {
    console.log("Creating issue with files:", args.title, "Image:", !!args.imageFileId, "Audio:", !!args.audioFileId);
    
    // Generate unique ticket ID
    const ticketId = generateTicketId();
    
    // Only include file IDs in database if they exist
    const issueData: any = {
      ticketId: ticketId,
      title: args.title,
      description: args.description,
      category: args.category as any,
      latitude: args.latitude,
      longitude: args.longitude,
      priority: args.priority as any,
      status: "pending",
      source: "mobile_app"
    };
    
    // Only add file IDs if they exist
    if (args.imageFileId) {
      issueData.fileId = args.imageFileId; // For backward compatibility
    }
    if (args.audioFileId) {
      issueData.audioFileId = args.audioFileId;
    }
    
    const issueId = await ctx.db.insert("issues", issueData);
    console.log("Issue with files created successfully:", issueId, "Ticket ID:", ticketId);
    return { success: true, issueId, ticketId };
  },
});

// NEW: Get file URL for display in web portal
export const getFileUrl = query({
  args: { fileId: v.id("_storage") },
  handler: async (ctx, args) => {
    try {
      const url = await ctx.storage.getUrl(args.fileId);
      return url;
    } catch (error) {
      console.error("Failed to get file URL:", error);
      return null;
    }
  },
});

// DEBUG: Test function to show exact data structure for mobile app
export const debugMobileIssuesStructure = query({
  args: {},
  handler: async (ctx) => {
    const issues = await ctx.db.query("issues").order("desc").take(5);
    
    console.log("=== DEBUG: Exact Issue Structure ===");
    issues.forEach((issue, index) => {
      console.log(`Issue ${index + 1}:`, JSON.stringify(issue, null, 2));
    });
    
    // Return the exact structure that getMobileIssuesHTTP returns
    const normalizedIssues = issues.map(issue => ({
      _id: issue._id,
      _creationTime: issue._creationTime,
      title: issue.title || issue.category,
      category: issue.category,
      description: issue.description,
      status: issue.status,
      latitude: issue.latitude,
      longitude: issue.longitude,
      priority: issue.priority,
      imageFileId: issue.fileId || null,
      audioFileId: issue.audioFileId || null,
      source: issue.source || "web_portal"
    }));
    
    console.log("=== DEBUG: Normalized Structure ===");
    normalizedIssues.forEach((issue, index) => {
      console.log(`Normalized Issue ${index + 1}:`, JSON.stringify(issue, null, 2));
    });
    
    return {
      success: true,
      rawIssues: issues,
      normalizedIssues: normalizedIssues,
      count: issues.length,
      message: "Check console logs for detailed structure"
    };
  },
});

// NEW: Get notifications for mobile app
export const getNotifications = query({
  args: {},
  handler: async (ctx) => {
    try {
      const notifications = await ctx.db
        .query("notifications")
        .withIndex("by_read", (q) => q.eq("read", false))
        .order("desc")
        .take(50);
      
      console.log(`Returning ${notifications.length} unread notifications`);
      return notifications;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  },
});

// NEW: Mark notification as read
export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { read: true });
    return { success: true };
  },
});

// NEW: Get ticket history with admin notes
export const getTicketHistory = query({
  args: {
    ticketId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const history = await ctx.db
        .query("ticket_history")
        .withIndex("by_ticket", (q) => q.eq("ticketId", args.ticketId))
        .order("desc")
        .collect();
      
      console.log(`Returning ${history.length} history entries for ticket ${args.ticketId}`);
      return history;
    } catch (error) {
      console.error("Error fetching ticket history:", error);
      return [];
    }
  },
});

// NEW: Add admin note without status change
export const addAdminNote = mutation({
  args: {
    issueId: v.id("issues"),
    adminNote: v.string(),
    adminName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentIssue = await ctx.db.get(args.issueId);
    if (!currentIssue) {
      throw new Error("Issue not found");
    }
    
    const timestamp = Date.now();
    const adminName = args.adminName || "Admin";
    
    // Update admin notes
    const updatedNotes = [...(currentIssue.adminNotes || []), args.adminNote];
    
    await ctx.db.patch(args.issueId, {
      adminNotes: updatedNotes,
      lastUpdated: timestamp,
      lastUpdatedBy: adminName
    });
    
    // Add to ticket history
    await ctx.db.insert("ticket_history", {
      ticketId: currentIssue.ticketId || `TKT-${currentIssue._id.slice(-6)}`,
      action: "admin_note",
      adminNote: args.adminNote,
      adminName: adminName,
      timestamp: timestamp
    });
    
    // Create notification
    await ctx.db.insert("notifications", {
      ticketId: currentIssue.ticketId || `TKT-${currentIssue._id.slice(-6)}`,
      message: `Admin note added: ${args.adminNote}`,
      type: "admin_note",
      read: false,
      createdAt: timestamp
    });
    
    console.log(`Admin note added to ticket ${currentIssue.ticketId}`);
    return { success: true, message: "Admin note added successfully" };
  },
});

// FIXED: Comments System - Add comment to issue (Mobile App Compatible)
export const addComment = mutation({
  args: {
    issueId: v.id("issues"),
    comment: v.object({
      text: v.string(),
      isAdmin: v.boolean(),
      timestamp: v.number(),
      author: v.string()
    })
  },
  handler: async (ctx, args) => {
    console.log("Adding comment to issue:", args.issueId);
    
    const issue = await ctx.db.get(args.issueId);
    if (!issue) {
      throw new Error("Issue not found");
    }
    
    // Add comment to existing comments array
    const updatedComments = [...(issue.comments || []), args.comment];
    
    // Update the issue with new comments
    await ctx.db.patch(args.issueId, {
      comments: updatedComments
    });
    
    console.log("Comment added successfully:", args.comment);
    return { 
      success: true, 
      commentCount: updatedComments.length,
      comment: args.comment
    };
  }
});

// NEW: Comments System - Get comments for issue
export const getComments = query({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    return issue?.comments || [];
  }
});