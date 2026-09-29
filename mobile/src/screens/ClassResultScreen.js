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
import api from '../services/api';

const DARK_GREEN = '#1a4a1a';
const GOLD = '#FFD700';

function buildReportHTML({ schoolName, title, className, teacherName, subjectName, examName, examDate, results, averagePct, isSubjectView }) {
  const rows = results
    .map(
      (s, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${s.roll_no}</td>
        <td style="font-weight:600;">${s.student_name}</td>
        <td>${s.father_name || 'N/A'}</td>
        <td>${s.total_obtained || s.marks_obtained || 0} / ${s.total_max || s.total_marks || 0}</td>
        <td style="font-weight:bold; color:${Number(s.percentage) >= 50 ? '#1b5e20' : '#c62828'};">${s.percentage || 0}%</td>
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
      .header { text-align: center; border-bottom: 3px solid #1a4a1a; padding-bottom: 12px; margin-bottom: 16px; }
      .header h1 { margin: 0; color: #1a4a1a; font-size: 24px; }
      .header h2 { margin: 4px 0 0 0; color: #2e7d32; font-size: 16px; font-weight: normal; }
      .header p { margin: 4px 0 0 0; color: #666; font-size: 13px; }
      .exam-banner {
        display: inline-block;
        background: #e8f5e9;
        border: 2px solid #1a4a1a;
        border-radius: 8px;
        padding: 6px 20px;
        margin-top: 8px;
        text-align: center;
      }
      .exam-title {
        color: #1a4a1a;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0.8px;
        text-transform: uppercase;
      }
      .exam-date {
        color: #2e7d32;
        font-size: 12px;
        font-weight: bold;
        margin-top: 2px;
      }
      .meta { display: flex; justify-content: space-between; background: #e8f5e9; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #1a4a1a; }
      .meta-item { font-size: 13px; }
      .meta-label { color: #555; font-size: 11px; text-transform: uppercase; font-weight: bold; }
      .meta-val { font-weight: bold; color: #1a4a1a; font-size: 15px; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
      th { background: #1a4a1a; color: #fff; padding: 10px 8px; text-align: left; }
      td { padding: 9px 8px; border-bottom: 1px solid #ddd; }
      tr:nth-child(even) { background: #f9fbf9; }
      .footer-summary { display: flex; justify-content: space-between; background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 8px; padding: 14px 18px; font-size: 15px; font-weight: bold; color: #1b5e20; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>${schoolName}</h1>
      <h2>${title}</h2>
      <p>District Hafizabad • Official Evaluation Sheet</p>
      ${examName || examDate ? `
      <div class="exam-banner">
        <div class="exam-title">${examName || 'TEST EVALUATION'}</div>
        ${examDate ? `<div class="exam-date">📅 Date: ${examDate}</div>` : ''}
      </div>
      ` : ''}
    </div>

    <div class="meta">
      <div class="meta-item">
        <div class="meta-label">Class</div>
        <div class="meta-val">${className}</div>
      </div>
      ${isSubjectView ? `
      <div class="meta-item">
        <div class="meta-label">Subject</div>
        <div class="meta-val">${subjectName || 'N/A'}</div>
      </div>
      ${examDate ? `
      <div class="meta-item">
        <div class="meta-label">Exam Date</div>
        <div class="meta-val">${examDate}</div>
      </div>
      ` : ''}
      ` : `
      <div class="meta-item">
        <div class="meta-label">Class Incharge</div>
        <div class="meta-val">${teacherName || 'Not Assigned'}</div>
      </div>
      `}
      <div class="meta-item">
        <div class="meta-label">Total Students</div>
        <div class="meta-val">${results.length}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Roll No</th>
          <th>Student Name</th>
          <th>Father Name</th>
          <th>Marks</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="footer-summary">
      <span>Average Percentage:</span>
      <span>${averagePct}%</span>
    </div>
  </body>
  </html>
  `;
}

export default function ClassResultScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const routeParams = route?.params || {};

  // Subject Teacher specific view
  const isSubjectView = Boolean(routeParams.filterBySubject && routeParams.subject_id);
  const subjectId = routeParams.subject_id;
  const subjectName = routeParams.subject_name;

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(
    routeParams.class_id
      ? { id: routeParams.class_id, class_name: routeParams.class_name }
      : null
  );
  const [results, setResults] = useState([]);
  const [selectedExamKey, setSelectedExamKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/school/classes');
      setClasses(res.data);
      if (!selectedClass && res.data.length > 0) {
        setSelectedClass(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching classes:', err.message);
    }
  }, [selectedClass]);

  const fetchResults = useCallback(async (classId) => {
    if (!classId) return;
    setLoading(true);
    try {
      if (isSubjectView && subjectId) {
        // Fetch detailed results for this subject
        try {
          const res = await api.get(`/results/class/${classId}/subject/${subjectId}`);
          setResults(res.data);
          setLoading(false);
          return;
        } catch (e) {
          // Fallback if needed
          const studentsRes = await api.get(`/students/class/${classId}`);
          const students = studentsRes.data;

          const detailedResults = await Promise.all(
            students.map(async (st) => {
              try {
                const rRes = await api.get(`/results/student/${st.id}`);
                const mark = rRes.data.find(
                  (m) => String(m.subject_id) === String(subjectId) || m.subject_name === subjectName
                );
                return {
                  student_id: st.id,
                  student_name: st.name,
                  roll_no: st.roll_no,
                  father_name: st.father_name,
                  class_name: routeParams.class_name,
                  subject_name: subjectName,
                  exam_name: mark?.exam_name || 'General Exam',
                  exam_date: mark?.exam_date || mark?.term || '',
                  total_obtained: mark ? mark.marks_obtained : 0,
                  total_max: mark ? mark.total_marks : 100,
                  percentage: mark && mark.total_marks > 0
                    ? ((Number(mark.marks_obtained) / Number(mark.total_marks)) * 100).toFixed(1)
                    : '0.0',
                };
              } catch {
                return {
                  student_id: st.id,
                  student_name: st.name,
                  roll_no: st.roll_no,
                  father_name: st.father_name,
                  total_obtained: 0,
                  total_max: 100,
                  percentage: '0.0',
                };
              }
            })
          );
          setResults(detailedResults);
          setLoading(false);
          return;
        }
      }

      // Default: Whole class performance across all subjects
      const res = await api.get(`/results/class/${classId}`);
      setResults(res.data);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [isSubjectView, subjectId, subjectName, routeParams.class_name]);

  useEffect(() => {
    if (!isSubjectView) {
      fetchClasses();
    }
  }, [fetchClasses, isSubjectView]);

  useEffect(() => {
    if (selectedClass?.id) {
      fetchResults(selectedClass.id);
    }
  }, [selectedClass, fetchResults]);

  // Group results by distinct Exam Name + Exam Date when in Subject View
  const examGroups = React.useMemo(() => {
    if (!isSubjectView || !results || results.length === 0) return [];
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
          students: [],
        });
      }
      map.get(key).students.push(r);
    });
    return Array.from(map.values());
  }, [results, isSubjectView]);

  // Default to first exam group if not set
  useEffect(() => {
    if (isSubjectView && examGroups.length > 0) {
      if (!selectedExamKey || !examGroups.some((g) => g.key === selectedExamKey)) {
        setSelectedExamKey(examGroups[0].key);
      }
    }
  }, [isSubjectView, examGroups, selectedExamKey]);

  const activeExam = React.useMemo(() => {
    if (!isSubjectView) return null;
    return examGroups.find((g) => g.key === selectedExamKey) || examGroups[0] || null;
  }, [isSubjectView, examGroups, selectedExamKey]);

  // Students to display in the table
  const displayedStudents = React.useMemo(() => {
    if (isSubjectView) {
      return activeExam ? activeExam.students : [];
    }
    return results;
  }, [isSubjectView, activeExam, results]);

  const totalPercentages = displayedStudents.reduce((acc, curr) => acc + Number(curr.percentage || 0), 0);
  const averagePct = displayedStudents.length > 0 ? (totalPercentages / displayedStudents.length).toFixed(1) : '0.0';
  const teacherName =
    routeParams.teacherName ||
    results[0]?.class_teacher_name ||
    selectedClass?.class_teacher_name ||
    'Not Assigned';

  const handleGeneratePdf = async () => {
    if (!selectedClass || displayedStudents.length === 0) {
      Alert.alert('Notice', 'No student results to generate PDF.');
      return;
    }

    setGeneratingPdf(true);
    try {
      const examTitle = isSubjectView && activeExam
        ? `Subject Result: ${subjectName} — ${activeExam.exam_name}`
        : (isSubjectView ? `Subject Result: ${subjectName}` : 'Official Class Result Sheet (Whole Class)');

      const html = buildReportHTML({
        schoolName: 'Govt. High School Pindi Bawray',
        title: examTitle,
        className: selectedClass.class_name,
        teacherName,
        subjectName,
        examName: activeExam?.exam_name,
        examDate: activeExam?.exam_date,
        results: displayedStudents,
        averagePct,
        isSubjectView,
      });

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const safeExam = activeExam ? `_${activeExam.exam_name}_${activeExam.exam_date}`.replace(/[^a-zA-Z0-9_-]/g, '_') : '';
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${selectedClass.class_name} ${subjectName || ''}${safeExam} Result Sheet`,
          UTI: '.pdf',
        });
      } else {
        Alert.alert('Success', `PDF created at: ${uri}`);
      }
    } catch (err) {
      Alert.alert('PDF Error', err.message || 'Failed to share PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20) + 6;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={DARK_GREEN} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isSubjectView ? 'Subject Result' : 'Class Performance'}
          </Text>
          <Text style={styles.headerSub}>
            {isSubjectView ? `${subjectName} • ${selectedClass?.class_name}` : 'Govt. High School Pindi Bawray'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.pdfHeaderBtn, generatingPdf && { opacity: 0.6 }]}
          onPress={handleGeneratePdf}
          disabled={generatingPdf}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.pdfHeaderBtnText}>{generatingPdf ? 'PDF...' : '📄 PDF'}</Text>
        </TouchableOpacity>
      </View>

      {/* Class Selector: Shown only for Admin / Multi-class view */}
      {!isSubjectView && classes.length > 1 && (
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
      )}

      {/* Context Badge Card */}
      {selectedClass && (
        <View style={styles.metaCard}>
          <View style={{ flex: 1 }}>
            <View style={styles.viewBadgeRow}>
              <Text style={styles.viewBadgeText}>
                {isSubjectView ? 'SUBJECT TEACHER VIEW' : 'WHOLE CLASS OVERALL RESULT'}
              </Text>
            </View>
            <Text style={styles.metaClass}>{selectedClass.class_name}</Text>
            <Text style={styles.metaTeacher}>
              {isSubjectView ? `Subject: ${subjectName}` : `Incharge: ${teacherName}`}
            </Text>
          </View>
          <View style={styles.avgBox}>
            <Text style={styles.avgLabel}>Class Avg</Text>
            <Text style={styles.avgValue}>{averagePct}%</Text>
          </View>
        </View>
      )}

      {/* Monthly Tests & Exams Selector for Subject View */}
      {isSubjectView && (
        <View style={styles.examPickerSection}>
          <View style={styles.examPickerHeaderRow}>
            <Text style={styles.examPickerTitle}>
              📅 Monthly Tests & Exams ({examGroups.length})
            </Text>
            <Text style={styles.examPickerSub}>
              ٹیسٹ منتخب کریں
            </Text>
          </View>

          {examGroups.length === 0 && !loading ? (
            <View style={styles.noExamsBox}>
              <Text style={styles.noExamsText}>No exams/tests recorded for {subjectName} yet.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examChipRow}>
              {examGroups.map((group) => {
                const isSelected = activeExam?.key === group.key;
                return (
                  <TouchableOpacity
                    key={group.key}
                    style={[styles.examCard, isSelected && styles.examCardActive]}
                    onPress={() => setSelectedExamKey(group.key)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.examCardTop}>
                      <View style={[styles.examBadgePill, isSelected && styles.examBadgePillActive]}>
                        <Text style={[styles.examBadgePillText, isSelected && styles.examBadgePillTextActive]}>
                          {isSelected ? '✓ SELECTED' : 'TEST'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.examCardName, isSelected && styles.examCardNameActive]} numberOfLines={1}>
                      {group.exam_name}
                    </Text>
                    <Text style={[styles.examCardDate, isSelected && styles.examCardDateActive]}>
                      📅 {group.exam_date || 'N/A'}
                    </Text>
                    <Text style={[styles.examCardCount, isSelected && styles.examCardCountActive]}>
                      👥 {group.students.length} Student{group.students.length === 1 ? '' : 's'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={DARK_GREEN} size="large" />
          <Text style={styles.loadingText}>Fetching results...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {displayedStudents.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>No marks found for this selection.</Text>
              <Text style={styles.emptySubText}>
                {isSubjectView
                  ? `No marks have been recorded for ${subjectName} yet.`
                  : 'No marks have been entered for this class yet.'}
              </Text>
            </View>
          ) : (
            <View style={styles.tableCard}>
              {/* Active Exam Label Bar */}
              {isSubjectView && activeExam && (
                <View style={styles.activeExamBar}>
                  <Text style={styles.activeExamBarText}>
                    📝 {activeExam.exam_name} • 📅 {activeExam.exam_date || 'N/A'}
                  </Text>
                  <Text style={styles.activeExamBarCount}>
                    {displayedStudents.length} Students
                  </Text>
                </View>
              )}

              <View style={styles.tableHeaderRow}>
                <Text style={[styles.th, { width: 42 }]}>Roll</Text>
                <Text style={[styles.th, { flex: 2 }]}>Student Name</Text>
                <Text style={[styles.th, { flex: 1.5 }]}>Father Name</Text>
                <Text style={[styles.th, { width: 72, textAlign: 'right' }]}>Marks</Text>
                <Text style={[styles.th, { width: 56, textAlign: 'right' }]}>%</Text>
              </View>

              {displayedStudents.map((item, index) => (
                <View
                  key={item.id || item.student_id || index}
                  style={[styles.tableRow, index % 2 === 1 && { backgroundColor: '#f9fcf9' }]}
                >
                  <Text style={[styles.td, { width: 42, fontWeight: '700', color: DARK_GREEN }]}>
                    {item.roll_no}
                  </Text>
                  <Text style={[styles.td, { flex: 2, fontWeight: '600', color: '#111' }]}>
                    {item.student_name}
                  </Text>
                  <Text style={[styles.td, { flex: 1.5, color: '#666' }]}>
                    {item.father_name || 'N/A'}
                  </Text>
                  <Text style={[styles.td, { width: 72, textAlign: 'right', fontWeight: '500' }]}>
                    {item.total_obtained || item.marks_obtained}/{item.total_max || item.total_marks}
                  </Text>
                  <Text
                    style={[
                      styles.td,
                      {
                        width: 56,
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
                <Text style={styles.avgFooterText}>Average Percentage:</Text>
                <Text style={styles.avgFooterValue}>{averagePct}%</Text>
              </View>

              {/* Action Button: Print This Exam's Result */}
              <TouchableOpacity
                style={[styles.bottomPdfBtn, generatingPdf && { opacity: 0.6 }]}
                onPress={handleGeneratePdf}
                disabled={generatingPdf}
                activeOpacity={0.8}
              >
                <Text style={styles.bottomPdfBtnText}>
                  {generatingPdf
                    ? 'Generating PDF...'
                    : isSubjectView && activeExam
                    ? `📄 Print ${activeExam.exam_name} Result Sheet`
                    : '📄 Print Class Result Sheet'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  header: {
    backgroundColor: DARK_GREEN,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  headerActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  backBtn: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSub: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  pdfHeaderBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pdfHeaderBtnText: {
    color: DARK_GREEN,
    fontWeight: '700',
    fontSize: 13,
  },
  classSelectorContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e7e1',
  },
  selectLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2e7d32',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#e8f5e9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  chipActive: {
    backgroundColor: DARK_GREEN,
    borderColor: DARK_GREEN,
  },
  chipText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  metaCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderLeftWidth: 5,
    borderLeftColor: DARK_GREEN,
  },
  viewBadgeRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  viewBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1b5e20',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaClass: {
    fontSize: 18,
    fontWeight: 'bold',
    color: DARK_GREEN,
    marginTop: 2,
  },
  metaTeacher: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  avgBox: {
    alignItems: 'flex-end',
    backgroundColor: '#f1f8e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dcedc8',
  },
  avgLabel: {
    fontSize: 10,
    color: '#558b2f',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  avgValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: DARK_GREEN,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 36,
  },
  empty: {
    alignItems: 'center',
    marginTop: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e0e7e1',
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emptySubText: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    textAlign: 'center',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e7e1',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e8f5e9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#c8e6c9',
  },
  th: {
    fontSize: 12,
    fontWeight: '800',
    color: DARK_GREEN,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  td: {
    fontSize: 12,
    color: '#333',
  },
  avgFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#c8e6c9',
  },
  avgFooterText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1b5e20',
  },
  avgFooterValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1b5e20',
  },

  /* ── Monthly Tests Picker Styles ── */
  examPickerSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  examPickerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  examPickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK_GREEN,
  },
  examPickerSub: {
    fontSize: 11,
    color: '#2e7d32',
    fontWeight: '600',
  },
  noExamsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e7e1',
    alignItems: 'center',
  },
  noExamsText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  examChipRow: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  examCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
    minWidth: 140,
    borderWidth: 1.5,
    borderColor: '#c8e6c9',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  examCardActive: {
    backgroundColor: '#e8f5e9',
    borderColor: DARK_GREEN,
    borderWidth: 2,
  },
  examCardTop: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  examBadgePill: {
    backgroundColor: '#f1f8e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dcedc8',
  },
  examBadgePillActive: {
    backgroundColor: DARK_GREEN,
    borderColor: DARK_GREEN,
  },
  examBadgePillText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#558b2f',
  },
  examBadgePillTextActive: {
    color: '#ffffff',
  },
  examCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  examCardNameActive: {
    color: DARK_GREEN,
    fontWeight: '800',
  },
  examCardDate: {
    fontSize: 11,
    color: '#2e7d32',
    marginTop: 2,
    fontWeight: '600',
  },
  examCardDateActive: {
    color: '#1b5e20',
  },
  examCardCount: {
    fontSize: 10,
    color: '#777',
    marginTop: 4,
  },
  examCardCountActive: {
    color: '#33691e',
    fontWeight: '600',
  },

  /* ── Active Exam Bar inside Table Card ── */
  activeExamBar: {
    backgroundColor: '#e8f5e9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#c8e6c9',
  },
  activeExamBarText: {
    fontSize: 12,
    fontWeight: '700',
    color: DARK_GREEN,
  },
  activeExamBarCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2e7d32',
  },

  /* ── Bottom PDF Print Button ── */
  bottomPdfBtn: {
    backgroundColor: DARK_GREEN,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPdfBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
