CREATE TABLE `brand_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`brand_name` text DEFAULT 'KEYSAR' NOT NULL,
	`brand_subtitle` text DEFAULT 'COSMETICS · GESTIÓN DE PERSONAL' NOT NULL,
	`logo_key` text,
	`logo_name` text,
	`logo_content_type` text,
	`updated_at` text NOT NULL
);
