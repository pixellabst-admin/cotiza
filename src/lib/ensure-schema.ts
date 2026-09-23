import { sql } from "drizzle-orm";
import { db } from "@/db";

let ready: Promise<void> | undefined;

/** Creates missing tables on Neon or any PostgreSQL database, including first-run Vercel deploys. */
export function ensureSchema() {
  if (!ready) {
    ready = createTables().catch((error) => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
}

async function createTables() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "customers" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar(180) NOT NULL,
      "contact" varchar(180) DEFAULT '' NOT NULL,
      "email" varchar(240) DEFAULT '' NOT NULL,
      "phone" varchar(40) DEFAULT '' NOT NULL,
      "color" varchar(20) DEFAULT 'mint' NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "business_settings" (
      "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
      "name" varchar(180) NOT NULL,
      "owner_name" varchar(180) NOT NULL,
      "email" varchar(240) NOT NULL,
      "phone" varchar(40) DEFAULT '' NOT NULL,
      "address" text DEFAULT '' NOT NULL,
      "currency" varchar(3) DEFAULT 'MXN' NOT NULL,
      "tax_rate" double precision DEFAULT 16 NOT NULL,
      "terms" text DEFAULT '' NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "quotes" (
      "id" serial PRIMARY KEY NOT NULL,
      "number" varchar(60) NOT NULL,
      "title" varchar(240) NOT NULL,
      "customer_id" integer NOT NULL REFERENCES "customers"("id"),
      "issue_date" date NOT NULL,
      "valid_until" date NOT NULL,
      "status" text DEFAULT 'draft' NOT NULL,
      "items" jsonb NOT NULL,
      "subtotal_cents" integer NOT NULL,
      "tax_cents" integer NOT NULL,
      "total_cents" integer NOT NULL,
      "tax_rate" double precision DEFAULT 16 NOT NULL,
      "discount_percent" double precision DEFAULT 0 NOT NULL,
      "currency" varchar(3) DEFAULT 'MXN' NOT NULL,
      "notes" text DEFAULT '' NOT NULL,
      "share_token" uuid DEFAULT gen_random_uuid() NOT NULL,
      "shared_via" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "accepted_by" varchar(180),
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "quotes_number_unique" ON "quotes" ("number")`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "quotes_share_token_unique" ON "quotes" ("share_token")`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "admin_users" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" varchar(240) NOT NULL,
      "name" varchar(180) DEFAULT '' NOT NULL,
      "password_hash" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "last_login_at" timestamp
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_unique" ON "admin_users" ("email")`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "app_secrets" (
      "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
      "session_secret" text NOT NULL
    )
  `);
  await db.execute(sql`ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "decision_note" text DEFAULT '' NOT NULL`);
  await db.execute(sql`ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "thank_you_message" text DEFAULT '' NOT NULL`);
  await db.execute(sql`ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "thank_you_photo" text DEFAULT '' NOT NULL`);
  await db.execute(sql`ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "thank_you_token" uuid DEFAULT gen_random_uuid()`);
  await db.execute(sql`UPDATE "quotes" SET "thank_you_token" = gen_random_uuid() WHERE "thank_you_token" IS NULL`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "quotes_thank_you_token_unique" ON "quotes" ("thank_you_token")`);
  await db.execute(sql`ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "quote_prefix" varchar(12) DEFAULT 'COT' NOT NULL`);
  await db.execute(sql`ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "next_quote_number" integer DEFAULT 1 NOT NULL`);
  await db.execute(sql`ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "logo_data" text DEFAULT '' NOT NULL`);
  await db.execute(sql`ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "website" varchar(240) DEFAULT '' NOT NULL`);
  await db.execute(sql`ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "facebook" varchar(240) DEFAULT '' NOT NULL`);
  await db.execute(sql`ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "instagram" varchar(240) DEFAULT '' NOT NULL`);
  await db.execute(sql`ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "tiktok" varchar(240) DEFAULT '' NOT NULL`);
  await db.execute(sql`ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "theme_mode" varchar(10) DEFAULT 'light' NOT NULL`);
  await db.execute(sql`ALTER TABLE "business_settings" ADD COLUMN IF NOT EXISTS "theme_accent" varchar(16) DEFAULT 'green' NOT NULL`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sales" (
      "id" serial PRIMARY KEY NOT NULL,
      "number" varchar(60) NOT NULL,
      "customer_id" integer REFERENCES "customers"("id"),
      "customer_name" varchar(180) DEFAULT '' NOT NULL,
      "sold_at" date NOT NULL,
      "items" jsonb NOT NULL,
      "subtotal_cents" integer NOT NULL,
      "tax_cents" integer NOT NULL,
      "total_cents" integer NOT NULL,
      "tax_rate" double precision DEFAULT 16 NOT NULL,
      "payment_method" text DEFAULT 'transfer' NOT NULL,
      "status" text DEFAULT 'paid' NOT NULL,
      "notes" text DEFAULT '' NOT NULL,
      "quote_id" integer,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "sales_number_unique" ON "sales" ("number")`);
}
