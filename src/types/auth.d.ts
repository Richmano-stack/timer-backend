import { Request } from "express";
import { auth } from "../drizzle/auth.js";

type Session = typeof auth.$Infer.Session;

declare global {
    namespace Express {
        interface Request {
            user?: Session["user"] & { role: string };
            session?: Session["session"];
        }
    }
}

export interface AuthRequest extends Request {
    user: Session["user"] & { role: string };
    session: Session["session"];
}