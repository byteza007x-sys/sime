ALTER TABLE `users`
  ADD COLUMN `username` VARCHAR(100) NULL,
  ADD UNIQUE INDEX `username` (`username`);

INSERT IGNORE INTO `roles` (`role_name`, `description`)
VALUES
  ('admin', 'Administrator'),
  ('user', 'Service user');
