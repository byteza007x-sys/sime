ALTER TABLE `system_feature_flags`
  MODIFY COLUMN `flag_key` VARCHAR(50) NOT NULL,
  MODIFY COLUMN `is_enabled` BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE `system_feature_flags`
  DROP COLUMN `label`,
  DROP COLUMN `created_at`;

ALTER TABLE `service_report_topics`
  DROP INDEX `report_service_topic_unique`;

ALTER TABLE `service_report_topics`
  CHANGE COLUMN `topic_id` `id` INT NOT NULL AUTO_INCREMENT;

ALTER TABLE `service_report_topics`
  DROP COLUMN `created_at`;

ALTER TABLE `service_report_topics`
  ADD UNIQUE KEY `report_id_service_type` (`report_id`, `service_type`);
