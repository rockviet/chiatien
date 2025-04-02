import { config } from "dotenv";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "../shared/schema";

config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN
});

const db = drizzle(client, { schema });

async function main() {
    try {
        await migrate(db, { migrationsFolder: "migrations" });
        console.log("Migration completed successfully");
    } catch (error) {
        console.error("Error during migration:", error);
        process.exit(1);
    }
    process.exit(0);
}

main(); 