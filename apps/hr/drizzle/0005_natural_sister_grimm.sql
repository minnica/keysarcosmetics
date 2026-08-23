CREATE TABLE `permission_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`requires_document` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permission_types_name_unique` ON `permission_types` (`name`);--> statement-breakpoint
ALTER TABLE `requests` ADD `attachment_key` text;--> statement-breakpoint
ALTER TABLE `requests` ADD `attachment_name` text;
--> statement-breakpoint
INSERT OR IGNORE INTO `permission_types` (`name`,`requires_document`,`active`,`created_at`) VALUES
('Permiso',false,true,CURRENT_TIMESTAMP),
('Vacaciones',false,true,CURRENT_TIMESTAMP),
('Incapacidad',true,true,CURRENT_TIMESTAMP);
