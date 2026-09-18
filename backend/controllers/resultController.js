const pool = require('../config/db');

// 1. Enter Student Result
exports.addResult = async (req, res) => {
    const { student_id, subject_id, term, marks_obtained, total_marks } = req.body;
    try {
        const newResult = await pool.query(
            'INSERT INTO results (student_id, subject_id, term, marks_obtained, total_marks) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [student_id, subject_id, term, marks_obtained, total_marks]
        );
        res.status(201).json({ message: 'Result submitted successfully', result: newResult.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Get Student Result Card
exports.getStudentResult = async (req, res) => {
    const { student_id } = req.params;
    try {
        const query = `
            SELECT r.id, s.name as student_name, sub.subject_name, r.term, r.marks_obtained, r.total_marks, r.created_at
            FROM results r
            JOIN students s ON r.student_id = s.id
            JOIN subjects sub ON r.subject_id = sub.id
            WHERE r.student_id = $1
            ORDER BY r.created_at DESC
        `;
        const results = await pool.query(query, [student_id]);
        res.json(results.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};