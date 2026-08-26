import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleNetlify } from "drizzle-orm/netlify-db";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import * as schema from "./schema.js";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.NETLIFY_DATABASE_URL;

function createDbClient() {
  if (!connectionString) {
    return drizzleNetlify({ schema });
  }

  if (connectionString.includes("neon.tech")) {
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

export const db: any = createDbClient();
