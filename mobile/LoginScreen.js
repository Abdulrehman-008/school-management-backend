import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Vercel Production Base Endpoint
  const API_URL = "https://school-management-backend-inovatters.vercel.app";

  const handleLogin = async () => {
    const trimmedInput = email.trim();
    if (!trimmedInput || !password) {
      Alert.alert('Error', 'Email/Username aur password enter karein.');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending login request to:', `${API_URL}/api/auth/login`);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send both username and email to be fully compatible with backend
        body: JSON.stringify({
          username: trimmedInput,
          email: trimmedInput,
          password: password,
        }),
      });

      const data = await response.json().catch(() => ({}));
      console.log('Response Status:', response.status);
      console.log('Response Data:', data);

      if (response.ok) {
        Alert.alert('Success', `Welcome ${data.user?.name || data.user?.username || trimmedInput}!`);
      } else if (response.status === 401 && (data.protection || data.error?.message === 'Protected deployment')) {
        Alert.alert(
          'Vercel Authentication Active',
          'Vercel Deployment Protection is blocking this API. Please disable Vercel Authentication in your Vercel Dashboard Settings -> Deployment Protection.'
        );
      } else {
        Alert.alert('Login Failed', data.message || data.error || 'Invalid Credentials');
      }
    } catch (error) {
      console.log('Fetch Error Log:', error.message);
      Alert.alert('Network Error', 'Backend server connect nahi ho raha. Internet aur backend status check karein.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>School Management App</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email / Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter email or username"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Logging in...' : 'LOGIN'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444444',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    height: 48,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});