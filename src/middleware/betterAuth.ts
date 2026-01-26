import { auth } from "../drizzle/auth.js";
import { Response, NextFunction, Request } from "express";

export interface AuthRequest extends Request {
    user?: any;
    session?: any;
}

export const authMiddleware = async (req: any, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({
        headers: req.headers,
    });

    if (!session) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = session.user;
    req.session = session.session;

    next();
};