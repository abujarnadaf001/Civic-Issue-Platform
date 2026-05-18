// Real Convex API - Connected to live backend (Phase 3 Enhanced)
export const api = {
  issues: {
    getAllIssues: "issues:getAllIssues",
    getAllIssuesForMobile: "issues:getAllIssuesForMobile",
    getMobileIssuesHTTP: "issues:getMobileIssuesHTTP",
    getIssuesForMap: "issues:getIssuesForMap", 
    createIssue: "issues:createIssue",
    createIssueWithFiles: "issues:createIssueWithFiles", // Phase 3: Auto-generates ticket ID
    updateIssueStatus: "issues:updateIssueStatus", // Phase 3: Creates status history
    getIssuesByStatus: "issues:getIssuesByStatus", // Phase 3: Filter by status
    closeIssue: "issues:closeIssue", // Close Issue: Admin only function
    addComment: "issues:addComment", // Add comment to issue
    getComments: "issues:getComments", // Get comments for issue
    getMyIssues: "issues:getMyIssues",
    generateUploadUrl: "issues:generateUploadUrl",
    getFileUrl: "issues:getFileUrl",
    getTicketHistory: "issues:getTicketHistory",
    getNotifications: "issues:getNotifications",
    markNotificationRead: "issues:markNotificationRead",
    addAdminNote: "issues:addAdminNote"
  },
  users: {
    createOrUpdateUser: "users:createOrUpdateUser"
  }
};

// Phase 3 + Close Issue Backend Functions Available:
/*
✅ Enhanced Database Schema:
- ticketId: Auto-generated TKT-XXXXXX format
- statusHistory: Array of status changes with timestamps
- closed: Boolean field for closed issues
- Performance indexes for faster queries

✅ Functions Available:
- issues:createIssueWithFiles - Creates ticket with auto-generated ID
- issues:updateIssueStatus - Updates status + creates history entry  
- issues:getAllIssues - Gets all tickets with history (excludes closed)
- issues:getIssuesByStatus - Filter by status
- issues:closeIssue - Closes resolved issues (admin only)
- issues:addComment - Add comment to issue (user/admin)
- issues:getComments - Get all comments for an issue
- issues:getAllIssuesForMobile - Includes closed field + comments in response
- issues:getMobileIssuesHTTP - Includes closed field + comments for mobile sync
- issues:getTicketHistory - Gets status history and admin notes for a ticket
- issues:getNotifications - Gets unread notifications for mobile app
- issues:markNotificationRead - Marks notification as read
- issues:addAdminNote - Add admin note without status change

✅ Backward Compatible:
- All existing functions still work
- Old issues without ticketId/closed are supported
- Same API endpoints and parameters
*/