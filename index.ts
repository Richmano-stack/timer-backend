import dotenv from "dotenv";
import express from "express";
import { initDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import statusRoutes from "./routes/status.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();
const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/admin", adminRoutes);

// Initialize DB and Start Server
const PORT = process.env.PORT || 4000;

initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
