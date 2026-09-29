const express = require('express');
const router = express.Router();
const { addResult, getStudentResult, getClassResults, getSubjectResults } = require('../controllers/resultController');

router.post('/add', addResult);
router.get('/class/:class_id', getClassResults);
router.get('/class/:class_id/subject/:subject_id', getSubjectResults);
router.get('/student/:student_id', getStudentResult);

module.exports = router;