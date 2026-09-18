const express = require('express');
const router = express.Router();

// Test GET route to verify endpoint reachability
router.get('/login', (req, res) => {
  res.json({ message: 'Auth route is reachable via GET!' });
});

// POST route for login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Dummy logic or database call
  if (username && password) {
    return res.status(200).json({
      message: 'Login successful',
      user: { name: username }
    });
  }
  return res.status(400).json({ message: 'Username and password required' });
});

module.exports = router;