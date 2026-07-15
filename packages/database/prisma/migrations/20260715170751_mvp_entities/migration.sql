-- CreateTable
CREATE TABLE `services` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `duration_min` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `buffer_before` INTEGER NOT NULL DEFAULT 0,
    `buffer_after` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `services_business_id_idx`(`business_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `professional_services` (
    `professional_id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `price_override` DECIMAL(10, 2) NULL,
    `duration_override` INTEGER NULL,

    INDEX `professional_services_service_id_idx`(`service_id`),
    PRIMARY KEY (`professional_id`, `service_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `working_hours` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `professional_id` VARCHAR(191) NOT NULL,
    `weekday` INTEGER NOT NULL,
    `start_time` VARCHAR(191) NOT NULL,
    `end_time` VARCHAR(191) NOT NULL,

    INDEX `working_hours_business_id_idx`(`business_id`),
    INDEX `working_hours_professional_id_weekday_idx`(`professional_id`, `weekday`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule_blocks` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `professional_id` VARCHAR(191) NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NULL,

    INDEX `schedule_blocks_business_id_idx`(`business_id`),
    INDEX `schedule_blocks_professional_id_start_at_idx`(`professional_id`, `start_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `clients_business_id_idx`(`business_id`),
    INDEX `clients_business_id_phone_idx`(`business_id`, `phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointments` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `professional_id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `status` ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'scheduled',
    `price` DECIMAL(10, 2) NOT NULL,
    `payment_status` VARCHAR(191) NOT NULL DEFAULT 'unpaid',
    `notes` TEXT NULL,
    `idempotency_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `appointments_business_id_idx`(`business_id`),
    INDEX `appointments_professional_id_start_at_idx`(`professional_id`, `start_at`),
    UNIQUE INDEX `appointments_business_id_idempotency_key_key`(`business_id`, `idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professional_services` ADD CONSTRAINT `professional_services_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `professional_services` ADD CONSTRAINT `professional_services_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `working_hours` ADD CONSTRAINT `working_hours_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `working_hours` ADD CONSTRAINT `working_hours_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_blocks` ADD CONSTRAINT `schedule_blocks_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `schedule_blocks` ADD CONSTRAINT `schedule_blocks_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_professional_id_fkey` FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
