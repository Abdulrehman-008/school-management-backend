const express = require('express');
const router = express.Router();
const { addClass, getClasses, addSubject, getSubjectsByClass } = require('../controllers/classController');

router.post('/add-class', addClass);
router.get('/classes', getClasses);
router.post('/add-subject', addSubject);
router.get('/subjects/:class_id', getSubjectsByClass);

module.exports = router;