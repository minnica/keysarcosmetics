CREATE TABLE `daily_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_id` integer NOT NULL,
	`work_date` text NOT NULL,
	`branch` text NOT NULL,
	`shift` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_staff_date_unique` ON `daily_assignments` (`staff_id`,`work_date`);