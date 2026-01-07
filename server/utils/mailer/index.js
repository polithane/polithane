import { getMailRuntimeConfig } from '../mailSettings.js';
import { sendWithBrevo } from './brevo.js';

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  headers,
  tags,
  params,
} = {}) {
  const cfg = await getMailRuntimeConfig();
  if (!cfg.enabled) {
    return { success: false, error: 'Mail sistemi kapalı (mail_enabled=false).' };
  }
  if (cfg.provider !== 'brevo') {
    return { success: false, error: `Desteklenmeyen provider: ${cfg.provider}` };
  }

  return await sendWithBrevo({
    apiKey: cfg.brevoApiKey,
    sender: { email: cfg.senderEmail, name: cfg.senderName },
    replyTo: replyTo?.email ? replyTo : cfg.replyToEmail ? { email: cfg.replyToEmail, name: cfg.replyToName } : undefined,
    to: Array.isArray(to) ? to : [],
    subject,
    html,
    text,
    headers,
    tags,
    params,
  });
}

