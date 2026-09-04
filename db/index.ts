import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleNetlify } from "drizzle-orm/netlify-db";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import * as schema from "./schema.js";

let cachedDb: any = null;

const DEFAULT_POSTGRES_URL =
  "postgresql://postgres.bfbjxruudnixvjwowuwq:eebotmaster123%24@aws-1-eu-west-1.pooler.supabase.com:6543/postgres";

export function getConnectionString(): string {
  // If user explicitly configured a Supabase or custom database URL
  if (process.env.SUPABASE_DATABASE_URL) {
    return process.env.SUPABASE_DATABASE_URL;
  }
  // If running in Netlify with Netlify DB
  if (process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DB_URL) {
    return process.env.NETLIFY_DATABASE_URL || process.env.NETLIFY_DB_URL!;
  }
  // Supabase is the primary database containing all 1,132 course materials and accounts.
  // If POSTGRES_URL is the auto-injected vercel-storage Neon database, use Supabase instead.
  if (process.env.POSTGRES_URL && !process.env.POSTGRES_URL.includes("vercel-storage.com")) {
    return process.env.POSTGRES_URL;
  }
  return process.env.DATABASE_URL || DEFAULT_POSTGRES_URL;
}

export function createDbClient() {
  const connectionString = getConnectionString();

  // If explicitly configured with Netlify Database URL
  if (
    (process.env.NETLIFY_DB_URL || process.env.NETLIFY_DATABASE_URL) &&
    !process.env.POSTGRES_URL &&
    !process.env.DATABASE_URL
  ) {
    try {
      return drizzleNetlify({ schema });
    } catch (e) {
      console.warn("drizzleNetlify initialization failed, falling back to PostgreSQL:", e);
    }
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

