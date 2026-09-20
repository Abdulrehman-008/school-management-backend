import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  Modal, Alert, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import api from '../services/api';

const BLUE = '#1a237e';

export default function ManageClassesScreen({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState({});
  const [loading, setLoading] = useState(true);

  // Add Class modal
  const [classModal, setClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [savingClass, setSavingClass] = useState(false);

  // Add Subject modal
  const [subjectModal, setSubjectModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/school/classes');
      setClasses(res.data);
      // Fetch subjects for all classes in parallel
      const subjectPromises = res.data.map((c) =>
        api.get(`/school/subjects/${c.id}`).then((r) => ({ id: c.id, data: r.data }))
      );
      const results = await Promise.all(subjectPromises);
      const subjectMap = {};
      results.forEach(({ id, data }) => { subjectMap[id] = data; });
      setSubjects(subjectMap);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const handleAddClass = async () => {
    if (!newClassName.trim()) {
      Alert.alert('Validation', 'Class name is required.');
      return;
    }
    setSavingClass(true);
    try {
      await api.post('/school/add-class', { class_name: newClassName.trim() });
      setClassModal(false);
      setNewClassName('');
      fetchClasses();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingClass(false);
    }
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) {
      Alert.alert('Validation', 'Subject name is required.');
      return;
    }
    setSavingSubject(true);
    try {
      await api.post('/school/add-subject', {
        subject_name: newSubjectName.trim(),
        class_id: selectedClass.id,
      });
      setSubjectModal(false);
      setNewSubjectName('');
      setSelectedClass(null);
      fetchClasses();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingSubject(false);
    }
  };

  const renderClass = ({ item }) => (
    <View style={styles.classCard}>
      <View style={styles.classHeader}>
        <Text style={styles.className}>{item.class_name}</Text>
        <TouchableOpacity
          style={styles.addSubjectBtn}
          onPress={() => { setSelectedClass(item); setSubjectModal(true); }}
        >
          <Text style={styles.addSubjectBtnText}>+ Subject</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.subjectsRow}>
        {(subjects[item.id] || []).length === 0 ? (
          <Text style={styles.noSubjects}>No subjects added yet</Text>
        ) : (
          (subjects[item.id] || []).map((s) => (
            <View key={s.id} style={styles.subjectChip}>
              <Text style={styles.subjectChipText}>{s.subject_name}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Classes & Subjects</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setClassModal(true)}>
          <Text style={styles.addBtnText}>+ Class</Text>
        </TouchableOpacity>
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
              <Text style={styles.emptyText}>No classes yet. Tap "+ Class" to add one.</Text>
            </View>
          }
        />
      )}

      {/* Add Class Modal */}
      <Modal visible={classModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add New Class</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Class name (e.g. Class 10)"
              value={newClassName}
              onChangeText={setNewClassName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setClassModal(false); setNewClassName(''); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddClass}
                disabled={savingClass}
              >
                <Text style={styles.saveBtnText}>
                  {savingClass ? 'Saving...' : 'Add Class'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Subject Modal */}
      <Modal visible={subjectModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              Add Subject to {selectedClass?.class_name}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Subject name (e.g. Mathematics)"
              value={newSubjectName}
              onChangeText={setNewSubjectName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setSubjectModal(false); setNewSubjectName(''); setSelectedClass(null); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddSubject}
                disabled={savingSubject}
              >
                <Text style={styles.saveBtnText}>
                  {savingSubject ? 'Saving...' : 'Add Subject'}
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
  backBtn: { color: '#c5cae9', fontSize: 22, fontWeight: '300' },
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
    shadowOffset: { width: 0, height: 1 },
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
  addSubjectBtn: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  addSubjectBtnText: { color: BLUE, fontSize: 12, fontWeight: '700' },
  subjectsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subjectChip: {
    backgroundColor: '#e8eaf6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  subjectChipText: { color: BLUE, fontSize: 13, fontWeight: '500' },
  noSubjects: { color: '#bbb', fontSize: 13, fontStyle: 'italic' },
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
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  modalActions: { flexDirection: 'row', gap: 12 },
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
