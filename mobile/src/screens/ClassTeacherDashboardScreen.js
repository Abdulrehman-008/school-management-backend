import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { clearSession, loadSession } from '../services/authStorage';
import api from '../services/api';

const TEAL = '#00695c';

export default function ClassTeacherDashboardScreen({ navigation }) {
  const [assignedClass, setAssignedClass] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [studentsCount, setStudentsCount] = useState(0);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const session = await loadSession();
      if (!session?.user) return;
      setTeacherName(session.user.name || session.user.username);

      // Find which class this class teacher is incharge of
      const classesRes = await api.get('/school/classes');
      const myClass = classesRes.data.find((c) => c.class_teacher_id === session.user.id);
      setAssignedClass(myClass || null);

      if (myClass) {
        const [studRes, subjRes] = await Promise.all([
          api.get(`/students/class/${myClass.id}`),
          api.get(`/school/subjects/${myClass.id}`),
        ]);
        setStudentsCount(studRes.data.length);
        setSubjectsCount(subjRes.data.length);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const unsubscribe = navigation.addListener('focus', fetchDashboardData);
    return unsubscribe;
  }, [navigation, fetchDashboardData]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          navigation.replace('Login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Class Teacher Portal</Text>
          <Text style={styles.headerSub}>{teacherName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={TEAL} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {assignedClass ? (
            <>
              <View style={styles.banner}>
                <Text style={styles.bannerTitle}>{assignedClass.class_name}</Text>
                <Text style={styles.bannerSub}>Assigned as Class Incharge</Text>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{studentsCount}</Text>
                  <Text style={styles.statLabel}>Students</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{subjectsCount}</Text>
                  <Text style={styles.statLabel}>Subjects</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Class Management</Text>

              <TouchableOpacity
                style={[styles.card, { borderLeftColor: '#00897b' }]}
                onPress={() =>
                  navigation.navigate('ManageStudents', {
                    class_id: assignedClass.id,
                    class_name: assignedClass.class_name,
                    isClassTeacher: true,
                  })
                }
              >
                <Text style={styles.cardIcon}>🎒</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Manage Students</Text>
                  <Text style={styles.cardDesc}>Add & Edit students in your class</Text>
                </View>
                <Text style={styles.cardArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, { borderLeftColor: '#3949ab' }]}
                onPress={() =>
                  navigation.navigate('ManageClasses', {
                    isClassTeacher: true,
                    targetClassId: assignedClass.id,
                  })
                }
              >
                <Text style={styles.cardIcon}>📚</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Manage Subjects</Text>
                  <Text style={styles.cardDesc}>Add & Edit subjects in your class</Text>
                </View>
                <Text style={styles.cardArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.card, { borderLeftColor: '#6a1b9a' }]}
                onPress={() => navigation.navigate('ClassResult')}
              >
                <Text style={styles.cardIcon}>📊</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>Class Result Sheet</Text>
                  <Text style={styles.cardDesc}>View class marks & generate PDF</Text>
                </View>
                <Text style={styles.cardArrow}>›</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.unassignedBox}>
              <Text style={styles.unassignedTitle}>No Class Assigned</Text>
              <Text style={styles.unassignedText}>
                The administrator has not linked you as incharge of any class yet. Please contact admin.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fdf4' },
  header: {
    backgroundColor: TEAL,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
  headerSub: { color: '#b2dfdb', fontSize: 13, marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#ef5350',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  content: { padding: 20 },
  banner: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  bannerTitle: { fontSize: 24, fontWeight: 'bold', color: TEAL },
  bannerSub: { fontSize: 14, color: '#666', marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  statNumber: { fontSize: 26, fontWeight: 'bold', color: TEAL },
  statLabel: { fontSize: 13, color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderLeftWidth: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardIcon: { fontSize: 28, marginRight: 16 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  cardDesc: { fontSize: 13, color: '#777', marginTop: 2 },
  cardArrow: { fontSize: 26, color: '#bbb' },
  unassignedBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 40,
    borderWidth: 1,
    borderColor: '#eee',
  },
  unassignedTitle: { fontSize: 18, fontWeight: 'bold', color: '#c62828', marginBottom: 8 },
  unassignedText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
});
