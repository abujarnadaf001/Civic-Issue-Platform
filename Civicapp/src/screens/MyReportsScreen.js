import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { convex } from '../convex/client';

const mockReports = [
  {
    id: 1,
    type: 'Pothole',
    description: 'Large pothole on main road causing traffic issues',
    status: 'pending',
    date: '2024-01-15',
    location: 'Main Street, Delhi',
    priority: 'high'
  },
  {
    id: 2,
    type: 'Street Light',
    description: 'Street light not working since last week',
    status: 'in-progress',
    date: '2024-01-10',
    location: 'Park Avenue, Mumbai',
    priority: 'medium'
  },
  {
    id: 3,
    type: 'Garbage',
    description: 'Garbage not collected for 3 days',
    status: 'resolved',
    date: '2024-01-05',
    location: 'Sector 15, Noida',
    priority: 'low'
  },
  {
    id: 4,
    type: 'Water Issue',
    description: 'Water leakage from main pipeline',
    status: 'pending',
    date: '2024-01-12',
    location: 'Civil Lines, Bangalore',
    priority: 'high'
  },
];

const statusColors = {
  pending: '#FF6B6B',
  'in-progress': '#4ECDC4',
  resolved: '#45B7D1',
};

const priorityColors = {
  high: '#FF6B6B',
  medium: '#FFEAA7',
  low: '#74B9FF',
};

// Enhanced status display logic (Fixed)
const getStatusDisplay = (issue) => {
  if (issue.closed) {
    return {
      text: "ISSUE CLOSED",
      subtext: "Resolved and completed",
      color: '#6B7280', // Gray
      icon: '✅'
    };
  }
  
  switch(issue.status) {
    case 'resolved':
      return { text: 'RESOLVED', color: '#10B981', icon: '✅' };
    case 'in-progress':
      return { text: 'IN PROGRESS', color: '#F59E0B', icon: '🔄' };
    default:
      return { text: 'PENDING', color: '#EF4444', icon: '⏳' };
  }
};

// Backward compatibility functions
const getStatusColor = (issue) => {
  const statusInfo = getStatusDisplay(issue);
  return statusInfo.color;
};

const getStatusText = (issue) => {
  const statusInfo = getStatusDisplay(issue);
  return statusInfo.text;
};

