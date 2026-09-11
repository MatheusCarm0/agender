-- Reconcilia o schema com as migrations: cria as tabelas e colunas de fase 4/5
-- (fidelidade, cupons, campanhas, OTP, notificacoes, staff, reset de senha,
-- email_verifications, plan_usages) e colunas (onboarding, plan_status, galeria,
-- cupom/desconto/membership em appointments, etc.) que existiam so via db push.

-- DropForeignKey
ALTER TABLE `clients` DROP FOREIGN KEY `clients_business_id_fkey`;

-- DropIndex
DROP INDEX `clients_business_id_phone_idx` ON `clients`;

-- AlterTable
ALTER TABLE `appointments` ADD COLUMN `coupon_id` VARCHAR(191) NULL,
    ADD COLUMN `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN `membership_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `businesses` ADD COLUMN `onboarding_completed_at` DATETIME(3) NULL,
    ADD COLUMN `onboarding_skipped` JSON NOT NULL,
    ADD COLUMN `onboarding_step` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `plan_status` ENUM('trialing', 'active', 'pastDue', 'expired') NOT NULL DEFAULT 'trialing',
    ADD COLUMN `plan_updated_at` DATETIME(3) NULL,
    ADD COLUMN `subdomain` VARCHAR(191) NULL,
    ADD COLUMN `trial_ends_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `plan` enum('basico','profissional','pro') NOT NULL DEFAULT 'basico',
    MODIFY `logo_url` varchar(191) NULL,
    MODIFY `cover_url` varchar(191) NULL;

-- AlterTable
ALTER TABLE `clients` ADD COLUMN `marketing_opt_in` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `marketing_opt_in_at` DATETIME(3) NULL,
    ADD COLUMN `phone_verified_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `page_customizations` ADD COLUMN `address` JSON NULL,
    ADD COLUMN `favicon_url` VARCHAR(191) NULL,
    ADD COLUMN `gallery` JSON NOT NULL,
    ADD COLUMN `show_hours` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `welcome_msg` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `onboarded_at` DATETIME(3) NULL,
    ADD COLUMN `token_version` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `campaign_recipients` (
    `id` VARCHAR(191) NOT NULL,
    `campaign_id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    `sent_at` DATETIME(3) NULL,
    `error` VARCHAR(191) NULL,

    UNIQUE INDEX `campaign_recipients_campaign_id_client_id_key`(`campaign_id` ASC, `client_id` ASC),
    INDEX `campaign_recipients_campaign_id_idx`(`campaign_id` ASC),
    INDEX `campaign_recipients_client_id_fkey`(`client_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `channel` ENUM('whatsapp', 'email', 'both') NOT NULL,
    `message_text` TEXT NOT NULL,
    `email_subject` VARCHAR(191) NULL,
    `audience_filter` JSON NOT NULL,
    `scheduled_for` DATETIME(3) NULL,
    `status` ENUM('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled') NOT NULL DEFAULT 'draft',
    `total_recipients` INTEGER NOT NULL DEFAULT 0,
    `total_sent` INTEGER NOT NULL DEFAULT 0,
    `total_failed` INTEGER NOT NULL DEFAULT 0,
    `cost_estimate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `cost_actual` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `campaigns_business_id_idx`(`business_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_memberships` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `plan_id` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'active', 'suspended', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
    `cycle_start` DATETIME(3) NOT NULL,
    `cycle_end` DATETIME(3) NOT NULL,
    `usage_in_cycle` INTEGER NOT NULL DEFAULT 0,
    `payment_status_enum` ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_memberships_business_id_idx`(`business_id` ASC),
    INDEX `client_memberships_client_id_idx`(`client_id` ASC),
    INDEX `client_memberships_plan_id_fkey`(`plan_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_otps` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_otps_business_id_created_at_idx`(`business_id` ASC, `created_at` ASC),
    INDEX `client_otps_client_id_idx`(`client_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupon_redemptions` (
    `id` VARCHAR(191) NOT NULL,
    `coupon_id` VARCHAR(191) NOT NULL,
    `appointment_id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `discount_applied` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `coupon_redemptions_appointment_id_key`(`appointment_id` ASC),
    INDEX `coupon_redemptions_client_id_idx`(`client_id` ASC),
    INDEX `coupon_redemptions_coupon_id_idx`(`coupon_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupons` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `discount_type` ENUM('percent', 'fixed') NOT NULL,
    `discount_value` DECIMAL(10, 2) NOT NULL,
    `scope` ENUM('all', 'service') NOT NULL DEFAULT 'all',
    `service_id` VARCHAR(191) NULL,
    `max_uses` INTEGER NULL,
    `used_count` INTEGER NOT NULL DEFAULT 0,
    `per_client_limit` INTEGER NULL,
    `valid_from` DATETIME(3) NOT NULL,
    `valid_until` DATETIME(3) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `coupons_business_id_code_key`(`business_id` ASC, `code` ASC),
    INDEX `coupons_business_id_idx`(`business_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verifications` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `purpose` VARCHAR(191) NOT NULL DEFAULT 'register',
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_verifications_email_created_at_idx`(`email` ASC, `created_at` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `membership_plans` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `billing_cycle` ENUM('monthly', 'quarterly', 'yearly') NOT NULL DEFAULT 'monthly',
    `usage_limit_type` ENUM('unlimited', 'limited') NOT NULL,
    `usage_limit` INTEGER NULL,
    `service_ids` JSON NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `membership_plans_business_id_idx`(`business_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_logs` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NULL,
    `channel` ENUM('email', 'sms', 'whatsapp') NOT NULL,
    `type` ENUM('booking_reminder', 'booking_confirmation', 'booking_cancelled', 'membership_expiring', 'trial_warning') NOT NULL,
    `status` ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    `payload` JSON NOT NULL,
    `sent_at` DATETIME(3) NULL,
    `error` VARCHAR(191) NULL,
    `reference_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notification_logs_business_id_idx`(`business_id` ASC),
    INDEX `notification_logs_client_id_fkey`(`client_id` ASC),
    UNIQUE INDEX `notification_logs_reference_id_type_key`(`reference_id` ASC, `type` ASC),
    INDEX `notification_logs_status_created_at_idx`(`status` ASC, `created_at` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `used_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `password_reset_tokens_user_id_idx`(`user_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_usages` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `period_start` DATETIME(3) NOT NULL,
    `period_end` DATETIME(3) NOT NULL,
    `plan_at_snapshot` ENUM('basico', 'profissional', 'pro') NOT NULL,
    `campaign_sends_included` INTEGER NOT NULL DEFAULT 0,
    `campaign_sends_used` INTEGER NOT NULL DEFAULT 0,
    `overage_sends` INTEGER NOT NULL DEFAULT 0,
    `overage_cost` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    INDEX `plan_usages_business_id_idx`(`business_id` ASC),
    UNIQUE INDEX `plan_usages_business_id_period_start_key`(`business_id` ASC, `period_start` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_invites` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('owner', 'admin', 'professional', 'receptionist') NOT NULL,
    `professional_id` VARCHAR(191) NULL,
    `token_hash` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `accepted_at` DATETIME(3) NULL,
    `invited_by_user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `staff_invites_business_id_email_idx`(`business_id` ASC, `email` ASC),
    INDEX `staff_invites_business_id_idx`(`business_id` ASC),
    INDEX `staff_invites_invited_by_user_id_fkey`(`invited_by_user_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `businesses_subdomain_key` ON `businesses`(`subdomain` ASC);

-- CreateIndex
CREATE UNIQUE INDEX `clients_business_id_phone_key` ON `clients`(`business_id` ASC, `phone` ASC);

-- AddForeignKey
ALTER TABLE `campaign_recipients` ADD CONSTRAINT `campaign_recipients_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey

-- AddForeignKey
ALTER TABLE `campaign_recipients` ADD CONSTRAINT `campaign_recipients_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_memberships` ADD CONSTRAINT `client_memberships_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_memberships` ADD CONSTRAINT `client_memberships_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_memberships` ADD CONSTRAINT `client_memberships_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `membership_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_otps` ADD CONSTRAINT `client_otps_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `membership_plans` ADD CONSTRAINT `membership_plans_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_logs` ADD CONSTRAINT `notification_logs_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plan_usages` ADD CONSTRAINT `plan_usages_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_invites` ADD CONSTRAINT `staff_invites_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `staff_invites` ADD CONSTRAINT `staff_invites_invited_by_user_id_fkey` FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey (restaura a FK de clients dropada acima para recriar o índice)
ALTER TABLE `clients` ADD CONSTRAINT `clients_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
