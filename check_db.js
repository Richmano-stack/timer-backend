import pg from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function check() {
    try {
        console.log("Checking columns for table 'user'...");
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'user'
        `);
        console.log("Columns found:", res.rows);

        console.log("\nTrying SELECT id FROM \"user\"...");
        const res2 = await pool.query('SELECT id FROM "user" LIMIT 1');
        console.log("Successfully selected id from \"user\"");

        console.log("\nTrying SELECT id FROM user...");
        const res3 = await pool.query('SELECT id FROM user LIMIT 1');
        console.log("Successfully selected id from user (this shouldn't happen if user is reserved)");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await pool.end();
    }
}

check();
