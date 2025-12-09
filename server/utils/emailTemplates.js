// Professional Email Templates for Polithane

export const emailStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: #f5f7fa;
    padding: 20px;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
  }
  .header {
    background: linear-gradient(135deg, #009FD6 0%, #0077B6 100%);
    padding: 40px 30px;
    text-align: center;
    color: white;
  }
  .header h1 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .header p {
    font-size: 14px;
    opacity: 0.9;
  }
  .content {
    padding: 40px 30px;
  }
  .content h2 {
    font-size: 22px;
    margin-bottom: 16px;
    color: #1a1a1a;
  }
  .content p {
    font-size: 15px;
    line-height: 1.6;
    color: #4a5568;
    margin-bottom: 12px;
  }
  .highlight-box {
    background: #f0f9ff;
    border-left: 4px solid #009FD6;
    padding: 16px 20px;
    margin: 24px 0;
    border-radius: 8px;
  }
  .highlight-box strong {
    color: #009FD6;
    font-size: 16px;
  }
  .button {
    display: inline-block;
    background: linear-gradient(135deg, #009FD6 0%, #0077B6 100%);
    color: white !important;
    padding: 16px 40px;
    text-decoration: none;
    border-radius: 50px;
    font-weight: 600;
    font-size: 16px;
    margin: 24px 0;
    box-shadow: 0 4px 15px rgba(0,159,214,0.3);
    transition: transform 0.2s;
  }
  .button:hover {
    transform: translateY(-2px);
  }
  .footer {
    background: #f8f9fa;
    padding: 24px 30px;
    text-align: center;
    border-top: 1px solid #e5e7eb;
  }
  .footer p {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 8px;
  }
  .footer a {
    color: #009FD6;
    text-decoration: none;
  }
  .social-links {
    margin-top: 16px;
  }
  .social-links a {
    display: inline-block;
    margin: 0 8px;
    color: #009FD6;
  }
`;

// Verification Email Template
export const verificationEmailTemplate = (email, token, frontendUrl) => {
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
  
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Doğrulama - Polithane</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Hoş Geldiniz!</h1>
          <p>Özgür, açık, şeffaf siyaset, bağımsız medya</p>
        </div>
        
        <div class="content">
          <h2>Email Adresinizi Doğrulayın</h2>
          <p>Merhaba,</p>
          <p>Polithane'ye hoş geldiniz! Hesabınızı aktifleştirmek için email adresinizi doğrulamanız gerekmektedir.</p>
          
          <div class="highlight-box">
            <p><strong>Email:</strong> ${email}</p>
          </div>
          
          <p style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}" class="button">Email Adresimi Doğrula</a>
          </p>
          
          <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
            Eğer bu isteği siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.
          </p>
          
          <p style="font-size: 13px; color: #6b7280; margin-top: 12px;">
            Link çalışmıyorsa, aşağıdaki adresi tarayıcınıza kopyalayın:<br>
            <span style="color: #009FD6; word-break: break-all;">${verificationUrl}</span>
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Polithane</strong> - Türkiye Siyasi Sosyal Medya</p>
          <p>
            <a href="${frontendUrl}">Ana Sayfa</a> | 
            <a href="${frontendUrl}/privacy">Gizlilik</a> | 
            <a href="${frontendUrl}/terms">Kullanım Koşulları</a>
          </p>
          <p style="margin-top: 12px; font-size: 12px;">
            Bu otomatik bir emaildir, lütfen yanıtlamayın.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Welcome Email Template
export const welcomeEmailTemplate = (fullName, email, frontendUrl) => {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hoş Geldiniz - Polithane</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎊 Hoş Geldiniz ${fullName}!</h1>
          <p>Polithane ailesine katıldığınız için teşekkür ederiz</p>
        </div>
        
        <div class="content">
          <h2>Hesabınız Başarıyla Oluşturuldu!</h2>
          <p>Merhaba <strong>${fullName}</strong>,</p>
          <p>Polithane'ye hoş geldiniz! Türkiye'nin özgür, açık ve şeffaf siyasi sosyal medya platformuna katıldınız.</p>
          
          <div class="highlight-box">
            <p><strong>Email Adresiniz:</strong> ${email}</p>
            <p style="margin-top: 8px; font-size: 14px; color: #4a5568;">
              Bu email adresiyle giriş yapabilirsiniz.
            </p>
          </div>
          
          <h3 style="font-size: 18px; margin: 24px 0 12px; color: #1a1a1a;">✨ Neler Yapabilirsiniz?</h3>
          <ul style="color: #4a5568; line-height: 1.8; margin-left: 20px;">
            <li>Siyasi içerikleri takip edin</li>
            <li>Gündemdeki konulara katılın</li>
            <li>Milletvekillerini ve parti yöneticilerini takip edin</li>
            <li>Yorumlarınızla tartışmalara katılın</li>
            <li>Polit Puan kazanın ve etkileşiminizi artırın</li>
          </ul>
          
          <p style="text-align: center; margin: 32px 0;">
            <a href="${frontendUrl}" class="button">Polithane'ye Giriş Yap</a>
          </p>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            <strong>Yardıma mı ihtiyacınız var?</strong><br>
            Sorularınız için bize her zaman ulaşabilirsiniz.
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Polithane</strong> - Özgür, açık, şeffaf siyaset, bağımsız medya</p>
          <p>
            <a href="${frontendUrl}">Ana Sayfa</a> | 
            <a href="${frontendUrl}/about">Hakkımızda</a> | 
            <a href="${frontendUrl}/help">Yardım</a>
          </p>
          <p style="margin-top: 12px; font-size: 12px;">
            © 2025 Polithane. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Password Reset Email Template
export const passwordResetEmailTemplate = (email, resetToken, frontendUrl) => {
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Şifre Sıfırlama - Polithane</title>
      <style>${emailStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Şifre Sıfırlama</h1>
          <p>Polithane Hesabı</p>
        </div>
        
        <div class="content">
          <h2>Şifrenizi Sıfırlayın</h2>
          <p>Merhaba,</p>
          <p>Polithane hesabınız için şifre sıfırlama talebi aldık.</p>
          
          <div class="highlight-box">
            <p><strong>Email:</strong> ${email}</p>
          </div>
          
          <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
          
          <p style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
          </p>
          
          <p style="font-size: 13px; color: #dc2626; background: #fef2f2; padding: 12px; border-radius: 8px; border-left: 4px solid #dc2626;">
            <strong>Güvenlik Uyarısı:</strong> Bu link 1 saat içinde geçerliliğini yitirecektir. Eğer bu talebi siz yapmadıysanız, lütfen bu emaili görmezden gelin ve şifrenizi değiştirin.
          </p>
          
          <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
            Link çalışmıyorsa:<br>
            <span style="color: #009FD6; word-break: break-all;">${resetUrl}</span>
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Polithane</strong> - Güvenli Platform</p>
          <p style="margin-top: 12px; font-size: 12px;">
            Bu otomatik bir emaildir, lütfen yanıtlamayın.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};
