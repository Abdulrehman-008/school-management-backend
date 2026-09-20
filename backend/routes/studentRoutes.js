const express = require('express');
const router = express.Router();
const {
    addStudent, editStudent, deleteStudent,
    getStudentsByClassAndSubject, getAllStudents, getStudentsByClass
} = require('../controllers/studentController');

router.post('/add', addStudent);
router.get('/', getAllStudents);
router.get('/class/:class_id', getStudentsByClass);
router.put('/:id', editStudent);
router.delete('/:id', deleteStudent);
router.get('/:class_id/:subject_id', getStudentsByClassAndSubject);

module.exports = router;