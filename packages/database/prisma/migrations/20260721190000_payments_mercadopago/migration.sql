-- AlterTable
ALTER TABLE `businesses` ADD COLUMN `booking_payment_policy` VARCHAR(191) NOT NULL DEFAULT 'none',
    ADD COLUMN `deposit_percent` INTEGER NULL;

-- CreateTable
CREATE TABLE `payment_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'mercadopago',
    `external_account_id` VARCHAR(191) NULL,
    `status` ENUM('pending_verification', 'active', 'restricted') NOT NULL DEFAULT 'pending_verification',
    `pix_key` VARCHAR(191) NULL,
    `bank_account` JSON NULL,
    `document_type` VARCHAR(191) NULL,
    `document_number` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payment_accounts_business_id_key`(`business_id`),
    INDEX `payment_accounts_business_id_idx`(`business_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `withdrawals` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `payment_account_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('pending', 'confirmed', 'failed') NOT NULL DEFAULT 'pending',
    `gateway_transfer_id` VARCHAR(191) NULL,
    `destination` VARCHAR(191) NULL,
    `confirmed_at` DATETIME(3) NULL,
    `error` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `withdrawals_business_id_idx`(`business_id`),
    INDEX `withdrawals_payment_account_id_idx`(`payment_account_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_payments` (
    `id` VARCHAR(191) NOT NULL,
    `appointment_id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'mercadopago',
    `amount` DECIMAL(10, 2) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'confirmed', 'failed', 'refunded', 'expired') NOT NULL DEFAULT 'pending',
    `gateway_charge_id` VARCHAR(191) NOT NULL,
    `pix_qr_code` TEXT NULL,
    `pix_qr_code_base64` TEXT NULL,
    `checkout_url` VARCHAR(191) NULL,
    `idempotency_key` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `last_synced_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `booking_payments_appointment_id_key`(`appointment_id`),
    INDEX `booking_payments_business_id_idx`(`business_id`),
    INDEX `booking_payments_gateway_charge_id_idx`(`gateway_charge_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'mercadopago',
    `gateway_subscription_id` VARCHAR(191) NOT NULL,
    `plan_tier` ENUM('basico', 'profissional', 'pro') NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `amount` DECIMAL(10, 2) NOT NULL,
    `checkout_url` VARCHAR(191) NULL,
    `next_due_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `plan_subscriptions_business_id_key`(`business_id`),
    INDEX `plan_subscriptions_business_id_idx`(`business_id`),
    INDEX `plan_subscriptions_gateway_subscription_id_idx`(`gateway_subscription_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_events` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'mercadopago',
    `event_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `processed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `webhook_events_provider_event_id_key`(`provider`, `event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_accounts` ADD CONSTRAINT `payment_accounts_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_payment_account_id_fkey` FOREIGN KEY (`payment_account_id`) REFERENCES `payment_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_payments` ADD CONSTRAINT `booking_payments_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_payments` ADD CONSTRAINT `booking_payments_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_subscriptions` ADD CONSTRAINT `plan_subscriptions_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

