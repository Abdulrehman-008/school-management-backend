const express = require('express');
const router = express.Router();
const { allocateTeacher, getTeacherAllocations } = require('../controllers/allocationController');

router.post('/allocate', allocateTeacher);
router.get('/teacher/:teacher_id', getTeacherAllocations);

module.exports = router;