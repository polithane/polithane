import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import crypto from 'crypto';
import { verificationEmailTemplate, welcomeEmailTemplate, passwordResetEmailTemplate } from './emailTemplates.js';

// Initialize SendGrid
if (process.env.EMAIL_SERVICE === 'sendgrid' && process.env.EMAIL_PASSWORD) {
  sgMail.setApiKey(process.env.EMAIL_PASSWORD);
}

// Create email transporter (Gmail only)
const createTransporter = () => {
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
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';
  
  // SendGrid Web API (Railway ile çalışır)
  if (process.env.EMAIL_SERVICE === 'sendgrid') {
    try {
      await sgMail.send({
        to: email,
        from: {
          email: process.env.EMAIL_FROM || 'polithanecom@gmail.com',
          name: 'Polithane. Özgür, açık, şeffaf siyaset, bağımsız medya!'
        },
        subject: '✅ Email Doğrulama - Polithane.',
        html: verificationEmailTemplate(email, token, frontendUrl)
      });
      return { success: true };
    } catch (error) {
      console.error('SendGrid email hatası:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Gmail SMTP (fallback)
  const transporter = createTransporter();
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
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';
  
  // SendGrid Web API
  if (process.env.EMAIL_SERVICE === 'sendgrid') {
    try {
      await sgMail.send({
        to: email,
        from: {
          email: process.env.EMAIL_FROM || 'polithanecom@gmail.com',
          name: 'Polithane. Özgür, açık, şeffaf siyaset, bağımsız medya!'
        },
        subject: '🎉 Hoş Geldiniz - Polithane.',
        html: welcomeEmailTemplate(fullName, email, frontendUrl)
      });
      return { success: true };
    } catch (error) {
      console.error('SendGrid email hatası:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Gmail SMTP (fallback)
  const transporter = createTransporter();
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
  const frontendUrl = process.env.FRONTEND_URL || 'https://polithane.com';
  
  // SendGrid Web API (Railway SMTP portlarını blokluyor, Web API kullanmalıyız!)
  if (process.env.EMAIL_SERVICE === 'sendgrid') {
    try {
      await sgMail.send({
        to: email,
        from: {
          email: process.env.EMAIL_FROM || 'polithanecom@gmail.com',
          name: 'Polithane. Özgür, açık, şeffaf siyaset, bağımsız medya!'
        },
        subject: '🔐 Şifre Sıfırlama - Polithane.',
        html: passwordResetEmailTemplate(email, resetToken, frontendUrl)
      });
      return { success: true };
    } catch (error) {
      console.error('SendGrid email hatası:', error.response?.body || error);
      return { success: false, error: error.message };
    }
  }
  
  // Gmail SMTP (fallback)
  const transporter = createTransporter();
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
