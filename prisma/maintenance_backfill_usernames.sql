INSERT IGNORE INTO `roles` (`role_name`, `description`)
VALUES
  ('admin', 'Administrator'),
  ('user', 'Service user');

UPDATE `users`
SET `username` = 'admin'
WHERE `email` = 'admin@siamebu.com'
  AND `username` IS NULL;
