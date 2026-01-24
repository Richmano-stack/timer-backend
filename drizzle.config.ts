import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/drizzle/schema.ts",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    tablesFilter: ["user", "session", "account"],
    entities: {
        roles: false,
    },
    verbose: true,
    strict: true,
});