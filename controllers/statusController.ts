import { Response } from "express";
import { pool } from "../db.js";
import { AuthRequest } from "../middleware/auth.js";
import { z } from "zod";

const StatusSchema = z.enum(["available", "lunch_break", "on_production", "away", "meeting", "short_break", "training", "off_duty"]);

export const changeStatus = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
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
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
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
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
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
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const userId = req.user.id;
    const { from, to } = req.query;

    try {
        let query = "SELECT * FROM status_logs WHERE user_id = $1";
        const params: unknown[] = [userId];

        if (from) {
            params.push(from);
            query += ` AND start_time >= $${params.length}`;
        }
        if (to) {
            params.push(to);
            query += ` AND start_time <= $${params.length}`;
        }

        query += " ORDER BY start_time DESC";

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};

export const getSummary = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const userId = req.user.id;
    const { from, to } = req.query;

    try {
        // Default to last 7 days if no range provided
        const defaultFrom = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const startTime = from ? parseInt(from as string) : defaultFrom;
        const endTime = to ? parseInt(to as string) : Date.now();

        const { rows } = await pool.query(
            `SELECT status_name, SUM(duration_ms) as total_duration 
             FROM status_logs 
             WHERE user_id = $1 AND start_time >= $2 AND start_time <= $3 
             GROUP BY status_name`,
            [userId, startTime, endTime]
        );

        res.json({
            period: { from: startTime, to: endTime },
            summary: rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch summary" });
    }
};

export const exportLogs = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const userId = req.user.id;
    const { from, to } = req.query;

    try {
        let query = "SELECT status_name, start_time, end_time, duration_ms FROM status_logs WHERE user_id = $1";
        const params: unknown[] = [userId];

        if (from) {
            params.push(from);
            query += ` AND start_time >= $${params.length}`;
        }
        if (to) {
            params.push(to);
            query += ` AND start_time <= $${params.length}`;
        }

        query += " ORDER BY start_time DESC";

        const { rows } = await pool.query(query, params);

        // Convert to CSV
        const headers = ["Status", "Start Time", "End Time", "Duration (ms)"];
        const csvRows = rows.map(row => [
            row.status_name,
            new Date(parseInt(row.start_time)).toISOString(),
            row.end_time ? new Date(parseInt(row.end_time)).toISOString() : "Active",
            row.duration_ms || 0
        ].join(","));

        const csvContent = [headers.join(","), ...csvRows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=status_logs.csv");
        res.status(200).send(csvContent);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to export logs" });
    }
};
