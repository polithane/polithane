# UI/UX Tasarım Dokümantasyonu

## Tasarım Prensipleri

### 1. Renk Paleti

**Ana Renkler** (Nötr ve Parti Bağımsız):
- **Primary**: #1E40AF (Mavi - Güven ve profesyonellik)
- **Secondary**: #059669 (Yeşil - Büyüme ve ilerleme)
- **Accent**: #DC2626 (Kırmızı - Önemli uyarılar)
- **Neutral**: #6B7280 (Gri - Metin ve arka plan)

**Arka Plan Renkleri**:
- **Light Mode**: #FFFFFF (Ana), #F9FAFB (İkincil)
- **Dark Mode**: #111827 (Ana), #1F2937 (İkincil)

**Durum Renkleri**:
- **Success**: #10B981
- **Warning**: #F59E0B
- **Error**: #EF4444
- **Info**: #3B82F6

**Parti Renkleri** (Badge ve Etiketler için):
- CHP: #E30A17
- AKP: #FFC107
- MHP: #FF6B00
- İYİ Parti: #1E88E5
- HDP: #8B0000
- Diğer: #6B7280

### 2. Tipografi

**Font Ailesi**: Inter / Roboto (Türkçe karakter desteği)

**Font Boyutları**:
- **H1**: 32px / 2rem (Sayfa başlıkları)
- **H2**: 24px / 1.5rem (Bölüm başlıkları)
- **H3**: 20px / 1.25rem (Alt başlıklar)
- **Body**: 16px / 1rem (Ana metin)
- **Small**: 14px / 0.875rem (Yardımcı metin)
- **Caption**: 12px / 0.75rem (Etiketler)

**Font Ağırlıkları**:
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

### 3. Spacing Sistemi

8px grid sistemi:
- **xs**: 4px
- **sm**: 8px
- **md**: 16px
- **lg**: 24px
- **xl**: 32px
- **2xl**: 48px
- **3xl**: 64px

### 4. Border Radius

- **sm**: 4px
- **md**: 8px
- **lg**: 12px
- **xl**: 16px
- **full**: 9999px (Yuvarlak)

### 5. Shadow Sistemi

- **sm**: 0 1px 2px rgba(0,0,0,0.05)
- **md**: 0 4px 6px rgba(0,0,0,0.1)
- **lg**: 0 10px 15px rgba(0,0,0,0.1)
- **xl**: 0 20px 25px rgba(0,0,0,0.15)

## Bileşen Kütüphanesi

### 1. Butonlar

```tsx
// Primary Button
<Button variant="primary" size="md">
  Paylaş
</Button>

// Secondary Button
<Button variant="secondary" size="md">
  İptal
</Button>

// Outline Button
<Button variant="outline" size="md">
  Daha Fazla
</Button>

// Ghost Button
<Button variant="ghost" size="md">
  Beğen
</Button>
```

**Boyutlar**: `sm`, `md`, `lg`

### 2. Kartlar

#### Post Kartı

```tsx
<PostCard
  author={user}
  content={post.content}
  media={post.media}
  politPuan={post.politPuan}
  engagement={engagement}
  location={location}
  party={party}
  category={category}
  tensionLevel={tensionLevel}
  aiTone={aiTone}
/>
```

**Görsel Tasarım**:
```
┌─────────────────────────────────────┐
│ [Avatar] Kullanıcı Adı      [Menu] │
│         @username · 2h             │
│         [Rol Badge] [PolitPuan]    │
├─────────────────────────────────────┤
│ İçerik metni burada görünür...     │
│                                     │
│ [Medya: Fotoğraf/Video]            │
│                                     │
│ [Anket: Seçenekler]                │
├─────────────────────────────────────┤
│ 📍 İstanbul/Kadıköy                │
│ 🏛️ CHP  🎯 Ekonomi                 │
│ 🔥 Gerilim: Yüksek                 │
│ 🤖 AI Ton: Eleştirel               │
├─────────────────────────────────────┤
│ [Etkileşim Heatmap]                │
│ ❤️ 234  💬 45  🔄 12  👁️ 1.2K      │
│ PolitPuan: 456 ⭐                   │
└─────────────────────────────────────┘
```

#### Profil Kartı

```tsx
<ProfileCard
  user={user}
  showStats={true}
  showActions={true}
/>
```

### 3. Badge'ler

```tsx
// Rol Badge
<Badge variant="role" role={user.role}>
  Milletvekili
</Badge>

// PolitPuan Badge
<Badge variant="politpuan" score={1234}>
  ⭐ 1,234
</Badge>

// Parti Badge
<Badge variant="party" party={party}>
  CHP
</Badge>

// Durum Badge
<Badge variant="status" status="verified">
  ✓ Doğrulanmış
</Badge>
```

### 4. Input Alanları

```tsx
<Input
  label="Başlık"
  placeholder="Başlık girin..."
  error={error}
  helperText="Yardımcı metin"
/>

<Textarea
  label="İçerik"
  placeholder="İçeriğinizi yazın..."
  rows={6}
/>

<Select
  label="Kategori"
  options={categories}
  value={selectedCategory}
/>
```

### 5. Modal/Dialog

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Başlık"
  size="md" // sm, md, lg, xl
>
  {/* İçerik */}
</Modal>
```

### 6. Tab Navigation

```tsx
<Tabs>
  <Tab label="İçerikler" value="posts">
    {/* İçerik */}
  </Tab>
  <Tab label="Beğeniler" value="likes">
    {/* İçerik */}
  </Tab>
  <Tab label="Medya" value="media">
    {/* İçerik */}
  </Tab>
