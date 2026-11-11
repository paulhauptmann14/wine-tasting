CREATE TYPE "public"."rating_scale" AS ENUM('five', 'twenty', 'hundred');--> statement-breakpoint
ALTER TABLE "rating_criteria" ADD COLUMN "weight" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasting" ADD COLUMN "scale" "rating_scale" DEFAULT 'five' NOT NULL;