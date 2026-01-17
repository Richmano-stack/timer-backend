import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    user?: {
        id: number;
        username: string;
        role: string;
    } | undefined;
}

const auth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.header("Authorization");
    let token = authHeader?.replace(/^Bearer\s+/i, "");

    // If no token in header, check cookies
    if (!token && req.cookies) {
        token = req.cookies.token;
    }

    if (!token) {
        console.log("Auth failed: No token provided");
        return res.status(401).json({ error: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            id: number;
            username: string;
            role: string;
        };
        req.user = decoded;
        console.log(`Auth success: User ${decoded.username} (${decoded.role}) authenticated`);
        next();
    } catch (err) {
        console.error("Auth failed: Token invalid or expired", err);
        res.status(401).json({ error: "Token is not valid" });
    }
};

export default auth;
