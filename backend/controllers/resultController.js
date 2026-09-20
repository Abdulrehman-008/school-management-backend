const pool = require('../config/db');

// 1. Enter Student Result (with exam_name)
exports.addResult = async (req, res) => {
    const { student_id, subject_id, term, exam_name, marks_obtained, total_marks } = req.body;
    try {
        const newResult = await pool.query(
            'INSERT INTO results (student_id, subject_id, term, exam_name, marks_obtained, total_marks) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [student_id, subject_id, term || 'Term 1', exam_name || 'General Exam', marks_obtained, total_marks]
        );
        res.status(201).json({ message: 'Result submitted successfully', result: newResult.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Get Student Result Card (with father_name, class_name, exam_name)
exports.getStudentResult = async (req, res) => {
    const { student_id } = req.params;
    try {
        const query = `
            SELECT r.id, s.name as student_name, s.roll_no, s.father_name,
                   c.class_name, sub.subject_name,
                   r.term, r.exam_name, r.marks_obtained, r.total_marks, r.created_at
            FROM results r
            JOIN students s ON r.student_id = s.id
            JOIN subjects sub ON r.subject_id = sub.id
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE r.student_id = $1
            ORDER BY r.created_at DESC
        `;
        const results = await pool.query(query, [student_id]);
        res.json(results.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Get Class Results — aggregated per student with percentage
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
            LEFT JOIN results r ON r.student_id = s.id
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