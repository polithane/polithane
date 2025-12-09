import { createTransport } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log('📧 EMAIL TEST - Railway SMTP');
console.log('============================');
console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✓ Mevcut' : '✗ Eksik');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('');

async function testEmail() {
  try {
    console.log('🔧 Creating transporter...');
    const transporter = createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });
    
    console.log('✓ Transporter created');
    console.log('📤 Sending test email...');
    console.log('');
    
    const startTime = Date.now();
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: 'albayrak_yusuf@hotmail.com',
      subject: '🧪 Polithane Email Test - Railway',
      text: 'Bu bir test emailidir. Eğer bunu görüyorsanız, email sistemi çalışıyor!',
      html: '<h1>✅ Email Sistemi Çalışıyor!</h1><p>Bu bir test emailidir.</p>'
    });
    
    const endTime = Date.now();
    
    console.log('✅ EMAIL GÖNDERİLDİ!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('Süre:', endTime - startTime, 'ms');
    console.log('');
    console.log('🎉 GMAIL SMTP ÇALIŞIYOR!');
    
  } catch (error) {
    console.error('');
    console.error('❌ EMAIL HATASI!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('');
    
    if (error.code === 'ETIMEDOUT') {
      console.error('🔴 CONNECTION TIMEOUT!');
      console.error('Railway Gmail SMTP portlarını blokluyor.');
      console.error('');
      console.error('✅ ÇÖZÜM: SendGrid kullanın');
      console.error('https://signup.sendgrid.com/');
    } else if (error.code === 'EAUTH') {
      console.error('🔴 AUTHENTICATION HATASI!');
      console.error('Gmail App Password yanlış veya eksik.');
    } else if (error.message.includes('Invalid login')) {
      console.error('🔴 INVALID LOGIN!');
      console.error('Email veya şifre yanlış.');
    }
    
    process.exit(1);
  }
}

testEmail();
