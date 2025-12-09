# 📧 SendGrid Email Setup (Ücretsiz)

## ❌ Sorun: Railway Gmail SMTP'ye bağlanamıyor

Railway sunucuları Gmail SMTP portlarını blokluyor:
```
Error: Connection timeout (ETIMEDOUT)
```

---

## ✅ Çözüm: SendGrid (Önerilen)

**Avantajlar:**
- ✅ Ücretsiz 100 email/gün (yeterli)
- ✅ Railway ile çalışır
- ✅ Kurulum 5 dakika
- ✅ Güvenilir & hızlı

---

## 🚀 Kurulum (5 Dakika)

### 1. SendGrid Hesabı Oluştur

```
https://signup.sendgrid.com/

Email: polithanecom@gmail.com
Password: (güçlü şifre)
Free Plan: 100 emails/gün ✅
```

### 2. API Key Oluştur

```
SendGrid Dashboard → Settings → API Keys
→ Create API Key

Name: Polithane
Full Access: ✓

Kopyala: SG.xxxxxxxxxxxxxxxxxx (güvenli yerde sakla!)
```

### 3. Sender Identity Doğrula

```
Settings → Sender Authentication
→ Single Sender Verification

From Email: polithanecom@gmail.com
From Name: Polithane
Reply To: polithanecom@gmail.com

→ Verify
→ Email'inizde linke tıklayın ✅
```

### 4. Railway Environment Variables

```
Railway → polithane service → Variables

EMAIL_SERVICE = sendgrid
EMAIL_USER = apikey
EMAIL_PASSWORD = SG.xxxxxxxxxxxxxxxxxx (API Key)
EMAIL_FROM = Polithane <polithanecom@gmail.com>

Save → Auto deploy (2dk)
```

---

## 🧪 Test

Deploy bittikten sonra:
```
https://polithane.com/forgot-password
→ Email girin
→ Gönder
✅ 2-3 saniye içinde mail gelecek!
```

---

## 📊 SendGrid vs Gmail

| Özellik | Gmail SMTP | SendGrid |
|---------|-----------|----------|
| Railway Desteği | ❌ Timeout | ✅ Çalışır |
| Ücretsiz Limit | Sınırsız | 100/gün |
| Kurulum | Zor | Kolay |
| Hız | Yavaş | Hızlı |
| Güvenilirlik | Orta | Yüksek |

---

## 🔧 Backend Değişikliği (Otomatik)

Backend SendGrid'i otomatik destekliyor. Sadece environment variables'ları değiştirin:

```javascript
// emailService.js
if (process.env.EMAIL_SERVICE === 'sendgrid') {
  // SendGrid kullan
} else {
  // Gmail SMTP kullan
}
```

**Not:** Ben backend'i güncelleyeceğim, siz sadece SendGrid hesabı açın!

---

## 🆘 Alternatif: Resend.com

SendGrid'den memnun kalmazsanız:
- https://resend.com/
- Ücretsiz 100 email/gün
- Daha modern UI
- Aynı şekilde çalışır
