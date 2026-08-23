CREATE TABLE `policy_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`file_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vacation_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`period_type` text NOT NULL,
	`total_days` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vacation_models_name_unique` ON `vacation_models` (`name`);--> statement-breakpoint
ALTER TABLE `branches` ADD `opening_time` text DEFAULT '10:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `branches` ADD `closing_time` text DEFAULT '20:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `requests` ADD `vacation_model_id` integer;--> statement-breakpoint
ALTER TABLE `staff` ADD `vacation_model_id` integer;