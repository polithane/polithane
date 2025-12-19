import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { verificationEmailTemplate, welcomeEmailTemplate, passwordResetEmailTemplate } from './emailTemplates.js';

// Create SMTP transporter (Polithane mail server)
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'mail.polithane.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
  const secure = port === 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
  if (!user || !pass) {
    throw new Error('SMTP_USER/SMTP_PASS eksik. Lütfen .env dosyanızı kontrol edin.');
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    tls: { servername: host },
  });
};

// Generate verification token
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
export const sendVerificationEmail = async (email, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';

  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || `Polithane <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: '✅ Email Doğrulama - Polithane',
    html: verificationEmailTemplate(email, token, frontendUrl)
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Email gönderme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Send welcome email
export const sendWelcomeEmail = async (email, fullName) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';

  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || `Polithane <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎉 Hoş Geldiniz - Polithane',
    html: welcomeEmailTemplate(fullName, email, frontendUrl)
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Welcome email gönderme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';

  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || `Polithane <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Şifre Sıfırlama - Polithane',
    html: passwordResetEmailTemplate(email, resetToken, frontendUrl)
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Password reset email gönderme hatası:', error);
    return { success: false, error: error.message };
  }
};
