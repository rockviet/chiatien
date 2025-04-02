import { defineConfig } from "drizzle-kit";

if (!process.env.TURSO_DATABASE_URL) {
    throw new Error("TURSO_DATABASE_URL environment variable is required");
}

export default defineConfig({
    out: "./migrations",
    schema: "./shared/schema.ts",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.TURSO_DATABASE_URL,
    },
});
