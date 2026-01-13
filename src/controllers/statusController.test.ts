import { describe, it, expect, vi, beforeEach } from 'vitest';
import { changeStatus, getCurrentStatus, stopStatus } from './statusController.js';
import { pool } from '../db.js';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';

// Mock dependencies
vi.mock('../db.js', () => ({
    pool: {
        query: vi.fn(),
    },
}));

describe('statusController', () => {
    let req: Partial<AuthRequest>;
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
        req = {
            user: { id: 1, username: 'testuser', role: 'agent' },
            body: {}
        };
    });

    describe('changeStatus', () => {
        it('should return 401 if user is not authenticated', async () => {
            req.user = undefined;
            await changeStatus(req as AuthRequest, res as Response);
            expect(statusMock).toHaveBeenCalledWith(401);
        });

        it('should return 400 for invalid status', async () => {
            req.body = { status: 'invalid_status' };
            await changeStatus(req as AuthRequest, res as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid status name' }));
        });

        it('should successfully change status and end previous log', async () => {
            req.body = { status: 'lunch_break' };
            const startTime = Date.now() - 1000;

            (pool.query as any)
                .mockResolvedValueOnce({ rows: [{ id: 10, start_time: startTime.toString() }] }) // Active log check
                .mockResolvedValueOnce({}) // Update previous log
                .mockResolvedValueOnce({ rows: [{ id: 11, status_name: 'lunch_break' }] }) // Insert new log
                .mockResolvedValueOnce({}); // Update user status

            await changeStatus(req as AuthRequest, res as Response);

            expect(pool.query).toHaveBeenCalledTimes(4);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status_name: 'lunch_break' }));
        });
    });

    describe('getCurrentStatus', () => {
        it('should return 404 if no active status found', async () => {
            (pool.query as any).mockResolvedValue({ rows: [] });
            await getCurrentStatus(req as AuthRequest, res as Response);
            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('should return the active status', async () => {
            (pool.query as any).mockResolvedValue({ rows: [{ id: 10, status_name: 'available' }] });
            await getCurrentStatus(req as AuthRequest, res as Response);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ status_name: 'available' }));
        });
    });

    describe('stopStatus', () => {
        it('should return 400 if no active status to stop', async () => {
            (pool.query as any).mockResolvedValue({ rows: [] });
            await stopStatus(req as AuthRequest, res as Response);
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'No active status to stop' });
        });

        it('should successfully stop the active status', async () => {
            (pool.query as any)
                .mockResolvedValueOnce({ rows: [{ id: 10, start_time: Date.now().toString() }] }) // Active log check
                .mockResolvedValueOnce({}) // Update log
                .mockResolvedValueOnce({}); // Update user status

            await stopStatus(req as AuthRequest, res as Response);

            expect(pool.query).toHaveBeenCalledTimes(3);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Status stopped successfully' }));
        });
    });
});
