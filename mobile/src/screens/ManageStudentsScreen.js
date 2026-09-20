import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

const GREEN = '#00695c';

export default function ManageStudentsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const presetClassId = route.params?.class_id || null;
  const presetClassName = route.params?.class_name || null;
  const readOnly = route.params?.readOnly || false;
  const isClassTeacher = route.params?.isClassTeacher || false;

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search input
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State (Enroll / Edit)
  const [modal, setModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [rollNo, setRollNo] = useState('');
  const [sName, setSName] = useState('');
  const [fatherName, setFatherName] = useState('');
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

  const openAddModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setRollNo('');
    setSName('');
    setFatherName('');
    setSelSubject(null);

    if (presetClassId || selectedClass) {
      const cls = selectedClass || classes.find((c) => c.id === presetClassId);
      if (cls) onEnrollClassSelect(cls);
    } else {
      setSelEnrollClass(null);
      setClassSubjects([]);
    }
    setModal(true);
  };

  const openEditModal = async (student) => {
    setIsEditing(true);
    setEditingId(student.id);
    setRollNo(String(student.roll_no || ''));
    setSName(student.name || '');
    setFatherName(student.father_name || '');

    const cls = classes.find((c) => c.id === student.class_id);
    setSelEnrollClass(cls || null);

    if (student.class_id) {
      try {
        const res = await api.get(`/school/subjects/${student.class_id}`);
        setClassSubjects(res.data);
        const subj = res.data.find((s) => s.id === student.subject_id);
        setSelSubject(subj || null);
      } catch (_) {
        setClassSubjects([]);
      }
    }
    setModal(true);
  };

  const handleSaveStudent = async () => {
    if (!rollNo.trim() || !sName.trim() || !selEnrollClass) {
      Alert.alert('Validation', 'Roll No, Name, and Class are required.');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await api.put(`/students/${editingId}`, {
          roll_no: rollNo.trim(),
          name: sName.trim(),
          father_name: fatherName.trim() || 'N/A',
          class_id: selEnrollClass.id,
          subject_id: selSubject?.id || null,
        });
        Alert.alert('Success', 'Student updated successfully!');
      } else {
        await api.post('/students/add', {
          roll_no: rollNo.trim(),
          name: sName.trim(),
          father_name: fatherName.trim() || 'N/A',
          class_id: selEnrollClass.id,
          subject_id: selSubject?.id || null,
        });
        Alert.alert('Success', 'Student enrolled successfully!');
      }

      setModal(false);
      fetchStudents(selectedClass?.id || presetClassId);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStudent = (student) => {
    if (isClassTeacher) {
      Alert.alert('Permission Denied', 'Only Admin can delete students.');
      return;
    }

    Alert.alert('Delete Student', `Are you sure you want to delete ${student.name}? This will also remove their results.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/students/${student.id}`);
            Alert.alert('Deleted', 'Student has been removed.');
            fetchStudents(selectedClass?.id || presetClassId);
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        String(s.roll_no || '').toLowerCase().includes(q) ||
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.father_name || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20) + 8;

  const renderStudent = ({ item }) => (
    <View style={styles.studentRow}>
      <View style={styles.rollBadge}>
        <Text style={styles.rollText}>{item.roll_no}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentFather}>Father: {item.father_name || 'N/A'}</Text>
        {item.class_name && !selectedClass && (
          <Text style={styles.studentClass}>{item.class_name}</Text>
        )}
      </View>

      {!readOnly && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          {!isClassTeacher && (
            <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteStudent(item)}>
              <Text style={styles.delBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Dynamic Header with Status Bar padding */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{presetClassName || 'Students'}</Text>

        {!readOnly ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={openAddModal}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.addBtnText}>+ Student</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* Class filter (only when not in preset mode) */}
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

      {/* Live search input for students */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Roll No, Name or Father Name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={GREEN} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStudent}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.countText}>
              Showing {filteredStudents.length} of {students.length} student(s)
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {searchQuery ? `No students found matching "${searchQuery}"` : 'No students found.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal for Add / Edit Student */}
      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Student' : 'Enroll New Student'}
              </Text>

              <Text style={styles.fieldLabel}>Roll Number *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 101"
                value={rollNo}
                onChangeText={setRollNo}
              />

              <Text style={styles.fieldLabel}>Student Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Full name"
                value={sName}
                onChangeText={setSName}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Father Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Father / Guardian name"
                value={fatherName}
                onChangeText={setFatherName}
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
                  <Text style={styles.fieldLabel}>Optional Subject / Group</Text>
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
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveStudent}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fff4' },
  header: {
    backgroundColor: GREEN,
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  addBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtnText: { color: GREEN, fontWeight: 'bold', fontSize: 13 },
  filterScroll: { maxHeight: 54, paddingVertical: 8 },
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    height: 44,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#222' },
  searchClear: { color: '#888', fontSize: 16, paddingHorizontal: 6 },
  list: { padding: 16 },
  countText: { fontSize: 12, color: '#888', marginBottom: 10 },
  studentRow: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
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
    marginRight: 12,
  },
  rollText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#222' },
  studentFather: { fontSize: 12, color: '#666', marginTop: 2 },
  studentClass: { fontSize: 12, color: '#888', marginTop: 2 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editBtnText: { color: GREEN, fontSize: 12, fontWeight: '700' },
  delBtn: {
    backgroundColor: '#ffebee',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  delBtnText: { color: '#c62828', fontWeight: 'bold', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#666', fontSize: 14 },
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
    height: 48,
    fontSize: 15,
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
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontWeight: '600' },
  saveBtn: {
    flex: 1,
    height: 48,
    backgroundColor: GREEN,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
