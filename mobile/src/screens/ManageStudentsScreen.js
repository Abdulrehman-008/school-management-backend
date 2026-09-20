import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  Modal, Alert, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import api from '../../services/api';

const GREEN = '#00695c';

export default function ManageStudentsScreen({ navigation, route }) {
  // When coming from TeacherDashboard, a class_id may be provided
  const presetClassId = route.params?.class_id || null;
  const presetClassName = route.params?.class_name || null;
  const readOnly = route.params?.readOnly || false;

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);

  // Enroll modal
  const [modal, setModal] = useState(false);
  const [rollNo, setRollNo] = useState('');
  const [sName, setSName] = useState('');
  const [selEnrollClass, setSelEnrollClass] = useState(null);
  const [classSubjects, setClassSubjects] = useState([]);
  const [selSubject, setSelSubject] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/school/classes');
      setClasses(res.data);
      if (presetClassId) {
        const found = res.data.find((c) => c.id === presetClassId);
        if (found) setSelectedClass(found);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }, [presetClassId]);

  const fetchStudents = useCallback(async (classId) => {
    try {
      setLoading(true);
      const url = classId ? `/students/class/${classId}` : '/students';
      const res = await api.get(url);
      setStudents(res.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchStudents(selectedClass?.id || presetClassId);
  }, [selectedClass, fetchStudents, presetClassId]);

  const onEnrollClassSelect = async (cls) => {
    setSelEnrollClass(cls);
    setSelSubject(null);
    try {
      const res = await api.get(`/school/subjects/${cls.id}`);
      setClassSubjects(res.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleEnroll = async () => {
    if (!rollNo.trim() || !sName.trim() || !selEnrollClass || !selSubject) {
      Alert.alert('Validation', 'All fields are required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/students/add', {
        roll_no: rollNo.trim(),
        name: sName.trim(),
        class_id: selEnrollClass.id,
        subject_id: selSubject.id,
      });
      Alert.alert('Success', 'Student enrolled successfully!');
      setModal(false);
      setRollNo(''); setSName(''); setSelEnrollClass(null); setSelSubject(null); setClassSubjects([]);
      fetchStudents(selectedClass?.id || presetClassId);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderStudent = ({ item }) => (
    <View style={styles.studentRow}>
      <View style={styles.rollBadge}>
        <Text style={styles.rollText}>{item.roll_no}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName}>{item.name}</Text>
        {item.class_name && !selectedClass && (
          <Text style={styles.studentClass}>{item.class_name}</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {presetClassName || 'Students'}
        </Text>
        {!readOnly && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
            <Text style={styles.addBtnText}>+ Enroll</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Class filter (only shown when not in preset mode) */}
      {!presetClassId && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedClass && styles.filterChipActive]}
              onPress={() => setSelectedClass(null)}
            >
              <Text style={[styles.filterChipText, !selectedClass && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {classes.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.filterChip, selectedClass?.id === c.id && styles.filterChipActive]}
                onPress={() => setSelectedClass(c)}
              >
                <Text style={[styles.filterChipText, selectedClass?.id === c.id && styles.filterChipTextActive]}>
                  {c.class_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={GREEN} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStudent}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.countText}>{students.length} student(s)</Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No students found.</Text>
            </View>
          }
        />
      )}

      {/* Enroll Student Modal */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Enroll New Student</Text>

              <Text style={styles.fieldLabel}>Roll Number *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 001"
                value={rollNo}
                onChangeText={setRollNo}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Student Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Full name"
                value={sName}
                onChangeText={setSName}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Select Class *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {classes.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, selEnrollClass?.id === c.id && styles.chipSelected]}
                      onPress={() => onEnrollClassSelect(c)}
                    >
                      <Text style={[styles.chipText, selEnrollClass?.id === c.id && styles.chipTextSelected]}>
                        {c.class_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {classSubjects.length > 0 && (
                <>
                  <Text style={styles.fieldLabel}>Select Subject *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {classSubjects.map((s) => (
                        <TouchableOpacity
                          key={s.id}
                          style={[styles.chip, selSubject?.id === s.id && styles.chipSelected]}
                          onPress={() => setSelSubject(s)}
                        >
                          <Text style={[styles.chipText, selSubject?.id === s.id && styles.chipTextSelected]}>
                            {s.subject_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setModal(false);
                    setRollNo(''); setSName(''); setSelEnrollClass(null); setSelSubject(null); setClassSubjects([]);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleEnroll}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Enrolling...' : 'Enroll'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0fff4' },
  header: {
    backgroundColor: GREEN,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { color: '#b2dfdb', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  addBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: GREEN, fontWeight: '700', fontSize: 13 },
  filterScroll: { maxHeight: 54, paddingVertical: 10 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  filterChip: {
    borderWidth: 1.5,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: '#fff',
  },
  filterChipActive: { backgroundColor: GREEN, borderColor: GREEN },
  filterChipText: { color: '#555', fontSize: 13 },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 16 },
  countText: { fontSize: 13, color: '#888', marginBottom: 10 },
  studentRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  rollBadge: {
    backgroundColor: GREEN,
    borderRadius: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rollText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#222' },
  studentClass: { fontSize: 12, color: '#888', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#666', fontSize: 15 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  chip: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipSelected: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { color: '#555', fontSize: 13 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 10, borderWidth: 1.5,
    borderColor: '#ddd', justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontWeight: '600' },
  saveBtn: {
    flex: 1, height: 48, backgroundColor: GREEN,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
