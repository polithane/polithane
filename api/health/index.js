// Vercel Serverless Function - Health check for DB connectivity

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const status = {
    ok: false,
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceRoleKey: !!supabaseKey,
    canFetchParties: false,
    sampleParty: null,
    timestamp: new Date().toISOString(),
  };

  try {
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ ...status, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' });
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/parties?select=id,slug,short_name&is_active=eq.true&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const text = await response.text().catch(() => '');
    if (!response.ok) {
      return res.status(500).json({ ...status, error: `Supabase REST error: ${response.status} ${response.statusText}`, detail: text });
    }

    const data = text ? JSON.parse(text) : [];
    status.canFetchParties = true;
    status.sampleParty = data?.[0] || null;
    status.ok = true;
    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({ ...status, error: error.message });
  }
}

