import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { pool } from "../drizzle/db.js";
import { AuthRequest } from "../middleware/auth.js";
import { generateUniqueEmail } from "../utils/authUtils.js";
import { UserRole } from "../types.js";

export const register = async (req: Request, res: Response) => {
    const { username, password, firstName, lastName, role } = req.body;

    // 1. Validation
    if (!username || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "Missing required fields: username, password, firstName, lastName" });
    }

    // Validate role if provided
    let finalRole = UserRole.AGENT;
    if (role) {
        if (!Object.values(UserRole).includes(role as UserRole)) {
            return res.status(400).json({ error: `Invalid role. Allowed roles: ${Object.values(UserRole).join(", ")}` });
        }
        finalRole = role as UserRole;
    }

    try {
        // 2. Automatic Email Generation Logic
        const { rows: existingEmails } = await pool.query(
            "SELECT email FROM users WHERE email LIKE $1",
            [`${firstName.toLowerCase()}.${lastName.toLowerCase()}%@xcompany.com`]
        );

        const email = generateUniqueEmail(firstName, lastName, existingEmails.map(row => row.email));

        // 3. Security: Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Data Integrity: Insert with RETURNING
        const { rows } = await pool.query(
            "INSERT INTO users (username, email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, first_name, last_name, role",
            [username, email, hashedPassword, firstName, lastName, finalRole]
        );

        res.status(201).json(rows[0]);
    } catch (err: any) {
        // 5. Error Handling
        if (err && typeof err === "object" && "code" in err && err.code === "23505") {
            const detail = err.detail || "";
            if (detail.includes("username")) {
                return res.status(400).json({ error: "Username already exists" });
            } else if (detail.includes("email")) {
                return res.status(400).json({ error: "Email already exists" });
            }
            return res.status(400).json({ error: "Duplicate entry found" });
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

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
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

        res.
            cookie("token", token, {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 60 * 60 * 1000

            }).
            cookie("refresh_token", refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000
            })
            .json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    }
};

export const refreshToken = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token is required" });
    }

    try {
        const { rows } = await pool.query(
            "SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()",
            [refreshToken]
        );

        if (!rows.length) {
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

        res.cookie("token", newToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 60 * 60 * 1000
        }).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Token refresh failed" });
    }
};


export const logout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refresh_token;

    try {
        if (refreshToken) {
            await pool.query(
                "DELETE FROM refresh_tokens WHERE token = $1",
                [refreshToken]
            );
        }

        res
            .clearCookie("token")
            .clearCookie("refresh_token")
            .json({ success: true });
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
    } catch (err: any) {
        if (err && typeof err === "object" && "code" in err && err.code === "23505") {
            const detail = err.detail || "";
            if (detail.includes("email")) {
                return res.status(400).json({ error: "Email already exists" });
            }
            return res.status(400).json({ error: "Duplicate entry found" });
        }
        console.error(err);
        res.status(500).json({ error: "Profile update failed" });
    }
};
