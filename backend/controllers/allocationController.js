const pool = require('../config/db');

// 1. Allocate Teacher — supports single allocation, single class multi-subject, OR batch multi-class multi-subject
exports.allocateTeacher = async (req, res) => {
    const { teacher_id, class_id, allocations } = req.body;

    if (!teacher_id) {
        return res.status(400).json({ message: 'teacher_id is required' });
    }

    try {
        let itemsToProcess = [];

        // If batch format provided: allocations: [{ class_id, subject_ids: [...] }]
        if (Array.isArray(allocations) && allocations.length > 0) {
            for (const item of allocations) {
                const cId = item.class_id;
                const sIds = Array.isArray(item.subject_ids) ? item.subject_ids : (item.subject_id ? [item.subject_id] : []);
                for (const sId of sIds) {
                    itemsToProcess.push({ class_id: cId, subject_id: sId });
                }
            }
        } else if (class_id) {
            // Legacy / single class format: { teacher_id, class_id, subject_ids: [...] }
            const subjectIds = Array.isArray(req.body.subject_ids)
                ? req.body.subject_ids
                : req.body.subject_id
                    ? [req.body.subject_id]
                    : [];
            for (const sId of subjectIds) {
                itemsToProcess.push({ class_id, subject_id: sId });
            }
        }

        if (itemsToProcess.length === 0) {
            return res.status(400).json({ message: 'No valid class and subject combinations provided.' });
        }

        const created = [];
        const skipped = [];

        for (const item of itemsToProcess) {
            const existing = await pool.query(
                'SELECT id FROM teacher_allocations WHERE teacher_id=$1 AND subject_id=$2 AND class_id=$3',
                [teacher_id, item.subject_id, item.class_id]
            );
            if (existing.rows.length > 0) {
                skipped.push(item);
                continue;
            }
            const newAlloc = await pool.query(
                'INSERT INTO teacher_allocations (teacher_id, subject_id, class_id) VALUES ($1, $2, $3) RETURNING *',
                [teacher_id, item.subject_id, item.class_id]
            );
            created.push(newAlloc.rows[0]);
        }

        res.status(201).json({
            message: `${created.length} allocation(s) saved, ${skipped.length} skipped (already assigned).`,
            allocations: created
        });
    } catch (err) {
        console.error('Allocate error:', err);
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