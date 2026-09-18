const pool = require('../config/db');

// 1. Add New Class
exports.addClass = async (req, res) => {
    const { class_name } = req.body;
    try {
        const newClass = await pool.query(
            'INSERT INTO classes (class_name) VALUES ($1) RETURNING *',
            [class_name]
        );
        res.status(201).json({ message: 'Class added successfully', class: newClass.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Get All Classes
exports.getClasses = async (req, res) => {
    try {
        const classes = await pool.query('SELECT * FROM classes ORDER BY id ASC');
        res.json(classes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Add Subject to a Class
exports.addSubject = async (req, res) => {
    const { subject_name, class_id } = req.body;
    try {
        const newSubject = await pool.query(
            'INSERT INTO subjects (subject_name, class_id) VALUES ($1, $2) RETURNING *',
            [subject_name, class_id]
        );
        res.status(201).json({ message: 'Subject added successfully', subject: newSubject.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Get Subjects by Class
exports.getSubjectsByClass = async (req, res) => {
    const { class_id } = req.params;
    try {
        const subjects = await pool.query('SELECT * FROM subjects WHERE class_id = $1', [class_id]);
        res.json(subjects.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};