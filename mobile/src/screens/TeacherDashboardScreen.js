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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearSession, loadSession } from '../services/authStorage';
import api from '../services/api';

const DARK_GREEN = '#1a4a1a';
const GOLD = '#FFD700';

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

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20) + 6;

  const renderAllocationItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.subjectIconBox}>
          <Text style={styles.subjectIcon}>📖</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.classBadgeRow}>
            <Text style={styles.classBadgeText}>{item.class_name}</Text>
          </View>
          <Text style={styles.subjectTitle}>{item.subject_name}</Text>
        </View>
      </View>

      <Text style={styles.allocationNote}>
        Manage marks and view performance for this subject.
      </Text>

      {/* 3 Dedicated Action Buttons */}
      <View style={styles.cardActions}>
        {/* Button 1: Students Roster */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.studentsBtn]}
          onPress={() =>
            navigation.navigate('ManageStudents', {
              class_id: item.class_id,
              class_name: item.class_name,
              readOnly: true,
            })
          }
        >
          <Text style={styles.studentsBtnText}>👥 Students</Text>
        </TouchableOpacity>

        {/* Button 2: Enter Marks */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.enterMarksBtn]}
          onPress={() =>
            navigation.navigate('EnterMarks', {
              class_id: item.class_id,
              subject_id: item.subject_id,
              class_name: item.class_name,
              subject_name: item.subject_name,
            })
          }
        >
          <Text style={styles.enterMarksBtnText}>✍️ Enter Marks</Text>
        </TouchableOpacity>

        {/* Button 3: Subject Result (Subject-Teacher specific view) */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.subjectResultBtn]}
          onPress={() =>
            navigation.navigate('ClassResult', {
              class_id: item.class_id,
              class_name: item.class_name,
              subject_id: item.subject_id,
              subject_name: item.subject_name,
              filterBySubject: true,
            })
          }
        >
          <Text style={styles.subjectResultBtnText}>📊 Subject Result</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
            <Text style={styles.headerSub}>Teacher Portal • {teacherName}</Text>
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
          <Text style={styles.loadingText}>Loading assigned teaching subjects...</Text>
        </View>
      ) : (
        <FlatList
          data={allocations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAllocationItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {/* Dual Role Card: If teacher is also a Class Incharge */}
              {inchargeClass && (
                <View style={styles.inchargeBox}>
                  <View style={styles.inchargeTop}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.inchargeBadgeRow}>
                        <Text style={styles.inchargeBadge}>★ CLASS INCHARGE DUAL ROLE</Text>
                      </View>
                      <Text style={styles.inchargeClassName}>{inchargeClass.class_name}</Text>
                      <Text style={styles.inchargeNote}>
                        As Class Incharge, you can view the whole class overall performance & student enrollment.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.inchargeBtnRow}>
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

                    <TouchableOpacity
                      style={[styles.inchargeBtn, styles.wholeClassBtn]}
                      onPress={() =>
                        navigation.navigate('ClassResult', {
                          class_id: inchargeClass.id,
                          class_name: inchargeClass.class_name,
                          isClassTeacher: true,
                          filterBySubject: false,
                        })
                      }
                    >
                      <Text style={styles.wholeClassBtnText}>Whole Class Result ➔</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Section Header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  My Assigned Teaching Subjects ({allocations.length})
                </Text>
                <Text style={styles.sectionSub}>
                  Enter student marks and view dedicated subject results for each allocated class.
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyText}>No subjects assigned yet.</Text>
              <Text style={styles.emptySubText}>
                Please ask the administration office to assign your teaching subjects.
              </Text>
            </View>
          }
        />
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
  list: {
    padding: 16,
    paddingBottom: 36,
  },
  inchargeBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 6,
    borderLeftColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#fed7aa',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  inchargeTop: {
    marginBottom: 12,
  },
  inchargeBadgeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  inchargeBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  inchargeClassName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  inchargeNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    lineHeight: 16,
  },
  inchargeBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  inchargeBtn: {
    flex: 1,
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#a5d6a7',
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  inchargeBtnText: {
    color: '#1b5e20',
    fontWeight: 'bold',
    fontSize: 12,
  },
  wholeClassBtn: {
    backgroundColor: DARK_GREEN,
    borderColor: DARK_GREEN,
  },
  wholeClassBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionHeader: {
    marginBottom: 12,
    marginLeft: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  sectionSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 5,
    borderLeftColor: DARK_GREEN,
    borderWidth: 1,
    borderColor: '#e0e7e1',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subjectIcon: {
    fontSize: 22,
  },
  classBadgeRow: {
    flexDirection: 'row',
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 3,
  },
  allocationNote: {
    fontSize: 12,
    color: '#777',
    marginBottom: 14,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentsBtn: {
    backgroundColor: '#f1f8e9',
    borderWidth: 1,
    borderColor: '#c5e1a5',
  },
  studentsBtnText: {
    color: '#33691e',
    fontWeight: '700',
    fontSize: 11,
  },
  enterMarksBtn: {
    backgroundColor: '#fff8e1',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  enterMarksBtnText: {
    color: '#b45309',
    fontWeight: '700',
    fontSize: 11,
  },
  subjectResultBtn: {
    backgroundColor: DARK_GREEN,
  },
  subjectResultBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 11,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e0e7e1',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emptySubText: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
});
