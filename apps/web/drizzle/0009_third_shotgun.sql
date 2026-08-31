ALTER TABLE `properties` ADD `property_type` text DEFAULT 'residential' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `address_line_1` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `suburb` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `state` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `postcode` text;--> statement-breakpoint
ALTER TABLE `properties` ADD `country` text DEFAULT 'Australia' NOT NULL;--> statement-breakpoint
ALTER TABLE `properties` ADD `purchase_price_minor` integer;--> statement-breakpoint
ALTER TABLE `properties` ADD `purchase_date` text;--> statement-breakpoint
UPDATE `properties` SET `address_line_1` = `address` WHERE `address_line_1` IS NULL;
