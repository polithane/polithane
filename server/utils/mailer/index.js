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
  console.error('📬 sendEmail called with:', { to: to?.map(t => t.email), subject });
  
  const cfg = await getMailRuntimeConfig();
  console.error('⚙️ Mail config:', {
    enabled: cfg.enabled,
    provider: cfg.provider,
    senderEmail: cfg.senderEmail,
    senderName: cfg.senderName,
    hasApiKey: !!cfg.brevoApiKey
  });
  
  if (!cfg.enabled) {
    console.error('❌ Mail system disabled');
    return { success: false, error: 'Mail sistemi kapalı (mail_enabled=false).' };
  }
  if (cfg.provider !== 'brevo') {
    console.error('❌ Unsupported provider:', cfg.provider);
    return { success: false, error: `Desteklenmeyen provider: ${cfg.provider}` };
  }

  try {
    const result = await sendWithBrevo({
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
    console.error('✅ sendEmail SUCCESS:', result);
    return result;
  } catch (error) {
    console.error('❌ sendEmail FAILED:', error.message, error.stack);
    return { success: false, error: error.message };
  }
}

