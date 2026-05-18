import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSignIn, useSignUp, useAuth, useOAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import * as Linking from 'expo-linking';

const countryCodes = [
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+49', country: 'DE', flag: '🇩🇪' },
  { code: '+33', country: 'FR', flag: '🇫🇷' },
  { code: '+7', country: 'RU', flag: '🇷🇺' },
  { code: '+55', country: 'BR', flag: '🇧🇷' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
];

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isSignUpFlow, setIsSignUpFlow] = useState(false);
  
  const { isSignedIn } = useAuth();
  const { signIn, setActive } = useSignIn();
  const { signUp } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  
  // Timer for resend functionality
  React.useEffect(() => {
    let interval;
    if (pendingVerification && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pendingVerification, timer]);
  
  // Navigate to main app if user is already signed in
  React.useEffect(() => {
    if (isSignedIn) {
      navigation.replace('Main');
    }
  }, [isSignedIn, navigation]);

  const handleGoogleLogin = async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/'),
      });

      if (createdSessionId) {
        setActive({ session: createdSessionId });
        console.log('Google login successful!');
        // Navigation will be handled automatically by useEffect
      }
    } catch (err) {
      console.error('OAuth error', err);
      Alert.alert('Error', 'Google login failed. Please try again.');
    }
  };

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }
    
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    
    try {
      // Create sign-up attempt first (works for both new and existing users)
      const signUpAttempt = await signUp.create({
        emailAddress: email,
      });
      
      // Prepare email verification
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      
      setIsSignUpFlow(true);
      setPendingVerification(true);
      setTimer(60);
      setCanResend(false);
      Alert.alert('Success', `Verification code sent to ${email}`);
      
    } catch (err) {
      console.log('SignUp failed, trying SignIn:', err);
      
      // If signup fails (user exists), try sign in
      try {
        const signInAttempt = await signIn.create({
          identifier: email,
        });
        
        // Find the email address ID from the sign in attempt
        const emailAddressId = signInAttempt.supportedFirstFactors?.find(
          factor => factor.strategy === 'email_code'
        )?.emailAddressId;
        
        if (emailAddressId) {
          await signInAttempt.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailAddressId,
          });
        } else {
          // Fallback method
          await signInAttempt.prepareFirstFactor({
            strategy: 'email_code',
          });
        }
        
        setIsSignUpFlow(false);
        setPendingVerification(true);
        setTimer(60);
        setCanResend(false);
        Alert.alert('Success', `Verification code sent to ${email}`);
        
      } catch (signInErr) {
        console.error('Both SignUp and SignIn failed:', signInErr);
        Alert.alert('Error', 'Failed to send verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerifyCode = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter verification code');
      return;
    }
    
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }
    
    setIsLoading(true);
    
    try {
      let result;
      
      if (isSignUpFlow) {
        // Use SignUp verification
        console.log('Attempting SignUp verification');
        result = await signUp.attemptEmailAddressVerification({
          code: code.trim(),
        });
        
        if (result.status === 'missing_requirements') {
          // Complete signup with minimal required fields
          const updatedResult = await signUp.update({
            firstName: email.split('@')[0],
            lastName: 'User',
          });
          
          if (updatedResult.status === 'complete') {
            await setActive({ session: updatedResult.createdSessionId });
            Alert.alert('Success', 'Account created successfully!');
            return;
          }
        }
      } else {
        // Use SignIn verification
        console.log('Attempting SignIn verification');
        result = await signIn.attemptFirstFactor({
          strategy: 'email_code',
          code: code.trim(),
        });
      }
      
      if (result && result.status === 'complete') {
        const sessionId = result.createdSessionId || result.sessionId;
        if (sessionId) {
          await setActive({ session: sessionId });
          setCode('');
          setPendingVerification(false);
          Alert.alert('Success', 'Login successful!');
        }
      } else {
        Alert.alert('Error', 'Invalid verification code. Please try again.');
      }
      
    } catch (err) {
      console.error('Verification error:', err);
      Alert.alert('Error', 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendCode = async () => {
    setIsLoading(true);
    setCanResend(false);
    setTimer(60);
    
    try {
      // Use the same flow that was successful initially
      if (isSignUpFlow && signUp) {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      } else if (!isSignUpFlow && signIn && signIn.status === 'needs_first_factor_auth') {
        const emailAddressId = signIn.supportedFirstFactors?.find(
          factor => factor.strategy === 'email_code'
        )?.emailAddressId;
        
        if (emailAddressId) {
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailAddressId,
          });
        } else {
          await signIn.prepareFirstFactor({
            strategy: 'email_code',
          });
        }
      } else {
        Alert.alert('Error', 'Unable to resend code. Please try logging in again.');
        return;
      }
      Alert.alert('Success', 'New verification code sent to your email');
    } catch (err) {
      console.error('Resend error:', err);
      Alert.alert('Error', 'Failed to resend code');
      setCanResend(true);
      setTimer(0);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/icon.jpg')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Civic App</Text>
      </View>

      <View style={styles.formContainer}>
        <TouchableOpacity 
          style={styles.googleButton}
          onPress={handleGoogleLogin}
        >
          <Ionicons name="logo-google" size={24} color="#fff" />
          <Text style={styles.googleButtonText}>Login with Google</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.emailContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.emailInput}
            placeholder="Enter email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        {!pendingVerification ? (
          <TouchableOpacity 
            style={[styles.otpButton, isLoading && styles.disabledButton]}
            onPress={handleSendOTP}
            disabled={isLoading}
          >
            <Text style={styles.otpButtonText}>
              {isLoading ? 'Sending OTP...' : 'Send OTP'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.verificationContainer}>
            <Text style={styles.verificationTitle}>Enter Verification Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="Enter 6-digit code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity 
              style={[styles.otpButton, isLoading && styles.disabledButton]}
              onPress={handleVerifyCode}
              disabled={isLoading}
            >
              <Text style={styles.otpButtonText}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.resendContainer}>
              {canResend ? (
                <TouchableOpacity onPress={handleResendCode} disabled={isLoading}>
                  <Text style={styles.resendText}>Resend Code</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.timerText}>
                  Resend code in {timer}s
                </Text>
              )}
            </View>
          </View>
        )}


      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
  },
  emailContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  disabledButton: {
    opacity: 0.6,
  },

  otpButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  otpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  verificationContainer: {
    marginBottom: 30,
  },
  verificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 15,
  },
  resendText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timerText: {
    color: '#666',
    fontSize: 16,
  },
});