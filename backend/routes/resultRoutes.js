const express = require('express');
const router = express.Router();
const { addResult, getStudentResult, getClassResults } = require('../controllers/resultController');

router.post('/add', addResult);
router.get('/class/:class_id', getClassResults);
router.get('/student/:student_id', getStudentResult);

module.exports = router;