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
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                current_status TEXT DEFAULT 'available', -- 'on_production', 'lunch_break', 'away'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email') THEN
                    ALTER TABLE users ADD COLUMN email TEXT UNIQUE NOT NULL;
                ELSE
                    ALTER TABLE users ALTER COLUMN email SET NOT NULL;
                END IF;
            END $$;
            
            CREATE TABLE IF NOT EXISTS status_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status_name TEXT NOT NULL,
                start_time BIGINT NOT NULL,
                end_time BIGINT, -- NULL if still active
                duration_ms INTEGER DEFAULT 0 -- Calculated when session ends
            );

            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                token TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
    } catch (err) {
        console.error(err);
    }
};


