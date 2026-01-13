import bcrypt from "bcryptjs";
import { pool } from "./db.js";

async function seed() {
    console.log("🌱 Starting database seeding...");

    try {
        // 1. Clear existing data (Optional, but good for a clean test state)
        console.log("Cleaning up existing data...");
        await pool.query("TRUNCATE users, status_logs, refresh_tokens RESTART IDENTITY CASCADE");

        const hashedPassword = await bcrypt.hash("password123", 10);

        // 2. Create Users
        console.log("Creating users...");
        const users = [
            {
                username: "admin",
                email: "admin@example.com",
                password_hash: hashedPassword,
                first_name: "System",
                last_name: "Admin",
                role: "admin",
                is_active: true
            },
            {
                username: "supervisor",
                email: "supervisor@example.com",
                password_hash: hashedPassword,
                first_name: "Team",
                last_name: "Lead",
                role: "supervisor",
                is_active: true
            },
            {
                username: "agent1",
                email: "agent1@example.com",
                password_hash: hashedPassword,
                first_name: "John",
                last_name: "Agent",
                role: "agent",
                is_active: true
            },
            {
                username: "agent2",
                email: "agent2@example.com",
                password_hash: hashedPassword,
                first_name: "Jane",
                last_name: "Inactive",
                role: "agent",
                is_active: false // Test deactivation
            }
        ];

        const userRows = [];
        for (const u of users) {
            const res = await pool.query(
                "INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, username, email",
                [u.username, u.email, u.password_hash, u.first_name, u.last_name, u.role, u.is_active]
            );
            userRows.push(res.rows[0]);
        }

        const agent1Id = userRows.find(u => u.username === "agent1").id;
        const supervisorId = userRows.find(u => u.username === "supervisor").id;

        // 3. Create Status Logs for Agent 1 (History & Summary Testing)
        console.log("Creating status logs...");
        const now = Date.now();
        const hourMs = 60 * 60 * 1000;

        const logs = [
            // Finished logs
            {
                user_id: agent1Id,
                status_name: "available",
                start_time: now - 5 * hourMs,
                end_time: now - 4 * hourMs,
                duration_ms: hourMs
            },
            {
                user_id: agent1Id,
                status_name: "lunch_break",
                start_time: now - 4 * hourMs,
                end_time: now - 3.5 * hourMs,
                duration_ms: 0.5 * hourMs
            },
            {
                user_id: agent1Id,
                status_name: "on_production",
                start_time: now - 3.5 * hourMs,
                end_time: now - 1 * hourMs,
                duration_ms: 2.5 * hourMs
            },
            // Active log (Current Status Testing)
            {
                user_id: agent1Id,
                status_name: "meeting",
                start_time: now - 0.5 * hourMs,
                end_time: null,
                duration_ms: 0
            },
            // Logs for Supervisor Dashboard Testing
            {
                user_id: supervisorId,
                status_name: "available",
                start_time: now - 1 * hourMs,
                end_time: null,
                duration_ms: 0
            }
        ];

        for (const l of logs) {
            await pool.query(
                "INSERT INTO status_logs (user_id, status_name, start_time, end_time, duration_ms) VALUES ($1, $2, $3, $4, $5)",
                [l.user_id, l.status_name, l.start_time, l.end_time, l.duration_ms]
            );
        }

        // Update current_status in users table to match active logs
        await pool.query("UPDATE users SET current_status = 'meeting' WHERE id = $1", [agent1Id]);
        await pool.query("UPDATE users SET current_status = 'available' WHERE id = $1", [supervisorId]);

        console.log("Seeding complete!");
        console.log("\nTest Accounts (Password: password123):");
        console.log("- Admin: admin@example.com");
        console.log("- Supervisor: supervisor@example.com");
        console.log("- Agent (Active): agent1@example.com");
        console.log("- Agent (Inactive): agent2@example.com");

    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        await pool.end();
        process.exit();
    }
}

seed();
