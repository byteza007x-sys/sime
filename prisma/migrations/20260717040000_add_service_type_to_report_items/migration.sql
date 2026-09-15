ALTER TABLE `service_report_items`
  ADD COLUMN `service_type` ENUM('Installation', 'Maintenance', 'Repair', 'PM', 'Emergency') NULL AFTER `line_no`;
