import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function MapViewScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userReports, setUserReports] = useState([]);
  
  // Real-time data from Convex backend (includes web portal issues)
  const convexIssues = useQuery(api.issues.getIssuesForMap) || [];
  
  // Combine Convex issues with local user reports
  const [allIssues, setAllIssues] = useState([]);

  useEffect(() => {
    getCurrentLocation();
    loadUserReports();
    
    // Listen for navigation focus to reload reports
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserReports();
    });
    
    return unsubscribe;
  }, [navigation]);
  
  const loadUserReports = async () => {
    try {
      const existingReports = await AsyncStorage.getItem('userReports');
      if (existingReports) {
        const reports = JSON.parse(existingReports);
        // Convert location string to coordinates for map display
        const reportsWithCoords = reports.map(report => {
          // Handle both string location and direct lat/lng
          if (report.latitude && report.longitude) {
            return {
              ...report,
              _id: `local-${report.id}`,
              title: report.type,
              category: report.type,
              latitude: report.latitude,
              longitude: report.longitude,
            };
          } else if (report.location && report.location.includes(',')) {
            const [lat, lng] = report.location.split(',').map(coord => parseFloat(coord.trim()));
            return {
              ...report,
              _id: `local-${report.id}`,
              title: report.type,
              category: report.type,
              latitude: lat,
              longitude: lng,
            };
          }
          return report;
        }).filter(report => report.latitude && report.longitude);
        
        // Only log and update if count changed
        if (reportsWithCoords.length !== userReports.length) {
          console.log('🗺️ Loaded user reports for map:', reportsWithCoords.length);
          setUserReports(reportsWithCoords);
        }
      }
    } catch (error) {
      console.error('Error loading user reports:', error);
    }
  };
  
  // Combine all issues (Convex + local) for map display
  useEffect(() => {
    const combined = [...convexIssues, ...userReports];
    // Only update if the count actually changed to prevent infinite loops
    if (combined.length !== allIssues.length) {
      setAllIssues(combined);
      console.log('Total issues on map:', combined.length);
    }
  }, [convexIssues.length, userReports.length]); // Only depend on lengths to prevent infinite loops
  
  // Focus handling is already done by navigation listener above

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        setIsLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    Alert.alert(
      'Report Issue',
      'Do you want to report an issue at this location?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report', 
          onPress: () => navigation.navigate('ReportNewIssue', { 
            latitude, 
            longitude 
          })
        }
      ]
    );
  };

  // Status display logic (consistent with MyReportsScreen)
  const getStatusDisplay = (issue) => {
    if (issue.closed) {
      return {
        text: "ISSUE CLOSED",
        subtext: "Resolved and completed",
        color: '#6B7280',
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

  const getMarkerColor = (issue) => {
    if (issue.closed) return '#6B7280'; // Gray for closed issues
    switch (issue.status) {
      case 'pending': return '#FF6B6B';
      case 'in-progress': return '#4ECDC4';
      case 'resolved': return '#45B7D1';
      default: return '#FF6B6B';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={handleMapPress}
        >
          <Marker
            coordinate={location}
            title="Your Location"
            pinColor="#007AFF"
          />
          
          {/* All issues (Convex + Local) with real-time status updates */}
          {allIssues?.map((issue, index) => {
            const isUserReport = issue._id && issue._id.startsWith('local-');
            return (
              <Marker
                key={`marker-${issue._id || issue.id}-${index}`}
                coordinate={{
                  latitude: issue.latitude,
                  longitude: issue.longitude,
                }}
                pinColor={getMarkerColor(issue)}
              >
                <Callout>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>
                      🎫 {issue.ticketId || `TKT-${(issue._id || issue.id).toString().slice(-6)}`}
                    </Text>
                    <Text style={styles.calloutType}>Type: {issue.category || issue.type}</Text>
                    {(() => {
                      const statusInfo = getStatusDisplay(issue);
                      return (
                        <View>
                          <Text style={[styles.calloutStatus, { color: statusInfo.color, fontWeight: 'bold' }]}>
                            {statusInfo.icon} {statusInfo.text}
                          </Text>
                          {statusInfo.subtext && (
                            <Text style={[styles.calloutStatus, { color: '#9CA3AF', fontSize: 10, fontStyle: 'italic' }]}>
                              {statusInfo.subtext}
                            </Text>
                          )}
                        </View>
                      );
                    })()}
                    {issue.date && (
                      <Text style={styles.calloutDate}>Date: {issue.date}</Text>
                    )}
                    {issue.priority && (
                      <Text style={styles.calloutPriority}>Priority: {issue.priority}</Text>
                    )}
                    {issue.description && (
                      <Text style={styles.calloutDescription} numberOfLines={2}>
                        {issue.description}
                      </Text>
                    )}
                    {issue.images > 0 && (
                      <Text style={styles.calloutMedia}>📷 {issue.images} photo(s)</Text>
                    )}
                    {issue.hasAudio && (
                      <Text style={styles.calloutMedia}>🎤 Audio note</Text>
                    )}
                    {issue.synced && (
                      <Text style={styles.calloutMedia}>✅ Synced to portal</Text>
                    )}
                    {isUserReport && (
                      <Text style={styles.calloutMedia}>📍 Your Report</Text>
                    )}
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text>Unable to load location</Text>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.reportButton}
        onPress={() => navigation.navigate('ReportNewIssue')}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.reportButtonText}>Report Issue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  callout: {
    padding: 10,
    minWidth: 120,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  calloutStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  calloutCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  calloutType: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 2,
  },
  calloutDate: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  calloutPriority: {
    fontSize: 11,
    color: '#FF6B35',
    marginTop: 2,
  },
  calloutDescription: {
    fontSize: 11,
    color: '#555',
    marginTop: 4,
    fontStyle: 'italic',
  },
  calloutMedia: {
    fontSize: 10,
    color: '#28a745',
    marginTop: 2,
  },
  reportButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  reportButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});