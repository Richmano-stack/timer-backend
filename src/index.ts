import * as dotenv from "dotenv";
import express from "express";
import { initDb } from "./drizzle/db.js";
import authRoutes from "./routes/auth.js";
import statusRoutes from "./routes/status.js";
import adminRoutes from "./routes/admin.js";
import cors from "cors";
import cookieParser from 'cookie-parser';
dotenv.config();           // load env first

export const app = express();  // create the Express app

// Middleware

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true                 // allow cookies
}));

app.use(express.json());            // JSON parsing
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/admin", adminRoutes);

// Initialize DB and Start Server
const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
    initDb().then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    });
}
