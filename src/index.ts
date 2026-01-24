import * as dotenv from "dotenv";
import express from "express";
import { initDb } from "./drizzle/db.js";
import authRoutes from "./routes/auth.js";
import statusRoutes from "./routes/status.js";
import adminRoutes from "./routes/admin.js";
import cors from "cors";
import cookieParser from 'cookie-parser';
dotenv.config();
import { auth } from "./drizzle/auth.js";

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

/* app.all("/api/auth/*any", async (req, res) => {

    try {
        console.log("-> [AUTH HANDLER HIT] Path:", req.originalUrl);
        const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
        const isPost = ["POST", "PUT", "PATCH"].includes(req.method);

        const webReq = new Request(fullUrl, {
            method: req.method,
            headers: new Headers(req.headers as any),
            body: isPost ? JSON.stringify(req.body || {}) : null,
        });

        const response = await auth.handler(webReq);
        const contentType = response.headers.get("content-type");

        response.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });

        if (contentType?.includes("application/json")) {
            return res.status(response.status).json(await response.json());
        } else {
            return res.status(response.status).send(await response.text());
        }
    } catch (error) {
        console.error("-> [AUTH HANDLER ERROR]", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
 */

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
