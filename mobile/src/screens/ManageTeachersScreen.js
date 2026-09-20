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
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

const INDIGO = '#3949ab';

export default function ManageTeachersScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [teachers, setTeachers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Register / Edit Teacher modal
  const [teacherModal, setTeacherModal] = useState(false);
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [tName, setTName] = useState('');
  const [tUsername, setTUsername] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [savingTeacher, setSavingTeacher] = useState(false);

  // Multi-Class Multi-Subject Allocate Modal
  const [allocModal, setAllocModal] = useState(false);
  const [selTeacher, setSelTeacher] = useState(null);
  const [activeClass, setActiveClass] = useState(null);
  const [classSubjects, setClassSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [stagedAllocations, setStagedAllocations] = useState([]);
  const [savingAlloc, setSavingAlloc] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [teachersRes, allocRes, classesRes] = await Promise.all([
        api.get('/auth/teachers'),
        api.get('/allocation/all'),
        api.get('/school/classes'),
      ]);
      setTeachers(teachersRes.data);
      setAllocations(allocRes.data);
      setClasses(classesRes.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTeacherAllocations = (teacherId) =>
    allocations.filter((a) => a.teacher_id === teacherId);

  const openRegisterModal = () => {
    setIsEditingTeacher(false);
    setEditingTeacherId(null);
    setTName('');
    setTUsername('');
    setTPhone('');
    setTPassword('');
    setTeacherModal(true);
  };

  const openEditTeacherModal = (teacher) => {
    setIsEditingTeacher(true);
    setEditingTeacherId(teacher.id);
    setTName(teacher.name || '');
    setTUsername(teacher.username || '');
    setTPhone(teacher.phone || '');
    setTPassword('');
    setTeacherModal(true);
  };

  const handleSaveTeacher = async () => {
    if (!tName.trim()) {
      Alert.alert('Validation', 'Teacher name is required.');
      return;
    }

    setSavingTeacher(true);
    try {
      if (isEditingTeacher) {
        await api.put(`/auth/teachers/${editingTeacherId}`, {
          name: tName.trim(),
          phone: tPhone.trim(),
        });
        Alert.alert('Success', 'Teacher updated successfully!');
      } else {
        if (!tUsername.trim() || !tPassword.trim()) {
          Alert.alert('Validation', 'Username and Password are required for registration.');
          setSavingTeacher(false);
          return;
        }

        // Register teacher strictly as role 'teacher'
        await api.post('/auth/register', {
          name: tName.trim(),
          username: tUsername.trim(),
          phone: tPhone.trim(),
          password: tPassword.trim(),
          role: 'teacher',
        });
        Alert.alert('Success', 'Teacher registered successfully!');
      }

      setTeacherModal(false);
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleDeleteTeacher = (teacher) => {
    Alert.alert(
      'Delete Teacher',
      `Are you sure you want to delete ${teacher.name}? All their assignments will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/auth/teachers/${teacher.id}`);
              Alert.alert('Deleted', 'Teacher removed.');
              fetchData();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const openAllocateModal = (teacher) => {
    setSelTeacher(teacher);
    setActiveClass(null);
    setClassSubjects([]);
    setSelectedSubjectIds([]);
    setStagedAllocations([]);
    setAllocModal(true);
  };

  const onSelectClass = async (cls) => {
    setActiveClass(cls);
    setSelectedSubjectIds([]);
    try {
      const res = await api.get(`/school/subjects/${cls.id}`);
      setClassSubjects(res.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const toggleSubjectSelect = (subjId) => {
    if (selectedSubjectIds.includes(subjId)) {
      setSelectedSubjectIds(selectedSubjectIds.filter((id) => id !== subjId));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, subjId]);
    }
  };

  const handleStageCurrentClassSubjects = () => {
    if (!activeClass || selectedSubjectIds.length === 0) {
      Alert.alert('Notice', 'Please select a class and at least one subject to add.');
      return;
    }

    const chosenSubjects = classSubjects
      .filter((s) => selectedSubjectIds.includes(s.id))
      .map((s) => ({ id: s.id, name: s.subject_name }));

    const existingIndex = stagedAllocations.findIndex((item) => item.class_id === activeClass.id);
    let updatedStaged = [...stagedAllocations];

    if (existingIndex >= 0) {
      const mergedMap = new Map();
      updatedStaged[existingIndex].subjects.forEach((s) => mergedMap.set(s.id, s));
      chosenSubjects.forEach((s) => mergedMap.set(s.id, s));
      updatedStaged[existingIndex].subjects = Array.from(mergedMap.values());
    } else {
      updatedStaged.push({
        class_id: activeClass.id,
        class_name: activeClass.class_name,
        subjects: chosenSubjects,
      });
    }

    setStagedAllocations(updatedStaged);
    setSelectedSubjectIds([]);
    Alert.alert('Added', `${chosenSubjects.length} subject(s) added from ${activeClass.class_name}. You can select another class or click Save.`);
  };

  const removeStagedSubject = (classId, subjId) => {
    const updated = stagedAllocations
      .map((item) => {
        if (item.class_id === classId) {
          return {
            ...item,
            subjects: item.subjects.filter((s) => s.id !== subjId),
          };
        }
        return item;
      })
      .filter((item) => item.subjects.length > 0);
    setStagedAllocations(updated);
  };

  const handleSaveAllAllocations = async () => {
    let finalStaged = [...stagedAllocations];
    if (activeClass && selectedSubjectIds.length > 0) {
      const chosen = classSubjects
        .filter((s) => selectedSubjectIds.includes(s.id))
        .map((s) => ({ id: s.id, name: s.subject_name }));

      const existingIndex = finalStaged.findIndex((i) => i.class_id === activeClass.id);
      if (existingIndex >= 0) {
        const merged = new Map();
        finalStaged[existingIndex].subjects.forEach((s) => merged.set(s.id, s));
        chosen.forEach((s) => merged.set(s.id, s));
        finalStaged[existingIndex].subjects = Array.from(merged.values());
      } else {
        finalStaged.push({
          class_id: activeClass.id,
          class_name: activeClass.class_name,
          subjects: chosen,
        });
      }
    }

    if (finalStaged.length === 0) {
      Alert.alert('Notice', 'Please select at least one class and subject.');
      return;
    }

    setSavingAlloc(true);
    try {
      const batchPayload = finalStaged.map((item) => ({
        class_id: item.class_id,
        subject_ids: item.subjects.map((s) => s.id),
      }));

      await api.post('/allocation/allocate', {
        teacher_id: selTeacher.id,
        allocations: batchPayload,
      });

      Alert.alert('Success', 'All selected classes and subjects assigned successfully!');
      setAllocModal(false);
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingAlloc(false);
    }
  };

  const handleDeleteAllocation = (allocId) => {
    Alert.alert('Remove Allocation', 'Are you sure you want to remove this subject assignment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/allocation/${allocId}`);
            fetchData();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20) + 8;

  const renderTeacher = ({ item }) => {
    const allocs = getTeacherAllocations(item.id);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardUsername}>@{item.username} • {item.phone || 'No phone'}</Text>
          </View>

          <View style={styles.topActions}>
            <TouchableOpacity style={styles.editIconBtn} onPress={() => openEditTeacherModal(item)}>
              <Text style={styles.editIconText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.delIconBtn} onPress={() => handleDeleteTeacher(item)}>
              <Text style={styles.delIconText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.assignRow}>
          <Text style={styles.assignTitle}>Assigned Classes & Subjects:</Text>
          <TouchableOpacity style={styles.allocBtn} onPress={() => openAllocateModal(item)}>
            <Text style={styles.allocBtnText}>+ Assign Classes</Text>
          </TouchableOpacity>
        </View>

        {allocs.length > 0 ? (
          <View style={styles.allocRow}>
            {allocs.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.allocChip}
                onLongPress={() => handleDeleteAllocation(a.id)}
              >
                <Text style={styles.allocChipText}>
                  {a.class_name}: {a.subject_name}
                </Text>
                <Text style={styles.allocChipCross} onPress={() => handleDeleteAllocation(a.id)}>
                  ✕
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.noAllocText}>No subjects assigned yet.</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Teachers</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={openRegisterModal}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.addBtnText}>+ Teacher</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={INDIGO} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={teachers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTeacher}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No teachers found.</Text>
            </View>
          }
        />
      )}

      {/* Register / Edit Teacher Modal */}
      <Modal visible={teacherModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                {isEditingTeacher ? 'Edit Teacher' : 'Register New Teacher'}
              </Text>

              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Full name"
                value={tName}
                onChangeText={setTName}
              />

              {!isEditingTeacher && (
                <>
                  <Text style={styles.fieldLabel}>Username *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Login username"
                    value={tUsername}
                    onChangeText={setTUsername}
                    autoCapitalize="none"
                  />

                  <Text style={styles.fieldLabel}>Password *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Set login password"
                    value={tPassword}
                    onChangeText={setTPassword}
                    secureTextEntry
                  />
                </>
              )}

              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Phone number"
                value={tPhone}
                onChangeText={setTPhone}
                keyboardType="phone-pad"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setTeacherModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveTeacher}
                  disabled={savingTeacher}
                >
                  <Text style={styles.saveBtnText}>
                    {savingTeacher ? 'Saving...' : isEditingTeacher ? 'Update' : 'Register'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Multi-Class Multi-Subject Staged Allocate Modal */}
      <Modal visible={allocModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                Assign Classes to {selTeacher?.name}
              </Text>

              <Text style={styles.fieldLabel}>1. Choose Class</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {classes.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, activeClass?.id === c.id && styles.chipSelected]}
                      onPress={() => onSelectClass(c)}
                    >
                      <Text style={[styles.chipText, activeClass?.id === c.id && styles.chipTextSelected]}>
                        {c.class_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {activeClass && (
                <>
                  <Text style={styles.fieldLabel}>
                    2. Select Subjects in {activeClass.class_name}
                  </Text>
                  {classSubjects.length === 0 ? (
                    <Text style={{ color: '#888', fontStyle: 'italic', marginBottom: 12 }}>
                      No subjects added in {activeClass.class_name} yet.
                    </Text>
                  ) : (
                    <View style={styles.multiSubjectBox}>
                      {classSubjects.map((s) => {
                        const isChecked = selectedSubjectIds.includes(s.id);
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={[styles.checkRow, isChecked && styles.checkRowSelected]}
                            onPress={() => toggleSubjectSelect(s.id)}
                          >
                            <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                              {isChecked && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                            <Text style={[styles.checkLabel, isChecked && styles.checkLabelActive]}>
                              {s.subject_name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      <TouchableOpacity
                        style={styles.addStageBtn}
                        onPress={handleStageCurrentClassSubjects}
                      >
                        <Text style={styles.addStageBtnText}>
                          + Add {activeClass.class_name} Selections ({selectedSubjectIds.length})
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                3. Total Classes & Subjects to Assign:
              </Text>
              {stagedAllocations.length === 0 ? (
                <Text style={{ color: '#888', fontStyle: 'italic', marginBottom: 14 }}>
                  No classes staged yet. Pick a class above and add subjects.
                </Text>
              ) : (
                <View style={styles.stagedContainer}>
                  {stagedAllocations.map((item) => (
                    <View key={item.class_id} style={styles.stagedClassBlock}>
                      <Text style={styles.stagedClassTitle}>{item.class_name}:</Text>
                      <View style={styles.stagedChipRow}>
                        {item.subjects.map((sub) => (
                          <View key={sub.id} style={styles.stagedSubjectChip}>
                            <Text style={styles.stagedSubjectText}>{sub.name}</Text>
                            <TouchableOpacity onPress={() => removeStagedSubject(item.class_id, sub.id)}>
                              <Text style={styles.stagedCross}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setAllocModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveAllAllocations}
                  disabled={savingAlloc}
                >
                  <Text style={styles.saveBtnText}>
                    {savingAlloc ? 'Saving...' : 'Save All Allocations'}
                  </Text>
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
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    backgroundColor: INDIGO,
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  addBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtnText: { color: INDIGO, fontWeight: 'bold', fontSize: 13 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderLeftWidth: 5,
    borderLeftColor: INDIGO,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: '#222' },
  cardUsername: { fontSize: 12, color: '#888', marginTop: 2 },
  topActions: { flexDirection: 'row', gap: 8 },
  editIconBtn: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editIconText: { fontSize: 12, color: INDIGO, fontWeight: '700' },
  delIconBtn: {
    backgroundColor: '#ffebee',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  delIconText: { color: '#c62828', fontWeight: 'bold', fontSize: 12 },
  assignRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  assignTitle: { fontSize: 12, fontWeight: '700', color: '#555' },
  allocBtn: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  allocBtnText: { color: INDIGO, fontSize: 12, fontWeight: '700' },
  allocRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  allocChip: {
    backgroundColor: '#e8eaf6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  allocChipText: { color: INDIGO, fontSize: 12 },
  allocChipCross: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  noAllocText: { fontSize: 12, color: '#aaa', fontStyle: 'italic', marginTop: 4 },
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
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  chip: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipSelected: { backgroundColor: INDIGO, borderColor: INDIGO },
  chipText: { color: '#555', fontSize: 13 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  multiSubjectBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 8,
    marginBottom: 14,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  checkRowSelected: { backgroundColor: '#e8eaf6' },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxActive: { backgroundColor: INDIGO, borderColor: INDIGO },
  checkmark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  checkLabel: { fontSize: 14, color: '#333' },
  checkLabelActive: { fontWeight: '600', color: INDIGO },
  addStageBtn: {
    backgroundColor: '#e8eaf6',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addStageBtnText: { color: INDIGO, fontWeight: '700', fontSize: 13 },
  stagedContainer: {
    backgroundColor: '#f9f9fc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  stagedClassBlock: { marginBottom: 8 },
  stagedClassTitle: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  stagedChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stagedSubjectChip: {
    backgroundColor: '#e0e7ff',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stagedSubjectText: { color: '#1e3a8a', fontSize: 12 },
  stagedCross: { color: '#991b1b', fontSize: 12, fontWeight: 'bold' },
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
    backgroundColor: INDIGO,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
