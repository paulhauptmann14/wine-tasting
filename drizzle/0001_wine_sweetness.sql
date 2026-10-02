CREATE TYPE "public"."wine_sweetness" AS ENUM('dry', 'off_dry', 'medium', 'sweet');--> statement-breakpoint
ALTER TABLE "wine" ADD COLUMN "sweetness" "wine_sweetness";