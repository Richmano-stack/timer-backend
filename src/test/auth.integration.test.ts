import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../index.js';
import { pool, initDb } from '../db.js';

describe('Auth Integration Tests', () => {
    beforeAll(async () => {
        await initDb();
    });

    beforeEach(async () => {
        // Clean up users before each test
        await pool.query('TRUNCATE users, refresh_tokens RESTART IDENTITY CASCADE');
    });

    const testAdmin = {
        username: 'admin_user',
        email: 'admin@xcompany.com',
        password: 'AdminPassword123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
    };

    const testUser = {
        username: 'testuser_int',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
    };

    async function getAdminToken() {
        const hashedPassword = await bcrypt.hash(testAdmin.password, 10);
        await pool.query(
            'INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6)',
            [testAdmin.username, testAdmin.email, hashedPassword, testAdmin.firstName, testAdmin.lastName, testAdmin.role]
        );

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                identifier: testAdmin.username,
                password: testAdmin.password
            });

        if (res.status !== 200) {
            return undefined;
        }

        // Extract token from cookies
        const cookies = res.header['set-cookie'] as string[] | undefined;
        if (!cookies) return undefined;

        const tokenCookie = cookies.find((c: string) => c.startsWith('token='));
        if (!tokenCookie) return undefined;

        const parts = tokenCookie.split(';')[0]?.split('=');
        return parts?.[1];
    }

    it('should return 401 for unauthenticated registration', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.status).toBe(401);
    });

    it('should return 403 for non-admin registration', async () => {
        // Register and login as a regular agent first
        const adminToken = await getAdminToken();
        if (!adminToken) {
            throw new Error('Failed to get admin token');
        }

        await request(app)
            .post('/api/auth/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(testUser);

        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                identifier: testUser.username,
                password: testUser.password
            });

        const cookies = loginRes.header['set-cookie'] as string[] | undefined;
        const tokenCookie = cookies?.find((c: string) => c.startsWith('token='));
        const agentToken = tokenCookie?.split(';')[0]?.split('=')[1];

        if (!agentToken) {
            throw new Error('Failed to get agent token');
        }

        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', `Bearer ${agentToken}`)
            .send({ ...testUser, username: 'another_user' });

        expect(res.status).toBe(403);
    });

    it('should allow admin to register a new user', async () => {
        const adminToken = await getAdminToken();
        if (!adminToken) throw new Error('Failed to get admin token');

        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(testUser);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('username', testUser.username);
        expect(res.body).toHaveProperty('role', 'agent'); // Default role
    });

    it('should allow admin to register a user with a specific role', async () => {
        const adminToken = await getAdminToken();
        if (!adminToken) throw new Error('Failed to get admin token');

        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ...testUser, role: 'supervisor' });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('role', 'supervisor');
    });

    it('should return 400 for invalid role', async () => {
        const adminToken = await getAdminToken();
        if (!adminToken) throw new Error('Failed to get admin token');

        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ ...testUser, role: 'invalid_role' });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Invalid role');
    });

    it('should login the registered user', async () => {
        const adminToken = await getAdminToken();
        if (!adminToken) throw new Error('Failed to get admin token');

        await request(app)
            .post('/api/auth/register')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(testUser);

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                identifier: testUser.username,
                password: testUser.password
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
    });
});
