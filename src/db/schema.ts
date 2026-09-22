import { pgTable, serial, varchar, text, integer, doublePrecision, jsonb, date, timestamp, uuid } from "drizzle-orm/pg-core";

export type QuoteItem = { description: string; quantity: number; unitPrice: number };
export type QuoteStatus = "draft" | "sent" | "review" | "accepted" | "rejected" | "expired" | "archived";
export type ShareChannel = "whatsapp" | "email";

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  contact: varchar("contact", { length: 180 }).notNull().default(""),
  email: varchar("email", { length: 240 }).notNull().default(""),
  phone: varchar("phone", { length: 40 }).notNull().default(""),
  color: varchar("color", { length: 20 }).notNull().default("mint"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const quotes = pgTable("quotes", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 60 }).notNull().unique(),
  title: varchar("title", { length: 240 }).notNull(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  issueDate: date("issue_date").notNull(),
  validUntil: date("valid_until").notNull(),
  status: text("status", { enum: ["draft", "sent", "review", "accepted", "rejected", "expired", "archived"] }).notNull().default("draft"),
  items: jsonb("items").$type<QuoteItem[]>().notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  taxCents: integer("tax_cents").notNull(),
  totalCents: integer("total_cents").notNull(),
  taxRate: doublePrecision("tax_rate").notNull().default(16),
  discountPercent: doublePrecision("discount_percent").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  notes: text("notes").notNull().default(""),
  shareToken: uuid("share_token").notNull().defaultRandom().unique(),
  sharedVia: jsonb("shared_via").$type<ShareChannel[]>().notNull().default([]),
  acceptedBy: varchar("accepted_by", { length: 180 }),
  decisionNote: text("decision_note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 240 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const appSecrets = pgTable("app_secrets", {
  id: integer("id").primaryKey().default(1),
  sessionSecret: text("session_secret").notNull(),
});

export const businessSettings = pgTable("business_settings", {
  id: integer("id").primaryKey().default(1),
  name: varchar("name", { length: 180 }).notNull(),
  ownerName: varchar("owner_name", { length: 180 }).notNull(),
  email: varchar("email", { length: 240 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull().default(""),
  address: text("address").notNull().default(""),
  currency: varchar("currency", { length: 3 }).notNull().default("MXN"),
  taxRate: doublePrecision("tax_rate").notNull().default(16),
  terms: text("terms").notNull().default(""),
  quotePrefix: varchar("quote_prefix", { length: 12 }).notNull().default("COT"),
  nextQuoteNumber: integer("next_quote_number").notNull().default(1),
  logoData: text("logo_data").notNull().default(""),
  website: varchar("website", { length: 240 }).notNull().default(""),
  facebook: varchar("facebook", { length: 240 }).notNull().default(""),
  instagram: varchar("instagram", { length: 240 }).notNull().default(""),
  tiktok: varchar("tiktok", { length: 240 }).notNull().default(""),
});
