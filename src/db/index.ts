import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL || "postgres://inventory:inventory_secret@localhost:5432/inventory";

const isPooler = connectionString.includes("pooler");

// For queries that don't need prepared statement caching issues with migrations
export const client = postgres(connectionString, {
  max: 15,
  idle_timeout: 30,
  connect_timeout: 30,
  prepare: !isPooler, // Disable named prepared statements for pgbouncer/neon pooler
  ssl: connectionString.includes("sslmode=require") ? "require" : undefined,
});

export const db = drizzle(client, { schema });
export type Database = typeof db;
