PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_merchant_logo_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`match_key` text NOT NULL,
	`match_kind` text NOT NULL,
	`match_value` text NOT NULL,
	`display_name` text NOT NULL,
	`custom_name` text,
	`logo` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_merchant_logo_rules`("id", "match_key", "match_kind", "match_value", "display_name", "custom_name", "logo", "created_at", "updated_at") SELECT "id", "match_key", "match_kind", "match_value", "display_name", NULL, "logo", "created_at", "updated_at" FROM `merchant_logo_rules`;--> statement-breakpoint
DROP TABLE `merchant_logo_rules`;--> statement-breakpoint
ALTER TABLE `__new_merchant_logo_rules` RENAME TO `merchant_logo_rules`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `merchant_logo_rules_match_key_unique` ON `merchant_logo_rules` (`match_key`);
