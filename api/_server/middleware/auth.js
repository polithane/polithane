import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'polithane-super-secret-key-2024';
const JWT_EXPIRES_IN = '7d';

// JWT token oluştur
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      is_admin: user.is_admin || false
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// JWT token doğrula
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Authentication middleware
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token bulunamadı. Lütfen giriş yapın.' 
    });
  }

  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(403).json({ 
      success: false, 
      error: 'Geçersiz veya süresi dolmuş token.' 
    });
  }

  req.user = decoded;
  next();
}

// Admin middleware
export function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ 
      success: false, 
      error: 'Bu işlem için admin yetkisi gereklidir.' 
    });
  }
  next();
}

// Optional auth (kullanıcı varsa bilgilerini ekle, yoksa devam et)
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}
