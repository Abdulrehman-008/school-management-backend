const { Pool } = require('pg');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || 'aws-0-ap-southeast-2.pooler.supabase.com';
const DB_PORT = Number(process.env.DB_PORT) || 6543;
const DB_NAME = process.env.DB_NAME || 'postgres';
const DB_USER = process.env.DB_USER || 'postgres.sthjormolhxnzlocdxoq';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Abdul@uog@2007';

const poolConfig = (process.env.DATABASE_URL && !process.env.DB_HOST)
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    }
    : {
        host: DB_HOST,
        port: DB_PORT,
        database: DB_NAME,
        user: DB_USER,
        password: DB_PASSWORD,
        ssl: {
            rejectUnauthorized: false
        }
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
});

// Test connection on startup (non-fatal for serverless environments)
pool.query('SELECT NOW()')
    .then(() => console.log('Successfully connected to Supabase PostgreSQL Database!'))
    .catch(err => console.error('Database connection warning:', err.message));

module.exports = pool;