import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users Table
  users: defineTable({
    name: v.string(),
    email: v.string(),
    // This is the unique identifier from your authentication provider (e.g., Clerk, Auth0)
    tokenIdentifier: v.string(),
    // Role for access control: 'citizen' or 'admin'
    role: v.optional(v.string()),
  }).index("by_token_identifier", ["tokenIdentifier"]),

  // Issues Table
  issues: defineTable({
    userId: v.optional(v.id("users")), // Make userId optional for mobile submissions
    ticketId: v.optional(v.string()), // Human-readable ticket ID (TKT-1024) - optional for existing data
    title: v.string(),
    description: v.string(),
    category: v.union(
      v.literal("Road Maintenance"),
      v.literal("Electrical"),
      v.literal("Water Supply"),
      v.literal("Sanitation"),
      v.literal("Traffic"),
      v.literal("Traffic Signal"),
      v.literal("Street Light"),
      v.literal("Road Damage"),
      v.literal("Pothole"),
      v.literal("Garbage/Waste"),
      v.literal("Water Issue"),
      v.literal("Drainage"),
      v.literal("Other")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("in-progress"),
      v.literal("resolved")
    ),
    closed: v.optional(v.boolean()), // Track if issue is closed (removed from active queue)
    priority: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical")
      )
    ),
    address: v.optional(v.string()),
    latitude: v.float64(),
    longitude: v.float64(),
    assignedTo: v.optional(v.string()), // Department name
    resolvedAt: v.optional(v.number()), // Timestamp
    fileId: v.optional(v.id("_storage")), // Link to Convex file storage (images)
    audioFileId: v.optional(v.id("_storage")), // Link to audio files
    source: v.optional(v.string()), // Track submission source (mobile_app, web_portal)
    statusHistory: v.optional(v.array(v.object({
      status: v.string(),
      timestamp: v.number(),
      updatedBy: v.optional(v.string())
    }))), // Track all status changes
    lastUpdated: v.optional(v.number()), // Last update timestamp
    lastUpdatedBy: v.optional(v.string()), // Admin who made last update
    adminNotes: v.optional(v.array(v.string())), // Array of admin notes
    comments: v.optional(v.array(v.object({
      text: v.string(),
      isAdmin: v.boolean(),
      timestamp: v.number(),
      author: v.string()
    }))), // Comments system for mobile-web communication
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])

    .index("by_source", ["source"]),

  // Files Table (for tracking user uploads)
  files: defineTable({
    storageId: v.id("_storage"),
    userId: v.id("users"),
  }),

  // Test Connections Table (for mobile app testing)
  test_connections: defineTable({
    message: v.string(),
    timestamp: v.number(),
    source: v.string(),
  }),

  // Ticket History Table (for admin notes and status changes)
  ticket_history: defineTable({
    ticketId: v.string(),
    action: v.string(), // "status_change", "admin_note", "assignment"
    oldStatus: v.optional(v.string()),
    newStatus: v.optional(v.string()),
    adminNote: v.optional(v.string()),
    adminName: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_ticket", ["ticketId"]),

  // Notifications Table (for mobile app notifications)
  notifications: defineTable({
    ticketId: v.string(),
    message: v.string(),
    type: v.string(), // "status_change", "admin_note", "assignment", "closure"
    read: v.boolean(),
    createdAt: v.number(),
  }).index("by_ticket", ["ticketId"]).index("by_read", ["read"]),
});