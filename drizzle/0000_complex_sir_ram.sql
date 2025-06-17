CREATE TABLE "alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"local_id" uuid NOT NULL,
	"external_uri" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uri" text NOT NULL,
	"data" jsonb NOT NULL,
	"source_node" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incident_uri_unique" UNIQUE("uri")
);
--> statement-breakpoint
CREATE TABLE "peer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_url" text NOT NULL,
	"outbox" text NOT NULL,
	"last_sync" timestamp with time zone,
	CONSTRAINT "peer_base_url_unique" UNIQUE("base_url")
);
--> statement-breakpoint
ALTER TABLE "alias" ADD CONSTRAINT "alias_local_id_incident_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."incident"("id") ON DELETE no action ON UPDATE no action;