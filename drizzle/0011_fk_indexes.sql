CREATE INDEX "participant_tasting_id_idx" ON "participant" USING btree ("tasting_id","created_at");--> statement-breakpoint
CREATE INDEX "rating_criteria_tasting_id_idx" ON "rating_criteria" USING btree ("tasting_id","position");--> statement-breakpoint
CREATE INDEX "rating_value_criterion_id_idx" ON "rating_value" USING btree ("criterion_id");--> statement-breakpoint
CREATE INDEX "rating_wine_id_idx" ON "rating" USING btree ("wine_id");--> statement-breakpoint
CREATE INDEX "session_participant_id_idx" ON "session" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "tasting_created_at_idx" ON "tasting" USING btree ("created_at");