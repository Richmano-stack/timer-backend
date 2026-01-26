import { Response } from "express";
import { db } from "../drizzle/db.js";
import { statusLogs } from "../drizzle/schema.js";
import { eq, and, isNull, desc, gte, lte, sql } from "drizzle-orm";
import { AuthRequest } from "../middleware/betterAuth.js";
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
        await db.transaction(async (tx) => {
            // 1. End current active log
            const endTime = Date.now();

            const activeLogs = await tx
                .select()
                .from(statusLogs)
                .where(and(
                    eq(statusLogs.userId, userId),
                    isNull(statusLogs.endTime)
                ));

            const activeLog = activeLogs[0];

            if (activeLog) {
                const duration = endTime - activeLog.startTime; // startTime is number (bigint mode)

                await tx
                    .update(statusLogs)
                    .set({
                        endTime: endTime,
                        durationMs: duration
                    })
                    .where(eq(statusLogs.id, activeLog.id));
            }

            // 2. Start new log
            const [newLog] = await tx
                .insert(statusLogs)
                .values({
                    userId,
                    statusName: status,
                    startTime: endTime
                })
                .returning();

            // Note: Users table update required 'current_status' column which is missing in schema.
            // Skipping update to users table.

            res.json(newLog);
        });
    } catch (err) {
        console.error("Change status error:", err);
        res.status(500).json({ error: "Failed to change status" });
    }
};

export const getCurrentStatus = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const userId = req.user.id;

    try {
        const activeLog = await db.query.statusLogs.findFirst({
            where: and(
                eq(statusLogs.userId, userId),
                isNull(statusLogs.endTime)
            )
        });

        if (!activeLog) {
            return res.status(404).json({ error: "No active status found" });
        }

        res.json(activeLog);
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

        const activeLog = await db.query.statusLogs.findFirst({
            where: and(
                eq(statusLogs.userId, userId),
                isNull(statusLogs.endTime)
            )
        });

        if (!activeLog) {
            return res.status(400).json({ error: "No active status to stop" });
        }

        const duration = endTime - activeLog.startTime;

        await db.update(statusLogs)
            .set({
                endTime: endTime,
                durationMs: duration
            })
            .where(eq(statusLogs.id, activeLog.id));

        // Note: Users table update required 'current_status' column which is missing in schema.
        // Skipping update to users table.

        res.json({ message: "Status stopped successfully", lastLog: { ...activeLog, endTime, durationMs: duration } });
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
        const conditions = [eq(statusLogs.userId, userId)];

        if (from) {
            conditions.push(gte(statusLogs.startTime, Number(from)));
        }
        if (to) {
            conditions.push(lte(statusLogs.startTime, Number(to)));
        }

        const logs = await db
            .select()
            .from(statusLogs)
            .where(and(...conditions))
            .orderBy(desc(statusLogs.startTime));

        res.json(logs);
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
        const startTime = from ? Number(from) : defaultFrom;
        const endTime = to ? Number(to) : Date.now();

        const summaryData = await db
            .select({
                status_name: statusLogs.statusName,
                total_duration: sql<string>`sum(${statusLogs.durationMs})`.mapWith(Number)
            })
            .from(statusLogs)
            .where(and(
                eq(statusLogs.userId, userId),
                gte(statusLogs.startTime, startTime),
                lte(statusLogs.startTime, endTime)
            ))
            .groupBy(statusLogs.statusName);

        res.json({
            period: { from: startTime, to: endTime },
            summary: summaryData
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
        const conditions = [eq(statusLogs.userId, userId)];

        if (from) {
            conditions.push(gte(statusLogs.startTime, Number(from)));
        }
        if (to) {
            conditions.push(lte(statusLogs.startTime, Number(to)));
        }

        const logs = await db
            .select({
                statusName: statusLogs.statusName,
                startTime: statusLogs.startTime,
                endTime: statusLogs.endTime,
                durationMs: statusLogs.durationMs
            })
            .from(statusLogs)
            .where(and(...conditions))
            .orderBy(desc(statusLogs.startTime));

        // Convert to CSV
        const headers = ["Status", "Start Time", "End Time", "Duration (ms)"];
        const csvRows = logs.map(row => [
            row.statusName,
            new Date(row.startTime).toISOString(),
            row.endTime ? new Date(row.endTime).toISOString() : "Active",
            row.durationMs || 0
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
