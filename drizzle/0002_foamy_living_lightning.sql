ALTER TABLE `monthly_snapshots` ADD `vat_transferred_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `monthly_snapshots` ADD `vat_creditable_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `monthly_snapshots` ADD `vat_withheld_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `monthly_snapshots` ADD `issued_cfdi_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `monthly_snapshots` ADD `received_cfdi_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `monthly_snapshots` ADD `payment_due_date` text;--> statement-breakpoint
ALTER TABLE `monthly_snapshots` ADD `filing_status` text DEFAULT 'determined' NOT NULL;