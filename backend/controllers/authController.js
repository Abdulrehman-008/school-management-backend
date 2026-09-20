const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 1. Register User (Admin / Teacher)
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