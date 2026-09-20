const express = require('express');
const router = express.Router();
const { addStudent, getStudentsByClassAndSubject, getAllStudents, getStudentsByClass } = require('../controllers/studentController');

router.post('/add', addStudent);
router.get('/', getAllStudents);
router.get('/class/:class_id', getStudentsByClass);
router.get('/:class_id/:subject_id', getStudentsByClassAndSubject);

module.exports = router;