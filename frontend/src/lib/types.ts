// src/lib/types.ts

export interface Check {
  id: number;
  timestamp: string;
  httpCode: string;
  url: string;
  targetDate: string;
  targetLabel: string;
  price: number | null;
  hasContent: boolean;
  content?: {
    contentData: string;
  };
}

export interface CheckerConfiguration {
  id: number;
  is_active: boolean;
  targetDate: string;
  targetLabel: string;
  is_mail_alert: boolean;
  mail_alert_address: string;
  mail_alert_contact: string;
}
