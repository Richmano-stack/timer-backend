import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

export const register = async (req, res) => {
    const { username, password, firstName, lastName } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const { rows } = await pool.query(
            "INSERT INTO users (username, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, username",
            [username, hashedPassword, firstName, lastName]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Registration failed" });
    }
};

export const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });

        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    }
};
