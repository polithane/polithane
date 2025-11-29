import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email transporter configuration
const createTransporter = () => {
  // Gmail SMTP configuration (production'da değiştirilmeli)
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'noreply@polithane.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
  });
};

// Generate verification token
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
export const sendVerificationEmail = async (email, username, token) => {
  const transporter = createTransporter();
  
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Doğrulama - Polithane</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header {
          background: linear-gradient(135deg, #009FD6 0%, #0077B6 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        .header img {
          width: 80px;
          height: 80px;
          margin-bottom: 20px;
        }
        .header h1 {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 10px;
        }
        .header p {
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 50px 40px;
          color: #333;
        }
        .content h2 {
          font-size: 24px;
          margin-bottom: 20px;
          color: #009FD6;
        }
        .content p {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 15px;
          color: #555;
        }
        .username-box {
          background: #f8f9fa;
          border-left: 4px solid #009FD6;
          padding: 15px 20px;
          margin: 25px 0;
          border-radius: 8px;
        }
        .username-box strong {
          color: #009FD6;
          font-size: 18px;
        }
        .button-container {
          text-align: center;
          margin: 40px 0;
        }
        .verify-button {
          display: inline-block;
          background: linear-gradient(135deg, #009FD6 0%, #0077B6 100%);
          color: white !important;
          text-decoration: none;
          padding: 18px 50px;
          border-radius: 50px;
          font-size: 18px;
          font-weight: 700;
          box-shadow: 0 10px 30px rgba(0, 159, 214, 0.4);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .verify-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(0, 159, 214, 0.5);
        }
        .divider {
          height: 1px;
          background: linear-gradient(to right, transparent, #ddd, transparent);
          margin: 30px 0;
        }
        .footer {
          background: #f8f9fa;
          padding: 30px 40px;
          text-align: center;
          color: #777;
          font-size: 14px;
          border-top: 1px solid #eee;
        }
        .footer p {
          margin-bottom: 10px;
        }
        .footer a {
          color: #009FD6;
          text-decoration: none;
        }
        .social-links {
          margin-top: 20px;
        }
        .social-links a {
          display: inline-block;
          margin: 0 10px;
          color: #009FD6;
          font-size: 24px;
        }
        .warning-box {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px 20px;
          margin: 25px 0;
          border-radius: 8px;
          font-size: 14px;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>🎊 Hoş Geldiniz!</h1>
          <p>Polithane ailesine katıldığınız için teşekkür ederiz</p>
        </div>
        
        <!-- Content -->
        <div class="content">
          <h2>Merhaba ${username}! 👋</h2>
          
          <p>
            Polithane'e kayıt olduğunuz için çok mutluyuz! Türkiye siyasetinin dijital meydanında yerinizi almak için sadece bir adım kaldı.
          </p>
          
          <div class="username-box">
            <p style="margin: 0;">Kullanıcı Adınız: <strong>${username}</strong></p>
          </div>
          
          <p>
            Email adresinizi doğrulamak için lütfen aşağıdaki butona tıklayın:
          </p>
          
          <div class="button-container">
            <a href="${verificationUrl}" class="verify-button">
              ✉️ Email Adresimi Doğrula
            </a>
          </div>
          
          <div class="divider"></div>
          
          <p style="font-size: 14px; color: #777;">
            Buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırabilirsiniz:
          </p>
          <p style="font-size: 12px; word-break: break-all; color: #009FD6; background: #f8f9fa; padding: 10px; border-radius: 5px;">
            ${verificationUrl}
          </p>
          
          <div class="warning-box">
            <strong>⚠️ Güvenlik Uyarısı:</strong><br>
            Bu email'i siz talep etmediyseniz, lütfen görmezden gelin. Hesap oluşturulmayacaktır.
          </div>
          
          <p style="margin-top: 30px;">
            <strong>Polithane'de neler yapabilirsiniz?</strong>
          </p>
          <ul style="line-height: 2; color: #555; margin-left: 20px;">
            <li>🗣️ Siyasi görüşlerinizi özgürce paylaşın</li>
            <li>👥 Milletvekillerini ve siyasetçileri takip edin</li>
            <li>💬 Siyasi gündem hakkında tartışın</li>
            <li>📊 Meclis faaliyetlerini takip edin</li>
            <li>🎯 Bağımsız ve şeffaf bir platform deneyimi yaşayın</li>
          </ul>
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <p>
            <strong>Polithane</strong><br>
            Özgür, açık, şeffaf siyaset, bağımsız medya.
          </p>
          <p>
            Bu email otomatik olarak gönderilmiştir. Lütfen yanıtlamayın.
          </p>
          <p style="margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">www.polithane.com</a> |
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/privacy">Gizlilik Politikası</a> |
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/terms">Kullanım Koşulları</a>
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 20px;">
            © 2024 Polithane. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const mailOptions = {
    from: {
      name: 'Polithane',
      address: process.env.EMAIL_USER || 'noreply@polithane.com'
    },
    to: email,
    subject: '🎊 Polithane - Email Adresinizi Doğrulayın',
    html: htmlTemplate,
    text: `Merhaba ${username}!\n\nPolithane'e hoş geldiniz! Email adresinizi doğrulamak için lütfen aşağıdaki linke tıklayın:\n\n${verificationUrl}\n\nTeşekkürler,\nPolithane Ekibi`
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Email send error:', error);
    return false;
  }
};

// Send welcome email after verification
export const sendWelcomeEmail = async (email, username) => {
  const transporter = createTransporter();
  
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #009FD6, #0077B6); padding: 40px; text-align: center; color: white; }
        .content { padding: 40px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #777; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Hesabınız Aktif!</h1>
        </div>
        <div class="content">
          <h2>Merhaba ${username}!</h2>
          <p>Email adresiniz başarıyla doğrulandı. Artık Polithane'nin tüm özelliklerinden yararlanabilirsiniz!</p>
          <p><strong>Şimdi neler yapabilirsiniz?</strong></p>
          <ul>
            <li>Profilinizi tamamlayın</li>
            <li>İlk gönderinizi paylaşın</li>
            <li>Diğer kullanıcıları takip edin</li>
            <li>Siyasi gündem tartışmalarına katılın</li>
          </ul>
          <p style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="display: inline-block; background: #009FD6; color: white; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-weight: bold;">
              🚀 Polithane'ye Giriş Yap
            </a>
          </p>
        </div>
        <div class="footer">
          <p>Polithane - Özgür, açık, şeffaf siyaset, bağımsız medya.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const mailOptions = {
    from: { name: 'Polithane', address: process.env.EMAIL_USER || 'noreply@polithane.com' },
    to: email,
    subject: '🎉 Hesabınız Aktif - Polithane',
    html: htmlTemplate
  };
  
  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Welcome email error:', error);
    return false;
  }
};
