const pool = require('../config/db');

// 1. Enter Student Result (with exam_name, exam_date and UPSERT)
exports.addResult = async (req, res) => {
    const { student_id, subject_id, term, exam_date, exam_name, marks_obtained, total_marks } = req.body;
    try {
        const todayDate = new Date().toISOString().split('T')[0];
        const cleanDate = (exam_date && String(exam_date).trim()) || (term && String(term).trim()) || todayDate;
        const cleanExam = (exam_name && String(exam_name).trim()) || 'General Exam';
        const marksNum = parseFloat(marks_obtained);
        const totalNum = parseFloat(total_marks);

        if (isNaN(marksNum) || isNaN(totalNum)) {
            return res.status(400).json({ error: 'Valid marks_obtained and total_marks are required.' });
        }

        const query = `
            INSERT INTO results (student_id, subject_id, term, exam_name, marks_obtained, total_marks)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (student_id, subject_id, term, exam_name)
            DO UPDATE SET
                marks_obtained = EXCLUDED.marks_obtained,
                total_marks = EXCLUDED.total_marks,
                created_at = NOW()
            RETURNING *
        `;
        const newResult = await pool.query(query, [
            student_id,
            subject_id,
            cleanDate,
            cleanExam,
            marksNum,
            totalNum,
        ]);
        res.status(201).json({ message: 'Result submitted successfully', result: newResult.rows[0] });
    } catch (err) {
        console.error('addResult error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 2. Get Student Result Card (with father_name, class_name, exam_name, exam_date)
exports.getStudentResult = async (req, res) => {
    const { student_id } = req.params;
    try {
        const query = `
            SELECT * FROM (
                SELECT DISTINCT ON (r.student_id, r.subject_id, r.term, r.exam_name)
                       r.id, s.name as student_name, s.roll_no, s.father_name,
                       c.class_name, sub.subject_name,
                       r.term as exam_date, r.term, r.exam_name, r.marks_obtained, r.total_marks, r.created_at
                FROM results r
                JOIN students s ON r.student_id = s.id
                JOIN subjects sub ON r.subject_id = sub.id
                LEFT JOIN classes c ON s.class_id = c.id
                WHERE r.student_id = $1
                ORDER BY r.student_id, r.subject_id, r.term, r.exam_name, r.created_at DESC
            ) sub_res
            ORDER BY sub_res.created_at DESC
        `;
        const results = await pool.query(query, [student_id]);
        res.json(results.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Get Class Results — aggregated per student with percentage (deduplicated by student + subject + term + exam)
exports.getClassResults = async (req, res) => {
    const { class_id } = req.params;
    try {
        const query = `
            SELECT
                s.id as student_id,
                s.name as student_name,
                s.roll_no,
                COALESCE(s.father_name, 'N/A') as father_name,
                c.class_name,
                COALESCE(u.name, 'Not Assigned') as class_teacher_name,
                COALESCE(SUM(r.marks_obtained), 0) as total_obtained,
                COALESCE(SUM(r.total_marks), 0) as total_max,
                CASE
                    WHEN COALESCE(SUM(r.total_marks), 0) > 0
                    THEN ROUND((SUM(r.marks_obtained)::numeric / SUM(r.total_marks)::numeric) * 100, 1)
                    ELSE 0
                END as percentage
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            LEFT JOIN users u ON c.class_teacher_id = u.id
            LEFT JOIN (
                SELECT DISTINCT ON (student_id, subject_id, term, exam_name)
                    student_id, marks_obtained, total_marks
                FROM results
                ORDER BY student_id, subject_id, term, exam_name, created_at DESC
            ) r ON r.student_id = s.id
            WHERE s.class_id = $1
            GROUP BY s.id, s.name, s.roll_no, s.father_name, c.class_name, u.name
            ORDER BY s.roll_no ASC
        `;
        const results = await pool.query(query, [class_id]);
        res.json(results.rows);
    } catch (err) {
        console.error('Get Class Results Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 4. Get Subject Results — marks for a specific subject in a class (for subject teachers)
exports.getSubjectResults = async (req, res) => {
    const { class_id, subject_id } = req.params;
    try {
        const query = `
            SELECT
                s.id as student_id,
                s.name as student_name,
                s.roll_no,
                COALESCE(s.father_name, 'N/A') as father_name,
                c.class_name,
                sub.subject_name,
                COALESCE(u.name, 'Not Assigned') as class_teacher_name,
                COALESCE(SUM(r.marks_obtained), 0) as total_obtained,
                COALESCE(SUM(r.total_marks), 0) as total_max,
                CASE
                    WHEN COALESCE(SUM(r.total_marks), 0) > 0
                    THEN ROUND((SUM(r.marks_obtained)::numeric / SUM(r.total_marks)::numeric) * 100, 1)
                    ELSE 0
                END as percentage
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            LEFT JOIN users u ON c.class_teacher_id = u.id
            LEFT JOIN subjects sub ON sub.id = $2
            LEFT JOIN (
                SELECT DISTINCT ON (student_id, subject_id, term, exam_name)
                    student_id, marks_obtained, total_marks
                FROM results
                WHERE subject_id = $2
                ORDER BY student_id, subject_id, term, exam_name, created_at DESC
            ) r ON r.student_id = s.id
            WHERE s.class_id = $1
            GROUP BY s.id, s.name, s.roll_no, s.father_name, c.class_name, sub.subject_name, u.name
            ORDER BY s.roll_no ASC
        `;
        const results = await pool.query(query, [class_id, subject_id]);
        res.json(results.rows);
    } catch (err) {
        console.error('Get Subject Results Error:', err);
        res.status(500).json({ error: err.message });
    }
};