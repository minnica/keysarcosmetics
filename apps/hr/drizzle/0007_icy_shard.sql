ALTER TABLE `staff` ADD `rest_type` text DEFAULT 'Fijo' NOT NULL;--> statement-breakpoint
ALTER TABLE `staff` ADD `rest_start_date` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `rest_end_date` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `is_active` integer DEFAULT true NOT NULL;