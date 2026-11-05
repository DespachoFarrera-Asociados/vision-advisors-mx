CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`type` text DEFAULT 'informative' NOT NULL,
	`due_date` text,
	`document_id` text,
	`read_at` text,
	`sent_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`sent_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
