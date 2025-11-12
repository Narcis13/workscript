ALTER TABLE `password_resets` ADD `ip_address` varchar(45);--> statement-breakpoint
ALTER TABLE `users` ADD `first_name` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `email_verification_token` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `email_verification_token_expiry` timestamp;