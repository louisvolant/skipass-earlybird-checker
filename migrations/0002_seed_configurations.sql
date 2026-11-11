-- migrations/0002_seed_configurations.sql
-- Baseline configurations for ski pass checker

INSERT INTO checker_configurations (id, is_active, target_date, target_label, is_mail_alert, mail_alert_address, mail_alert_contact)
VALUES 
  (1, 1, '2026-12-20', 'Val Cenis', 1, 'alerts@louisvolant.com', 'Louis Volant')
ON CONFLICT(id) DO UPDATE SET 
  is_active = excluded.is_active,
  target_date = excluded.target_date,
  target_label = excluded.target_label,
  is_mail_alert = excluded.is_mail_alert,
  mail_alert_address = excluded.mail_alert_address,
  mail_alert_contact = excluded.mail_alert_contact,
  updated_at = datetime('now');