export default function MyReportsScreen() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [liveIssues, setLiveIssues] = useState([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedComments, setExpandedComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [isSubmittingComment, setIsSubmittingComment] = useState({});
  
  // HTTP-based queries (more stable than WebSocket)
  const fetchIssuesHTTP = async () => {
    try {
      setIsLoadingIssues(true);
      const result = await convex.query("issues:getMobileIssuesHTTP", {});
      // Only log on errors or significant changes
      if (result.success) {
        console.log(`✅ Synced ${result.issues?.length || 0} issues`);
      } else {
        console.log('❌ HTTP fetch failed:', result);
      }
      
      setLiveIssues(result.issues || []);
      
      // Also fetch notifications with alert system
      try {
        const notificationResult = await convex.query("issues:getNotifications", {});
        if (notificationResult && notificationResult.length > 0) {
          const newNotifications = notificationResult.filter(n => !n.read);
          const previousUnreadCount = unreadCount;
          
          setNotifications(notificationResult);
          setUnreadCount(newNotifications.length);
          
          // Show alert for new notifications
          if (newNotifications.length > previousUnreadCount && previousUnreadCount >= 0) {
            const latestNotification = newNotifications[0];
            if (latestNotification) {
              showNotificationAlert(latestNotification);
            }
          }
          
          console.log('🔔 Notifications:', notificationResult.length, 'unread:', newNotifications.length);
        }
      } catch (notifError) {
        console.log('⚠️ Notifications not available yet:', notifError.message);
      }
      
      return result;
    } catch (error) {
      console.error('HTTP fetch failed:', error);
      return { success: false, issues: [] };
    } finally {
      setIsLoadingIssues(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadReports();
    }, [])
  );
  
  // HTTP-based status updates every 8 seconds (more frequent for better sync)
  useEffect(() => {
    // Initial fetch
    fetchIssuesHTTP();
    
    // Regular updates
    const interval = setInterval(() => {
      fetchIssuesHTTP();
    }, 8000); // Reduced from 10 to 8 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Additional refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchIssuesHTTP();
    }, [])
  );
  
  // HTTP-based status change detection
  useEffect(() => {
    if (liveIssues.length > 0) {
      // Only log significant changes
      const statusChanges = liveIssues.filter(serverIssue => {
        const localIssue = reports.find(r => r.convexId === serverIssue._id);
        return localIssue && localIssue.status !== serverIssue.status;
      });
      
      if (statusChanges.length > 0) {
        console.log(`🔄 ${statusChanges.length} status changes detected`);
      }
    } else {
      console.log('⚠️ No issues received via HTTP');
    }
  }, [liveIssues, reports]);
  
  // Merge local reports with live Convex data for real-time status updates
  useEffect(() => {
    if (liveIssues.length > 0 && reports.length > 0) {
      // Minimal sync logging
      const syncStartTime = Date.now();
      
      // Update local reports with live status from Convex
      const updatedReports = reports.map((localReport, index) => {
        // Efficient matching without excessive logging
        const liveIssue = liveIssues.find(issue => {
          // Strategy 1: Match by stored Convex ID (most reliable)
          if (localReport.convexId && issue._id === localReport.convexId) {
            return true;
          }
          
          // Strategy 2: Match by timestamp + category
          if (localReport.timestamp && issue._creationTime) {
            const timeDiff = Math.abs(localReport.timestamp - issue._creationTime);
            const categoryMatch = localReport.type === issue.category;
            if (timeDiff < 10000 && categoryMatch) {
              return true;
            }
          }
          
          // Strategy 3: Match by exact description + category (fallback)
          if (issue.description === localReport.description && 
              localReport.type === issue.category) {
            return true;
          }
          
          return false;
        });
        
        if (liveIssue) {
          const hasStatusChange = liveIssue.status !== localReport.status;
          const hasClosedChange = liveIssue.closed !== localReport.closed;
          const hasNewHistory = liveIssue.statusHistory && liveIssue.statusHistory.length > 0;
          
          if (hasStatusChange || hasClosedChange || hasNewHistory) {
            if (hasStatusChange) {
              console.log(`🔄 ${localReport.type}: ${localReport.status} → ${liveIssue.status}`);
            }
            if (hasClosedChange) {
              console.log(`🔒 ${localReport.type}: ${localReport.closed ? 'Opened' : 'Closed'}`);
            }
            return {
              ...localReport,
              status: liveIssue.status, // Update with live status
              closed: liveIssue.closed, // Update closed status
              convexId: liveIssue._id, // Store Convex ID
              ticketId: liveIssue.ticketId, // Store ticket ID
              statusHistory: liveIssue.statusHistory, // Store status history
              comments: liveIssue.comments || localReport.comments || [], // Sync comments
              synced: true
            };
          } else {
            // Store enhanced data even if status hasn't changed
            return {
              ...localReport,
              convexId: liveIssue._id,
              ticketId: liveIssue.ticketId, // Always store ticket ID
              closed: liveIssue.closed, // Always store closed status
              statusHistory: liveIssue.statusHistory, // Always store history
              comments: liveIssue.comments || localReport.comments || [], // Always sync comments
              synced: true
            };
          }
        }
        return localReport;
      });
      
      // Only update if there are actual changes (include closed status)
      const hasChanges = updatedReports.some((report, index) => 
        report.status !== reports[index]?.status || 
        report.closed !== reports[index]?.closed ||
        report.convexId !== reports[index]?.convexId ||
        report.ticketId !== reports[index]?.ticketId ||
        JSON.stringify(report.statusHistory) !== JSON.stringify(reports[index]?.statusHistory) ||
        JSON.stringify(report.comments) !== JSON.stringify(reports[index]?.comments)
      );
      
      if (hasChanges) {
        const syncTime = Date.now() - syncStartTime;
        console.log(`✅ Updated ${updatedReports.length} reports (${syncTime}ms)`);
        setReports(updatedReports);
        applyFiltersToReports(updatedReports);
        
        // Save updated reports to AsyncStorage
        AsyncStorage.setItem('userReports', JSON.stringify(updatedReports));
      }
    }
  }, [liveIssues, reports]); // Watch for actual changes in data

  const loadReports = async () => {
    try {
      const userReports = await AsyncStorage.getItem('userReports');
      const savedReports = userReports ? JSON.parse(userReports) : [];
      
      // Combine user reports with mock reports
      const allReports = [...savedReports, ...mockReports];
      setReports(allReports);
      setFilteredReports(allReports);
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports(mockReports);
      setFilteredReports(mockReports);
    }
  };

  const applyFiltersToReports = (reportsToFilter) => {
    let filtered = [...reportsToFilter];

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'closed') {
        filtered = filtered.filter(report => report.closed === true);
      } else {
        filtered = filtered.filter(report => report.status === selectedStatus && !report.closed);
      }
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(report => report.type.toLowerCase().includes(selectedType.toLowerCase()));
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date) - new Date(a.date);
      } else if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      } else if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return 0;
    });

    setFilteredReports(filtered);
  };
  
  const applyFilters = () => {
    applyFiltersToReports(reports);
    setShowFilters(false);
  };

  const resetFilters = () => {
    setSelectedStatus('all');
    setSelectedType('all');
    setSortBy('date');
    setFilteredReports(reports);
    setShowFilters(false);
  };
  
  // Notification alert system
  const showNotificationAlert = (notification) => {
    Alert.alert(
      "📢 Ticket Update",
      notification.message,
      [
        { 
          text: "Mark as Read", 
          onPress: () => markNotificationAsRead(notification._id)
        },
        { 
          text: "View Ticket", 
          onPress: () => {
            // Find and scroll to the ticket
            const ticketIndex = filteredReports.findIndex(r => r.ticketId === notification.ticketId);
            if (ticketIndex >= 0) {
              console.log(`🎫 Navigating to ticket ${notification.ticketId}`);
            }
            markNotificationAsRead(notification._id);
          }
        }
      ]
    );
  };
  
  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await convex.mutation("issues:markNotificationRead", { notificationId });
      // Refresh notifications
      const updatedNotifications = notifications.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      );
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read).length);
      console.log('✅ Notification marked as read');
    } catch (error) {
      console.log('⚠️ Failed to mark notification as read:', error.message);
    }
  };
  
  // Comments functionality
  const toggleComments = (issueId) => {
    setExpandedComments(prev => ({
      ...prev,
      [issueId]: !prev[issueId]
    }));
  };
  
  const submitComment = async (issue) => {
    const issueId = issue._id || issue.id;
    const commentText = (newComment[issueId] || '').trim();
    
    if (!commentText) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }
    
    setIsSubmittingComment(prev => ({ ...prev, [issueId]: true }));
    
    try {
      const comment = {
        text: commentText,
        timestamp: Date.now(),
        isAdmin: false,
        author: 'User'
      };
      
      // Add comment to local storage immediately
      const updatedReports = reports.map(report => {
        if ((report._id || report.id) === issueId) {
          return {
            ...report,
            comments: [...(report.comments || []), comment]
          };
        }
        return report;
      });
      
      setReports(updatedReports);
      applyFiltersToReports(updatedReports);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('userReports', JSON.stringify(updatedReports));
      
      // Clear comment input
      setNewComment(prev => ({ ...prev, [issueId]: '' }));
      
      // Try to sync to backend (when available)
      if (issue.convexId) {
        try {
          const result = await convex.mutation(api.issues.addComment, {
            issueId: issue.convexId,
            comment: {
              text: commentText,
              isAdmin: false,
              timestamp: Date.now(),
              author: 'User'
            }
          });
          console.log('✅ Comment synced to backend:', result);
        } catch (syncError) {
          console.log('⚠️ Backend sync not available yet:', syncError.message);
          if (syncError.message.includes('Could not find public function')) {
            console.log('📝 Note: Web portal needs to implement addComment function');
          }
        }
      }
      
      // Force refresh to get latest comments from backend
      setTimeout(() => {
        fetchIssuesHTTP();
      }, 1000);
      
      Alert.alert(
        'Comment Added!', 
        'Your comment has been saved locally. It will sync to the web portal once the backend is updated.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(prev => ({ ...prev, [issueId]: false }));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'in-progress': return 'construct-outline';
      case 'resolved': return 'checkmark-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const renderReportItem = ({ item }) => (
    <View style={styles.reportCard}>
      {/* Ticket ID Header with Notification Indicator */}
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketId}>
          🎫 {item.ticketId || `TKT-${(item._id || item.id).toString().slice(-6)}`}
        </Text>
        <View style={styles.headerRight}>
          {notifications.some(n => n.ticketId === item.ticketId && !n.read) && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>🔔</Text>
            </View>
          )}
          <Text style={styles.ticketCategory}>{item.type || item.category}</Text>
        </View>
      </View>
      
      <View style={styles.reportHeader}>
        <View style={styles.typeContainer}>
          {item.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: priorityColors[item.priority] }]}>
              <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
            </View>
          )}
        </View>
        {item.closed ? (
          <View style={styles.closedStatusBadge}>
            <Text style={styles.closedStatusText}>✅ ISSUE CLOSED</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item) }]}>
            <Ionicons name={getStatusIcon(item.status)} size={16} color="#fff" />
            <Text style={styles.statusText}>{getStatusDisplay(item).text}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.description}>{item.description}</Text>
      
      {/* Admin Notes Section - Enhanced */}
      {(item.lastUpdatedBy || (item.adminNotes && item.adminNotes.length > 0)) && (
        <View style={styles.adminNotesSection}>
          <Text style={styles.adminNotesTitle}>📝 Admin Update:</Text>
          {item.lastUpdatedBy && (
            <Text style={styles.adminNotesText}>Updated by {item.lastUpdatedBy}</Text>
          )}
          {item.lastUpdated && (
            <Text style={styles.adminNotesText}>
              {new Date(item.lastUpdated).toLocaleString()}
            </Text>
          )}
          {item.adminNotes && item.adminNotes.length > 0 && (
            <Text style={styles.adminNote}>
              "💬 {item.adminNotes[item.adminNotes.length - 1]}"
            </Text>
          )}
        </View>
      )}
      
      {/* Enhanced Closed Status Notice */}
      {item.closed && (
        <View style={styles.closedStatus}>
          <Text style={styles.closedText}>✅ ISSUE CLOSED</Text>
          <Text style={styles.closedSubtext}>Resolved and completed</Text>
        </View>
      )}
      
      {/* Status History */}
      {item.statusHistory && item.statusHistory.length > 0 && (
        <View style={styles.statusHistoryContainer}>
          <Text style={styles.statusHistoryTitle}>📋 Status History</Text>
          {item.statusHistory.slice(-2).map((history, index) => (
            <View key={`${history.timestamp}-${index}`} style={styles.historyItem}>
              <Text style={styles.historyStatus}>{history.status}</Text>
              <Text style={styles.historyDate}>
                {new Date(history.timestamp).toLocaleString()}
              </Text>
              {history.updatedBy && (
                <Text style={styles.historyUpdatedBy}>by {history.updatedBy}</Text>
              )}
            </View>
          ))}
        </View>
      )}
      
      {/* Comments Section */}
      <View style={styles.commentsSection}>
        <TouchableOpacity 
          style={styles.commentsToggle}
          onPress={() => toggleComments(item._id || item.id)}
        >
          <Ionicons 
            name={expandedComments[item._id || item.id] ? 'chatbubbles' : 'chatbubbles-outline'} 
            size={16} 
            color="#007AFF" 
          />
          <Text style={styles.commentsToggleText}>
            💬 Comments ({(item.comments || []).length})
          </Text>
          <Ionicons 
            name={expandedComments[item._id || item.id] ? 'chevron-up' : 'chevron-down'} 
            size={16} 
            color="#666" 
          />
        </TouchableOpacity>
        
        {expandedComments[item._id || item.id] && (
          <View style={styles.commentsContainer}>
            {/* Existing Comments */}
            {(item.comments || []).map((comment, index) => (
              <View key={`comment-${index}`} style={styles.commentItem}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>
                    {comment.isAdmin ? '👨‍💼 Admin' : '👤 You'}
                  </Text>
                  <Text style={styles.commentDate}>
                    {new Date(comment.timestamp).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>
            ))}
            
            {/* Add New Comment */}
            <View style={styles.addCommentContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={newComment[item._id || item.id] || ''}
                onChangeText={(text) => setNewComment(prev => ({
                  ...prev,
                  [item._id || item.id]: text
                }))}
                multiline
                numberOfLines={2}
              />
              <TouchableOpacity 
                style={[
                  styles.submitCommentButton,
                  isSubmittingComment[item._id || item.id] && styles.disabledButton
                ]}
                onPress={() => submitComment(item)}
                disabled={isSubmittingComment[item._id || item.id] || !(newComment[item._id || item.id] || '').trim()}
              >
                <Text style={styles.submitCommentText}>
                  {isSubmittingComment[item._id || item.id] ? 'Sending...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      
      <View style={styles.reportFooter}>
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.location}>{item.location}</Text>
        </View>
        <Text style={styles.date}>{item.date}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Tickets</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={async () => {
              loadReports();
              await fetchIssuesHTTP();
            }}
          >
            <Ionicons name="refresh" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{reports.filter(r => r.status === 'pending' && !r.closed).length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{reports.filter(r => r.status === 'in-progress' && !r.closed).length}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{reports.filter(r => r.status === 'resolved' && !r.closed).length}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{reports.filter(r => r.closed).length}</Text>
          <Text style={styles.statLabel}>Closed</Text>
        </View>
      </View>

      <FlatList
        data={filteredReports}
        renderItem={renderReportItem}
        keyExtractor={(item, index) => `report-${item.id}-${index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Status</Text>
                <View style={styles.filterOptions}>
                  {['all', 'pending', 'in-progress', 'resolved', 'closed'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        selectedStatus === status && styles.selectedFilter
                      ]}
                      onPress={() => setSelectedStatus(status)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedStatus === status && styles.selectedFilterText
                      ]}>
                        {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Sort By</Text>
                <View style={styles.filterOptions}>
                  {[
                    { key: 'date', label: 'Date' },
                    { key: 'status', label: 'Status' },
                    { key: 'priority', label: 'Priority' }
                  ].map((sort) => (
                    <TouchableOpacity
                      key={sort.key}
                      style={[
                        styles.filterOption,
                        sortBy === sort.key && styles.selectedFilter
                      ]}
                      onPress={() => setSortBy(sort.key)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        sortBy === sort.key && styles.selectedFilterText
                      ]}>
                        {sort.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 10,
  },
  filterButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 20,
    marginBottom: 10,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 15,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  ticketHeader: {
    backgroundColor: '#f8f9fa',
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
  },
  ticketCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  notificationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  adminNotesSection: {
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  adminNotesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  adminNotesText: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  adminNote: {
    fontSize: 12,
    color: '#333',
    fontStyle: 'italic',
  },
  statusHistoryContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  statusHistoryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  historyStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#007AFF',
    flex: 1,
  },
  historyDate: {
    fontSize: 10,
    color: '#666',
    flex: 2,
    textAlign: 'center',
  },
  historyUpdatedBy: {
    fontSize: 10,
    color: '#28a745',
    flex: 1,
    textAlign: 'right',
  },
  closedStatusBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  closedStatusText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  closedStatus: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  closedText: {
    color: '#6B7280',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closedSubtext: {
    color: '#9CA3AF',
    fontSize: 12,
    fontStyle: 'italic',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  location: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterSection: {
    padding: 20,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    marginBottom: 10,
  },
  selectedFilter: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  selectedFilterText: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginRight: 10,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  applyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
  },
  commentsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  commentsToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
  },
  commentsContainer: {
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  commentItem: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  commentDate: {
    fontSize: 10,
    color: '#666',
  },
  commentText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fff',
    marginRight: 8,
    maxHeight: 80,
  },
  submitCommentButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  submitCommentText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});