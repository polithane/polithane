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

  try {
    return await sendEmail({
      to: [{ email }],
      subject: '🔐 Şifre Sıfırlama - Polithane',
      html: passwordResetEmailTemplate(email, resetToken, frontendUrl),
    });
  } catch (error) {
    console.error('Password reset email gönderme hatası:', error);
    return { success: false, error: error.message };
  }
};
