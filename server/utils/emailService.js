import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { verificationEmailTemplate, welcomeEmailTemplate, passwordResetEmailTemplate } from './emailTemplates.js';

// Create email transporter
const createTransporter = () => {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  
  // SendGrid (Önerilen - Railway ile çalışır)
  if (emailService === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey', // SendGrid için her zaman 'apikey'
        pass: process.env.EMAIL_PASSWORD // SendGrid API Key
      }
    });
  }
  
  // Gmail SMTP (Railway'de timeout sorunu olabilir)
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // SSL port
    secure: true, // SSL kullan
    auth: {
      user: process.env.EMAIL_USER || 'polithanecom@gmail.com',
      pass: process.env.EMAIL_PASSWORD
    },
    connectionTimeout: 10000, // 10 saniye timeout
    greetingTimeout: 5000,
    socketTimeout: 10000
  });
};

// Generate verification token
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
export const sendVerificationEmail = async (email, token) => {
  const transporter = createTransporter();
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Polithane <polithanecom@gmail.com>',
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
  const transporter = createTransporter();
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Polithane <polithanecom@gmail.com>',
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
  const transporter = createTransporter();
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Polithane <polithanecom@gmail.com>',
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
