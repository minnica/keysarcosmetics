CREATE TABLE `staff` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`job_role` text NOT NULL,
	`email` text,
	`access_code_hash` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`branch` text DEFAULT 'Sin asignar' NOT NULL,
	`shift` text DEFAULT 'Sin asignar' NOT NULL,
	`rest_day` text DEFAULT 'Sin asignar' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_email_unique` ON `staff` (`email`);