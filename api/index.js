import posts from './_endpoints/posts.js';
import parties from './_endpoints/parties.js';
import health from './_endpoints/health.js';
import testSupabase from './_endpoints/test-supabase.js';
import authRouter from './_endpoints/auth/[route].js';
import adminRouter from './_endpoints/admin/[route].js';
import usersList from './_endpoints/users/index.js';
import usersDetail from './_endpoints/users/[username].js';

export default async function handler(req, res) {
  // Normalize path
  const url = req.url.split('?')[0];
  
  // CORS (Global fallback)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (url === '/api/posts' || url === '/api/posts/') return await posts(req, res);
    if (url === '/api/parties' || url === '/api/parties/') return await parties(req, res);
    if (url === '/api/health' || url === '/api/health/') return await health(req, res);
    if (url === '/api/test-supabase') return await testSupabase(req, res);
    
    if (url === '/api/users' || url === '/api/users/') return await usersList(req, res);
    
    if (url.startsWith('/api/users/')) {
        const username = url.split('/api/users/')[1];
        if (username) {
            req.query.username = username;
            return await usersDetail(req, res);
        }
    }

    if (url.startsWith('/api/auth/')) {
        const routePart = url.split('/api/auth/')[1];
        // Remove trailing slash
        const cleanRoute = routePart.replace(/\/$/, '');
        req.query.route = cleanRoute;
        return await authRouter(req, res);
    }

    if (url.startsWith('/api/admin/')) {
        const routePart = url.split('/api/admin/')[1];
        const cleanRoute = routePart.replace(/\/$/, '');
        // Admin router expects array for sub-routes
        req.query.route = cleanRoute.split('/');
        return await adminRouter(req, res);
    }

    return res.status(404).json({ error: 'Endpoint not found', path: url });

  } catch (error) {
    console.error('Dispatcher Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
