const express = require('express');
const router = express.Router();
const {
    addClass, editClass, deleteClass, getClasses,
    addSubject, editSubject, deleteSubject, getSubjectsByClass
} = require('../controllers/classController');

router.post('/add-class', addClass);
router.get('/classes', getClasses);
router.put('/classes/:id', editClass);
router.delete('/classes/:id', deleteClass);

router.post('/add-subject', addSubject);
router.get('/subjects/:class_id', getSubjectsByClass);
router.put('/subjects/:id', editSubject);
router.delete('/subjects/:id', deleteSubject);

module.exports = router;