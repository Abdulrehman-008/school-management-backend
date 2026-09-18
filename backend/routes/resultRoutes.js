const express = require('express');
const router = express.Router();
const { addResult, getStudentResult } = require('../controllers/resultController');

router.post('/add', addResult);
router.get('/student/:student_id', getStudentResult);

module.exports = router;