import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  Modal, Alert, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import api from '../services/api';

const INDIGO = '#3949ab';

export default function ManageTeachersScreen({ navigation }) {
  const [teachers, setTeachers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Register teacher modal
  const [teacherModal, setTeacherModal] = useState(false);
  const [tName, setTName] = useState('');
  const [tUsername, setTUsername] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [savingTeacher, setSavingTeacher] = useState(false);

  // Allocate modal
  const [allocModal, setAllocModal] = useState(false);
  const [selTeacher, setSelTeacher] = useState(null);
  const [selClass, setSelClass] = useState(null);
  const [selSubject, setSelSubject] = useState(null);
  const [classSubjects, setClassSubjects] = useState([]);
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const getTeacherAllocations = (teacherId) =>
    allocations.filter((a) => a.teacher_id === teacherId);

  const handleRegisterTeacher = async () => {
    if (!tName.trim() || !tUsername.trim() || !tPassword.trim()) {
      Alert.alert('Validation', 'Name, username and password are required.');
      return;
    }
    setSavingTeacher(true);
    try {
      await api.post('/auth/register', {
        name: tName.trim(),
        username: tUsername.trim(),
        phone: tPhone.trim(),
        password: tPassword.trim(),
        role: 'teacher',
      });
      Alert.alert('Success', 'Teacher registered successfully!');
      setTeacherModal(false);
      setTName(''); setTUsername(''); setTPhone(''); setTPassword('');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingTeacher(false);
    }
  };

  const onClassSelect = async (cls) => {
    setSelClass(cls);
    setSelSubject(null);
    try {
      const res = await api.get(`/school/subjects/${cls.id}`);
      setClassSubjects(res.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleAllocate = async () => {
    if (!selTeacher || !selClass || !selSubject) {
      Alert.alert('Validation', 'Please select teacher, class, and subject.');
      return;
    }
    setSavingAlloc(true);
    try {
      await api.post('/allocation/allocate', {
        teacher_id: selTeacher.id,
        class_id: selClass.id,
        subject_id: selSubject.id,
      });
      Alert.alert('Success', 'Teacher allocated successfully!');
      setAllocModal(false);
      setSelTeacher(null); setSelClass(null); setSelSubject(null); setClassSubjects([]);
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingAlloc(false);
    }
  };

  const renderTeacher = ({ item }) => {
    const allocs = getTeacherAllocations(item.id);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardUsername}>@{item.username}</Text>
          </View>
          <TouchableOpacity
            style={styles.allocBtn}
            onPress={() => { setSelTeacher(item); setAllocModal(true); }}
          >
            <Text style={styles.allocBtnText}>+ Assign</Text>
          </TouchableOpacity>
        </View>
        {allocs.length > 0 && (
          <View style={styles.allocRow}>
            {allocs.map((a) => (
              <View key={a.id} style={styles.allocChip}>
                <Text style={styles.allocChipText}>
                  {a.class_name} — {a.subject_name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teachers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setTeacherModal(true)}>
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
              <Text style={styles.emptyText}>No teachers yet. Tap "+ Teacher" to register one.</Text>
            </View>
          }
        />
      )}

      {/* Register Teacher Modal */}
      <Modal visible={teacherModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Register New Teacher</Text>
              {[
                { label: 'Full Name *', value: tName, setter: setTName, placeholder: 'Teacher full name' },
                { label: 'Username *', value: tUsername, setter: setTUsername, placeholder: 'Login username', autoCapitalize: 'none' },
                { label: 'Phone', value: tPhone, setter: setTPhone, placeholder: 'Phone number', keyboardType: 'phone-pad' },
                { label: 'Password *', value: tPassword, setter: setTPassword, placeholder: 'Set password', secure: true },
              ].map((field) => (
                <View key={field.label} style={{ marginBottom: 14 }}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={field.placeholder}
                    value={field.value}
                    onChangeText={field.setter}
                    secureTextEntry={field.secure}
                    keyboardType={field.keyboardType || 'default'}
                    autoCapitalize={field.autoCapitalize || 'words'}
                  />
                </View>
              ))}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setTeacherModal(false);
                    setTName(''); setTUsername(''); setTPhone(''); setTPassword('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleRegisterTeacher}
                  disabled={savingTeacher}
                >
                  <Text style={styles.saveBtnText}>
                    {savingTeacher ? 'Registering...' : 'Register'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Allocate Modal */}
      <Modal visible={allocModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                Assign Class to {selTeacher?.name}
              </Text>

              <Text style={styles.fieldLabel}>Select Class</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {classes.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, selClass?.id === c.id && styles.chipSelected]}
                      onPress={() => onClassSelect(c)}
                    >
                      <Text style={[styles.chipText, selClass?.id === c.id && styles.chipTextSelected]}>
                        {c.class_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {classSubjects.length > 0 && (
                <>
                  <Text style={styles.fieldLabel}>Select Subject</Text>
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
                    setAllocModal(false);
                    setSelTeacher(null); setSelClass(null); setSelSubject(null); setClassSubjects([]);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleAllocate}
                  disabled={savingAlloc}
                >
                  <Text style={styles.saveBtnText}>
                    {savingAlloc ? 'Saving...' : 'Allocate'}
                  </Text>
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
  safe: { flex: 1, backgroundColor: '#f0f4ff' },
  header: {
    backgroundColor: INDIGO,
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
  addBtnText: { color: INDIGO, fontWeight: '700', fontSize: 13 },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderLeftWidth: 5,
    borderLeftColor: INDIGO,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: '#222' },
  cardUsername: { fontSize: 13, color: '#888', marginTop: 2 },
  allocBtn: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  allocBtnText: { color: INDIGO, fontSize: 12, fontWeight: '700' },
  allocRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  allocChip: {
    backgroundColor: '#e8eaf6',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  allocChipText: { color: INDIGO, fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#666', fontSize: 15, textAlign: 'center' },
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
