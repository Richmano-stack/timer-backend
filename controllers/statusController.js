const { pool } = require("../db");

exports.changeStatus = async (req, res) => {
    const { status } = req.body;
    const userId = req.user.id;

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

exports.getHistory = async (req, res) => {
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
