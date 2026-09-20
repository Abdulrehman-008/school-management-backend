const express = require('express');
const router = express.Router();
const {
    register, login, getTeachers, editTeacher, deleteTeacher, changePassword
} = require('../controllers/authController');

router.get('/login', (req, res) => res.json({ message: 'Auth route is reachable via GET!' }));
router.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth' }));

router.post('/register', register);
router.post('/login', login);
router.get('/teachers', getTeachers);
router.put('/teachers/:id', editTeacher);
router.delete('/teachers/:id', deleteTeacher);
router.put('/change-password', changePassword);

module.exports = router;