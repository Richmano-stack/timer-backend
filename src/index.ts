import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import statusRoutes from "./routes/status.js";
import adminRoutes from "./routes/admin.js";
import cors from "cors";
import cookieParser from 'cookie-parser';
import { auth } from "./drizzle/auth.js";
import { toNodeHandler } from "better-auth/node";

export const app = express();

app.use((req, res, next) => {
    console.log(`[NETWORK DEBUG] ${req.method} request to: ${req.url}`);
    next();
});
app.use(cors({
    origin: [process.env.FRONTEND_URL || "http://localhost:3000"],
    credentials: true                 // allow cookies
}));

app.use(express.json());
app.use(cookieParser());

app.all("/api/auth/*any", (req, res) => {
    return toNodeHandler(auth)(req, res);
});

app.use("/api/status", statusRoutes);
app.use("/api/admin", adminRoutes);


const startServer = async () => {
    try {

        app.listen(process.env.PORT, () => {
            console.log(`Server running on http://localhost:${process.env.PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();

