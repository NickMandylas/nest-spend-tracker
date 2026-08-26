CREATE TABLE `merchant_logo_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`match_key` text NOT NULL,
	`match_kind` text NOT NULL,
	`match_value` text NOT NULL,
	`display_name` text NOT NULL,
	`logo` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `merchant_logo_rules_match_key_unique` ON `merchant_logo_rules` (`match_key`);