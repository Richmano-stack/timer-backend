import { describe, it, expect, vi, beforeEach } from 'vitest';
import auth, { AuthRequest } from './auth.js';
import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';

vi.mock('jsonwebtoken', () => ({
    default: {
        verify: vi.fn(),
    },
}));

describe('authMiddleware', () => {
    let req: Partial<AuthRequest>;
    let res: Partial<Response>;
    let next: NextFunction;
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
        next = vi.fn();
        req = {
            header: vi.fn(),
        };
    });

    it('should return 401 if no token is provided', () => {
        (req.header as any).mockReturnValue(null);
        auth(req as AuthRequest, res as Response, next);
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'No token, authorization denied' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should call next() and attach user if token is valid', () => {
        const mockUser = { id: 1, username: 'testuser', role: 'agent' };
        (req.header as any).mockReturnValue('Bearer valid_token');
        (jwt.verify as any).mockReturnValue(mockUser);

        auth(req as AuthRequest, res as Response, next);

        expect(jwt.verify).toHaveBeenCalledWith('valid_token', expect.any(String));
        expect(req.user).toEqual(mockUser);
        expect(next).toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
        (req.header as any).mockReturnValue('Bearer invalid_token');
        (jwt.verify as any).mockImplementation(() => {
            throw new Error('Invalid token');
        });

        auth(req as AuthRequest, res as Response, next);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Token is not valid' });
        expect(next).not.toHaveBeenCalled();
    });
});
