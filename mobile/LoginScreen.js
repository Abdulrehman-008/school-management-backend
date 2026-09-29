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
  Image,
  StatusBar,
} from 'react-native';
import api from './src/services/api';
import { saveSession } from './src/services/authStorage';

const DARK_GREEN = '#1a4a1a';

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
      } else if (data.user?.role === 'class_teacher') {
        navigation.replace('ClassTeacherDashboard');
      } else if (data.user?.role === 'teacher') {
        navigation.replace('TeacherDashboard');
      } else {
        Alert.alert('Login Error', 'Unknown role. Contact administrator.');
      }
    } catch (error) {
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
      <StatusBar barStyle="light-content" backgroundColor={DARK_GREEN} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* School Photo Banner */}
        <View style={styles.photoBanner}>
          <Image
            source={require('./assets/school_photo.jpg')}
            style={styles.schoolPhoto}
            resizeMode="cover"
          />
          {/* Dark overlay for text legibility */}
          <View style={styles.photoOverlay} />
          <View style={styles.photoTextContainer}>
            <Text style={styles.photoUrduName}>گورنمنٹ ہائی سکول</Text>
            <Text style={styles.photoEnglishName}>Govt. High School Pindi Bawray</Text>
            <Text style={styles.photoLocationText}>ضلع حافظ آباد  •  District Hafizabad</Text>
          </View>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          {/* Circular school logo floating at top */}
          <View style={styles.logoWrapper}>
            <Image
              source={require('./assets/school_logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>School Management System</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <View style={styles.divider} />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>👤  Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              placeholderTextColor="#aaa"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>🔒  Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor="#aaa"
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

          <Text style={styles.footerText}>
            Govt. High School Pindi Bawray, Hafizabad
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0d2b0d',
    alignItems: 'center',
  },

  /* ── School Photo Banner ── */
  photoBanner: {
    width: '100%',
    height: 230,
    position: 'relative',
  },
  schoolPhoto: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 40, 10, 0.52)',
  },
  photoTextContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  photoUrduName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  photoEnglishName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  photoLocationText: {
    fontSize: 12,
    color: '#d4efdf',
    textAlign: 'center',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  /* ── Login Card ── */
  card: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 28,
    paddingBottom: 28,
    paddingTop: 10,
    marginTop: -36,
    marginBottom: 30,
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    alignItems: 'center',
  },

  /* ── School Logo ── */
  logoWrapper: {
    width: 260,
    height: 110,
    borderRadius: 14,
    marginTop: -30,
    marginBottom: 14,
    borderWidth: 3,
    borderColor: DARK_GREEN,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    backgroundColor: '#fff',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },

  title: {
    fontSize: 19,
    fontWeight: 'bold',
    color: DARK_GREEN,
    marginBottom: 3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 18,
  },

  inputContainer: { width: '100%', marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: '#f9fafb',
    color: '#222',
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: DARK_GREEN,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  footerText: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});