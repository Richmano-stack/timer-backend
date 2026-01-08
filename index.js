require("dotenv").config();
const express = require("express");
const app = express();
const { initDb } = require("./db");

// Middleware
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const statusRoutes = require("./routes/status");

app.use("/api/auth", authRoutes);
app.use("/api/status", statusRoutes);

// Initialize DB and Start Server
const PORT = process.env.PORT || 4000;

initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
