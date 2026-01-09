import crypto from 'crypto';
import { verificationEmailTemplate, welcomeEmailTemplate, passwordResetEmailTemplate } from './emailTemplates.js';
import { sendEmail } from './mailer/index.js';

// Generate verification token
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
export const sendVerificationEmail = async (email, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';

  try {
    return await sendEmail({
      to: [{ email }],
      subject: '✅ Email Doğrulama - Polithane',
      html: verificationEmailTemplate(email, token, frontendUrl),
    });
  } catch (error) {
    console.error('Email gönderme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email
export const sendWelcomeEmail = async (email, fullName) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';

  try {
    return await sendEmail({
      to: [{ email }],
      subject: '🎉 Hoş Geldiniz - Polithane',
      html: welcomeEmailTemplate(fullName, email, frontendUrl),
    });
  } catch (error) {
    console.error('Welcome email gönderme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';
  
  console.log('📧 sendPasswordResetEmail called with:');
  console.log('  - Email:', email);
  console.log('  - Token:', resetToken?.substring(0, 10) + '...');
  console.log('  - Frontend URL:', frontendUrl);

  try {
    const htmlContent = passwordResetEmailTemplate(email, resetToken, frontendUrl);
    console.log('📝 Template generated, length:', htmlContent?.length);
    
    const result = await sendEmail({
      to: [{ email }],
      subject: '🔐 Şifre Sıfırlama - Polithane',
      html: htmlContent,
    });
    
    console.log('📮 sendEmail result:', result);
    return result;
  } catch (error) {
    console.error('❌ Password reset email error:', error);
    return { success: false, error: error.message };
  }
};
