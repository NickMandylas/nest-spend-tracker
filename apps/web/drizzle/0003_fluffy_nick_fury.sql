CREATE TABLE `account_balance_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`current_amount_minor` integer,
	`current_currency` text,
	`available_amount_minor` integer,
	`available_currency` text,
	`balance_currency` text,
	`raw_balance_json` text,
	`fetched_at` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `connected_accounts`(`account_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_balance_snapshots_account_fetched_unique` ON `account_balance_snapshots` (`account_id`,`fetched_at`);--> statement-breakpoint
CREATE INDEX `account_balance_snapshots_account_fetched_idx` ON `account_balance_snapshots` (`account_id`,`fetched_at`);--> statement-breakpoint
CREATE TABLE `bank_transactions` (
	`transaction_id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`status` text NOT NULL,
	`date` text NOT NULL,
	`datetime` text,
	`post_date` text,
	`post_datetime` text,
	`value_date` text,
	`value_datetime` text,
	`description` text NOT NULL,
	`amount_minor` integer,
	`currency` text,
	`direction` text NOT NULL,
	`provider_category` text,
	`category` text,
	`merchant_name` text,
	`merchant_category_code` text,
	`raw_transaction_json` text NOT NULL,
	`first_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `connected_accounts`(`account_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bank_transactions_account_date_idx` ON `bank_transactions` (`account_id`,`date`);--> statement-breakpoint
CREATE INDEX `bank_transactions_merchant_idx` ON `bank_transactions` (`merchant_name`);--> statement-breakpoint
CREATE INDEX `bank_transactions_provider_category_idx` ON `bank_transactions` (`provider_category`);--> statement-breakpoint
CREATE TABLE `banking_syncs` (
	`source` text PRIMARY KEY NOT NULL,
	`fetched_at` text NOT NULL,
	`timezone` text NOT NULL,
	`api_version` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connected_accounts` (
	`account_id` text PRIMARY KEY NOT NULL,
	`connection_id` text NOT NULL,
	`provider_name` text NOT NULL,
	`category` text NOT NULL,
	`account_name` text NOT NULL,
	`account_type` text NOT NULL,
	`institution_id` text NOT NULL,
	`institution_name` text NOT NULL,
	`institution_logo` text,
	`account_number` text,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`raw_account_json` text NOT NULL,
	`raw_details_json` text,
	`warnings_json` text NOT NULL,
	`first_seen_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
