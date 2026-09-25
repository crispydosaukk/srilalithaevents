export interface EmailRecipient {
  id: string;
  email: string;
  name: string;
  enabled: boolean;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface EmailNotificationConfig {
  enabled: boolean;
  recipients: EmailRecipient[];
  sendCustomerConfirmation: boolean;
  smtp: SmtpConfig;
  updatedAt?: string;
}

export const DEFAULT_EMAIL_NOTIFICATION_CONFIG: EmailNotificationConfig = {
  enabled: true,
  recipients: [
    {
      id: 'recipient-default-1',
      email: 'admin@vegchennaisrilalitha.co.uk',
      name: 'Primary Admin',
      enabled: true,
    },
  ],
  sendCustomerConfirmation: true,
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: 'zingbiteuk@gmail.com',
    pass: 'yyozpzropaysxtah',
    fromName: 'SriLalitha Events & Catering',
    fromEmail: 'zingbiteuk@gmail.com',
  },
};

export function sanitizeEmailNotificationConfig(data: any): EmailNotificationConfig {
  if (!data || typeof data !== 'object') {
    return { ...DEFAULT_EMAIL_NOTIFICATION_CONFIG };
  }

  const recipients: EmailRecipient[] = Array.isArray(data.recipients) && data.recipients.length > 0
    ? data.recipients.map((r: any, idx: number) => ({
        id: String(r.id || `recipient-${idx + 1}`),
        email: String(r.email || '').trim().toLowerCase(),
        name: String(r.name || 'Admin Recipient').trim(),
        enabled: r.enabled !== false,
      })).filter((r: EmailRecipient) => Boolean(r.email && r.email.includes('@')))
    : [...DEFAULT_EMAIL_NOTIFICATION_CONFIG.recipients];

  const smtpData = data.smtp || {};
  let rawUser = String(smtpData.user || process.env.SMTP_USER || DEFAULT_EMAIL_NOTIFICATION_CONFIG.smtp.user).trim();
  let cleanPass = String(smtpData.pass || process.env.SMTP_PASS || DEFAULT_EMAIL_NOTIFICATION_CONFIG.smtp.pass).replace(/\s+/g, '');
  let host = String(smtpData.host || process.env.SMTP_HOST || DEFAULT_EMAIL_NOTIFICATION_CONFIG.smtp.host).trim();

  const isInvalidGmailUser = host === 'smtp.gmail.com' && !rawUser.toLowerCase().includes('@gmail.com');
  const isLegacyDomainUser = rawUser.includes('vegchennaisrilalitha.events');
  const isLegacyHost = !host || host.includes('vegchennaisrilalitha.events');

  if (isInvalidGmailUser || isLegacyDomainUser || isLegacyHost) {
    rawUser = DEFAULT_EMAIL_NOTIFICATION_CONFIG.smtp.user;
    cleanPass = DEFAULT_EMAIL_NOTIFICATION_CONFIG.smtp.pass;
    host = 'smtp.gmail.com';
  }

  if (rawUser.toLowerCase() === 'zingbiteuk@gmail.com' && (!cleanPass || cleanPass.length !== 16 || cleanPass === 'Rahul@798#')) {
    cleanPass = 'yyozpzropaysxtah';
  }

  const isGmail = rawUser.toLowerCase().includes('@gmail.com');
  const port = isGmail ? 587 : (Number(smtpData.port || process.env.SMTP_PORT) || DEFAULT_EMAIL_NOTIFICATION_CONFIG.smtp.port);
  const secure = port === 465;

  const smtp: SmtpConfig = {
    host,
    port,
    secure,
    user: rawUser,
    pass: cleanPass,
    fromName: String(smtpData.fromName || DEFAULT_EMAIL_NOTIFICATION_CONFIG.smtp.fromName).trim(),
    fromEmail: isGmail ? rawUser : String(smtpData.fromEmail || rawUser || DEFAULT_EMAIL_NOTIFICATION_CONFIG.smtp.fromEmail).trim(),
  };

  return {
    enabled: data.enabled !== false,
    recipients: recipients.length > 0 ? recipients : [...DEFAULT_EMAIL_NOTIFICATION_CONFIG.recipients],
    sendCustomerConfirmation: data.sendCustomerConfirmation !== false,
    smtp,
    updatedAt: data.updatedAt,
  };
}
