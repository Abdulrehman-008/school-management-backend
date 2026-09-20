import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import api from '../services/api';

const INDIGO = '#283593';

function buildClassReportHTML(className, teacherName, studentResults, averagePct) {
  const rows = studentResults
    .map(
      (s, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${s.roll_no}</td>
        <td style="font-weight:600;">${s.student_name}</td>
        <td>${s.father_name || 'N/A'}</td>
        <td>${s.total_obtained} / ${s.total_max}</td>
        <td style="font-weight:bold; color:${s.percentage >= 50 ? '#2e7d32' : '#c62828'};">${s.percentage}%</td>
      </tr>`
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8"/>
    <style>
      body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
      .header { text-align: center; border-bottom: 2px solid #283593; padding-bottom: 12px; margin-bottom: 16px; }
      .header h1 { margin: 0; color: #283593; font-size: 24px; }
      .header p { margin: 4px 0; color: #666; font-size: 13px; }
      .meta { display: flex; justify-content: space-between; background: #e8eaf6; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
      .meta-item { font-size: 14px; }
      .meta-label { color: #555; font-size: 12px; text-transform: uppercase; }
      .meta-val { font-weight: bold; color: #1a237e; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
      th { background: #283593; color: #fff; padding: 10px 8px; text-align: left; }
      td { padding: 9px 8px; border-bottom: 1px solid #ddd; }
      tr:nth-child(even) { background: #f9f9fc; }
      .footer-summary { display: flex; justify-content: space-between; background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 8px; padding: 14px 18px; font-size: 15px; font-weight: bold; color: #1b5e20; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>School Management System</h1>
      <p>Official Class Result Sheet</p>
    </div>

    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">Class Name</div>
        <div class="meta-val">${className}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Class Incharge / Teacher</div>
        <div class="meta-val">${teacherName || 'Not Assigned'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Total Students</div>
        <div class="meta-val">${studentResults.length}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Roll No</th>
          <th>Student Name</th>
          <th>Father Name</th>
          <th>Total Marks</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="footer-summary">
      <span>Class Average Percentage:</span>
      <span>${averagePct}%</span>
    </div>
  </body>
  </html>
  `;
}

export default function ClassResultScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/school/classes');
      setClasses(res.data);
      if (res.data.length > 0) {
        setSelectedClass(res.data[0]);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }, []);

  const fetchResults = useCallback(async (classId) => {
    if (!classId) return;
    setLoading(true);
    try {
      const res = await api.get(`/results/class/${classId}`);
      setResults(res.data);
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
    if (selectedClass?.id) {
      fetchResults(selectedClass.id);
    }
  }, [selectedClass, fetchResults]);

  const totalPercentages = results.reduce((acc, curr) => acc + Number(curr.percentage || 0), 0);
  const averagePct = results.length > 0 ? (totalPercentages / results.length).toFixed(1) : '0.0';
  const teacherName = results[0]?.class_teacher_name || selectedClass?.class_teacher_name || 'Not Assigned';

  const handleGeneratePdf = async () => {
    if (!selectedClass || results.length === 0) {
      Alert.alert('Notice', 'No student results to generate PDF.');
      return;
    }

    setGeneratingPdf(true);
    try {
      const html = buildClassReportHTML(selectedClass.class_name, teacherName, results, averagePct);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      let targetUri = uri;
      if (Platform.OS === 'android') {
        const safeName = `Class_Result_${selectedClass.class_name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
        const destUri = `${FileSystem.cacheDirectory}${safeName}`;
        await FileSystem.copyAsync({ from: uri, to: destUri });
        targetUri = destUri;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          dialogTitle: `${selectedClass.class_name} Result Sheet`,
          UTI: '.pdf',
        });
      } else {
        Alert.alert('Success', `PDF created at: ${targetUri}`);
      }
    } catch (err) {
      Alert.alert('PDF Error', err.message || 'Failed to share PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20) + 8;

  return (
    <View style={styles.container}>
      {/* Header with notch padding */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Class Results</Text>
        <TouchableOpacity
          style={[styles.pdfHeaderBtn, generatingPdf && { opacity: 0.6 }]}
          onPress={handleGeneratePdf}
          disabled={generatingPdf}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.pdfHeaderBtnText}>{generatingPdf ? 'PDF...' : '📄 PDF'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.classSelectorContainer}>
        <Text style={styles.selectLabel}>Select Class:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {classes.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, selectedClass?.id === c.id && styles.chipActive]}
              onPress={() => setSelectedClass(c)}
            >
              <Text style={[styles.chipText, selectedClass?.id === c.id && styles.chipTextActive]}>
                {c.class_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedClass && (
        <View style={styles.metaCard}>
          <View>
            <Text style={styles.metaClass}>{selectedClass.class_name}</Text>
            <Text style={styles.metaTeacher}>Incharge: {teacherName}</Text>
          </View>
          <View style={styles.avgBox}>
            <Text style={styles.avgLabel}>Class Avg</Text>
            <Text style={styles.avgValue}>{averagePct}%</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={INDIGO} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {results.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No students or marks found for this class.</Text>
            </View>
          ) : (
            <View style={styles.tableCard}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { width: 45 }]}>Roll</Text>
                <Text style={[styles.th, { flex: 2 }]}>Student Name</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>Father Name</Text>
                <Text style={[styles.th, { width: 70, textAlign: 'right' }]}>Marks</Text>
                <Text style={[styles.th, { width: 55, textAlign: 'right' }]}>%</Text>
              </View>

              {results.map((item, index) => (
                <View
                  key={item.student_id || index}
                  style={[styles.tableRow, index % 2 === 1 && { backgroundColor: '#fbfbff' }]}
                >
                  <Text style={[styles.td, { width: 45, fontWeight: '700' }]}>{item.roll_no}</Text>
                  <Text style={[styles.td, { flex: 2, fontWeight: '600', color: '#1a237e' }]}>
                    {item.student_name}
                  </Text>
                  <Text style={[styles.td, { flex: 1.5, color: '#666' }]}>
                    {item.father_name || 'N/A'}
                  </Text>
                  <Text style={[styles.td, { width: 70, textAlign: 'right' }]}>
                    {item.total_obtained}/{item.total_max}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      {
                        width: 55,
                        textAlign: 'right',
                        fontWeight: '700',
                        color: Number(item.percentage) >= 50 ? '#2e7d32' : '#c62828',
                      },
                    ]}
                  >
                    {item.percentage}%
                  </Text>
                </View>
              ))}

              <View style={styles.avgFooterRow}>
                <Text style={styles.avgFooterText}>Class Average Percentage:</Text>
                <Text style={styles.avgFooterValue}>{averagePct}%</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}
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
  pdfHeaderBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pdfHeaderBtnText: { color: INDIGO, fontWeight: '700', fontSize: 13 },
  classSelectorContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: '#fff',
  },
  selectLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6 },
  chipRow: { flexDirection: 'row', marginBottom: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#eee',
    marginRight: 8,
  },
  chipActive: { backgroundColor: INDIGO },
  chipText: { color: '#333', fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  metaCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  metaClass: { fontSize: 17, fontWeight: 'bold', color: '#1a237e' },
  metaTeacher: { fontSize: 13, color: '#666', marginTop: 2 },
  avgBox: { alignItems: 'flex-end' },
  avgLabel: { fontSize: 11, color: '#777', textTransform: 'uppercase' },
  avgValue: { fontSize: 20, fontWeight: 'bold', color: '#2e7d32' },
  listContainer: { padding: 16, paddingBottom: 30 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#777', fontSize: 14 },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e8eaf6',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#c5cae9',
  },
  th: { fontSize: 12, fontWeight: '700', color: '#1a237e' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  td: { fontSize: 12, color: '#333' },
  avgFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
  },
  avgFooterText: { fontSize: 14, fontWeight: 'bold', color: '#1b5e20' },
  avgFooterValue: { fontSize: 16, fontWeight: 'bold', color: '#1b5e20' },
});
