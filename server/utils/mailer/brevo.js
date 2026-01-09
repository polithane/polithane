const BREVO_API_BASE = 'https://api.brevo.com/v3';

export async function sendWithBrevo({
  apiKey,
  sender,
  replyTo,
  to,
  subject,
  html,
  text,
  headers,
  tags,
  params,
} = {}) {
  console.error('🔧 sendWithBrevo called');
  console.error('  - Has API Key:', !!apiKey, 'Length:', apiKey?.length);
  console.error('  - Sender:', sender);
  console.error('  - To:', to);
  console.error('  - Subject:', subject);
  console.error('  - Has HTML:', !!html);
  
  const fetchFn = globalThis.fetch;
  if (typeof fetchFn !== 'function') throw new Error('fetch() bulunamadı (Node 18+ gerekli).');
  if (!apiKey) throw new Error('Brevo API key eksik (BREVO_API_KEY veya mail_brevo_api_key).');
  if (!sender?.email) throw new Error('Gönderici email eksik (mail_sender_email).');
  if (!to || !Array.isArray(to) || to.length === 0) throw new Error('Alıcı listesi boş.');
  if (!subject) throw new Error('Konu boş olamaz.');
  if (!html && !text) throw new Error('İçerik boş olamaz (html veya text gerekli).');

  const payload = {
    sender: {
      name: sender?.name || 'Polithane',
      email: sender.email,
    },
    to: to.map((x) => ({ email: x.email, name: x.name || undefined })),
    subject,
    htmlContent: html || undefined,
    textContent: text || undefined,
    replyTo: replyTo?.email ? { email: replyTo.email, name: replyTo.name || undefined } : undefined,
    headers: headers && typeof headers === 'object' ? headers : undefined,
    tags: Array.isArray(tags) ? tags.filter(Boolean) : undefined,
    params: params && typeof params === 'object' ? params : undefined,
  };

  console.error('📤 Sending to Brevo API...');
  
  const r = await fetchFn(`${BREVO_API_BASE}/smtp/email`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  console.error('📥 Brevo response status:', r.status, r.statusText);

  const bodyText = await r.text().catch(() => '');
  let bodyJson = null;
  try {
    bodyJson = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    bodyJson = null;
  }

  console.error('📄 Brevo response body:', bodyJson || bodyText);

  if (!r.ok) {
    const msg =
      bodyJson?.message ||
      bodyJson?.error ||
      bodyText ||
      `Brevo API error (HTTP ${r.status})`;
    console.error('❌ Brevo API error:', msg);
    const e = new Error(msg);
    e.status = r.status;
    e.details = bodyJson || bodyText;
    throw e;
  }

  console.error('✅ Brevo email sent successfully. MessageId:', bodyJson?.messageId);

  return {
    success: true,
    provider: 'brevo',
    messageId: bodyJson?.messageId || null,
    raw: bodyJson,
  };
}

