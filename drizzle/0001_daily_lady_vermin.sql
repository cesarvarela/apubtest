CREATE TABLE "pull" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"peer_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"incidents_found" numeric DEFAULT '0',
	"incidents_processed" numeric DEFAULT '0',
	"incidents_created" numeric DEFAULT '0',
	"incidents_updated" numeric DEFAULT '0',
	"last_page" numeric DEFAULT '0',
	"error_message" text,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "pull" ADD CONSTRAINT "pull_peer_id_peer_id_fk" FOREIGN KEY ("peer_id") REFERENCES "public"."peer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peer" DROP COLUMN "last_sync";