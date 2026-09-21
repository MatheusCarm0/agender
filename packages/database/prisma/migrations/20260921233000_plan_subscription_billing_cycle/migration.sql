-- AlterTable
ALTER TABLE `plan_subscriptions` ADD COLUMN `billing_cycle` VARCHAR(191) NOT NULL DEFAULT 'monthly';
