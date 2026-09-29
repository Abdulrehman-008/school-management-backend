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
import { clearSession, loadSession } from '../services/authStorage';
import api from '../services/api';

const DARK_GREEN = '#1a4a1a';
const GOLD = '#FFD700';

export default function ClassTeacherDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [assignedClass, setAssignedClass] = useState(null);
  const [teacherName, setTeacherName] = useState('');
  const [studentsCount, setStudentsCount] = useState(0);
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [classAverage, setClassAverage] = useState('0.0');
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
        const [studRes, subjRes, resultsRes] = await Promise.all([
          api.get(`/students/class/${myClass.id}`),
          api.get(`/school/subjects/${myClass.id}`),
          api.get(`/results/class/${myClass.id}`).catch(() => ({ data: [] })),
        ]);
        setStudentsCount(studRes.data.length);
        setSubjectsCount(subjRes.data.length);

        const results = resultsRes.data || [];
        if (results.length > 0) {
          const totalPct = results.reduce((acc, curr) => acc + Number(curr.percentage || 0), 0);
          setClassAverage((totalPct / results.length).toFixed(1));
        }
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
    Alert.alert('Logout', 'Are you sure you want to logout from Class Teacher Portal?', [
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

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20) + 6;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_GREEN} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/school_logo.png')}
            style={styles.headerLogo}
            resizeMode="cover"
          />
          <View style={styles.headerTitles}>
            <Text style={styles.schoolName}>Govt. High School Pindi Bawray</Text>
            <Text style={styles.headerSub}>Class Incharge Portal • {teacherName}</Text>
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={DARK_GREEN} size="large" />
          <Text style={styles.loadingText}>Loading class details...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {assignedClass ? (
            <>
              {/* Incharge Class Hero Card */}
              <View style={styles.inchargeHeroCard}>
                <View style={styles.heroTopRow}>
                  <View style={styles.goldBadge}>
                    <Text style={styles.goldBadgeText}>★ CLASS INCHARGE</Text>
                  </View>
                  <Text style={styles.urduMotto}>گورنمنٹ ہائی سکول</Text>
                </View>

                <Text style={styles.heroClassName}>{assignedClass.class_name}</Text>
                <Text style={styles.heroSubText}>
                  You have full administrative authority over this class roster and overall results.
                </Text>

                {/* Live Class Stats Widgets */}
                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatValue}>{studentsCount}</Text>
                    <Text style={styles.heroStatLabel}>Students</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatValue}>{subjectsCount}</Text>
                    <Text style={styles.heroStatLabel}>Subjects</Text>
                  </View>
                  <View style={styles.heroStatDivider} />
                  <View style={styles.heroStatItem}>
                    <Text style={[styles.heroStatValue, { color: '#2e7d32' }]}>{classAverage}%</Text>
                    <Text style={styles.heroStatLabel}>Class Avg</Text>
                  </View>
                </View>
              </View>

              {/* Primary Feature: Whole Class Performance Widget */}
              <Text style={styles.sectionHeading}>OVERALL CLASS PERFORMANCE</Text>

              <TouchableOpacity
                style={styles.performanceBannerWidget}
                onPress={() =>
                  navigation.navigate('ClassResult', {
                    class_id: assignedClass.id,
                    class_name: assignedClass.class_name,
                    isClassTeacher: true,
                    teacherName,
                  })
                }
                activeOpacity={0.85}
              >
                <View style={styles.perfLeft}>
                  <View style={styles.perfIconBox}>
                    <Text style={styles.perfIcon}>📊</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.perfBadgeRow}>
                      <Text style={styles.perfBadge}>FULL CLASS RESULT</Text>
                    </View>
                    <Text style={styles.perfTitle}>Whole Class Performance Sheet</Text>
                    <Text style={styles.perfDesc}>
                      View complete student rankings, marks, class average & export official PDF.
                    </Text>
                  </View>
                </View>
                <View style={styles.perfArrowCircle}>
                  <Text style={styles.perfArrow}>➔</Text>
                </View>
              </TouchableOpacity>

              {/* Management Widgets Grid */}
              <Text style={[styles.sectionHeading, { marginTop: 18 }]}>CLASS MANAGEMENT WIDGETS</Text>

              <View style={styles.gridContainer}>
                {/* Widget 1: Manage Students */}
                <TouchableOpacity
                  style={styles.actionWidget}
                  onPress={() =>
                    navigation.navigate('ManageStudents', {
                      class_id: assignedClass.id,
                      class_name: assignedClass.class_name,
                      isClassTeacher: true,
                      readOnly: false,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#e8f5e9' }]}>
                    <Text style={styles.actionIcon}>🎒</Text>
                  </View>
                  <Text style={styles.actionWidgetTitle}>Manage Students</Text>
                  <Text style={styles.actionWidgetDesc}>Enroll, edit, and view class roster</Text>
                  <Text style={styles.actionWidgetAction}>Manage ➔</Text>
                </TouchableOpacity>

                {/* Widget 2: Manage Subjects */}
                <TouchableOpacity
                  style={styles.actionWidget}
                  onPress={() =>
                    navigation.navigate('ManageClasses', {
                      isClassTeacher: true,
                      targetClassId: assignedClass.id,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#e0f2f1' }]}>
                    <Text style={styles.actionIcon}>📚</Text>
                  </View>
                  <Text style={styles.actionWidgetTitle}>Class Subjects</Text>
                  <Text style={styles.actionWidgetDesc}>View allocated subjects & curriculum</Text>
                  <Text style={styles.actionWidgetAction}>View ➔</Text>
                </TouchableOpacity>

                {/* Widget 3: Report Cards */}
                <TouchableOpacity
                  style={styles.actionWidget}
                  onPress={() => navigation.navigate('ReportCard')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#f1f8e9' }]}>
                    <Text style={styles.actionIcon}>📄</Text>
                  </View>
                  <Text style={styles.actionWidgetTitle}>Report Cards</Text>
                  <Text style={styles.actionWidgetDesc}>Individual student marks & PDF card</Text>
                  <Text style={styles.actionWidgetAction}>Search ➔</Text>
                </TouchableOpacity>

                {/* Widget 4: Password Security */}
                <TouchableOpacity
                  style={styles.actionWidget}
                  onPress={() => navigation.navigate('ChangePassword')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: '#eceff1' }]}>
                    <Text style={styles.actionIcon}>🔒</Text>
                  </View>
                  <Text style={styles.actionWidgetTitle}>Account Password</Text>
                  <Text style={styles.actionWidgetDesc}>Update your portal login password</Text>
                  <Text style={styles.actionWidgetAction}>Update ➔</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.unassignedBox}>
              <Text style={styles.unassignedIcon}>⚠️</Text>
              <Text style={styles.unassignedTitle}>No Class Assigned</Text>
              <Text style={styles.unassignedText}>
                The school administrator has not designated you as incharge of any class yet. Please contact the administration office.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: DARK_GREEN,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  inchargeHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#c8e6c9',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    marginBottom: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goldBadge: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  goldBadgeText: {
    color: '#b45309',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  urduMotto: {
    fontSize: 13,
    color: DARK_GREEN,
    fontWeight: 'bold',
  },
  heroClassName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: DARK_GREEN,
    marginTop: 2,
  },
  heroSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    lineHeight: 17,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: DARK_GREEN,
  },
  heroStatLabel: {
    fontSize: 11,
    color: '#777',
    fontWeight: '600',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e0e0e0',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2e7d32',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  performanceBannerWidget: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#1b5e20',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  perfLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  perfIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  perfIcon: {
    fontSize: 26,
  },
  perfBadgeRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  perfBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1b5e20',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  perfTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  perfDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    lineHeight: 16,
  },
  perfArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1b5e20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfArrow: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionWidget: {
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
    minHeight: 130,
    justifyContent: 'space-between',
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionWidgetTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  actionWidgetDesc: {
    fontSize: 11,
    color: '#777',
    lineHeight: 14,
  },
  actionWidgetAction: {
    fontSize: 11,
    fontWeight: '700',
    color: DARK_GREEN,
    marginTop: 8,
    textAlign: 'right',
  },
  unassignedBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  unassignedIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  unassignedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 8,
  },
  unassignedText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 19,
  },
});
