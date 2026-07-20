CREATE TABLE `experiences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`display_name` text DEFAULT 'Anonymous' NOT NULL,
	`location` text DEFAULT 'Location withheld' NOT NULL,
	`experience_year` text DEFAULT '' NOT NULL,
	`experience_type` text DEFAULT 'Other' NOT NULL,
	`transcript` text DEFAULT '' NOT NULL,
	`privacy` text DEFAULT 'archive' NOT NULL,
	`recording_mode` text DEFAULT 'text' NOT NULL,
	`media_key` text,
	`media_type` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
