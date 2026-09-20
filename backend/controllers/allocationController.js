const pool = require('../config/db');

// 1. Allocate Teacher — supports multiple subjects in one call
exports.allocateTeacher = async (req, res) => {
    const { teacher_id, class_id } = req.body;
    // Accept either subject_ids (array) or legacy subject_id (single)
    const subjectIds = Array.isArray(req.body.subject_ids)
        ? req.body.subject_ids
        : req.body.subject_id
            ? [req.body.subject_id]
            : [];

    if (!teacher_id || !class_id || subjectIds.length === 0) {
        return res.status(400).json({ message: 'teacher_id, class_id, and at least one subject are required' });
    }

    try {
        const created = [];
        const skipped = [];
        for (const subject_id of subjectIds) {
            const existing = await pool.query(
                'SELECT id FROM teacher_allocations WHERE teacher_id=$1 AND subject_id=$2 AND class_id=$3',
                [teacher_id, subject_id, class_id]
            );
            if (existing.rows.length > 0) {
                skipped.push(subject_id);
                continue;
            }
            const newAlloc = await pool.query(
                'INSERT INTO teacher_allocations (teacher_id, subject_id, class_id) VALUES ($1, $2, $3) RETURNING *',
                [teacher_id, subject_id, class_id]
            );
            created.push(newAlloc.rows[0]);
        }
        res.status(201).json({
            message: `${created.length} allocation(s) created, ${skipped.length} skipped (already exist)`,
            allocations: created
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Delete a single allocation
exports.deleteAllocation = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM teacher_allocations WHERE id=$1', [id]);
        res.json({ message: 'Allocation removed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Get Allocations by Teacher ID
exports.getTeacherAllocations = async (req, res) => {
    const { teacher_id } = req.params;
    try {
        const query = `
            SELECT ta.id, ta.class_id, ta.subject_id, c.class_name, s.subject_name
            FROM teacher_allocations ta
            JOIN classes c ON ta.class_id = c.id
            JOIN subjects s ON ta.subject_id = s.id
            WHERE ta.teacher_id = $1
            ORDER BY c.class_name ASC, s.subject_name ASC
        `;
        const allocations = await pool.query(query, [teacher_id]);
        res.json(allocations.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 4. Get All Allocations (Admin view)
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