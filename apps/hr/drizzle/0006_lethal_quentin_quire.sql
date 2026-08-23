ALTER TABLE `staff` ADD `first_name` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `paternal_surname` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `maternal_surname` text;--> statement-breakpoint
ALTER TABLE `staff` ADD `username` text;--> statement-breakpoint
CREATE UNIQUE INDEX `staff_username_unique` ON `staff` (`username`);