CREATE TYPE "public"."tasting_status" AS ENUM('setup', 'active', 'finished');--> statement-breakpoint
CREATE TABLE "participant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "participant" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rating_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'stars' NOT NULL,
	"scale_min" integer DEFAULT 1 NOT NULL,
	"scale_max" integer DEFAULT 5 NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rating_criteria" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rating_value" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rating_id" uuid NOT NULL,
	"criterion_id" uuid NOT NULL,
	"value" smallint NOT NULL,
	CONSTRAINT "rating_value_rating_criterion_uq" UNIQUE("rating_id","criterion_id")
);
--> statement-breakpoint
ALTER TABLE "rating_value" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "rating" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"wine_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rating_participant_wine_uq" UNIQUE("participant_id","wine_id")
);
--> statement-breakpoint
ALTER TABLE "rating" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "session_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tasting" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"blind_tasting" boolean DEFAULT false NOT NULL,
	"guessing_enabled" boolean DEFAULT false NOT NULL,
	"status" "tasting_status" DEFAULT 'setup' NOT NULL,
	"admin_pin_hash" text NOT NULL,
	"pin_failed_attempts" integer DEFAULT 0 NOT NULL,
	"pin_locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasting_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "tasting" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "wine" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tasting_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"vintage" integer,
	"grape_variety" text,
	CONSTRAINT "wine_tasting_position_uq" UNIQUE("tasting_id","position")
);
--> statement-breakpoint
ALTER TABLE "wine" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "participant" ADD CONSTRAINT "participant_tasting_id_tasting_id_fk" FOREIGN KEY ("tasting_id") REFERENCES "public"."tasting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_criteria" ADD CONSTRAINT "rating_criteria_tasting_id_tasting_id_fk" FOREIGN KEY ("tasting_id") REFERENCES "public"."tasting"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_value" ADD CONSTRAINT "rating_value_rating_id_rating_id_fk" FOREIGN KEY ("rating_id") REFERENCES "public"."rating"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_value" ADD CONSTRAINT "rating_value_criterion_id_rating_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."rating_criteria"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating" ADD CONSTRAINT "rating_wine_id_wine_id_fk" FOREIGN KEY ("wine_id") REFERENCES "public"."wine"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_participant_id_participant_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participant"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wine" ADD CONSTRAINT "wine_tasting_id_tasting_id_fk" FOREIGN KEY ("tasting_id") REFERENCES "public"."tasting"("id") ON DELETE cascade ON UPDATE no action;