import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  Alert, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import api from '../../services/api';

const DARK_BLUE = '#1565c0';
const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Final'];

export default function EnterMarksScreen({ navigation, route }) {
  const { class_id, subject_id, class_name, subject_name } = route.params;

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selStudent, setSelStudent] = useState(null);
  const [selTerm, setSelTerm] = useState(null);
  const [marksObtained, setMarksObtained] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [saving, setSaving] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get(`/students/class/${class_id}`);
      setStudents(res.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [class_id]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleSubmit = async () => {
    if (!selStudent || !selTerm || !marksObtained || !totalMarks) {
      Alert.alert('Validation', 'Please select student, term and enter marks.');
      return;
    }
    const obtained = parseFloat(marksObtained);
    const total = parseFloat(totalMarks);
    if (isNaN(obtained) || isNaN(total) || obtained < 0 || total <= 0 || obtained > total) {
      Alert.alert('Validation', 'Marks obtained must be between 0 and total marks.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/results/add', {
        student_id: selStudent.id,
        subject_id,
        term: selTerm,
        marks_obtained: obtained,
        total_marks: total,
      });
      Alert.alert('Success', `Marks saved for ${selStudent.name}!`, [
        {
          text: 'Enter More',
          onPress: () => {
            setSelStudent(null);
            setSelTerm(null);
            setMarksObtained('');
            setTotalMarks('100');
          },
        },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Enter Marks</Text>
          <Text style={styles.headerSub}>{class_name} — {subject_name}</Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Select Student */}
        <Text style={styles.sectionLabel}>1. Select Student</Text>
        {loading ? (
          <ActivityIndicator color={DARK_BLUE} />
        ) : (
          <ScrollView style={styles.studentList} nestedScrollEnabled>
            {students.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.studentRow, selStudent?.id === s.id && styles.studentRowSelected]}
                onPress={() => setSelStudent(s)}
              >
                <View style={[styles.rollBadge, selStudent?.id === s.id && styles.rollBadgeSelected]}>
                  <Text style={styles.rollText}>{s.roll_no}</Text>
                </View>
                <Text style={[styles.studentName, selStudent?.id === s.id && styles.studentNameSelected]}>
                  {s.name}
                </Text>
                {selStudent?.id === s.id && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Select Term */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>2. Select Term</Text>
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

        {/* Enter Marks */}
        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>3. Enter Marks</Text>
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

        {/* Summary Preview */}
        {selStudent && selTerm && marksObtained && totalMarks && (
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              📝 {selStudent.name} • {selTerm} • {marksObtained}/{totalMarks}
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
            {saving ? 'Saving...' : 'Submit Marks'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    backgroundColor: DARK_BLUE,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { color: '#90caf9', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  headerSub: { color: '#90caf9', fontSize: 12, textAlign: 'center', marginTop: 2 },
  content: { padding: 20 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 12 },
  studentList: { maxHeight: 220, backgroundColor: '#fff', borderRadius: 12, elevation: 2 },
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
  studentName: { flex: 1, fontSize: 15, color: '#333' },
  studentNameSelected: { fontWeight: '600', color: DARK_BLUE },
  checkmark: { color: DARK_BLUE, fontSize: 18, fontWeight: '700' },
  termRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  termChip: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  termChipSelected: { backgroundColor: DARK_BLUE, borderColor: DARK_BLUE },
  termChipText: { color: '#555', fontSize: 14 },
  termChipTextSelected: { color: '#fff', fontWeight: '600' },
  marksRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  marksField: { flex: 1 },
  fieldLabel: { fontSize: 13, color: '#666', marginBottom: 6 },
  marksInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  slash: { fontSize: 30, color: '#bbb', marginBottom: 10 },
  preview: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 14,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  previewText: { fontSize: 14, color: '#2e7d32', fontWeight: '600' },
  submitBtn: {
    height: 52,
    backgroundColor: DARK_BLUE,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
});
