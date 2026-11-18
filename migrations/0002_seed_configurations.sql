-- migrations/0002_seed_configurations.sql
-- Baseline configurations for ski pass checker.
-- Privacy: this file is committed to source control, so it must only contain
-- placeholder recipient data. Real alert recipients are customer PII and are
-- configured after deployment via the authenticated dashboard.

INSERT INTO checker_configurations (id, is_active, target_date, target_label, is_mail_alert, mail_alert_address, mail_alert_contact)
VALUES 
  (1, 1, '2026-12-20', 'Val Cenis', 1, 'alerts@example.com', 'Admin User')
ON CONFLICT(id) DO NOTHING;
