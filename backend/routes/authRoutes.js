const express = require('express');
const router = express.Router();
const { register, login, getTeachers } = require('../controllers/authController');

// Test GET route to verify endpoint reachability
router.get('/login', (req, res) => {
  res.json({ message: 'Auth route is reachable via GET!' });
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

// Authentication endpoints
router.post('/register', register);
router.post('/login', login);
router.get('/teachers', getTeachers);

module.exports = router;