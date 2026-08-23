CREATE TABLE `branches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`manager_id` integer,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `branches_name_unique` ON `branches` (`name`);--> statement-breakpoint
CREATE TABLE `requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_id` integer NOT NULL,
	`request_type` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Pendiente' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `branches` (`name`, `created_at`) VALUES
('Mitikah', CURRENT_TIMESTAMP),
('Mitikah VIP', CURRENT_TIMESTAMP),
('Opatra', CURRENT_TIMESTAMP),
('Galerías Insurgentes', CURRENT_TIMESTAMP),
('Masaryk', CURRENT_TIMESTAMP),
('Parque Delta', CURRENT_TIMESTAMP);
