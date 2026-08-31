CREATE TABLE `household_members` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`monthly_take_home_income_minor` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `household_members_sort_order_idx` ON `household_members` (`sort_order`);
--> statement-breakpoint
INSERT INTO `household_members` (
	`id`,
	`display_name`,
	`monthly_take_home_income_minor`,
	`sort_order`,
	`created_at`,
	`updated_at`
)
SELECT
	'household_member_migrated_income',
	'Household income',
	MAX(`monthly_take_home_income_minor`),
	0,
	unixepoch() * 1000,
	unixepoch() * 1000
FROM `properties`
HAVING MAX(`monthly_take_home_income_minor`) > 0;
--> statement-breakpoint
UPDATE `properties`
SET `monthly_take_home_income_minor` = NULL
WHERE `monthly_take_home_income_minor` IS NOT NULL;
