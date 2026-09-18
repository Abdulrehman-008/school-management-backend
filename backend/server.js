const express = require('express');
const cors = require('cors');
require('dotenv').config();
require('./config/db');

const authRoutes = require('./routes/authRoutes');
const classRoutes = require('./routes/classRoutes');
const allocationRoutes = require('./routes/allocationRoutes');
const studentRoutes = require('./routes/studentRoutes');
const resultRoutes = require('./routes/resultRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/school', classRoutes);
app.use('/api/allocation', allocationRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/results', resultRoutes);

app.get('/', (req, res) => {
    res.send('School Management System API is Running...');
});

const PORT = process.env.PORT || 5000;

// Host '0.0.0.0' explicitly bind karein
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});