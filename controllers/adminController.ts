import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { AuthRequest } from "../middleware/auth.js";

export const getTeamStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, username, first_name, last_name, current_status, role FROM users WHERE is_active = true ORDER BY first_name ASC"
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch team status" });
    }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, username, email, first_name, last_name, role, is_active, created_at FROM users ORDER BY created_at DESC"
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

export const createUser = async (req: Request, res: Response) => {
    const { username, password, firstName, lastName, email, role } = req.body;

    if (!username || !password || !firstName || !lastName || !email) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(
            "INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, first_name, last_name, role",
            [username, email, hashedPassword, firstName, lastName, role || 'agent']
        );
        res.status(201).json(rows[0]);
    } catch (err: any) {
        if (err.code === "23505") {
            return res.status(400).json({ error: "Username or email already exists" });
        }
        console.error(err);
        res.status(500).json({ error: "User creation failed" });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { firstName, lastName, email, role, is_active } = req.body;

    try {
        const { rows } = await pool.query(
            "UPDATE users SET first_name = $1, last_name = $2, email = $3, role = $4, is_active = $5 WHERE id = $6 RETURNING id, username, email, first_name, last_name, role, is_active",
            [firstName, lastName, email, role, is_active, id]
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
            "UPDATE users SET is_active = false WHERE id = $1 RETURNING id, username, is_active",
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
