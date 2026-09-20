import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import api from '../services/api';
import { enqueue, getQueue } from '../services/offlineQueue';
import { syncPendingMarks } from '../services/syncService';

const DARK_BLUE = '#1565c0';
const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Final'];

export default function EnterMarksScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { class_id, subject_id, class_name, subject_name } = route.params;

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [selStudent, setSelStudent] = useState(null);
  const [selTerm, setSelTerm] = useState('Term 1');
  const [examName, setExamName] = useState('Annual Examination');
  const [marksObtained, setMarksObtained] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [saving, setSaving] = useState(false);

  // Offline support
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const updatePendingCount = async () => {
    const queue = await getQueue();
    setPendingCount(queue.length);
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online) {
        syncPendingMarks().then(() => updatePendingCount());
      }
    });

    updatePendingCount();
    return () => unsubscribe();
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get(`/students/class/${class_id}`);
      setStudents(res.data);
    } catch (err) {
      Alert.alert('Notice', 'Could not load live student list. Using cached data if offline.');
    } finally {
      setLoading(false);
    }
  }, [class_id]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Filter students in real-time by Roll No or Name
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      const matchRoll = String(s.roll_no || '').toLowerCase().includes(q);
      const matchName = String(s.name || '').toLowerCase().includes(q);
      return matchRoll || matchName;
    });
  }, [students, searchQuery]);

  const handleSubmit = async () => {
    if (!selStudent) {
      Alert.alert('Validation', 'Please select a student from the list.');
      return;
    }

    if (!marksObtained || !totalMarks) {
      Alert.alert('Validation', 'Please enter marks obtained and total marks.');
      return;
    }

    const obtained = parseFloat(marksObtained);
    const total = parseFloat(totalMarks);

    if (isNaN(obtained) || isNaN(total) || obtained < 0 || total <= 0 || obtained > total) {
      Alert.alert('Validation', 'Marks obtained must be between 0 and total marks.');
      return;
    }

    setSaving(true);
    const payload = {
      student_id: selStudent.id,
      subject_id,
      term: selTerm,
      exam_name: examName.trim() || 'General Exam',
      marks_obtained: obtained,
      total_marks: total,
    };

    try {
      if (isOnline) {
        await api.post('/results/add', payload);
        Alert.alert('Success', `Marks saved for Roll #${selStudent.roll_no} - ${selStudent.name}!`, [
          {
            text: 'Enter Next',
            onPress: () => {
              setSelStudent(null);
              setMarksObtained('');
              setSearchQuery('');
            },
          },
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } else {
        await enqueue(payload);
        await updatePendingCount();
        Alert.alert(
          'Saved Offline',
          `No internet. Marks saved to device queue for Roll #${selStudent.roll_no} - ${selStudent.name}. Will sync automatically when back online.`,
          [
            {
              text: 'Enter Next',
              onPress: () => {
                setSelStudent(null);
                setMarksObtained('');
                setSearchQuery('');
              },
            },
            { text: 'Done', onPress: () => navigation.goBack() },
          ]
        );
      }
    } catch (err) {
      await enqueue(payload);
      await updatePendingCount();
      Alert.alert(
        'Offline Queued',
        'Server unreachable. Marks safely stored on device and will sync automatically.'
      );
    } finally {
      setSaving(false);
    }
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20) + 8;

  return (
    <View style={styles.container}>
      {/* Header with notch padding */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Enter Marks</Text>
          <Text style={styles.headerSub}>
            {class_name} • {subject_name}
          </Text>
        </View>
        <View style={styles.networkBadge}>
          <Text style={[styles.networkDot, { color: isOnline ? '#4caf50' : '#ff9800' }]}>●</Text>
          <Text style={styles.networkText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      {pendingCount > 0 && (
        <View style={styles.pendingBar}>
          <Text style={styles.pendingText}>
            ⏳ {pendingCount} offline mark(s) queued for sync.
          </Text>
          {isOnline && (
            <TouchableOpacity
              onPress={() => syncPendingMarks().then(() => updatePendingCount())}
            >
              <Text style={styles.syncBtnText}>Sync Now</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Step 1: Select Student with Real-time Search */}
        <Text style={styles.sectionLabel}>1. Select Student (Search by Roll No / Name)</Text>

        {/* Live Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Type Roll No or Student Name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={DARK_BLUE} />
        ) : (
          <ScrollView style={styles.studentList} nestedScrollEnabled>
            {filteredStudents.length === 0 ? (
              <Text style={styles.noStudentsText}>
                {searchQuery ? `No student matches "${searchQuery}"` : 'No students found in this class.'}
              </Text>
            ) : (
              filteredStudents.map((s) => {
                const isSelected = selStudent?.id === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.studentRow, isSelected && styles.studentRowSelected]}
                    onPress={() => setSelStudent(s)}
                  >
                    <View style={[styles.rollBadge, isSelected && styles.rollBadgeSelected]}>
                      <Text style={[styles.rollText, isSelected && { color: '#fff' }]}>
                        {s.roll_no}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.studentName, isSelected && styles.studentNameSelected]}>
                        {s.name}
                      </Text>
                      <Text style={styles.fatherSub}>Father: {s.father_name || 'N/A'}</Text>
                    </View>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Step 2: Exam Name */}
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>2. Exam Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Annual Examination 2024"
          value={examName}
          onChangeText={setExamName}
        />

        {/* Step 3: Term */}
        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>3. Select Term</Text>
        <View style={styles.termRow}>
          {TERMS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.termChip, selTerm === t && styles.termChipSelected]}
              onPress={() => setSelTerm(t)}
            >
              <Text style={[styles.termChipText, selTerm === t && styles.termChipTextSelected]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step 4: Marks */}
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>4. Enter Marks</Text>
        <View style={styles.marksRow}>
          <View style={styles.marksField}>
            <Text style={styles.fieldLabel}>Marks Obtained</Text>
            <TextInput
              style={styles.marksInput}
              placeholder="e.g. 85"
              value={marksObtained}
              onChangeText={setMarksObtained}
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.slash}>/</Text>
          <View style={styles.marksField}>
            <Text style={styles.fieldLabel}>Total Marks</Text>
            <TextInput
              style={styles.marksInput}
              placeholder="e.g. 100"
              value={totalMarks}
              onChangeText={setTotalMarks}
              keyboardType="numeric"
            />
          </View>
        </View>

        {selStudent && marksObtained && totalMarks && (
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              📝 Roll #{selStudent.roll_no} - {selStudent.name} • {examName} • {marksObtained}/{totalMarks}
              {' '}({((parseFloat(marksObtained) / parseFloat(totalMarks)) * 100).toFixed(1)}%)
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          <Text style={styles.submitBtnText}>
            {saving ? 'Saving...' : isOnline ? 'Submit Marks' : 'Save Marks Offline'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    backgroundColor: DARK_BLUE,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  headerActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  backBtn: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
  headerSub: { color: '#90caf9', fontSize: 11, textAlign: 'center', marginTop: 1 },
  networkBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  networkDot: { fontSize: 14 },
  networkText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  pendingBar: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ffe0b2',
  },
  pendingText: { fontSize: 12, color: '#e65100', fontWeight: '600' },
  syncBtnText: { fontSize: 12, color: '#1565c0', fontWeight: 'bold', textDecorationLine: 'underline' },
  content: { padding: 18, paddingBottom: 30 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 10 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    marginBottom: 10,
    height: 44,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#222' },
  clearSearch: { color: '#888', fontSize: 16, paddingHorizontal: 6 },
  studentList: { maxHeight: 200, backgroundColor: '#fff', borderRadius: 12, elevation: 2 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  studentRowSelected: { backgroundColor: '#e8eaf6' },
  rollBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#e8eaf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rollBadgeSelected: { backgroundColor: DARK_BLUE },
  rollText: { color: '#1a237e', fontWeight: '700', fontSize: 13 },
  studentName: { fontSize: 15, color: '#333', fontWeight: '500' },
  studentNameSelected: { fontWeight: '700', color: DARK_BLUE },
  fatherSub: { fontSize: 11, color: '#777', marginTop: 1 },
  checkmark: { color: DARK_BLUE, fontSize: 18, fontWeight: '700' },
  noStudentsText: { padding: 16, color: '#888', fontStyle: 'italic', textAlign: 'center' },
  input: {
    height: 46,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  termRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  termChip: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  termChipSelected: { backgroundColor: DARK_BLUE, borderColor: DARK_BLUE },
  termChipText: { color: '#555', fontSize: 13 },
  termChipTextSelected: { color: '#fff', fontWeight: '600' },
  marksRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  marksField: { flex: 1 },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 6 },
  marksInput: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  slash: { fontSize: 26, color: '#bbb', marginBottom: 10 },
  preview: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  previewText: { fontSize: 13, color: '#2e7d32', fontWeight: '600' },
  submitBtn: {
    height: 50,
    backgroundColor: DARK_BLUE,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
