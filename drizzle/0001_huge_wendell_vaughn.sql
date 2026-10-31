ALTER TABLE `documents` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `documents` ADD `published_at` text;--> statement-breakpoint
ALTER TABLE `documents` ADD `published_by` text REFERENCES users(id);