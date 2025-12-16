import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 1. Env Var Check
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
    
    if (!dbUrl) {
      return res.status(500).json({ 
        success: false, 
        error: 'DATABASE_URL environment variable is MISSING in Vercel!' 
      });
    }

    // 2. Connection Check
    const sql = neon(dbUrl);
    const [result] = await sql`SELECT NOW() as current_time, version() as version`;

    res.json({
      success: true,
      message: 'Database connection SUCCESSFUL!',
      data: result,
      env_var_used: process.env.DATABASE_URL ? 'DATABASE_URL' : (process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'SUPABASE_DB_URL')
    });

  } catch (error) {
    console.error('DB Test Error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connection FAILED',
      details: error.message,
      hint: 'Check your Vercel Environment Variables and Database credentials.'
    });
  }
}
