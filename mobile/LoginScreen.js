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
  ActivityIndicator,
} from 'react-native';
import api from './src/services/api';
import { saveSession } from './src/services/authStorage';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedInput = identifier.trim();
    if (!trimmedInput || !password) {
      Alert.alert('Validation', 'Please enter username and password.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        username: trimmedInput,
        email: trimmedInput,
        password,
      });

      await saveSession(data.token, data.user);

      if (data.user?.role === 'admin') {
        navigation.replace('AdminDashboard');
      } else if (data.user?.role === 'teacher') {
        navigation.replace('TeacherDashboard');
      } else {
        Alert.alert('Login Error', 'Unknown role. Contact administrator.');
      }
    } catch (error) {
      // Show the real error message for easier debugging
      Alert.alert('Login Failed', error.message || 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Logo placeholder */}
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🏫</Text>
          </View>

          <Text style={styles.title}>School Management</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
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
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>SIGN IN</Text>
            )}
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
    backgroundColor: '#f0f4ff',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    elevation: 8,
    shadowColor: '#1a237e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    alignItems: 'center',
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e8eaf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: { fontSize: 36 },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 28,
  },
  inputContainer: { width: '100%', marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#222',
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#1a237e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
});