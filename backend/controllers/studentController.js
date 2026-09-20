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

// 3. Get All Students with Class Name
exports.getAllStudents = async (req, res) => {
    try {
        const query = `
            SELECT s.id, s.roll_no, s.name, s.class_id, s.subject_id, c.class_name, sub.subject_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            LEFT JOIN subjects sub ON s.subject_id = sub.id
            ORDER BY c.id ASC, s.roll_no ASC
        `;
        const students = await pool.query(query);
        res.json(students.rows);
    } catch (err) {
        console.error('Get All Students Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 4. Get Students by Class
exports.getStudentsByClass = async (req, res) => {
    const { class_id } = req.params;
    try {
        const query = `
            SELECT s.id, s.roll_no, s.name, s.class_id, s.subject_id, c.class_name
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.class_id = $1
            ORDER BY s.roll_no ASC
        `;
        const students = await pool.query(query, [class_id]);
        res.json(students.rows);
    } catch (err) {
        console.error('Get Students By Class Error:', err);
        res.status(500).json({ error: err.message });
    }
};