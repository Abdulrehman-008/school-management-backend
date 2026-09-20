const express = require('express');
const router = express.Router();
const {
    allocateTeacher, deleteAllocation, getTeacherAllocations, getAllAllocations
} = require('../controllers/allocationController');

router.post('/allocate', allocateTeacher);
router.get('/all', getAllAllocations);
router.get('/teacher/:teacher_id', getTeacherAllocations);
router.delete('/:id', deleteAllocation);

module.exports = router;