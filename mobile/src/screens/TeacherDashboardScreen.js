import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { clearSession, loadSession } from '../../services/authStorage';
import api from '../../services/api';

const TEAL = '#00695c';

export default function TeacherDashboardScreen({ navigation }) {
  const [allocations, setAllocations] = useState([]);
  const [teacherName, setTeacherName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAllocations = useCallback(async () => {
    try {
      const session = await loadSession();
      if (!session?.user) return;
      setTeacherName(session.user.name || session.user.username);
      const res = await api.get(`/allocation/teacher/${session.user.id}`);
      setAllocations(res.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllocations();
    const unsubscribe = navigation.addListener('focus', fetchAllocations);
    return unsubscribe;
  }, [navigation, fetchAllocations]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
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

  const renderAllocation = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardClass}>{item.class_name}</Text>
        <Text style={styles.cardSubject}>{item.subject_name}</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            navigation.navigate('ManageStudents', {
              class_id: item.class_id,
              class_name: item.class_name,
              readOnly: true,
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
          <Text style={styles.actionBtnText}>Marks</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
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
          renderItem={renderAllocation}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>
              My Assigned Classes ({allocations.length})
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No class assignments yet.</Text>
              <Text style={styles.emptySubText}>Contact admin to get assigned to a class.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fff4' },
  header: {
    backgroundColor: TEAL,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  list: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderLeftWidth: 5,
    borderLeftColor: TEAL,
  },
  cardLeft: { flex: 1 },
  cardClass: { fontSize: 17, fontWeight: '700', color: '#333' },
  cardSubject: { fontSize: 14, color: '#666', marginTop: 3 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    backgroundColor: TEAL,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  marksBtn: { backgroundColor: '#1565c0' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#666', fontWeight: '600' },
  emptySubText: { fontSize: 13, color: '#999', marginTop: 8, textAlign: 'center' },
});
