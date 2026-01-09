/**
 * =================================================
 * AVATAR PROXY MIDDLEWARE
 * =================================================
 * Encode edilmiş dosya adlarını decode eder
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const avatarProxy = (req, res, next) => {
  // Sadece /assets/profiles/politicians/ path'i için çalış
  if (!req.path.startsWith('/assets/profiles/politicians/')) {
    return next();
  }

  try {
    // URL-encoded dosya adını decode et
    const decodedPath = decodeURIComponent(req.path);
    const filePath = path.join(__dirname, '../../public', decodedPath);

    // Dosya var mı kontrol et
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }

    // Dosya yoksa 404
    return res.status(404).send('Avatar not found');
  } catch (error) {
    console.error('Avatar proxy error:', error);
    return res.status(500).send('Server error');
  }
};
