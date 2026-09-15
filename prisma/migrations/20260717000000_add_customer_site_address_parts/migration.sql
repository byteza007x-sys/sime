ALTER TABLE `customer_sites`
  ADD COLUMN `house_no` VARCHAR(80) NULL AFTER `address`,
  ADD COLUMN `village_no` VARCHAR(40) NULL AFTER `house_no`,
  ADD COLUMN `road` VARCHAR(150) NULL AFTER `village_no`,
  ADD COLUMN `subdistrict` VARCHAR(100) NULL AFTER `road`,
  ADD COLUMN `district` VARCHAR(100) NULL AFTER `subdistrict`;
