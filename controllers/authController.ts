import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { pool } from "../db.js";
import { AuthRequest } from "../middleware/auth.js";

export const register = async (req: Request, res: Response) => {
    const { username, password, firstName, lastName } = req.body;

    // 1. Validation
    if (!username || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "Missing required fields: username, password, firstName, lastName" });
    }

    try {
        // 2. Automatic Email Generation Logic
        const baseEmailPrefix = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
        const domain = "@xcompany.com";

        // Find existing emails with the same prefix to handle collisions
        const { rows: existingEmails } = await pool.query(
            "SELECT email FROM users WHERE email LIKE $1",
            [`${baseEmailPrefix}%${domain}`]
        );

        let email = `${baseEmailPrefix}${domain}`;
        if (existingEmails.length > 0) {
            // Extract suffixes and find the next available number
            const suffixes = existingEmails
                .map(row => {
                    const match = row.email.match(new RegExp(`${baseEmailPrefix}(\\d+)${domain}`));
                    return match ? parseInt(match[1]) : 1;
                })
                .filter(n => !isNaN(n));

            const maxSuffix = suffixes.length > 0 ? Math.max(...suffixes) : 1;
            email = `${baseEmailPrefix}${maxSuffix + 1}${domain}`;
        }

        // 3. Security: Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Data Integrity: Insert with RETURNING
        const { rows } = await pool.query(
            "INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, first_name, last_name",
            [username, email, hashedPassword, firstName, lastName]
        );

        res.status(201).json(rows[0]);
    } catch (err: unknown) {
        // 5. Error Handling
        if (err && typeof err === "object" && "code" in err && err.code === "23505") {
            return res.status(400).json({ error: "Username already exists" });
        }
        console.error(err);
        res.status(500).json({ error: "Registration failed" });
    }
};

export const login = async (req: Request, res: Response) => {
    const { identifier, password } = req.body; // 'identifier' can be username or email

    if (!identifier || !password) {
        return res.status(400).json({ error: "Identifier (username/email) and password are required" });
    }

    try {
        // Search by username OR email
        const { rows } = await pool.query(
            "SELECT * FROM users WHERE username = $1 OR email = $1",
            [identifier]
        );
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: "Account is deactivated" });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: "1h" }
        );

        const refreshToken = crypto.randomBytes(40).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
            [user.id, refreshToken, expiresAt]
        );

        res.json({ token, refreshToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token is required" });
    }

    try {
        const { rows } = await pool.query(
            "SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()",
            [refreshToken]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid or expired refresh token" });
        }

        const userId = rows[0].user_id;
        const { rows: userRows } = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
        const user = userRows[0];

        if (!user.is_active) {
            return res.status(403).json({ error: "Account is deactivated" });
        }

        const newToken = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: "1h" }
        );

        res.json({ token: newToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Token refresh failed" });
    }
};

export const logout = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    try {
        await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
        res.json({ message: "Logged out successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Logout failed" });
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    try {
        const { rows } = await pool.query(
            "SELECT id, username, email, first_name, last_name, current_status, role, is_active, created_at FROM users WHERE id = $1",
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch user data" });
    }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { firstName, lastName, email, password } = req.body;
    const userId = req.user.id;

    try {
        let query = "UPDATE users SET first_name = $1, last_name = $2, email = $3";
        const params: unknown[] = [firstName, lastName, email];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query += ", password_hash = $4 WHERE id = $5";
            params.push(hashedPassword, userId);
        } else {
            query += " WHERE id = $4";
            params.push(userId);
        }

        const { rows } = await pool.query(query + " RETURNING id, username, email, first_name, last_name", params);
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Profile update failed" });
    }
};
