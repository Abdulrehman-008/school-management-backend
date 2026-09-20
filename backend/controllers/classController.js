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

// 2. Edit Class
exports.editClass = async (req, res) => {
    const { id } = req.params;
    const { class_name, class_teacher_id } = req.body;
    try {
        const result = await pool.query(
            'UPDATE classes SET class_name=$1, class_teacher_id=$2 WHERE id=$3 RETURNING *',
            [class_name, class_teacher_id || null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Class not found' });
        res.json({ message: 'Class updated', class: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Delete Class
exports.deleteClass = async (req, res) => {
    const { id } = req.params;
    try {
        // Cascade: remove allocations, then subjects, then class
        await pool.query('DELETE FROM teacher_allocations WHERE class_id=$1', [id]);
        await pool.query('DELETE FROM subjects WHERE class_id=$1', [id]);
        await pool.query('DELETE FROM classes WHERE id=$1', [id]);
        res.json({ message: 'Class deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Get All Classes (with class teacher name)
exports.getClasses = async (req, res) => {
    try {
        const classes = await pool.query(`
            SELECT c.*, u.name as class_teacher_name
            FROM classes c
            LEFT JOIN users u ON c.class_teacher_id = u.id
            ORDER BY c.id ASC
        `);
        res.json(classes.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. Add Subject to a Class
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

// 6. Edit Subject
exports.editSubject = async (req, res) => {
    const { id } = req.params;
    const { subject_name } = req.body;
    try {
        const result = await pool.query(
            'UPDATE subjects SET subject_name=$1 WHERE id=$2 RETURNING *',
            [subject_name, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Subject not found' });
        res.json({ message: 'Subject updated', subject: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 7. Delete Subject
exports.deleteSubject = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM teacher_allocations WHERE subject_id=$1', [id]);
        await pool.query('DELETE FROM subjects WHERE id=$1', [id]);
        res.json({ message: 'Subject deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 8. Get Subjects by Class
exports.getSubjectsByClass = async (req, res) => {
    const { class_id } = req.params;
    try {
        const subjects = await pool.query('SELECT * FROM subjects WHERE class_id = $1 ORDER BY id ASC', [class_id]);
        res.json(subjects.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};