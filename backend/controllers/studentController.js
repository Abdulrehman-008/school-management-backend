const pool = require('../config/db');

// 1. Add Student
exports.addStudent = async (req, res) => {
    const { roll_no, name, class_id, subject_id } = req.body;
    try {
        const newStudent = await pool.query(
            'INSERT INTO students (roll_no, name, class_id, subject_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [roll_no, name, class_id, subject_id]
        );
        res.status(201).json({ message: 'Student added successfully', student: newStudent.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Get Students by Class & Subject
exports.getStudentsByClassAndSubject = async (req, res) => {
    const { class_id, subject_id } = req.params;
    try {
        const students = await pool.query(
            'SELECT * FROM students WHERE class_id = $1 AND subject_id = $2 ORDER BY roll_no ASC',
            [class_id, subject_id]
        );
        res.json(students.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};