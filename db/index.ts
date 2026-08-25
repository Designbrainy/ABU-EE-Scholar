import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleNetlify } from "drizzle-orm/netlify-db";
import * as schema from "./schema.js";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.NETLIFY_DATABASE_URL;

export const db: any = connectionString
  ? drizzleNeon({ client: neon(connectionString), schema })
  : drizzleNetlify({ schema });
