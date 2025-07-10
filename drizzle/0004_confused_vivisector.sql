ALTER TABLE "schema" DROP CONSTRAINT "schema_uri_unique";--> statement-breakpoint
ALTER TABLE "schema" ADD COLUMN "target_type" text;--> statement-breakpoint
ALTER TABLE "schema" DROP COLUMN "uri";