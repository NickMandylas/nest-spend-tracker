CREATE TABLE `manual_net_worth_items` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`item_type` text NOT NULL,
	`category` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `manual_net_worth_items_type_idx` ON `manual_net_worth_items` (`item_type`);--> statement-breakpoint
CREATE TABLE `net_worth_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`monthly_super_contribution_minor` integer NOT NULL,
	`super_contribution_tax_bps` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `property_valuations` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`value_minor` integer NOT NULL,
	`loan_balance_minor` integer NOT NULL,
	`valued_at` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `property_valuations_property_unique` ON `property_valuations` (`property_id`);