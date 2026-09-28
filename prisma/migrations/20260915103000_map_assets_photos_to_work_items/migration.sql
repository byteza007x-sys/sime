ALTER TABLE `service_report_assets`
  ADD COLUMN `item_line_no` INTEGER NULL AFTER `line_no`;

ALTER TABLE `service_report_photos`
  ADD COLUMN `item_line_no` INTEGER NULL AFTER `photo_type`;
