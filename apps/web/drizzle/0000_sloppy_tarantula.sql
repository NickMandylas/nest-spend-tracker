CREATE TABLE `account_preferences` (
	`account_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`provider_name` text NOT NULL,
	`account_type` text NOT NULL,
	`institution_name` text NOT NULL,
	`institution_logo` text,
	`property_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`address` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
