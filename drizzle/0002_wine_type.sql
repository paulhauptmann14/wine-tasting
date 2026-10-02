CREATE TYPE "public"."wine_type" AS ENUM('red', 'white', 'rose', 'sparkling');--> statement-breakpoint
ALTER TABLE "wine" ADD COLUMN "wine_type" "wine_type";