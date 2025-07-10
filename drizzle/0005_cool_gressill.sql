CREATE TABLE "content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uri" text NOT NULL,
	"content_type" text NOT NULL,
	"namespace" text NOT NULL,
	"data" jsonb NOT NULL,
	"source_node" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_uri_unique" UNIQUE("uri")
);
--> statement-breakpoint
ALTER TABLE "pull" RENAME COLUMN "incidents_found" TO "content_found";--> statement-breakpoint
ALTER TABLE "pull" RENAME COLUMN "incidents_processed" TO "content_processed";--> statement-breakpoint
ALTER TABLE "pull" RENAME COLUMN "incidents_created" TO "content_created";--> statement-breakpoint
ALTER TABLE "pull" RENAME COLUMN "incidents_updated" TO "content_updated";