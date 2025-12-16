// INLINE HELPER
async function supabaseRestGet(path, params) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase env missing');
  
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}${qs}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Supabase error: ${res.status} ${res.statusText} ${text}`);
  }
  return await res.json();
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization'
  );
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const parties = await supabaseRestGet('parties', {
        select: 'id,name,short_name,logo_url,color,seats',
        is_active: 'eq.true',
        order: 'follower_count.desc'
    });
    
    // Frontend expects { success: true, data: [...] } for parties?
    // Let's check HomePage.jsx: 
    // api.parties.getAll().catch(...)
    // src/utils/api.js: return await apiCall(...) -> returns data directly?
    // apiCall checks response.ok.
    // If backend returns array, data is array.
    // If backend returns { success: true, data: [...] }, data is object.
    
    // Original parties/index.js returned { success: true, data }.
    // Let's stick to that.
    
    res.json({ success: true, data: parties || [] });
  } catch (error) {
    console.error('Parties API error:', error);
    res.status(500).json({ success: false, error: 'Partiler yüklenemedi: ' + error.message });
  }
}
