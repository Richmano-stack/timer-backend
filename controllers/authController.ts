/**
 * CHALLENGE 3: AUTH CONTROLLER - MULTI-STEP LOGIC
 * * * 1. REGISTER FUNCTION:
 * - Validate existence of: username, password, firstName, lastName.
 * - EMAIL GENERATION LOGIC:
 * a. Create prefix: "firstname.lastname".
 * b. Query DB for existing emails matching this prefix.
 * c. If exists, extract numeric suffixes, find max, and increment (e.g., name.name2@company.com).
 * d. If not exists, use base prefix.
 * - SECURITY: Hash password with salt rounds (10).
 * - DATA: INSERT into users using RETURNING to get the new object without the password.
 * - ERROR: Handle Postgres code "23505" for unique constraint (username).
 * * * 2. LOGIN FUNCTION:
 * - Accept 'identifier' (can be username OR email) and password.
 * - DB: Query users where username = $1 OR email = $1.
 * - VALIDATION: 
 * a. Compare passwords using bcrypt.
 * b. Check if 'user.is_active' is true.
 * - TOKENS:
 * a. Sign Access Token (JWT) with id, username, and role (Expires 1h).
 * b. Generate Refresh Token using 'crypto.randomBytes(40)'.
 * c. Store Refresh Token in 'refresh_tokens' table with a 7-day expiry.
 * * * 3. TOKEN MANAGEMENT:
 * - REFRESH: Validate token exists and 'expires_at > NOW()'. Re-sign new Access Token.
 * - LOGOUT: Delete the specific refresh token from the database.
 * * * 4. PROFILE LOGIC:
 * - GET_ME: Fetch full user profile based on the 'req.user.id' from middleware.
 * - UPDATE: Build a dynamic SQL query to update names/email. Only hash and update password if provided.
 */

// START CODING HERE...


import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { pool } from "../db.js";
import { AuthRequest } from "../middleware/auth.js";

export const register = async (req: Request, res: Response) => {
    const { username, password, firstName, lastName } = req.body;

    if (!username || !password || !firstName || !lastName) {
        return res.status(400).json({ error: "All fields are required" })
    }

    try {
        const baseEmailPrefix = `${firstName.toLowerCase()}.${lastName.toLowerCase()}}`;
        const domain = "@company.com";

        const result = await pool.query(
            "SELECT email FROM users WHERE email LIKE $1",
            [`${baseEmailPrefix}%${domain}`]
        );

        const existingEmails = result.rows;
        let email = `${baseEmailPrefix}${domain}`;
        if (existingEmails.length > 0) {

            const suffixes = existingEmails.map(row => {
                const match = row.email.match(new RegExp(`${baseEmailPrefix}(\\d+)?${domain}`));
                return match ? parseInt(match[1]) : 1;
            }).filter(n => !isNaN(n));

            const maxSuffix = Math.max(...suffixes);
            email = `${baseEmailPrefix}${maxSuffix + 1}${domain}`;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { rows } = await pool.query(
            "INSERT INTO users (username, email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, first_name, last_name",
            [username, email, hashedPassword, firstName, lastName]
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


export const login = async (req: Request, res: Response) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ error: "All fields are required" })
    }

    try {
        const { rows } = await pool.query(
            "SELECT * FROM users WHERE username = $1 OR email = $1",
            [identifier]
        );
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Invalid credentials" })
        }

        if (!user.is_active) {
            return res.status(401).json({ error: "User is not active" })
        }

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role },
            process.env.ACCESS_TOKEN_SECRET as string, {
            expiresIn: "1h"
        });

        const refreshToken = crypto.randomBytes(40).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
            [user.id, refreshToken, expiresAt]
        );

        res.json({ token, refreshToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Login failed" });
    }


};

export const refreshToken = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token is required" })
    };

    try {
        const { rows } = await pool.query(
            "SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()",
            [refreshToken]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid refresh token" })
        };

        const userId = rows[0].user_id;
        const { rows: userRows } = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [userId]
        );

        const user = userRows[0];

        if (!user.is_active) {
            return res.status(401).json({ error: "User is not active" })
        }

        const newToken = jwt.sign({ id: user.id, username: user.username, role: user.role },
            process.env.ACCESS_TOKEN_SECRET as string, {
            expiresIn: "1h"
        });

        res.json({ token: newToken });


    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Refresh token failed" });
    }
}


export const logout = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    try {
        await pool.query(
            "DELETE FROM refresh_tokens WHERE token = $1",
            [refreshToken]
        );
        res.json({ message: "Logout successful" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Logout failed" });
    }
}


export const getMe = async (re: AuthRequest, res: Response) => {
    if (!re.user) return res.status(401).json({ error: "Unauthorized" });
    try {
        const { rows } = await pool.query(
            "SELECT id, username, email, first_name, current_status, role, is_active, created_at FROM users WHERE id = $1",
            [re.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found" })
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch user" });
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to update user" });
    }
}