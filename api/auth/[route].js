import register from './_controllers/register.js';
import login from './_controllers/login.js';
import logout from './_controllers/logout.js';
import me from './_controllers/me.js';
import checkAvailability from './_controllers/checkAvailability.js';

export default async function handler(req, res) {
  const { route } = req.query;
  const endpoint = Array.isArray(route) ? route[0] : route;

  // CORS (Global for auth)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    switch (endpoint) {
      case 'register':
        return await register(req, res);
      case 'login':
        return await login(req, res);
      case 'logout':
        return await logout(req, res);
      case 'me':
        return await me(req, res);
      case 'check-availability':
        return await checkAvailability(req, res);
      default:
        return res.status(404).json({ error: 'Auth endpoint not found: ' + endpoint });
    }
  } catch (error) {
    console.error('Auth Gateway Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
