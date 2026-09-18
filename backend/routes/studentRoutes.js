const express = require('express');
const router = express.Router();
const { addStudent, getStudentsByClassAndSubject } = require('../controllers/studentController');

router.post('/add', addStudent);
router.get('/:class_id/:subject_id', getStudentsByClassAndSubject);

module.exports = router;