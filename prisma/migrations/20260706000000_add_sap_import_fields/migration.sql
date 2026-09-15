ALTER TABLE `customers`
  ADD COLUMN `sap_bp_code` VARCHAR(50) NULL,
  ADD COLUMN `account_balance` DECIMAL(12, 2) NULL,
  ADD INDEX `sap_bp_code` (`sap_bp_code`);

ALTER TABLE `equipment_master`
  ADD COLUMN `sap_item_no` VARCHAR(50) NULL,
  ADD INDEX `sap_item_no` (`sap_item_no`);

ALTER TABLE `inventory`
  ADD COLUMN `batch_number` VARCHAR(100) NULL,
  ADD COLUMN `quantity` DECIMAL(12, 3) NULL DEFAULT 1.000,
  ADD COLUMN `inventory_value` DECIMAL(14, 2) NULL;
