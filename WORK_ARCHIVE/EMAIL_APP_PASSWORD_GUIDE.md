# 📧 Gmail App Password Kurulum Rehberi

## ❌ Sorun: "Şifremi Unuttum" Email Gönderilemiyor

**Hata:** Email gönderilirken bir hata oluştu.

**Sebep:** Gmail artık normal şifrelerle uygulama erişimine izin vermiyor. **App Password** kullanmanız gerekiyor.

---

## ✅ Çözüm: Gmail App Password Oluştur

### Adım 1: Google Hesabınıza Gidin
1. https://myaccount.google.com/ adresine gidin
2. `polithanecom@gmail.com` ile giriş yapın

### Adım 2: 2-Step Verification Açın
1. Sol menüden **Security** seçin
2. **2-Step Verification** bulun
3. **GET STARTED** tıklayın
4. Telefon numarası ile doğrulama yapın
5. Aktif edin ✅

### Adım 3: App Password Oluşturun
1. Security sayfasına geri dönün
2. **App passwords** bulun (2-Step Verification'ın altında)
3. Tıklayın

### Adım 4: Polithane İçin Password Oluştur
1. **Select app** dropdown → **Mail** seçin
2. **Select device** dropdown → **Other (Custom name)** seçin
3. İsim olarak: `Polithane Backend` yazın
4. **GENERATE** tıklayın

### Adım 5: 16 Haneli Şifreyi Kopyalayın
```
örnek: abcd efgh ijkl mnop
```

**ÖNEMLİ:** Bu şifre sadece bir kez gösterilir! Hemen kopyalayın.

---

## 🔧 Backend'e Ekleyin

### Railway'de:
1. Railway Dashboard → Polithane Service
2. **Variables** sekmesi
3. `EMAIL_PASSWORD` değişkenini bulun
4. 16 haneli App Password'ü yapıştırın (boşluklarla birlikte)
5. **Deploy** → Otomatik yeniden başlar

### Lokal .env:
```bash
# /workspace/server/.env
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

---

## 🧪 Test Edin

1. Railway'de deploy tamamlansın (2dk)
2. https://polithane.com/forgot-password
3. Email adresinizi girin
4. ✅ "Email Gönderildi!" mesajını görmelisiniz
5. Mailinizi kontrol edin (spam'e de bakın)

---

## 📞 Hala Çalışmıyorsa

Railway Logs kontrol edin:
```
Railway Dashboard → Deployments → Latest → View Logs

Arayın:
"⚠️ Password reset email gönderme hatası"
"Email Error Details:"
```

Hata türleri:
- `Invalid login` → App Password yanlış girilmiş
- `Connection timeout` → Gmail engelliyor (nadir)
- `Authentication failed` → 2-Step Verification açılmamış

---

## 🔗 Faydalı Linkler

- [Gmail App Passwords](https://myaccount.google.com/apppasswords)
- [2-Step Verification](https://myaccount.google.com/signinoptions/two-step-verification)
- [Gmail Security Checkup](https://myaccount.google.com/security-checkup)

---

**Not:** App Password oluşturulduktan sonra Railway'de güncellemeniz yeterli. Kod değişikliği gerekmez.