</Tabs>
```

### 7. PolitPuan Göstergesi

```tsx
<PolitPuanIndicator
  score={1234}
  trend="up" // up, down, stable
  showHistory={true}
/>
```

**Görsel Tasarım**:
```
┌─────────────────────────┐
│ PolitPuan               │
│ ⭐ 1,234                │
│ ↗ +45 (3.8%)           │
│                         │
│ [Mini Grafik]           │
└─────────────────────────┘
```

### 8. Harita Bileşeni

```tsx
<OrganizationMap
  level="city" // city, district, neighborhood
  partyFilter={partyId}
  showIndicators={true}
  onClickLocation={handleClick}
/>
```

**Görsel Özellikler**:
- İnteraktif zoom
- Isı haritası overlay
- Marker'lar (İl Başkanı, Vekil, vb.)
- Tooltip'ler
- Animasyonlar

### 9. Analitik Dashboard

```tsx
<AnalyticsDashboard
  userId={userId}
  period="monthly"
  metrics={['politpuan', 'engagement', 'reach']}
/>
```

**Grafik Bileşenleri**:
- Line Chart (Trend)
- Bar Chart (Karşılaştırma)
- Pie Chart (Dağılım)
- Heatmap (Zaman/Coğrafya)

### 10. Feed Bileşeni

```tsx
<Feed
  type="general" // general, party, local, following, trending
  filters={filters}
  onLoadMore={handleLoadMore}
/>
```

## Sayfa Düzenleri

### 1. Ana Layout

```
┌─────────────────────────────────────┐
│ [Logo] Platform    [Search] [User] │ ← Header (Fixed)
├─────────────────────────────────────┤
│                                     │
│ ┌──────┐  ┌──────────────────────┐ │
│ │      │  │                      │ │
│ │ Side │  │   Main Content      │ │
│ │ Nav  │  │   (Feed/Profile)    │ │
│ │      │  │                      │ │
│ │      │  │                      │ │
│ └──────┘  └──────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

### 2. Mobil Layout

```
┌─────────────────────┐
│ [Logo] [Search] [☰] │ ← Header
├─────────────────────┤
│                     │
│   Main Content      │
│   (Feed/Profile)    │
│                     │
│                     │
├─────────────────────┤
│ [🏠][🗺️][📰][👤]   │ ← Bottom Nav
└─────────────────────┘
```

## Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px
- **Large Desktop**: > 1280px

## Erişilebilirlik (A11y)

### WCAG 2.1 AA Uyumluluğu

- **Renk Kontrastı**: Minimum 4.5:1
- **Klavye Navigasyonu**: Tüm öğeler erişilebilir
- **Screen Reader**: ARIA etiketleri
- **Focus States**: Görünür focus göstergeleri
- **Alt Text**: Tüm görseller için

### Klavye Kısayolları

- `j/k`: Feed'de yukarı/aşağı
- `l`: Beğen
- `c`: Yorum yap
- `s`: Paylaş
- `n`: Yeni post
- `?`: Yardım menüsü

## Animasyonlar

### Geçiş Animasyonları

- **Fade**: 200ms ease-in-out
- **Slide**: 300ms ease-out
- **Scale**: 200ms ease-out

### Mikro Etkileşimler

- Buton hover: Scale 1.05
- Kart hover: Shadow artışı
- Like animasyonu: Heart pulse
- Yeni içerik: Slide-in animation

## Dark Mode

Tüm bileşenler dark mode destekler:

```tsx
<ThemeProvider theme={darkTheme}>
  {/* Uygulama */}
</ThemeProvider>
```

**Renk Değişiklikleri**:
- Arka plan: Beyaz → Koyu gri
- Metin: Siyah → Açık gri
- Kartlar: Beyaz → Koyu gri
- Border'lar: Açık gri → Koyu gri

## İkon Seti

**Kütüphane**: Heroicons / Lucide Icons

**Kullanılan İkonlar**:
- 🏠 Home
- 🗺️ Map
- 📰 News
- 📅 Agenda
- 🏛️ Parliament
- 👥 Users
- 📊 Analytics
- ⚙️ Settings
- ❤️ Like
- 💬 Comment
- 🔄 Share
- ⭐ Star (PolitPuan)
- 🔥 Fire (Trend)
- 📍 Location
- 🏛️ Party
- ✅ Verified

## Loading States

### Skeleton Loaders

```tsx
<PostCardSkeleton />
<ProfileCardSkeleton />
<FeedSkeleton />
```

### Spinner

```tsx
<Spinner size="sm" | "md" | "lg" />
```

## Error States

### Empty States

```tsx
<EmptyState
  icon={<Icon />}
  title="İçerik bulunamadı"
  description="Henüz paylaşım yapılmamış"
  action={<Button>İlk Paylaşımı Yap</Button>}
/>
```

### Error Messages

```tsx
<ErrorMessage
  title="Bir hata oluştu"
  message="Lütfen tekrar deneyin"
  retry={handleRetry}
/>
```

## Form Validasyonu

- Real-time validation
- Error mesajları
- Success göstergeleri
- Required field işaretleri

## Performans Optimizasyonları

- **Lazy Loading**: Görüntüler ve bileşenler
- **Virtual Scrolling**: Uzun listeler için
- **Code Splitting**: Route bazlı
- **Image Optimization**: WebP format, responsive sizes
- **Memoization**: React.memo, useMemo, useCallback
