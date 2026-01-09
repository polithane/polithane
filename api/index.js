/**
 * Vercel Serverless Function Entry Point
 * 
 * NOTE: Specific endpoints like /api/auth/forgot-password.js 
 * are handled by their own serverless functions.
 * 
 * This file is a fallback for routes not handled elsewhere.
 */

export default async function handler(req, res) {
  // Set CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  console.log('⚠️ /api/index.js fallback hit:', req.url);
  
  // This should not be hit if routes are properly configured
  return res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    note: 'Specific endpoints have their own handlers',
    url: req.url,
  });
}
