import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { initDb } from '../db.js';

describe('Status Integration Tests', () => {
    let token: string;

    beforeEach(async () => {
        await initDb();

        // Register and login a user to get a token
        const testUser = {
            username: 'statususer_int',
            email: 'status_int@example.com',
            password: 'Password123!',
            firstName: 'Status',
            lastName: 'User'
        };

        const regRes = await request(app).post('/api/auth/register').send(testUser);
        if (regRes.status !== 201) {
            console.error('Registration failed:', regRes.body);
        }

        const loginRes = await request(app).post('/api/auth/login').send({
            identifier: testUser.username,
            password: testUser.password
        });

        if (loginRes.status !== 200) {
            console.error('Login failed:', loginRes.body);
        }

        token = loginRes.body.token;
    });

    it('should change user status', async () => {
        const res = await request(app)
            .post('/api/status/change')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'lunch_break' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status_name', 'lunch_break');
    });

    it('should get current status', async () => {
        // Set status first
        await request(app)
            .post('/api/status/change')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'lunch_break' });

        const res = await request(app)
            .get('/api/status/current')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status_name', 'lunch_break');
    });

    it('should stop current status', async () => {
        // Set status first
        await request(app)
            .post('/api/status/change')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'lunch_break' });

        const res = await request(app)
            .post('/api/status/stop')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message', 'Status stopped successfully');
    });

    it('should return 400 when stopping status if none is active', async () => {
        // Status was stopped in previous test
        const res = await request(app)
            .post('/api/status/stop')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'No active status to stop');
    });
});
