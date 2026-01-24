import { pool } from './drizzle/db.js';

async function promote() {
    try {
        const res = await pool.query("UPDATE users SET role = 'admin' WHERE email = 'test.user2@xcompany.com' RETURNING *");
        console.log('Promoted to admin:', res.rows[0]?.email);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

promote();
