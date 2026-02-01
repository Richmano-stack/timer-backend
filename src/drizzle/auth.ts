import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db.js";
import * as schema from "./schema.js";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            ...schema,
        }
    }),
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "agent",
            },
            is_active: {
                type: "boolean",
                required: false,
                defaultValue: true,
            }
        }
    },
    baseURL: "http://localhost:4000",
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:3000"],
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
        cookieCache: {
            enabled: true,
            maxAge: 5 * 60 // 5 minutes cache
        },
        cookie: {
            name: "better-auth.session",
            sameSite: "lax",
            secure: false,
            httpOnly: true,
            path: "/",
        }
    },
});