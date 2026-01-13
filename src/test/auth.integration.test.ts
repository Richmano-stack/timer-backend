import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { initDb } from '../db.js';

describe('Auth Integration Tests', () => {
    beforeAll(async () => {
        await initDb();
    });

    const testUser = {
        username: 'testuser_int',
        email: 'test_int@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
    };

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('username', testUser.username);
    });

    it('should login the registered user', async () => {
        // Register first
        await request(app).post('/api/auth/register').send(testUser);

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                identifier: testUser.username,
                password: testUser.password
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body).toHaveProperty('refreshToken');
    });

    it('should return 401 for login with wrong password', async () => {
        // Register first
        await request(app).post('/api/auth/register').send(testUser);

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                identifier: testUser.username,
                password: 'wrongpassword'
            });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should get current user profile with valid token', async () => {
        // Register and login
        await request(app).post('/api/auth/register').send(testUser);
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                identifier: testUser.username,
                password: testUser.password
            });

        const token = loginRes.body.token;

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('username', testUser.username);
    });
});
