import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearSession, loadSession } from '../services/authStorage';
import api from '../services/api';

const TEAL = '#00695c';

export default function TeacherDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [allocations, setAllocations] = useState([]);
  const [inchargeClass, setInchargeClass] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const session = await loadSession();
      if (!session?.user) return;
      setTeacherName(session.user.name || session.user.username);

      // 1. Fetch teaching allocations (subjects assigned to teach)
      const allocRes = await api.get(`/allocation/teacher/${session.user.id}`);
      setAllocations(allocRes.data);

      // 2. Fetch all classes to check if this teacher is an assigned Class Incharge
      const classesRes = await api.get('/school/classes');
      const myClass = classesRes.data.find((c) => c.class_teacher_id === session.user.id);
      setInchargeClass(myClass || null);
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

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20) + 8;

  const renderAllocationItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardClass}>{item.class_name}</Text>
        <Text style={styles.cardSubject}>Subject: {item.subject_name}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            navigation.navigate('ManageStudents', {
              class_id: item.class_id,
              class_name: item.class_name,
              readOnly: true, // Subject teachers only have read-only view of students unless incharge
            })
          }
        >
          <Text style={styles.actionBtnText}>Students</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.marksBtn]}
          onPress={() =>
            navigation.navigate('EnterMarks', {
              class_id: item.class_id,
              subject_id: item.subject_id,
              class_name: item.class_name,
              subject_name: item.subject_name,
            })
          }
        >
          <Text style={styles.actionBtnText}>Enter Marks</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with notch padding */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <View>
          <Text style={styles.headerTitle}>Teacher Dashboard</Text>
          <Text style={styles.headerSub}>{teacherName}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={TEAL} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={allocations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAllocationItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              {/* Dual Role Card 1: Class Incharge Role (Only displayed if assigned) */}
              {inchargeClass && (
                <View style={styles.inchargeBox}>
                  <View style={styles.inchargeTop}>
                    <View>
                      <Text style={styles.inchargeBadge}>CLASS INCHARGE</Text>
                      <Text style={styles.inchargeClassName}>{inchargeClass.class_name}</Text>
                      <Text style={styles.inchargeNote}>
                        You can view, enroll, and edit students for this class.
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.inchargeBtn}
                      onPress={() =>
                        navigation.navigate('ManageStudents', {
                          class_id: inchargeClass.id,
                          class_name: inchargeClass.class_name,
                          isClassTeacher: true,
                          readOnly: false,
                        })
                      }
                    >
                      <Text style={styles.inchargeBtnText}>Manage Students</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Dual Role Card 2: Subject Teaching Allocations */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  My Teaching Allocations ({allocations.length})
                </Text>
                <Text style={styles.sectionSub}>
                  Select a subject to record and submit student marks.
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No subjects assigned to you yet.</Text>
              <Text style={styles.emptySubText}>Contact admin to allocate your teaching subjects.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fff4' },
  header: {
    backgroundColor: TEAL,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#b2dfdb', fontSize: 12, marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#ef5350',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  list: { padding: 18 },
  inchargeBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#00897b',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  inchargeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inchargeBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#00897b',
    letterSpacing: 1,
    marginBottom: 2,
  },
  inchargeClassName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  inchargeNote: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    maxWidth: 200,
  },
  inchargeBtn: {
    backgroundColor: '#00897b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  inchargeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  sectionSub: { fontSize: 12, color: '#666', marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: TEAL,
  },
  cardLeft: { flex: 1 },
  cardClass: { fontSize: 16, fontWeight: '700', color: '#333' },
  cardSubject: { fontSize: 13, color: '#666', marginTop: 3 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    backgroundColor: TEAL,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
  },
  marksBtn: { backgroundColor: '#1565c0' },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 15, color: '#666', fontWeight: '600' },
  emptySubText: { fontSize: 12, color: '#999', marginTop: 6, textAlign: 'center' },
});
