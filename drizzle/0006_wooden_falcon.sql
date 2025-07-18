CREATE TABLE "relationship" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" text NOT NULL,
	"name" text NOT NULL,
	"source_type" text NOT NULL,
	"target_type" text NOT NULL,
	"cardinality" text NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"inverse_relationship" text,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
