import { Response } from "express";
import { db } from "../drizzle/db.js";
import { statusLogs } from "../drizzle/schema.js";
import { eq, and, isNull, desc, gte, lte, sql } from "drizzle-orm";
import { AuthRequest } from "../middleware/betterAuth.js";
import { z } from "zod";

const StatusSchema = z.enum(["available", "lunch_break", "on_production", "away", "meeting", "short_break", "training", "off_duty"]);

export const updateStatus = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { status } = req.body;
    const validation = StatusSchema.safeParse(status);
    if (!validation.success) return res.status(400).json({ error: "Invalid status" });

    const userId = req.user.id;

    try {
        const result = await db.transaction(async (tx) => {
            // 2. Find and close any existing log
            const [activeLog] = await tx
                .select()
                .from(statusLogs)
                .where(and(eq(statusLogs.userId, userId), isNull(statusLogs.endTime)))
                .limit(1);

            const now = Date.now();

            if (activeLog) {
                // Prevent redundant updtes
                if (activeLog.statusName === status) return activeLog;

                // Close current log
                await tx.update(statusLogs)
                    .set({
                        endTime: now,
                        durationMs: now - Number(activeLog.startTime)
                    })
                    .where(eq(statusLogs.id, activeLog.id));
            }

            if (status !== 'off_duty') {
                const [newLog] = await tx.insert(statusLogs).values({
                    userId,
                    statusName: status,
                    startTime: now,
                }).returning();
                return newLog;
            }

            return { message: "Status stopped (Off Duty)", statusName: 'off_duty' };
        });

        return res.json(result);
    } catch (err) {
        console.error("Status transition failure:", err);
        return res.status(500).json({ error: "State transition failed" });
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


export const getHistory = async (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const userId = req.user.id;

    try {

        let page = Number(req.query.page) || 1;
        let limit = Number(req.query.limit) || 10;

        if (page < 1) page = 1;
        if (limit < 1) limit = 10;
        if (limit > 100) limit = 100;

        const skip = (page - 1) * limit;

        const [countResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(statusLogs)
            .where(eq(statusLogs.userId, userId));

        const totalItems = Number(countResult?.count || 0);

        const historyItems = await db
            .select()
            .from(statusLogs)
            .where(eq(statusLogs.userId, userId))
            .limit(limit)
            .offset(skip)
            .orderBy(desc(statusLogs.startTime));

        const totalPages = Math.ceil(totalItems / limit);

        const response = {
            success: true,
            data: historyItems,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: totalItems,
                limit: limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Error fetching history:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch history',
            error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        });
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
