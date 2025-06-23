CREATE TABLE "schema" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"namespace" text NOT NULL,
	"version" text DEFAULT 'v1' NOT NULL,
	"uri" text NOT NULL,
	"content" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schema_uri_unique" UNIQUE("uri")
);
