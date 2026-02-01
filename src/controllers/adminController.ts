import { Response } from "express";
import { db } from "../drizzle/db.js";
import { user, statusLogs } from "../drizzle/schema.js";
import { eq, and, isNull, desc } from "drizzle-orm";
import { AuthRequest } from "../middleware/betterAuth.js";
import { auth } from "../drizzle/auth.js";


export const getTeamStatus = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    try {
        const rows = await db.select({
            id: user.id,
            username: user.name,
            role: user.role,
            current_status: statusLogs.statusName
        })
            .from(user)
            .leftJoin(statusLogs, and(
                eq(statusLogs.userId, user.id),
                isNull(statusLogs.endTime)
            ))
            .where(eq(user.is_active, true))
            .orderBy(user.name);

        res.json(rows);
    } catch (err) {
        console.error("Get team status error:", err);
        res.status(500).json({ error: "Failed to fetch team status" });
    }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    try {
        const rows = await db.select({
            id: user.id,
            username: user.name,
            email: user.email,
            role: user.role,
            is_active: user.is_active,
            createdAt: user.createdAt
        })
            .from(user)
            .orderBy(desc(user.createdAt));

        res.json(rows);
    } catch (err) {
        console.error("Get all users error:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

export const createUser = async (req: AuthRequest, res: Response) => {
    const { username, password, email, role } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const result = await auth.api.signUpEmail({
            body: {
                email: email.toLowerCase(),
                password: password,
                name: username,
                role: role || 'agent',
                is_active: true,
            },
        });

        res.status(201).json(result.user);
    } catch (err: any) {
        console.error("Auth API Error:", err);
        res.status(500).json({ error: "Creation failed" });
    }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { email, role, is_active } = req.body;

    try {
        const [updatedUser] = await db
            .update(user)
            .set({
                email,
                role,
                is_active,
                updatedAt: new Date(),
            })
            .where(eq(user.id, id as string))
            .returning({
                id: user.id,
                username: user.name,
                email: user.email,
                role: user.role,
                is_active: user.is_active,
            });

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(updatedUser);
    } catch (err) {
        console.error("User update error:", err);
        res.status(500).json({ error: "User update failed" });
    }
};

export const deactivateUser = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    try {
        const [deactivatedUser] = await db
            .update(user)
            .set({
                is_active: false,
                updatedAt: new Date(),
            })
            .where(eq(user.id, id as string))
            .returning({
                id: user.id,
                username: user.name,
                is_active: user.is_active,
            });

        if (!deactivatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User deactivated successfully", user: deactivatedUser });
    } catch (err) {
        console.error("User deactivation error:", err);
        res.status(500).json({ error: "User deactivation failed" });
    }
};
