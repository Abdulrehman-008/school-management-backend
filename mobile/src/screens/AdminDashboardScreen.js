import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearSession } from '../services/authStorage';
import api from '../services/api';

const DARK_GREEN = '#1a4a1a';
const GOLD = '#FFD700';

export default function AdminDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
    Alert.alert('Logout', 'Are you sure you want to logout from Admin Panel?', [
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

  const widgets = [
    {
      id: 'classes',
      title: 'Classes & Subjects',
      subtitle: 'Manage classes, sections & subjects',
      icon: '📚',
      screen: 'ManageClasses',
      accentColor: '#1b5e20',
      badge: 'Academic',
    },
    {
      id: 'teachers',
      title: 'Teachers',
      subtitle: 'Staff registry, credentials & roles',
      icon: '👨‍🏫',
      screen: 'ManageTeachers',
      accentColor: '#2e7d32',
      badge: 'Faculty',
    },
    {
      id: 'students',
      title: 'Students',
      subtitle: 'Enrollment, roster & student details',
      icon: '🎒',
      screen: 'ManageStudents',
      accentColor: '#00695c',
      badge: 'Admissions',
    },
    {
      id: 'report_cards',
      title: 'Report Cards',
      subtitle: 'Student result cards & PDF export',
      icon: '📄',
      screen: 'ReportCard',
      accentColor: '#388e3c',
      badge: 'Evaluation',
    },
    {
      id: 'class_results',
      title: 'Class Results',
      subtitle: 'Whole class performance & sheet PDF',
      icon: '📊',
      screen: 'ClassResult',
      accentColor: '#004d40',
      badge: 'Analytics',
    },
    {
      id: 'password',
      title: 'Security',
      subtitle: 'Change admin portal password',
      icon: '🔒',
      screen: 'ChangePassword',
      accentColor: '#37474f',
      badge: 'Settings',
    },
  ];

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20) + 6;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_GREEN} />

      {/* Header with School Branding */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/school_logo.png')}
            style={styles.headerLogo}
            resizeMode="cover"
          />
          <View style={styles.headerTitles}>
            <Text style={styles.schoolName}>Govt. High School Pindi Bawray</Text>
            <Text style={styles.headerSub}>Admin Portal • Hafizabad</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* School Urdu Banner Ribbon */}
        <View style={styles.bannerRibbon}>
          <Text style={styles.bannerUrduText}>گورنمنٹ ہائی سکول پنڈی باوِرے، ضلع حافظ آباد</Text>
        </View>

        {/* Quick Stats Summary Widgets */}
        <Text style={styles.sectionHeading}>OVERVIEW</Text>
        {loading ? (
          <ActivityIndicator color={DARK_GREEN} size="large" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsRow}>
            <View style={[styles.statWidget, { borderBottomColor: '#2e7d32' }]}>
              <Text style={styles.statIcon}>🏛️</Text>
              <Text style={styles.statValue}>{stats.classes}</Text>
              <Text style={styles.statLabel}>Classes</Text>
            </View>

            <View style={[styles.statWidget, { borderBottomColor: '#00695c' }]}>
              <Text style={styles.statIcon}>👨‍🏫</Text>
              <Text style={styles.statValue}>{stats.teachers}</Text>
              <Text style={styles.statLabel}>Teachers</Text>
            </View>

            <View style={[styles.statWidget, { borderBottomColor: '#1b5e20' }]}>
              <Text style={styles.statIcon}>🎓</Text>
              <Text style={styles.statValue}>{stats.students}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
          </View>
        )}

        {/* 2-Column Administrative Action Widgets */}
        <Text style={[styles.sectionHeading, { marginTop: 14 }]}>MANAGEMENT WIDGETS</Text>
        <View style={styles.widgetGrid}>
          {widgets.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={styles.gridWidget}
              onPress={() => navigation.navigate(w.screen)}
              activeOpacity={0.78}
            >
              <View style={styles.widgetTopRow}>
                <View style={[styles.widgetIconWrap, { backgroundColor: '#e8f5e9' }]}>
                  <Text style={styles.widgetIconText}>{w.icon}</Text>
                </View>
                <View style={[styles.widgetBadge, { borderColor: w.accentColor }]}>
                  <Text style={[styles.widgetBadgeText, { color: w.accentColor }]}>{w.badge}</Text>
                </View>
              </View>

              <Text style={styles.widgetTitle}>{w.title}</Text>
              <Text style={styles.widgetSubtitle} numberOfLines={2}>
                {w.subtitle}
              </Text>

              <View style={styles.widgetFooter}>
                <Text style={[styles.widgetOpenText, { color: w.accentColor }]}>Open</Text>
                <Text style={[styles.widgetArrow, { color: w.accentColor }]}>➔</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  header: {
    backgroundColor: DARK_GREEN,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: GOLD,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  headerTitles: {
    flex: 1,
  },
  schoolName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSub: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  logoutBtn: {
    backgroundColor: '#c62828',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 34,
  },
  bannerRibbon: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c8e6c9',
    marginBottom: 16,
  },
  bannerUrduText: {
    color: DARK_GREEN,
    fontSize: 15,
    fontWeight: 'bold',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2e7d32',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statWidget: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: DARK_GREEN,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    marginTop: 2,
  },
  widgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridWidget: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e7e1',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    justifyContent: 'space-between',
    minHeight: 140,
  },
  widgetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  widgetIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetIconText: {
    fontSize: 20,
  },
  widgetBadge: {
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  widgetBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  widgetTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  widgetSubtitle: {
    fontSize: 11,
    color: '#666',
    lineHeight: 15,
  },
  widgetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 4,
  },
  widgetOpenText: {
    fontSize: 12,
    fontWeight: '700',
  },
  widgetArrow: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
