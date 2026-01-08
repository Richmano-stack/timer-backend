import dotenv from "dotenv";
import pg from "pg";

dotenv.config();
const { Pool } = pg;

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const initDb = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                current_status TEXT DEFAULT 'available', -- 'on_production', 'lunch_break', 'away'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS status_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status_name TEXT NOT NULL,
                start_time BIGINT NOT NULL,
                end_time BIGINT, -- NULL if still active
                duration_ms INTEGER DEFAULT 0 -- Calculated when session ends
            );
        `);
    } catch (err) {
        console.error(err);
    }
};


