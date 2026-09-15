ALTER TABLE `service_reports`
  MODIFY COLUMN `scheduled_date` DATETIME(0) NULL;

CREATE TABLE `service_report_topics` (
  `topic_id` INT NOT NULL AUTO_INCREMENT,
  `report_id` CHAR(36) NOT NULL,
  `service_type` ENUM('Installation','Maintenance','Repair','PM','Emergency') NOT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`topic_id`),
  UNIQUE KEY `report_service_topic_unique` (`report_id`, `service_type`),
  KEY `report_id` (`report_id`),
  CONSTRAINT `service_report_topics_ibfk_1`
    FOREIGN KEY (`report_id`) REFERENCES `service_reports` (`report_id`)
    ON DELETE CASCADE
    ON UPDATE RESTRICT
);
