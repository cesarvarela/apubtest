import { pgTable, uuid, text, timestamp, jsonb, numeric, boolean } from "drizzle-orm/pg-core";

export const Incident = pgTable("incident", {
    id: uuid("id").primaryKey().defaultRandom(),
    uri: text("uri").unique().notNull(),
    data: jsonb("data").notNull(),
    sourceNode: text("source_node").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const Alias = pgTable("alias", {
    id: uuid("id").primaryKey().defaultRandom(),
    localId: uuid("local_id").references(() => Incident.id).notNull(),
    externalUri: text("external_uri").notNull(),
});

export const Peer = pgTable("peer", {
    id: uuid("id").primaryKey().defaultRandom(),
    baseUrl: text("base_url").unique().notNull(),
    outbox: text("outbox").notNull(),
    lastSync: timestamp("last_sync", { withTimezone: true }),
});
