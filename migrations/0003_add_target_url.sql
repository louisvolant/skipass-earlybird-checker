-- migrations/0003_add_target_url.sql
-- Add per-configuration site URL support so multiple resort or shop URLs can be checked.

ALTER TABLE checker_configurations ADD COLUMN target_url TEXT;
