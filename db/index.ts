import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleNetlify } from "drizzle-orm/netlify-db";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import * as schema from "./schema.js";

let cachedDb: any = null;

export function getConnectionString(): string | undefined {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NETLIFY_DATABASE_URL
  );
}

export function createDbClient() {
  const connectionString = getConnectionString();

  if (!connectionString) {
    // If Netlify Database is present or default fallback
    return drizzleNetlify({ schema });
  }

  // Neon or Vercel Postgres (Neon-backed) HTTP driver
  if (
    connectionString.includes("neon.tech") ||
    connectionString.includes("vercel-storage.com") ||
    connectionString.includes("neondatabase")
  ) {
    return drizzleNeon({ client: neon(connectionString), schema });
  }

  // Supabase, Railway, Render, or any standard PostgreSQL instance
  // prepare: false is required for Supabase transaction pooler
  const client = postgres(connectionString, {
    prepare: false,
    ssl: connectionString.includes("localhost") ? false : "require",
    max: 1,
  });
  return drizzlePostgres({ client, schema });
}

export function getDb() {
  if (!cachedDb) {
    cachedDb = createDbClient();
  }
  return cachedDb;
}

export const db: any = new Proxy({} as any, {
  get(_target, prop) {
    const client = getDb();
    const val = client[prop];
    return typeof val === "function" ? val.bind(client) : val;
  },
});

