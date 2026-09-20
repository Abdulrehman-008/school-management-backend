const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DB_HOST
    ? {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'postgres',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: {
            rejectUnauthorized: false
        }
    }
    : {
        connectionString: process.env.DATABASE_URL,
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