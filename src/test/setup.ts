import dotenv from 'dotenv';
dotenv.config({ path: 'env.test', override: true });

import { beforeAll, afterAll, afterEach } from 'vitest';
import { pool } from '../db.js';

beforeAll(async () => {
    // Ensure we are in test environment
    if (process.env.NODE_ENV !== 'test') {
        throw new Error('Tests must run with NODE_ENV=test');
    }
    // Optional: Run migrations here if needed
});

afterEach(async () => {
    // Truncate tables between tests
    if (process.env.NODE_ENV === 'test') {
        await pool.query('TRUNCATE users, status_logs, refresh_tokens RESTART IDENTITY CASCADE');
    }
});

afterAll(async () => {
    await pool.end();
});
