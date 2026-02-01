import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../drizzle/db.js";

export const getTeamStatus = async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    try {
        const { rows } = await pool.query(
            `SELECT u.id, u.name as username, u.role, sl.status_name as current_status 
             FROM "user" u 
             LEFT JOIN status_logs sl ON sl.user_id = u.id AND sl.end_time IS NULL 
             WHERE u.is_active = true 
             ORDER BY u.name ASC`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch team status" });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    try {
        const { rows } = await pool.query(
            'SELECT id, name as username, email, role, is_active, "createdAt" FROM "user" ORDER BY "createdAt" DESC'
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

export const createUser = async (req: Request, res: Response) => {
    const { username, password, email, role } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Note: Better-auth stores passwords in the 'account' table. 
        // This direct insert into 'user' table will only work if the columns match.
        // The 'user' table in your schema does not have password_hash.
        const { rows } = await pool.query(
            'INSERT INTO "user" (name, email, role, "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, false, NOW(), NOW()) RETURNING id, name as username, email, role',
            [username, email, role || 'agent']
        );
        res.status(201).json(rows[0]);
    } catch (err: unknown) {
        if (err && typeof err === "object" && "code" in err && err.code === "23505") {
            return res.status(400).json({ error: "Username or email already exists" });
        }
        console.error(err);
        res.status(500).json({ error: "User creation failed" });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { email, role, is_active } = req.body;

    try {
        const { rows } = await pool.query(
            'UPDATE "user" SET email = $1, role = $2, is_active = $3, "updatedAt" = NOW() WHERE id = $4 RETURNING id, name as username, email, role, is_active',
            [email, role, is_active, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "User update failed" });
    }
};

export const deactivateUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const { rows } = await pool.query(
            'UPDATE "user" SET is_active = false, "updatedAt" = NOW() WHERE id = $1 RETURNING id, name as username, is_active',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "User deactivated successfully", user: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "User deactivation failed" });
    }
};
