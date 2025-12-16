import usersList from './_controllers/usersList.js';
import usersDetail from './_controllers/usersDetail.js';
import settings from './_controllers/settings.js';

export default async function handler(req, res) {
  const { route } = req.query;
  const endpoint = Array.isArray(route) ? route[0] : route;
  const subEndpoint = Array.isArray(route) && route.length > 1 ? route[1] : null;

  // CORS (Global for admin)
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
      case 'users':
        if (subEndpoint) {
          req.query.id = subEndpoint;
          return await usersDetail(req, res);
        }
        return await usersList(req, res);
      case 'settings':
        return await settings(req, res);
      default:
        return res.status(404).json({ error: 'Admin endpoint not found: ' + endpoint });
    }
  } catch (error) {
    console.error('Admin Gateway Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
