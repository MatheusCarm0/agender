-- Clube de fidelidade: ciclo personalizado em dias (sobrepõe billingCycle quando > 0)
-- AlterTable
ALTER TABLE `membership_plans` ADD COLUMN `cycle_duration_days` INTEGER NULL;
