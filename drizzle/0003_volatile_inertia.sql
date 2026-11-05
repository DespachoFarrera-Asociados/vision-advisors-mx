ALTER TABLE `documents` ADD `fiscal_type` text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `issue_date` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `opinion_sense` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `valid_until` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `is_current` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `replaces_id` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `sha256` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `detected_rfc` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `rfc_validated` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `manual_confirmed` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `rfc` text;--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_rfc_unique` ON `organizations` (`rfc`);