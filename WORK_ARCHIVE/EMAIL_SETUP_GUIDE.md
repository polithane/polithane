# 📧 Email Doğrulama Sistemi - Kurulum Rehberi

## 🔴 ÖNEMLİ: Email Servisi Şu Anda KAPALI

Email doğrulama sistemi kodda mevcut ama **email servisi yapılandırılmadığı için devre dışı**.

**Şu anki durum:**
- ✅ Yeni kullanıcılar kayıt olabiliyor
- ✅ Tüm kullanıcılar otomatik `email_verified = TRUE`
- ❌ Email gönderimi çalışmıyor
- ❌ Doğrulama email'i gönderilmiyor

---

## 🚀 Email Sistemini Aktif Etmek İsterseniz

### Adım 1: Gmail App Password Oluşturun

1. Google hesabınıza gidin: https://myaccount.google.com
2. **Security** → **2-Step Verification** (Aktif edin)
3. **Security** → **App passwords** (Uygulama şifreleri)
4. **Select app** → "Mail" seçin
5. **Select device** → "Other" seçin, "Polithane" yazın
6. **Generate** → 16 haneli şifre oluşturulacak
7. Bu şifreyi kopyalayın (örn: `abcd efgh ijkl mnop`)

### Adım 2: Environment Variables Ekleyin

`server/.env` dosyasına ekleyin:

```env
# Email Configuration
EMAIL_USER=sizin-gmail@gmail.com
EMAIL_PASSWORD=abcd-efgh-ijkl-mnop
FRONTEND_URL=http://localhost:5173
```

### Adım 3: Kodu Aktif Edin

**server/routes/auth.js** dosyasında:

```javascript
// ŞU SATIRI AKTİF EDİN:
import { generateVerificationToken, sendVerificationEmail, sendWelcomeEmail } from '../utils/emailService.js';

// Ve register endpoint'inde:

// Email doğrulama token'ı oluştur
const verificationToken = generateVerificationToken();
const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat
const emailVerified = false; // Değiştir

// INSERT query'de:
email_verified = FALSE,
verification_token = ${verificationToken},
verification_token_expires = ${tokenExpires}

// Kayıt sonrası email gönder:
try {
  await sendVerificationEmail(email, username, verificationToken);
  console.log(`✅ Verification email sent to ${email}`);
} catch (emailError) {
  console.error('⚠️ Email send failed:', emailError);
}
```

---

## 🧪 Test Etme

### Backend'i yeniden başlatın:
```bash
cd server
npm run dev
```

### Kayıt olun:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "123456",
    "full_name": "Test User"
  }'
```

### Email'i kontrol edin:
- Gmail'e gelen email'i açın
- "Email Adresimi Doğrula" butonuna tıklayın
- Hesabınız aktif olacak

---

## 🎯 Mevcut Durum (Email Kapalı)

```javascript
// Kayıt işlemi
const emailVerified = true;  // Otomatik verified
const verificationToken = null;
const tokenExpires = null;

// Kullanıcı hemen giriş yapabilir
// Email doğrulaması beklemiyor
```

---

## ⚠️ Dikkat Edilecekler

### Gmail Limitleri:
- **Günlük limit:** 500 email/gün
- **Dakika limiti:** 100 email/dakika

### Alternatif Email Servisleri:
1. **SendGrid** (Ücretli/Ücretsiz plan)
2. **AWS SES** (Çok ucuz)
3. **Mailgun** (Ücretsiz 5000 email/ay)
4. **Resend** (Modern, güzel API)

### SendGrid Örneği:
```javascript
// server/utils/emailService.js

import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendVerificationEmail = async (email, username, token) => {
  const msg = {
    to: email,
    from: 'noreply@polithane.com',
    subject: 'Email Doğrulama - Polithane',
    html: htmlTemplate,
  };
  
  await sgMail.send(msg);
};
```

---

## 📊 Veritabanı Tablosu

Email doğrulama için gerekli kolonlar zaten var:

```sql
users TABLE:
- email_verified (BOOLEAN)
- verification_token (VARCHAR)
- verification_token_expires (TIMESTAMP)
- verified_at (TIMESTAMP)
```

---

## 🎉 Özet

### Şimdi (Email Kapalı):
- ✅ Kayıt çalışıyor
- ✅ Kullanıcılar otomatik verified
- ❌ Email gönderilmiyor

### Email Aktif Etmek İçin:
1. Gmail App Password oluştur
2. .env'e ekle
3. Kodu aktif et
4. Backend'i yeniden başlat

**İleride kullanıcı sayısı artınca SendGrid gibi profesyonel servis önerilir!**
