import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Image,
  Alert,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "@clerk/clerk-expo";
import { convex } from "../convex/client";

const issueTypes = [
  { id: 'pothole', name: 'Pothole', icon: 'car', color: '#FF6B6B' },
  { id: 'streetlight', name: 'Street Light', icon: 'bulb', color: '#4ECDC4' },
  { id: 'garbage', name: 'Garbage/Waste', icon: 'trash', color: '#45B7D1' },
  { id: 'water', name: 'Water Issue', icon: 'water', color: '#96CEB4' },
  { id: 'road', name: 'Road Damage', icon: 'construct', color: '#FFEAA7' },
  { id: 'traffic', name: 'Traffic Signal', icon: 'warning', color: '#DDA0DD' },
  { id: 'drainage', name: 'Drainage', icon: 'funnel', color: '#74B9FF' },
  { id: 'other', name: 'Other', icon: 'ellipsis-horizontal', color: '#A29BFE' },
];

export default function ReportNewIssueScreen({ route }) {
  const navigation = useNavigation();
  const [selectedType, setSelectedType] = useState(null);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [audioUri, setAudioUri] = useState(null);
  const [location, setLocation] = useState(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Clerk authentication hook
  const { isSignedIn, getToken } = useAuth();
  
  // Convex mutation hooks for real backend integration
  const generateUploadUrl = useMutation(api.issues.generateUploadUrl);
  const createIssue = useMutation(api.issues.createIssue);
  const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

  useEffect(() => {
    if (route.params?.latitude && route.params?.longitude) {
      // Use the exact coordinates passed from the map tap
      setLocation({
        latitude: route.params.latitude,
        longitude: route.params.longitude,
      });
    } else {
      getCurrentLocation();
    }
  }, [route.params?.latitude, route.params?.longitude]); // re-run when tapped coords change

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation.coords);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages([...images, ...result.assets.map(asset => asset.uri)]);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecording(true);
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setAudioUri(uri);
  };

  const submitReport = async () => {
    if (!selectedType || !description.trim()) {
      Alert.alert('Error', 'Please select issue type and add description');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Location is required to submit a report');
      return;
    }

    setIsSubmitting(true);
    console.log('Starting hybrid report submission...');

    // Step 1: Save to AsyncStorage immediately (fast user feedback)
    const timestamp = Date.now();
    const newReport = {
      id: timestamp,
      type: selectedType.name,
      description,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      location: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      priority: 'medium',
      images: images.length, // Actual image count
      hasAudio: !!audioUri, // Actual audio status
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: timestamp, // Store timestamp for Convex matching
      synced: false, // Track sync status
    };

    try {
      const existingReports = await AsyncStorage.getItem('userReports');
      const reports = existingReports ? JSON.parse(existingReports) : [];
      reports.unshift(newReport);
      await AsyncStorage.setItem('userReports', JSON.stringify(reports));
      
      console.log('Report saved to AsyncStorage immediately');
      
      // Show success immediately
      Alert.alert('Success', 'Issue reported successfully! Saved locally.', [
        { text: 'OK', onPress: () => navigation.navigate('MapView') }
      ]);
      
      // Step 2: Try to sync to Convex in background with proper auth
      syncToConvex(newReport);
      
    } catch (error) {
      console.error('Failed to save to AsyncStorage:', error);
      Alert.alert('Error', 'Failed to save report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Test Convex connection by checking existing functions
  const testConvexConnection = async () => {
    try {
      // Test connection using existing getMobileIssuesHTTP function
      const result = await convex.query("issues:getMobileIssuesHTTP", {});
      console.log("✅ Convex connection working");
      return result;
    } catch (error) {
      console.log("❌ Convex connection failed:", error.message);
      return null;
    }
  };
  
  const syncToConvex = async (report) => {
    console.log('=== CONVEX SYNC WITH FILES ===');
    
    // Test connection using existing function
    const testResult = await testConvexConnection();
    
    if (!testResult) {
      console.log('⚠️ Connection test failed - trying direct creation...');
    } else {
      console.log('✅ Connection verified - creating issue...');
    }

    try {
      let imageFileId = null;
      let audioFileId = null;
      
      // Upload image if available
      if (images.length > 0) {
        console.log('📷 Uploading image...');
        try {
          const uploadUrl = await convex.mutation("issues:generateUploadUrl", {});
          
          // Convert image URI to blob
          const response = await fetch(images[0]);
          const blob = await response.blob();
          
          // Upload to Convex storage
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          });
          
          const uploadResult = await uploadResponse.json();
          imageFileId = uploadResult.storageId;
          console.log('✅ Image uploaded:', imageFileId);
        } catch (imageError) {
          console.log('⚠️ Image upload failed:', imageError.message);
        }
      }
      
      // Upload audio if available
      if (audioUri) {
        console.log('🎤 Uploading audio...');
        try {
          const uploadUrl = await convex.mutation("issues:generateUploadUrl", {});
          
          // Convert audio URI to blob
          const response = await fetch(audioUri);
          const blob = await response.blob();
          
          // Upload to Convex storage
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": blob.type },
            body: blob,
          });
          
          const uploadResult = await uploadResponse.json();
          audioFileId = uploadResult.storageId;
          console.log('✅ Audio uploaded:', audioFileId);
        } catch (audioError) {
          console.log('⚠️ Audio upload failed:', audioError.message);
        }
      }
      
      // Create issue with files using the new function
      console.log('Creating issue with files...');
      const issueData = {
        title: report.type,
        description: report.description,
        category: report.type,
        latitude: report.latitude,
        longitude: report.longitude,
        priority: "medium"
      };
      
      // Only add file IDs if they exist (avoid null values)
      if (imageFileId) {
        issueData.imageFileId = imageFileId;
      }
      if (audioFileId) {
        issueData.audioFileId = audioFileId;
      }
      
      const result = await convex.mutation("issues:createIssueWithFiles", issueData);
      
      console.log('✅ Issue with files created successfully:', result);
      
      // Show ticket ID to user (Phase 3 enhanced)
      const ticketId = result.ticketId || `TKT-${(result.issueId || result._id || '').slice(-6)}`;
      Alert.alert(
        '🎫 Ticket Created Successfully!', 
        `✅ Your issue has been registered as:\n\n🎫 ${ticketId}\n\n📱 Track status in "My Tickets"\n🌐 Real-time sync with web portal`,
        [{ text: 'Got it!' }]
      );
      console.log('🎫 Phase 3 Ticket ID:', ticketId);
      
      // Mark as synced in AsyncStorage with correct Convex ID and ticket ID
      const existingReports = await AsyncStorage.getItem('userReports');
      if (existingReports) {
        const reports = JSON.parse(existingReports);
        const updatedReports = reports.map(r => 
          r.id === report.id ? { 
            ...r, 
            synced: true, 
            convexId: result.issueId || result,
            ticketId: result.ticketId // Store ticket ID
          } : r
        );
        await AsyncStorage.setItem('userReports', JSON.stringify(updatedReports));
      }
      
      console.log('🎉 Full sync with files to Convex successful!');
      console.log('📷 Image:', imageFileId ? 'Uploaded' : 'None');
      console.log('🎤 Audio:', audioFileId ? 'Uploaded' : 'None');
      
    } catch (error) {
      console.log('❌ Issue creation with files failed:', error.message);
      console.log('Full error:', error);
      
      // Fallback: Save locally for later sync
      console.log('⚠️ Backend sync failed - issue saved locally for later sync');
      Alert.alert(
        'Issue Saved Locally', 
        'Your issue has been saved and will sync when the backend is available.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Report New Issue</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Issue Type</Text>
        <View style={styles.typeGrid}>
          {issueTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                { backgroundColor: type.color + '20' },
                selectedType?.id === type.id && styles.selectedType
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Ionicons name={type.icon} size={24} color={type.color} />
              <Text style={styles.typeName}>{type.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Describe the issue in detail..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Photos</Text>
        <View style={styles.mediaButtons}>
          <TouchableOpacity style={styles.mediaButton} onPress={takePhoto}>
            <Ionicons name="camera" size={20} color="#007AFF" />
            <Text style={styles.mediaButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
            <Ionicons name="images" size={20} color="#007AFF" />
            <Text style={styles.mediaButtonText}>Gallery</Text>
          </TouchableOpacity>
        </View>
        
        {images.length > 0 && (
          <ScrollView horizontal style={styles.imagePreview}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setImages(images.filter((_, i) => i !== index))}
                >
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Audio Note</Text>
        <TouchableOpacity
          style={[styles.audioButton, isRecording && styles.recordingButton]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons 
            name={isRecording ? "stop" : "mic"} 
            size={20} 
            color={isRecording ? "#FF6B6B" : "#007AFF"} 
          />
          <Text style={[styles.audioButtonText, isRecording && styles.recordingText]}>
            {isRecording ? 'Stop Recording' : 'Record Audio'}
          </Text>
        </TouchableOpacity>
        {audioUri && (
          <View style={styles.audioPreview}>
            <Ionicons name="musical-notes" size={16} color="#28a745" />
            <Text style={styles.audioStatus}>Audio recorded successfully</Text>
            <TouchableOpacity 
              style={styles.removeAudioButton}
              onPress={() => setAudioUri(null)}
            >
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {location && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.locationText}>
            📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.submitButton, isSubmitting && styles.disabledButton]} 
        onPress={submitReport}
        disabled={isSubmitting}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeCard: {
    width: '48%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedType: {
    borderColor: '#007AFF',
  },
  typeName: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  mediaButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    flex: 0.45,
    justifyContent: 'center',
  },
  mediaButtonText: {
    marginLeft: 8,
    color: '#007AFF',
    fontWeight: '500',
  },
  imagePreview: {
    marginTop: 15,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  audioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
  },
  recordingButton: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FF6B6B20',
  },
  audioButtonText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  audioStatus: {
    marginTop: 10,
    color: '#28a745',
    fontWeight: '500',
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledSection: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  disabledText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  disabledSubtext: {
    fontSize: 12,
    color: '#adb5bd',
    marginTop: 4,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  recordingText: {
    color: '#FF6B6B',
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  removeAudioButton: {
    marginLeft: 'auto',
    padding: 5,
  },
});