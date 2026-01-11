/**
 * CHALLENGE 2: EXPRESS SERVER & BOOTSTRAP
 * * 1. IMPORTS:
 * - Import 'dotenv', 'express', and 'cors' (if you want to allow frontend access).
 * - Import 'initDb' from your './db' file.
 * - (Leave route imports for later once you've created the files).
 * * 2. CONFIGURATION:
 * - Call 'dotenv.config()'.
 * - Initialize 'app' using express().
 * - Define a 'PORT' constant from 'process.env.PORT' or default to 4000.
 * * 3. MIDDLEWARE:
 * - Set up 'app.use(express.json())' to parse JSON bodies.
 * * 4. SERVER BOOTSTRAP (The "Start" Logic):
 * - Create an async function called 'startServer'.
 * - Inside a try/catch block:
 * A. 'await' the 'initDb()' function to ensure tables exist.
 * B. Call 'app.listen()' and log a success message with the port.
 * - Call 'startServer()' at the bottom of the file.
 */

// START CODING HERE...

import dotenv from "dotenv";
import express from "express";
import { initDb } from "./db.js";
import cors from "cors";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;
type pool = any;

app.use(express.json());
app.use(cors());

const startServer = async () => {
    try {
        await initDb();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        })
    } catch (error) {
        console.error(error);
    }
}

startServer();