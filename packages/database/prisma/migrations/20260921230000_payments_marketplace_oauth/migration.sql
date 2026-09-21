-- AlterTable
ALTER TABLE `appointments` MODIFY `status` ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'pending_payment') NOT NULL DEFAULT 'scheduled';

-- AlterTable
ALTER TABLE `payment_accounts` ADD COLUMN `connected_at` DATETIME(3) NULL,
    ADD COLUMN `oauth_access_token` TEXT NULL,
    ADD COLUMN `oauth_public_key` VARCHAR(191) NULL,
    ADD COLUMN `oauth_refresh_token` TEXT NULL,
    ADD COLUMN `pix_unavailable` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `token_expires_at` DATETIME(3) NULL;
