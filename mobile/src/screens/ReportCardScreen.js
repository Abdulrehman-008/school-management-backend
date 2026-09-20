import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  Alert, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../../services/api';

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
  const overallPct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : 0;
  const { grade } = getGrade(parseFloat(overallPct));

  const rows = results
    .map(
      (r) => {
        const pct = ((r.marks_obtained / r.total_marks) * 100).toFixed(1);
        const g = getGrade(parseFloat(pct));
        return `
        <tr>
          <td>${r.subject_name}</td>
          <td>${r.term}</td>
          <td>${r.marks_obtained}</td>
          <td>${r.total_marks}</td>
          <td>${pct}%</td>
          <td style="color:${g.color};font-weight:bold">${g.grade}</td>
        </tr>`;
      }
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
    .header { text-align: center; border-bottom: 3px solid #6a1b9a; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { color: #6a1b9a; margin: 0; font-size: 26px; }
    .header p { margin: 4px 0; color: #555; font-size: 14px; }
    .info-row { display: flex; gap: 32px; margin-bottom: 24px; }
    .info-item { flex: 1; }
    .info-label { font-size: 12px; color: #888; text-transform: uppercase; }
    .info-value { font-size: 16px; font-weight: bold; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #6a1b9a; color: white; padding: 10px 12px; text-align: left; font-size: 13px; }
    td { padding: 9px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
    tr:nth-child(even) td { background: #f9f4ff; }
    .summary { background: #f3e5f5; border-radius: 12px; padding: 20px; text-align: center; }
    .summary-pct { font-size: 40px; font-weight: bold; color: #6a1b9a; }
    .summary-grade { font-size: 22px; font-weight: bold; }
    .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #bbb; }
  </style>
  </head>
  <body>
    <div class="header">
      <h1>📋 Student Report Card</h1>
      <p>School Management System</p>
      <p>Generated: ${new Date().toLocaleDateString('en-PK', { dateStyle: 'long' })}</p>
    </div>

    <div class="info-row">
      <div class="info-item">
        <div class="info-label">Student Name</div>
        <div class="info-value">${results[0]?.student_name || student.name}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Class</div>
        <div class="info-value">${student.class_name || '—'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Roll No.</div>
        <div class="info-value">${student.roll_no}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Subject</th>
          <th>Term</th>
          <th>Marks</th>
          <th>Total</th>
          <th>%</th>
          <th>Grade</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="summary">
      <div style="font-size:14px;color:#777;margin-bottom:4px">Overall Performance</div>
      <div class="summary-pct">${overallPct}%</div>
      <div class="summary-grade" style="color:${getGrade(parseFloat(overallPct)).color}">${grade}</div>
      <div style="margin-top:8px;color:#555;font-size:13px">
        Total: ${totalObtained} / ${totalMax} marks
      </div>
    </div>

    <div class="footer">This is an auto-generated report. School Management System.</div>
  </body>
  </html>`;
}

export default function ReportCardScreen({ navigation }) {
  const [allStudents, setAllStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsFetched, setStudentsFetched] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const fetchAllStudents = useCallback(async () => {
    if (studentsFetched) return;
    setLoadingStudents(true);
    try {
      const res = await api.get('/students');
      setAllStudents(res.data);
      setStudentsFetched(true);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingStudents(false);
    }
  }, [studentsFetched]);

  const handleSearchFocus = () => { fetchAllStudents(); };

  const filteredStudents = searchQuery.trim()
    ? allStudents.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.roll_no?.toString().includes(searchQuery)
      )
    : [];

  const loadResults = async (student) => {
    setSelectedStudent(student);
    setResults([]);
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
      Alert.alert('No Data', 'No results found for this student.');
      return;
    }
    setGeneratingPDF(true);
    try {
      const html = buildReportHTML(selectedStudent, results);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Report Card — ${selectedStudent.name}`,
        });
      } else {
        Alert.alert('PDF Created', `Saved to: ${uri}`);
      }
    } catch (err) {
      Alert.alert('PDF Error', err.message);
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Compute summary stats
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
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Search */}
        <Text style={styles.sectionLabel}>Search Student</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Type student name or roll number..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={handleSearchFocus}
        />

        {loadingStudents && <ActivityIndicator color={PURPLE} style={{ marginVertical: 10 }} />}

        {/* Search Results */}
        {searchQuery.trim() !== '' && (
          <View style={styles.searchResults}>
            {filteredStudents.length === 0 ? (
              <Text style={styles.noResultText}>No students match "{searchQuery}"</Text>
            ) : (
              filteredStudents.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.searchResultRow,
                    selectedStudent?.id === s.id && styles.searchResultRowSelected,
                  ]}
                  onPress={() => {
                    setSearchQuery(s.name);
                    loadResults(s);
                  }}
                >
                  <Text style={styles.searchResultName}>{s.name}</Text>
                  <Text style={styles.searchResultMeta}>
                    Roll: {s.roll_no} {s.class_name ? `• ${s.class_name}` : ''}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Results Table */}
        {selectedStudent && (
          <>
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.resultStudentName}>{selectedStudent.name}</Text>
                <Text style={styles.resultStudentMeta}>
                  Roll: {selectedStudent.roll_no} {selectedStudent.class_name ? `• ${selectedStudent.class_name}` : ''}
                </Text>
              </View>
              {overallPct && (
                <View style={styles.gradeBadge}>
                  <Text style={styles.gradePct}>{overallPct}%</Text>
                  <Text style={[styles.gradeText, { color: gradeInfo?.color }]}>
                    {gradeInfo?.grade}
                  </Text>
                </View>
              )}
            </View>

            {loadingResults ? (
              <ActivityIndicator color={PURPLE} style={{ marginVertical: 20 }} />
            ) : results.length === 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultText}>No results recorded for this student.</Text>
              </View>
            ) : (
              <>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.tableCellHeader, { flex: 2 }]}>Subject</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader]}>Term</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader]}>Marks</Text>
                  <Text style={[styles.tableCell, styles.tableCellHeader]}>%</Text>
                </View>
                {results.map((r) => {
                  const pct = ((r.marks_obtained / r.total_marks) * 100).toFixed(0);
                  const g = getGrade(parseFloat(pct));
                  return (
                    <View key={r.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2 }]}>{r.subject_name}</Text>
                      <Text style={styles.tableCell}>{r.term}</Text>
                      <Text style={styles.tableCell}>{r.marks_obtained}/{r.total_marks}</Text>
                      <Text style={[styles.tableCell, { color: g.color, fontWeight: '700' }]}>
                        {pct}%
                      </Text>
                    </View>
                  );
                })}

                {/* Totals Row */}
                <View style={[styles.tableRow, styles.tableTotal]}>
                  <Text style={[styles.tableCell, { flex: 2, fontWeight: '700' }]}>TOTAL</Text>
                  <Text style={styles.tableCell} />
                  <Text style={[styles.tableCell, { fontWeight: '700' }]}>
                    {totalObtained}/{totalMax}
                  </Text>
                  <Text style={[styles.tableCell, { fontWeight: '700', color: gradeInfo?.color }]}>
                    {overallPct}%
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.pdfBtn, generatingPDF && styles.pdfBtnDisabled]}
                  onPress={handleGeneratePDF}
                  disabled={generatingPDF}
                >
                  <Text style={styles.pdfBtnText}>
                    {generatingPDF ? 'Generating PDF...' : '📄 Generate & Share PDF'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
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
  content: { padding: 20 },
  sectionLabel: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  searchInput: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  searchResults: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 20,
    overflow: 'hidden',
  },
  searchResultRow: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  searchResultRowSelected: { backgroundColor: '#f3e5f5' },
  searchResultName: { fontSize: 15, fontWeight: '600', color: '#222' },
  searchResultMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  noResultText: { padding: 14, color: '#888', fontSize: 14 },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderLeftWidth: 5,
    borderLeftColor: PURPLE,
  },
  resultStudentName: { fontSize: 17, fontWeight: '700', color: '#222' },
  resultStudentMeta: { fontSize: 13, color: '#888', marginTop: 3 },
  gradeBadge: { alignItems: 'center' },
  gradePct: { fontSize: 22, fontWeight: '800', color: PURPLE },
  gradeText: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  noResults: { alignItems: 'center', marginVertical: 20 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: PURPLE,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6ff',
  },
  tableTotal: {
    backgroundColor: '#f3e5f5',
    borderRadius: 8,
    borderBottomWidth: 0,
    marginTop: 4,
    marginBottom: 20,
  },
  tableCell: { flex: 1, fontSize: 13, color: '#333' },
  tableCellHeader: { color: '#fff', fontWeight: '700', fontSize: 12 },
  pdfBtn: {
    height: 52,
    backgroundColor: PURPLE,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pdfBtnDisabled: { opacity: 0.6 },
  pdfBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
