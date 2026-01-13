/**
 * CHALLENGE 1: DATABASE CONFIGURATION & SCHEMA
 * * 1. IMPORTS:
 * - Import 'dotenv' to load environment variables.
 * - Import 'pg' (PostgreSQL client).
 * * 2. SETUP:
 * - Initialize dotenv config.
 * - Extract 'Pool' from the pg import.
 * * 3. CONNECTION:
 * - Create a new instance of Pool.
 * - Pass the 'connectionString' using 'process.env.DATABASE_URL'.
 * - Export this 'pool' constant.
 * * 4. SCHEMA INITIALIZATION (initDb function):
 * - Export an async function named 'initDb'.
 * - Wrap everything in a try/catch block.
 * - Inside try, use 'pool.query' to:
 * A. Create 'users' table:
 * (id, username, email, password_hash, first_name, last_name, current_status, created_at).
 * B. Use a 'DO $$' block to safely add/alter columns if they don't exist:
 * - Ensure 'email' exists and is NOT NULL.
 * - Add 'role' (default 'agent') if missing.
 * - Add 'is_active' (default true) if missing.
 * C. Create 'status_logs' table:
 * (id, user_id (FK), status_name, start_time (BIGINT), end_time (BIGINT), duration_ms).
 * D. Create 'refresh_tokens' table:
 * (id, user_id (FK), token (UNIQUE), expires_at, created_at).
 * * 5. ERROR HANDLING:
 * - In the catch block, console.error the error.
 */

// START CODING HERE...


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
                username VARCHAR(50) NOT NULL,
                email VARCHAR(100) NOT NULL,
                password_hash VARCHAR(100) NOT NULL,
                first_name VARCHAR(50),
                last_name VARCHAR(50),
                current_status TEXT DEFAULT 'offline' CHECK( current_status IN ('online', 'offline', 'away', 'lunch_break', 'break', 'meeting', 'available', 'working', 'on_call')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                role TEXT DEFAULT 'agent' CHECK( role IN ('agent', 'admin') ),
                is_active BOOLEAN DEFAULT true
            )
        `)

        // Enforce email uniqueness
        await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique
        ON users(email)
        `);

        await pool.query(`CREATE TABLE IF NOT EXISTS status_logs (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            status_name VARCHAR(50) NOT NULL,
            start_time BIGINT NOT NULL,
            end_time BIGINT,
            duration_ms BIGINT
        )`)

        await pool.query(`CREATE TABLE IF NOT EXISTS refresh_tokens (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(100) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`)

    } catch (error) {
        console.error(error)
    }
}

// Automatically initialize DB when this module is loaded (optional, but kept for consistency)
initDb();
