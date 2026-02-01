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
        console.log("Listing all tables...");
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log("Tables found:", res.rows.map(r => r.table_name));

        for (const table of res.rows) {
            console.log(`\nColumns for table '${table.table_name}':`);
            const cols = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [table.table_name]);
            console.log(cols.rows.map(c => c.column_name));
        }
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await pool.end();
    }
}

check();
