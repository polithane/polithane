import posts from './_controllers/posts.js';
import parties from './_controllers/parties.js';
import usersList from './_controllers/users_legacy/index.js';
import usersDetail from './_controllers/users_legacy/[username].js';

export default async function handler(req, res) {
  const { route } = req.query;
  const endpoint = Array.isArray(route) ? route[0] : route;
  const subEndpoint = Array.isArray(route) && route.length > 1 ? route[1] : null;

  // CORS (Global for public)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, apikey, authorization'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    switch (endpoint) {
      case 'posts':
        return await posts(req, res);
      case 'parties':
        return await parties(req, res);
      case 'users':
        if (subEndpoint) {
            req.query.username = subEndpoint;
            return await usersDetail(req, res);
        }
        return await usersList(req, res);
      default:
        return res.status(404).json({ error: 'Public endpoint not found: ' + endpoint });
    }
  } catch (error) {
    console.error('Public Gateway Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
