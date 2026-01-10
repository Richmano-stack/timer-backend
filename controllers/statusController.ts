import { Response } from "express";
import { pool } from "../db.js";
import { AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

const StatusSchema = z.enum(["available", "lunch_break", "on_production", "away", "meeting", "short_break", "training", "off_duty"]);

export const changeStatus = async (req: AuthRequest, res: Response) => {
    const { status } = req.body;
    const userId = req.user.id;

    // Validation
    const validation = StatusSchema.safeParse(status);
    if (!validation.success) {
        return res.status(400).json({
            error: "Invalid status name",
            details: validation.error.format()
        });
    }

    try {
        // 1. End current active log
        const endTime = Date.now();
        const { rows: activeLogs } = await pool.query(
            "SELECT * FROM status_logs WHERE user_id = $1 AND end_time IS NULL",
            [userId]
        );

        if (activeLogs.length > 0) {
            const activeLog = activeLogs[0];
            const duration = endTime - parseInt(activeLog.start_time);
            await pool.query(
                "UPDATE status_logs SET end_time = $1, duration_ms = $2 WHERE id = $3",
                [endTime, duration, activeLog.id]
            );
        }

        // 2. Start new log
        const { rows: newLog } = await pool.query(
            "INSERT INTO status_logs (user_id, status_name, start_time) VALUES ($1, $2, $3) RETURNING *",
            [userId, status, endTime]
        );

        // 3. Update user current status
        await pool.query("UPDATE users SET current_status = $1 WHERE id = $2", [status, userId]);

        res.json(newLog[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to change status" });
    }
};

export const getCurrentStatus = async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;

    try {
        const { rows } = await pool.query(
            "SELECT * FROM status_logs WHERE user_id = $1 AND end_time IS NULL LIMIT 1",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: "No active status found" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch current status" });
    }
};

export const stopStatus = async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;

    try {
        const endTime = Date.now();
        const { rows: activeLogs } = await pool.query(
            "SELECT * FROM status_logs WHERE user_id = $1 AND end_time IS NULL",
            [userId]
        );

        if (activeLogs.length === 0) {
            return res.status(400).json({ error: "No active status to stop" });
        }

        const activeLog = activeLogs[0];
        const duration = endTime - parseInt(activeLog.start_time);

        await pool.query(
            "UPDATE status_logs SET end_time = $1, duration_ms = $2 WHERE id = $3",
            [endTime, duration, activeLog.id]
        );

        // Update user current status to 'off_duty'
        await pool.query("UPDATE users SET current_status = $1 WHERE id = $2", ["off_duty", userId]);

        res.json({ message: "Status stopped successfully", lastLog: activeLog });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to stop status" });
    }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
    const userId = req.user.id;

    try {
        const { rows } = await pool.query(
            "SELECT * FROM status_logs WHERE user_id = $1 ORDER BY start_time DESC",
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};
