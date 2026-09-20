import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import api from '../services/api';

const PURPLE = '#6a1b9a';

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

function buildReportHTML(student, results) {
  const totalObtained = results.reduce((sum, r) => sum + Number(r.marks_obtained), 0);
  const totalMax = results.reduce((sum, r) => sum + Number(r.total_marks), 0);
  const overallPct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0';
  const { grade } = getGrade(parseFloat(overallPct));
  const examName = results[0]?.exam_name || 'General Examination';

  const rows = results
    .map((r) => {
      const pct = ((r.marks_obtained / r.total_marks) * 100).toFixed(1);
      const g = getGrade(parseFloat(pct));
      return `
      <tr>
        <td>${r.subject_name}</td>
        <td>${r.term || 'Term 1'}</td>
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
      .header { text-align: center; border-bottom: 3px solid #6a1b9a; padding-bottom: 14px; margin-bottom: 20px; }
      .header h1 { color: #6a1b9a; margin: 0; font-size: 24px; }
      .header p { margin: 3px 0; color: #555; font-size: 13px; }
      .student-card { background: #fdf5ff; border: 1px solid #e1bee7; border-radius: 10px; padding: 16px; margin-bottom: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
      .info-label { font-size: 11px; color: #777; text-transform: uppercase; }
      .info-val { font-size: 15px; font-weight: bold; color: #222; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
      th { background: #6a1b9a; color: white; padding: 10px 12px; text-align: left; }
      td { padding: 9px 12px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #faf5fc; }
      .summary { background: #f3e5f5; border-radius: 10px; padding: 18px; text-align: center; }
      .summary-pct { font-size: 38px; font-weight: bold; color: #6a1b9a; }
      .summary-grade { font-size: 22px; font-weight: bold; }
      .footer { margin-top: 36px; text-align: center; font-size: 11px; color: #aaa; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>School Management System</h1>
      <p>Student Official Progress Report</p>
      <p>Exam: ${examName}</p>
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
          <th>Term</th>
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
      <div style="font-size:13px; color:#666; margin-bottom:4px;">Cumulative Performance</div>
      <div class="summary-pct">${overallPct}%</div>
      <div class="summary-grade" style="color:${getGrade(parseFloat(overallPct)).color};">Grade: ${grade}</div>
      <div style="margin-top:6px; font-size:13px; color:#444;">
        Total Marks: ${totalObtained} / ${totalMax}
      </div>
    </div>

    <div class="footer">Auto-generated official student academic transcript.</div>
  </body>
  </html>
  `;
}

export default function ReportCardScreen({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [results, setResults] = useState([]);

  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Load all classes on mount
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

  // When class is selected, load its students
  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    setSelectedStudent(null);
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

  // When student is selected, load results
  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setLoadingResults(true);
    try {
      const res = await api.get(`/results/student/${student.id}`);
      setResults(res.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingResults(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedStudent || results.length === 0) {
      Alert.alert('Notice', 'No results available for this student to generate PDF.');
      return;
    }

    setGeneratingPDF(true);
    try {
      const html = buildReportHTML(selectedStudent, results);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      // Fix Android file sharing permission by copying to cache directory
      let targetUri = uri;
      if (Platform.OS === 'android') {
        const safeName = `Report_Card_${selectedStudent.roll_no}_${selectedStudent.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        const destUri = `${FileSystem.cacheDirectory}${safeName}`;
        await FileSystem.copyAsync({ from: uri, to: destUri });
        targetUri = destUri;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Report Card - ${selectedStudent.name}`,
          UTI: '.pdf',
        });
      } else {
        Alert.alert('Success', `Report Card saved: ${targetUri}`);
      }
    } catch (err) {
      Alert.alert('PDF Error', err.message || 'Could not share PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const totalObtained = results.reduce((sum, r) => sum + Number(r.marks_obtained), 0);
  const totalMax = results.reduce((sum, r) => sum + Number(r.total_marks), 0);
  const overallPct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : null;
  const gradeInfo = overallPct ? getGrade(parseFloat(overallPct)) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
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

        {/* Step 2: Select Student from that Class */}
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

        {/* Step 3: View Results & PDF */}
        {selectedStudent && (
          <View style={{ marginTop: 20 }}>
            <View style={styles.studentCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardStudentName}>{selectedStudent.name}</Text>
                <Text style={styles.cardStudentMeta}>
                  Roll #{selectedStudent.roll_no} • Father: {selectedStudent.father_name || 'N/A'}
                </Text>
                <Text style={styles.cardStudentMeta}>
                  Class: {selectedClass?.class_name} • Exam: {results[0]?.exam_name || 'General Exam'}
                </Text>
              </View>
              {overallPct && (
                <View style={styles.gradeCircle}>
                  <Text style={styles.gradePct}>{overallPct}%</Text>
                  <Text style={[styles.gradeLabel, { color: gradeInfo?.color }]}>
                    {gradeInfo?.grade}
                  </Text>
                </View>
              )}
            </View>

            {loadingResults ? (
              <ActivityIndicator color={PURPLE} style={{ marginVertical: 20 }} />
            ) : results.length === 0 ? (
              <View style={styles.noResultBox}>
                <Text style={styles.emptyNote}>No exam marks recorded for this student yet.</Text>
              </View>
            ) : (
              <>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, { flex: 2 }]}>Subject</Text>
                  <Text style={styles.th}>Term</Text>
                  <Text style={[styles.th, { textAlign: 'right' }]}>Marks</Text>
                  <Text style={[styles.th, { textAlign: 'right' }]}>%</Text>
                </View>

                {results.map((r, i) => {
                  const pct = ((r.marks_obtained / r.total_marks) * 100).toFixed(0);
                  const g = getGrade(parseFloat(pct));
                  return (
                    <View key={r.id || i} style={styles.tableRow}>
                      <Text style={[styles.td, { flex: 2, fontWeight: '500' }]}>{r.subject_name}</Text>
                      <Text style={styles.td}>{r.term || 'Term 1'}</Text>
                      <Text style={[styles.td, { textAlign: 'right' }]}>
                        {r.marks_obtained}/{r.total_marks}
                      </Text>
                      <Text style={[styles.td, { textAlign: 'right', fontWeight: 'bold', color: g.color }]}>
                        {pct}%
                      </Text>
                    </View>
                  );
                })}

                <View style={styles.tableTotalRow}>
                  <Text style={[styles.td, { flex: 2, fontWeight: 'bold' }]}>TOTAL</Text>
                  <Text style={styles.td} />
                  <Text style={[styles.td, { textAlign: 'right', fontWeight: 'bold' }]}>
                    {totalObtained}/{totalMax}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      { textAlign: 'right', fontWeight: 'bold', color: gradeInfo?.color },
                    ]}
                  >
                    {overallPct}%
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.pdfBtn, generatingPDF && styles.pdfBtnDisabled]}
                  onPress={handleGeneratePDF}
                  disabled={generatingPDF}
                >
                  <Text style={styles.pdfBtnText}>
                    {generatingPDF ? 'Generating PDF...' : '📄 Generate & Share Report Card PDF'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fdf5ff' },
  header: {
    backgroundColor: PURPLE,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { color: '#e1bee7', fontSize: 22 },
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
