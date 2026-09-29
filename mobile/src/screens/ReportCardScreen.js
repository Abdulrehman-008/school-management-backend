import React, { useEffect, useState, useCallback } from 'react';
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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../services/api';

const PURPLE = '#1a4a1a';

const GRADE_THRESHOLDS = [
  { min: 90, grade: 'A+', color: '#1b5e20' },
  { min: 80, grade: 'A', color: '#2e7d32' },
  { min: 70, grade: 'B+', color: '#33691e' },
  { min: 60, grade: 'B', color: '#558b2f' },
  { min: 50, grade: 'C', color: '#f57f17' },
  { min: 40, grade: 'D', color: '#e65100' },
  { min: 0, grade: 'F', color: '#b71c1c' },
];

function getGrade(percentage) {
  for (const g of GRADE_THRESHOLDS) {
    if (percentage >= g.min) return g;
  }
  return { grade: 'F', color: '#b71c1c' };
}

function buildReportHTML(student, results, examNameParam, examDateParam) {
  const totalObtained = results.reduce((sum, r) => sum + Number(r.marks_obtained), 0);
  const totalMax = results.reduce((sum, r) => sum + Number(r.total_marks), 0);
  const overallPct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0';
  const { grade } = getGrade(parseFloat(overallPct));
  const examName = examNameParam || results[0]?.exam_name || 'General Examination';
  const examDate = examDateParam || results[0]?.exam_date || results[0]?.term || '';

  const rows = results
    .map((r) => {
      const pct = ((r.marks_obtained / r.total_marks) * 100).toFixed(1);
      const g = getGrade(parseFloat(pct));
      return `
      <tr>
        <td>${r.subject_name}</td>
        <td>${r.marks_obtained}</td>
        <td>${r.total_marks}</td>
        <td>${pct}%</td>
        <td style="color:${g.color}; font-weight:bold;">${g.grade}</td>
      </tr>`;
    })
    .join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8"/>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
      .header { text-align: center; border-bottom: 3px solid #1a4a1a; padding-bottom: 14px; margin-bottom: 18px; }
      .header h1 { color: #1a4a1a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
      .header p { margin: 4px 0; color: #555; font-size: 13px; font-weight: 600; }
      .exam-banner {
        display: inline-block;
        background: #e8f5e9;
        border: 2px solid #1a4a1a;
        border-radius: 8px;
        padding: 8px 24px;
        margin-top: 10px;
        text-align: center;
      }
      .exam-title {
        color: #1a4a1a;
        font-size: 19px;
        font-weight: 800;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .exam-date {
        color: #2e7d32;
        font-size: 13px;
        font-weight: bold;
        margin-top: 3px;
      }
      .student-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .info-label { font-size: 11px; color: #555; text-transform: uppercase; font-weight: 600; }
      .info-val { font-size: 15px; font-weight: bold; color: #1a4a1a; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
      th { background: #1a4a1a; color: white; padding: 10px 12px; text-align: left; }
      td { padding: 9px 12px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #f9fbf9; }
      .summary { background: #e8f5e9; border: 1.5px solid #a5d6a7; border-radius: 10px; padding: 16px; text-align: center; }
      .summary-pct { font-size: 36px; font-weight: bold; color: #1a4a1a; }
      .summary-grade { font-size: 20px; font-weight: bold; }
      .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #777; border-top: 1px solid #ddd; padding-top: 12px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Govt. High School Pindi Bawray</h1>
      <p>District Hafizabad • Official Student Progress Report</p>
      <div class="exam-banner">
        <div class="exam-title">${examName}</div>
        ${examDate ? `<div class="exam-date">📅 Exam Date: ${examDate}</div>` : ''}
      </div>
    </div>

    <div class="student-card">
      <div>
        <div class="info-label">Student Name</div>
        <div class="info-val">${student.name}</div>
      </div>
      <div>
        <div class="info-label">Father / Guardian</div>
        <div class="info-val">${student.father_name || 'N/A'}</div>
      </div>
      <div>
        <div class="info-label">Class</div>
        <div class="info-val">${student.class_name || 'N/A'}</div>
      </div>
      <div>
        <div class="info-label">Roll Number</div>
        <div class="info-val">${student.roll_no}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Subject</th>
          <th>Obtained</th>
          <th>Total</th>
          <th>%</th>
          <th>Grade</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="summary">
      <div style="font-size:13px; color:#555; margin-bottom:4px; font-weight:bold;">Overall Performance</div>
      <div class="summary-pct">${overallPct}%</div>
      <div class="summary-grade" style="color:${getGrade(parseFloat(overallPct)).color};">Grade: ${grade}</div>
      <div style="margin-top:6px; font-size:13px; color:#333; font-weight:600;">
        Total Marks: ${totalObtained} / ${totalMax}
      </div>
    </div>

    <div class="footer">Auto-generated official student academic transcript • Govt. High School Pindi Bawray</div>
  </body>
  </html>
  `;
}

export default function ReportCardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedExamKey, setSelectedExamKey] = useState(null);

  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingClasses(true);
      try {
        const res = await api.get('/school/classes');
        setClasses(res.data);
      } catch (err) {
        Alert.alert('Error', err.message);
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, []);

  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    setSelectedStudent(null);
    setSelectedExamKey(null);
    setResults([]);
    setLoadingStudents(true);
    try {
      const res = await api.get(`/students/class/${cls.id}`);
      setClassStudents(res.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setSelectedExamKey(null);
    setLoadingResults(true);
    try {
      const res = await api.get(`/results/student/${student.id}`);
      setResults(res.data);
      if (res.data && res.data.length > 0) {
        const first = res.data[0];
        const key = `${(first.exam_name || 'General Exam').trim()}__${(first.exam_date || first.term || '').trim()}`;
        setSelectedExamKey(key);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingResults(false);
    }
  };

  // Group results by Exam Name + Exam Date so each exam is separate
  const examGroups = React.useMemo(() => {
    const map = new Map();
    results.forEach((r) => {
      const examNameStr = (r.exam_name || 'General Exam').trim();
      const dateStr = (r.exam_date || r.term || '').trim();
      const key = `${examNameStr}__${dateStr}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          exam_name: examNameStr,
          exam_date: dateStr,
          results: [],
        });
      }
      map.get(key).results.push(r);
    });
    return Array.from(map.values());
  }, [results]);

  const activeGroup = React.useMemo(() => {
    if (!selectedExamKey && examGroups.length > 0) return examGroups[0];
    return examGroups.find((g) => g.key === selectedExamKey) || examGroups[0];
  }, [selectedExamKey, examGroups]);

  const handleGeneratePDF = async (groupToPrint) => {
    const target = groupToPrint || activeGroup;
    if (!selectedStudent || !target || !target.results || target.results.length === 0) {
      Alert.alert('Notice', 'No results available for this exam to generate PDF.');
      return;
    }

    setGeneratingPDF(true);
    try {
      const html = buildReportHTML(
        selectedStudent,
        target.results,
        target.exam_name,
        target.exam_date
      );
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${target.exam_name} Report Card - ${selectedStudent.name}`,
          UTI: '.pdf',
        });
      } else {
        Alert.alert('Success', `Report Card saved: ${uri}`);
      }
    } catch (err) {
      Alert.alert('PDF Error', err.message || 'Could not share PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20) + 8;

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
        <Text style={styles.headerTitle}>Report Cards</Text>
        <View style={{ width: 45 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Step 1: Select Class */}
        <Text style={styles.sectionLabel}>1. Select Class</Text>
        {loadingClasses ? (
          <ActivityIndicator color={PURPLE} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {classes.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, selectedClass?.id === c.id && styles.chipActive]}
                onPress={() => handleSelectClass(c)}
              >
                <Text style={[styles.chipText, selectedClass?.id === c.id && styles.chipTextActive]}>
                  {c.class_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Step 2: Select Student */}
        {selectedClass && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
              2. Select Student from {selectedClass.class_name}
            </Text>
            {loadingStudents ? (
              <ActivityIndicator color={PURPLE} />
            ) : classStudents.length === 0 ? (
              <Text style={styles.emptyNote}>No students found in this class.</Text>
            ) : (
              <ScrollView style={styles.studentListBox} nestedScrollEnabled>
                {classStudents.map((s) => {
                  const isSelected = selectedStudent?.id === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.studentItem, isSelected && styles.studentItemSelected]}
                      onPress={() => handleSelectStudent(s)}
                    >
                      <View style={[styles.rollBadge, isSelected && styles.rollBadgeSelected]}>
                        <Text style={[styles.rollText, isSelected && { color: '#fff' }]}>
                          {s.roll_no}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sName, isSelected && styles.sNameSelected]}>
                          {s.name}
                        </Text>
                        <Text style={styles.sFather}>Father: {s.father_name || 'N/A'}</Text>
                      </View>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}

        {/* Step 3: Select Exam & Generate PDF */}
        {selectedStudent && (
          <View style={{ marginTop: 20 }}>
            {loadingResults ? (
              <ActivityIndicator color={PURPLE} style={{ marginVertical: 20 }} />
            ) : examGroups.length === 0 ? (
              <View style={styles.noResultBox}>
                <Text style={styles.emptyNote}>No exam marks recorded for this student yet.</Text>
              </View>
            ) : (
              <>
                {/* If multiple exams exist for this student, show selectable chips */}
                {examGroups.length > 1 && (
                  <>
                    <Text style={styles.sectionLabel}>
                      3. Select Exam ({examGroups.length} Exams Recorded)
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                      {examGroups.map((g) => {
                        const isSelected = activeGroup?.key === g.key;
                        return (
                          <TouchableOpacity
                            key={g.key}
                            style={[styles.examChip, isSelected && styles.examChipActive]}
                            onPress={() => setSelectedExamKey(g.key)}
                          >
                            <Text style={[styles.examChipTitle, isSelected && styles.examChipTitleActive]}>
                              📝 {g.exam_name}
                            </Text>
                            {g.exam_date ? (
                              <Text style={[styles.examChipDate, isSelected && styles.examChipDateActive]}>
                                📅 {g.exam_date}
                              </Text>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                )}

                {/* Selected Exam Highlight Card */}
                {activeGroup && (
                  <View style={styles.selectedExamBanner}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedExamName}>
                        {activeGroup.exam_name}
                      </Text>
                      <Text style={styles.selectedExamMeta}>
                        📅 Date: {activeGroup.exam_date || 'N/A'} • {activeGroup.results.length} Subject(s) Recorded
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.pdfBtn, generatingPDF && styles.pdfBtnDisabled]}
                  onPress={() => handleGeneratePDF(activeGroup)}
                  disabled={generatingPDF}
                >
                  <Text style={styles.pdfBtnText}>
                    {generatingPDF
                      ? 'Generating PDF...'
                      : `📄 Generate & Share PDF for ${activeGroup?.exam_name || 'Exam'}`}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: {
    backgroundColor: PURPLE,
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
  content: { padding: 18, paddingBottom: 30 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8 },
  chipRow: { flexDirection: 'row', marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ddd',
    marginRight: 8,
  },
  chipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  chipText: { color: '#555', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  examChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#c8e6c9',
    marginRight: 8,
    alignItems: 'center',
  },
  examChipActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#1a4a1a',
  },
  examChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  examChipTitleActive: {
    color: '#1a4a1a',
  },
  examChipDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  examChipDateActive: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  selectedExamBanner: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1.5,
    borderColor: '#a5d6a7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedExamName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a4a1a',
  },
  selectedExamMeta: {
    fontSize: 12,
    color: '#2e7d32',
    marginTop: 3,
    fontWeight: '600',
  },
  studentListBox: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 1,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  studentItemSelected: { backgroundColor: '#f3e5f5' },
  rollBadge: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#f3e5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rollBadgeSelected: { backgroundColor: PURPLE },
  rollText: { color: PURPLE, fontWeight: 'bold', fontSize: 12 },
  sName: { fontSize: 14, color: '#222', fontWeight: '500' },
  sNameSelected: { fontWeight: '700', color: PURPLE },
  sFather: { fontSize: 11, color: '#777', marginTop: 1 },
  checkmark: { color: PURPLE, fontSize: 16, fontWeight: 'bold' },
  emptyNote: { color: '#888', fontStyle: 'italic', fontSize: 13, marginVertical: 8 },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: PURPLE,
    marginBottom: 14,
  },
  cardStudentName: { fontSize: 17, fontWeight: 'bold', color: '#222' },
  cardStudentMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  gradeCircle: { alignItems: 'center' },
  gradePct: { fontSize: 22, fontWeight: 'bold', color: PURPLE },
  gradeLabel: { fontSize: 14, fontWeight: 'bold' },
  noResultBox: { alignItems: 'center', padding: 24 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PURPLE,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  th: { flex: 1, color: '#fff', fontSize: 12, fontWeight: 'bold' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6ff',
    alignItems: 'center',
  },
  td: { flex: 1, fontSize: 13, color: '#333' },
  tableTotalRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f3e5f5',
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 18,
    alignItems: 'center',
  },
  pdfBtn: {
    height: 50,
    backgroundColor: PURPLE,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfBtnDisabled: { opacity: 0.6 },
  pdfBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
