import { Request, Response, NextFunction } from "express";

const roleAuth = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            console.log("RoleAuth failed: No user in request");
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!allowedRoles.includes(req.user.role)) {
            console.log(`RoleAuth failed: User role '${req.user.role}' not in allowed roles [${allowedRoles.join(", ")}]`);
            return res.status(403).json({ error: "Forbidden: You do not have the required role" });
        }

        next();
    };
};

export default roleAuth;
