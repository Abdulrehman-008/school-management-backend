const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Register User (Admin / Teacher / Class Teacher)
exports.register = async (req, res) => {
    const { name, username, email, phone, password, role } = req.body;
    const userIdentifier = (username || email || '').trim();

    if (!userIdentifier || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const userExist = await pool.query(
            'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
            [userIdentifier]
        );
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            'INSERT INTO users (name, username, phone, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, username, role',
            [name || userIdentifier, userIdentifier, phone || '', hashedPassword, role || 'teacher']
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: newUser.rows[0]
        });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
};

// 2. Login User
exports.login = async (req, res) => {
    const identifier = (req.body.username || req.body.email || '').trim();
    const password = req.body.password;

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Username/Email and password are required' });
    }

    try {
        const userResult = await pool.query(
            'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
            [identifier]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, username: user.username },
            process.env.JWT_SECRET || 'super_secret_key_123',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login Database Error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// 3. Get All Teachers
exports.getTeachers = async (req, res) => {
    try {
        const teachers = await pool.query(
            "SELECT id, name, username, phone, role, created_at FROM users WHERE role IN ('teacher', 'class_teacher') ORDER BY name ASC"
        );
        res.json(teachers.rows);
    } catch (err) {
        console.error('Get Teachers Error:', err);
        res.status(500).json({ message: 'Failed to fetch teachers', error: err.message });
    }
};

// 4. Edit Teacher
exports.editTeacher = async (req, res) => {
    const { id } = req.params;
    const { name, phone } = req.body;
    try {
        const result = await pool.query(
            "UPDATE users SET name=$1, phone=$2 WHERE id=$3 AND role IN ('teacher','class_teacher') RETURNING id, name, username, phone, role",
            [name, phone || '', id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Teacher not found' });
        res.json({ message: 'Teacher updated successfully', teacher: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 5. Delete Teacher
exports.deleteTeacher = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM teacher_allocations WHERE teacher_id=$1', [id]);
        const result = await pool.query(
            "DELETE FROM users WHERE id=$1 AND role IN ('teacher','class_teacher') RETURNING id",
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Teacher not found' });
        res.json({ message: 'Teacher deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 6. Change Password
exports.changePassword = async (req, res) => {
    const { username, current_password, new_password } = req.body;
    if (!username || !current_password || !new_password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        const userResult = await pool.query(
            'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
            [username]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(current_password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashedPassword, user.id]);
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change Password Error:', err);
        res.status(500).json({ error: err.message });
    }
};

// 7. Admin Reset Teacher Credentials (no old password required)
exports.adminResetCredentials = async (req, res) => {
    const { id } = req.params;
    const { new_username, new_password } = req.body;

    if (!new_username && !new_password) {
        return res.status(400).json({ message: 'Provide at least a new username or new password.' });
    }

    try {
        // Check teacher exists
        const teacherResult = await pool.query(
            "SELECT * FROM users WHERE id=$1 AND role IN ('teacher','class_teacher')",
            [id]
        );
        if (teacherResult.rows.length === 0) {
            return res.status(404).json({ message: 'Teacher not found.' });
        }

        // If changing username, check it's not taken by another user
        if (new_username) {
            const conflict = await pool.query(
                'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
                [new_username.trim(), id]
            );
            if (conflict.rows.length > 0) {
                return res.status(400).json({ message: 'Username already taken by another user.' });
            }
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let idx = 1;

        if (new_username) {
            updates.push(`username = $${idx++}`);
            values.push(new_username.trim());
        }
        if (new_password) {
            const hashed = await bcrypt.hash(new_password, 10);
            updates.push(`password = $${idx++}`);
            values.push(hashed);
        }

        values.push(id);
        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
            values
        );

        res.json({ message: 'Teacher credentials updated successfully.' });
    } catch (err) {
        console.error('Admin Reset Credentials Error:', err);
        res.status(500).json({ error: err.message });
    }
};