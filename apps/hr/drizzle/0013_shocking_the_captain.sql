CREATE TABLE `job_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_roles_name_unique` ON `job_roles` (`name`);--> statement-breakpoint
ALTER TABLE `staff` ADD `birthday` text;