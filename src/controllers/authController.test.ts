import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, login } from './authController.js';
import { pool } from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

// Mock dependencies
vi.mock('../db.js', () => ({
    pool: {
        query: vi.fn(),
    },
}));

vi.mock('bcryptjs', () => ({
    default: {
        hash: vi.fn(),
        compare: vi.fn(),
    },
}));

vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(),
    },
}));

describe('authController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let statusMock: any;
    let jsonMock: any;

    beforeEach(() => {
        vi.clearAllMocks();
        statusMock = vi.fn().mockReturnThis();
        jsonMock = vi.fn().mockReturnThis();
        res = {
            status: statusMock,
            json: jsonMock,
        };
    });

    describe('register', () => {
        it('should return 400 if required fields are missing', async () => {
            req = { body: { username: 'test' } }; // Missing password, firstName, lastName
            await register(req as Request, res as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('Missing required fields') }));
        });

        it('should successfully register a user', async () => {
            req = {
                body: {
                    username: 'testuser',
                    password: 'password123',
                    firstName: 'John',
                    lastName: 'Doe'
                }
            };

            (pool.query as any)
                .mockResolvedValueOnce({ rows: [] }) // For existing emails check
                .mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'john.doe@xcompany.com' }] }); // For insert

            (bcrypt.hash as any).mockResolvedValue('hashed_password');

            await register(req as Request, res as Response);

            expect(pool.query).toHaveBeenCalledTimes(2);
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ username: 'testuser' }));
        });

        it('should handle duplicate username error from DB', async () => {
            req = {
                body: {
                    username: 'testuser',
                    password: 'password123',
                    firstName: 'John',
                    lastName: 'Doe'
                }
            };

            (pool.query as any)
                .mockResolvedValueOnce({ rows: [] }) // Email check
                .mockRejectedValueOnce({ code: '23505', detail: 'Key (username)=(testuser) already exists.' });

            await register(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Username already exists' });
        });
    });

    describe('login', () => {
        it('should return 401 for invalid credentials', async () => {
            req = { body: { identifier: 'testuser', password: 'wrongpassword' } };
            (pool.query as any).mockResolvedValue({ rows: [{ username: 'testuser', password_hash: 'hashed' }] });
            (bcrypt.compare as any).mockResolvedValue(false);

            await login(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid credentials' });
        });

        it('should return 403 if account is deactivated', async () => {
            req = { body: { identifier: 'testuser', password: 'password123' } };
            (pool.query as any).mockResolvedValue({ rows: [{ username: 'testuser', password_hash: 'hashed', is_active: false }] });
            (bcrypt.compare as any).mockResolvedValue(true);

            await login(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Account is deactivated' });
        });
    });
});
