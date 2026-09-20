const pool = require('../config/db');

// 1. Assign Teacher to Subject and Class
exports.allocateTeacher = async (req, res) => {
    const { teacher_id, subject_id, class_id } = req.body;
    try {
        const newAllocation = await pool.query(
            'INSERT INTO teacher_allocations (teacher_id, subject_id, class_id) VALUES ($1, $2, $3) RETURNING *',
            [teacher_id, subject_id, class_id]
        );
        res.status(201).json({ message: 'Teacher allocated successfully', allocation: newAllocation.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Get Allocations by Teacher ID
exports.getTeacherAllocations = async (req, res) => {
    const { teacher_id } = req.params;
    try {
        const query = `
            SELECT ta.id, c.class_name, s.subject_name 
            FROM teacher_allocations ta
            JOIN classes c ON ta.class_id = c.id
            JOIN subjects s ON ta.subject_id = s.id
            WHERE ta.teacher_id = $1
        `;
        const allocations = await pool.query(query, [teacher_id]);
        res.json(allocations.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Get All Allocations (Admin view — all teachers with their classes and subjects)
exports.getAllAllocations = async (req, res) => {
    try {
        const query = `
            SELECT ta.id, u.id as teacher_id, u.name as teacher_name, u.username,
                   c.id as class_id, c.class_name,
                   s.id as subject_id, s.subject_name
            FROM teacher_allocations ta
            JOIN users u ON ta.teacher_id = u.id
            JOIN classes c ON ta.class_id = c.id
            JOIN subjects s ON ta.subject_id = s.id
            ORDER BY u.name ASC, c.class_name ASC
        `;
        const allocations = await pool.query(query);
        res.json(allocations.rows);
    } catch (err) {
        console.error('Get All Allocations Error:', err);
        res.status(500).json({ error: err.message });
    }
};