export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ 
    status: 'ok', 
    message: 'API is working',
    time: new Date().toISOString(),
    env: {
        supabase: !!process.env.SUPABASE_URL
    }
  });
}
