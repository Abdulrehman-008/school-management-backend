import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { clearSession } from '../../services/authStorage';
import api from '../../services/api';

const BLUE = '#1a237e';
const LIGHT = '#e8eaf6';

export default function AdminDashboardScreen({ navigation }) {
  const [stats, setStats] = useState({ classes: 0, teachers: 0, students: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [classesRes, teachersRes, studentsRes] = await Promise.all([
        api.get('/school/classes'),
        api.get('/auth/teachers'),
        api.get('/students'),
      ]);
      setStats({
        classes: classesRes.data.length,
        teachers: teachersRes.data.length,
        students: studentsRes.data.length,
      });
    } catch (err) {
      console.error('Stats fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const unsubscribe = navigation.addListener('focus', fetchStats);
    return unsubscribe;
  }, [navigation, fetchStats]);

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

  const navCards = [
    {
      title: 'Classes & Subjects',
      icon: '📚',
      desc: 'Add classes and manage subjects',
      screen: 'ManageClasses',
      color: '#3949ab',
    },
    {
      title: 'Teachers',
      icon: '👩‍🏫',
      desc: 'Register teachers & assign classes',
      screen: 'ManageTeachers',
      color: '#1565c0',
    },
    {
      title: 'Students',
      icon: '🎒',
      desc: 'Enroll students & view rosters',
      screen: 'ManageStudents',
      color: '#00695c',
    },
    {
      title: 'Report Cards',
      icon: '📊',
      desc: 'View & generate result PDFs',
      screen: 'ReportCard',
      color: '#6a1b9a',
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>School Management System</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats Row */}
        {loading ? (
          <ActivityIndicator color={BLUE} size="large" style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.statsRow}>
            {[
              { label: 'Classes', value: stats.classes },
              { label: 'Teachers', value: stats.teachers },
              { label: 'Students', value: stats.students },
            ].map((s) => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {/* Nav Cards */}
        {navCards.map((card) => (
          <TouchableOpacity
            key={card.screen}
            style={[styles.navCard, { borderLeftColor: card.color }]}
            onPress={() => navigation.navigate(card.screen)}
            activeOpacity={0.8}
          >
            <Text style={styles.navIcon}>{card.icon}</Text>
            <View style={styles.navInfo}>
              <Text style={[styles.navTitle, { color: card.color }]}>{card.title}</Text>
              <Text style={styles.navDesc}>{card.desc}</Text>
            </View>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    backgroundColor: BLUE,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerSub: { color: '#c5cae9', fontSize: 12, marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#ef5350',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  content: { padding: 20 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  statValue: { fontSize: 28, fontWeight: 'bold', color: BLUE },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 14,
  },
  navCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  navIcon: { fontSize: 32, marginRight: 16 },
  navInfo: { flex: 1 },
  navTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  navDesc: { fontSize: 13, color: '#888' },
  navArrow: { fontSize: 28, color: '#bbb', fontWeight: '300' },
});
