import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";

const roleAuth = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden: You do not have the required role" });
        }

        next();
    };
};

export default roleAuth;
