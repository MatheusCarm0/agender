-- AlterTable
ALTER TABLE `appointments` ADD COLUMN `paid_at` DATETIME(3) NULL,
    ADD COLUMN `payment_method` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `professionals` ADD COLUMN `commission_type` ENUM('none', 'percent', 'fixed') NOT NULL DEFAULT 'none',
    ADD COLUMN `commission_value` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `page_customizations` (
    `business_id` VARCHAR(191) NOT NULL,
    `theme` JSON NOT NULL,
    `links` JSON NOT NULL,
    `socials` JSON NOT NULL,
    `headline` VARCHAR(191) NULL,
    `about` TEXT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`business_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurring_blocks` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `professional_id` VARCHAR(191) NULL,
    `weekday` INTEGER NOT NULL,
    `start_time` VARCHAR(191) NOT NULL,
    `end_time` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,

    INDEX `recurring_blocks_business_id_idx`(`business_id`),
    INDEX `recurring_blocks_professional_id_weekday_idx`(`professional_id`, `weekday`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `page_customizations` ADD CONSTRAINT `page_customizations_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_blocks` ADD CONSTRAINT `recurring_blocks_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_blocks` ADD CONSTRAINT `recurring_blocks_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
