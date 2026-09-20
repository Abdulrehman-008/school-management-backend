import React, { useEffect, useState, useCallback } from 'react';
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
  SafeAreaView,
  ScrollView,
} from 'react-native';
import api from '../services/api';

const BLUE = '#1a237e';

export default function ManageClassesScreen({ navigation, route }) {
  const isClassTeacher = route.params?.isClassTeacher || false;
  const targetClassId = route.params?.targetClassId || null;

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState({});
  const [loading, setLoading] = useState(true);

  // Add / Edit Class modal
  const [classModal, setClassModal] = useState(false);
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState(null);
  const [newClassName, setNewClassName] = useState('');
  const [selClassTeacherId, setSelClassTeacherId] = useState(null);
  const [savingClass, setSavingClass] = useState(false);

  // Add / Edit Subject modal
  const [subjectModal, setSubjectModal] = useState(false);
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const [clsRes, tRes] = await Promise.all([
        api.get('/school/classes'),
        api.get('/auth/teachers'),
      ]);

      let classList = clsRes.data;
      if (isClassTeacher && targetClassId) {
        classList = classList.filter((c) => c.id === targetClassId);
      }

      setClasses(classList);
      setTeachers(tRes.data);

      const subjectPromises = classList.map((c) =>
        api.get(`/school/subjects/${c.id}`).then((r) => ({ id: c.id, data: r.data }))
      );
      const results = await Promise.all(subjectPromises);
      const subjectMap = {};
      results.forEach(({ id, data }) => {
        subjectMap[id] = data;
      });
      setSubjects(subjectMap);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [isClassTeacher, targetClassId]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const openAddClassModal = () => {
    setIsEditingClass(false);
    setEditingClassId(null);
    setNewClassName('');
    setSelClassTeacherId(null);
    setClassModal(true);
  };

  const openEditClassModal = (item) => {
    setIsEditingClass(true);
    setEditingClassId(item.id);
    setNewClassName(item.class_name);
    setSelClassTeacherId(item.class_teacher_id || null);
    setClassModal(true);
  };

  const handleSaveClass = async () => {
    if (!newClassName.trim()) {
      Alert.alert('Validation', 'Class name is required.');
      return;
    }
    setSavingClass(true);
    try {
      if (isEditingClass) {
        await api.put(`/school/classes/${editingClassId}`, {
          class_name: newClassName.trim(),
          class_teacher_id: selClassTeacherId,
        });
        Alert.alert('Success', 'Class updated successfully.');
      } else {
        await api.post('/school/add-class', {
          class_name: newClassName.trim(),
        });
        Alert.alert('Success', 'Class created successfully.');
      }
      setClassModal(false);
      fetchClasses();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = (item) => {
    if (isClassTeacher) {
      Alert.alert('Access Denied', 'Only admin can delete classes.');
      return;
    }
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete ${item.class_name}? All associated subjects and allocations will be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/school/classes/${item.id}`);
              Alert.alert('Deleted', 'Class deleted.');
              fetchClasses();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const openAddSubjectModal = (cls) => {
    setSelectedClass(cls);
    setIsEditingSubject(false);
    setEditingSubjectId(null);
    setNewSubjectName('');
    setSubjectModal(true);
  };

  const openEditSubjectModal = (cls, subj) => {
    setSelectedClass(cls);
    setIsEditingSubject(true);
    setEditingSubjectId(subj.id);
    setNewSubjectName(subj.subject_name);
    setSubjectModal(true);
  };

  const handleSaveSubject = async () => {
    if (!newSubjectName.trim()) {
      Alert.alert('Validation', 'Subject name is required.');
      return;
    }
    setSavingSubject(true);
    try {
      if (isEditingSubject) {
        await api.put(`/school/subjects/${editingSubjectId}`, {
          subject_name: newSubjectName.trim(),
        });
        Alert.alert('Success', 'Subject updated successfully.');
      } else {
        await api.post('/school/add-subject', {
          subject_name: newSubjectName.trim(),
          class_id: selectedClass.id,
        });
        Alert.alert('Success', 'Subject added successfully.');
      }
      setSubjectModal(false);
      fetchClasses();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingSubject(false);
    }
  };

  const handleDeleteSubject = (subj) => {
    if (isClassTeacher) {
      Alert.alert('Access Denied', 'Only admin can delete subjects.');
      return;
    }
    Alert.alert(
      'Delete Subject',
      `Delete "${subj.subject_name}"? Allocations for this subject will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/school/subjects/${subj.id}`);
              fetchClasses();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const renderClass = ({ item }) => (
    <View style={styles.classCard}>
      <View style={styles.classHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.className}>{item.class_name}</Text>
          <Text style={styles.classTeacherSub}>
            Incharge: {item.class_teacher_name || 'Not Assigned'}
          </Text>
        </View>

        <View style={styles.headerBtnGroup}>
          <TouchableOpacity
            style={styles.addSubjectBtn}
            onPress={() => openAddSubjectModal(item)}
          >
            <Text style={styles.addSubjectBtnText}>+ Subject</Text>
          </TouchableOpacity>

          {!isClassTeacher && (
            <>
              <TouchableOpacity
                style={styles.classEditBtn}
                onPress={() => openEditClassModal(item)}
              >
                <Text style={styles.classEditBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.classDelBtn}
                onPress={() => handleDeleteClass(item)}
              >
                <Text style={styles.classDelBtnText}>✕</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.subjectsRow}>
        {(subjects[item.id] || []).length === 0 ? (
          <Text style={styles.noSubjects}>No subjects added yet</Text>
        ) : (
          (subjects[item.id] || []).map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.subjectChip}
              onPress={() => openEditSubjectModal(item, s)}
              onLongPress={() => handleDeleteSubject(s)}
            >
              <Text style={styles.subjectChipText}>{s.subject_name}</Text>
              {!isClassTeacher && (
                <Text style={styles.chipCross} onPress={() => handleDeleteSubject(s)}>
                  ✕
                </Text>
              )}
            </TouchableOpacity>
          ))
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
        <Text style={styles.headerTitle}>Classes & Subjects</Text>
        {!isClassTeacher ? (
          <TouchableOpacity style={styles.addBtn} onPress={openAddClassModal}>
            <Text style={styles.addBtnText}>+ Class</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={BLUE} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderClass}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No classes found.</Text>
            </View>
          }
        />
      )}

      {/* Add / Edit Class Modal */}
      <Modal visible={classModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                {isEditingClass ? 'Edit Class' : 'Add New Class'}
              </Text>

              <Text style={styles.fieldLabel}>Class Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Class 10"
                value={newClassName}
                onChangeText={setNewClassName}
              />

              {isEditingClass && (
                <>
                  <Text style={styles.fieldLabel}>Assign Class Incharge / Teacher</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.tChip, !selClassTeacherId && styles.tChipSelected]}
                        onPress={() => setSelClassTeacherId(null)}
                      >
                        <Text style={[styles.tChipText, !selClassTeacherId && styles.tChipTextSelected]}>
                          None
                        </Text>
                      </TouchableOpacity>
                      {teachers.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.tChip, selClassTeacherId === t.id && styles.tChipSelected]}
                          onPress={() => setSelClassTeacherId(t.id)}
                        >
                          <Text style={[styles.tChipText, selClassTeacherId === t.id && styles.tChipTextSelected]}>
                            {t.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setClassModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveClass}
                  disabled={savingClass}
                >
                  <Text style={styles.saveBtnText}>
                    {savingClass ? 'Saving...' : isEditingClass ? 'Update' : 'Add Class'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Add / Edit Subject Modal */}
      <Modal visible={subjectModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {isEditingSubject ? 'Edit Subject' : `Add Subject to ${selectedClass?.class_name}`}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Subject name (e.g. Mathematics)"
              value={newSubjectName}
              onChangeText={setNewSubjectName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSubjectModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveSubject}
                disabled={savingSubject}
              >
                <Text style={styles.saveBtnText}>
                  {savingSubject ? 'Saving...' : isEditingSubject ? 'Update' : 'Add Subject'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    backgroundColor: BLUE,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { color: '#c5cae9', fontSize: 22 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  addBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: { color: BLUE, fontWeight: '700', fontSize: 13 },
  list: { padding: 16 },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderLeftWidth: 5,
    borderLeftColor: BLUE,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  className: { fontSize: 17, fontWeight: '700', color: '#222' },
  classTeacherSub: { fontSize: 12, color: '#666', marginTop: 2 },
  headerBtnGroup: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addSubjectBtn: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addSubjectBtnText: { color: BLUE, fontSize: 12, fontWeight: '700' },
  classEditBtn: {
    backgroundColor: '#ede7f6',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  classEditBtnText: { color: '#512da8', fontSize: 12, fontWeight: '700' },
  classDelBtn: {
    backgroundColor: '#ffebee',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classDelBtnText: { color: '#c62828', fontWeight: 'bold', fontSize: 12 },
  subjectsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  subjectChip: {
    backgroundColor: '#e8eaf6',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subjectChipText: { color: BLUE, fontSize: 13, fontWeight: '500' },
  chipCross: { color: '#888', fontSize: 11, fontWeight: 'bold' },
  noSubjects: { color: '#bbb', fontSize: 13, fontStyle: 'italic' },
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
    height: 48,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  tChip: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tChipSelected: { backgroundColor: BLUE, borderColor: BLUE },
  tChipText: { color: '#555', fontSize: 12 },
  tChipTextSelected: { color: '#fff', fontWeight: 'bold' },
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
    backgroundColor: BLUE,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
