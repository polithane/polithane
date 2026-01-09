// Vercel Serverless Function Entry Point
// Import Express app from _server directory (inside api for Vercel compatibility)

import app from './_server/index.js';

// Log for debugging in Vercel
console.log('🔍 api/index.js loaded, app type:', typeof app);

export default app;
