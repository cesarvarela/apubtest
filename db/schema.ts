import { pgTable, uuid, text, timestamp, jsonb, numeric, boolean } from "drizzle-orm/pg-core";

export const Content = pgTable("content", {
    id: uuid("id").primaryKey().defaultRandom(),
    uri: text("uri").unique().notNull(),
    contentType: text("content_type").notNull(), // Matches targetType in Schema table (e.g., "core:Incident", "aiid:Report")
    namespace: text("namespace").notNull(), // The namespace this content belongs to
    data: jsonb("data").notNull(),
    sourceNode: text("source_node").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Keep the old Incident table for backward compatibility during migration
export const Incident = pgTable("incident", {
    id: uuid("id").primaryKey().defaultRandom(),
    uri: text("uri").unique().notNull(),
    data: jsonb("data").notNull(),
    sourceNode: text("source_node").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const Peer = pgTable("peer", {
    id: uuid("id").primaryKey().defaultRandom(),
    baseUrl: text("base_url").unique().notNull(),
    outbox: text("outbox").notNull(),
});

export const Pull = pgTable("pull", {
    id: uuid("id").primaryKey().defaultRandom(),
    peerId: uuid("peer_id").references(() => Peer.id).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: text("status", { enum: ["pending", "in_progress", "completed", "failed"] }).notNull().default("pending"),
    contentFound: numeric("content_found").default("0"),
    contentProcessed: numeric("content_processed").default("0"),
    contentCreated: numeric("content_created").default("0"),
    contentUpdated: numeric("content_updated").default("0"),
    lastPage: numeric("last_page").default("0"),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata"), // For storing additional pull info like pagination cursors, etc.
});

export const Schema = pgTable("schema", {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type", { enum: ["context", "validation"] }).notNull(),
    namespace: text("namespace").notNull(), // "core" for core schemas, custom namespace for local
    version: text("version").notNull().default("v1"),
    targetType: text("target_type"), // For validation schemas: "Incident", "Peer", etc. Null for context schemas
    content: jsonb("content").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
