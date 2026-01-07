import { useEffect, useMemo, useState } from 'react';
import { Save, RotateCcw, Eye, Download, Upload } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiCall } from '../../utils/api';

export const ThemeEditor = () => {
  const { theme, updateTheme, resetTheme } = useTheme();

  const inferredFont = useMemo(() => {
    const ff = String(theme?.fontFamily || '').trim();
    if (!ff) return 'Inter';
    const first = ff.split(',')[0]?.trim()?.replace(/^["']|["']$/g, '');
    return first || 'Inter';
  }, [theme?.fontFamily]);
  
  const [colors, setColors] = useState({
    primary: theme.primaryColor || '#009FD6',
    secondary: theme.secondaryColor || '#10b981',
    accent: theme.accentColor || '#f59e0b',
    danger: theme.dangerColor || '#ef4444',
  });
  
  const [fonts, setFonts] = useState({
    heading: inferredFont,
    body: inferredFont,
  });

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [schemaSql, setSchemaSql] = useState('');

  const defaultWelcomeHtml = useMemo(
    () =>
      `
<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.75; color:#0f172a;">
  <div style="display:flex;align-items:center;gap:12px;">
    <div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#009fd6,#2563eb);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:26px;">P</div>
    <div>
      <div style="font-size:22px;font-weight:900;">Polithane’ye hoş geldin!</div>
      <div style="color:#475569;">Özgür • açık • şeffaf siyaset • bağımsız medya</div>
    </div>
  </div>
  <div style="margin-top:18px;padding:14px 16px;border:1px solid #e2e8f0;border-radius:16px;background:linear-gradient(180deg,#eff6ff,#ffffff);">
    <div style="font-weight:900;color:#0b3b5a;">🎉 Sıcak bir karşılama</div>
    <div style="margin-top:8px;color:#334155;">
      Burada amaç “çok konuşmak” değil; <strong>daha iyi konuşmak</strong>. Saygılı tartışma, doğrulanabilir bilgi,
      şeffaf süreçler ve katılımcı demokrasi için bir aradayız.
    </div>
  </div>
  <div style="margin-top:18px;display:grid;grid-template-columns:1fr;gap:12px;">
    <div style="padding:16px;border-radius:16px;border:1px solid #e2e8f0;background:#fff;">
      <div style="font-weight:900;">🧭 Biz kimiz?</div>
      <div style="margin-top:8px;color:#334155;">
        Polithane, Türkiye’nin siyaset gündemini <strong>bağımsız</strong> ve <strong>şeffaf</strong> bir şekilde takip edebileceğin,
        fikir üretebileceğin ve sesini duyurabileceğin bir sosyal platformdur.
      </div>
    </div>
    <div style="padding:16px;border-radius:16px;border:1px solid #e2e8f0;background:#fff;">
      <div style="font-weight:900;">🎯 Amacımız</div>
      <div style="margin-top:8px;color:#334155;">
        Siyaseti; kutuplaşmadan, hakaretten ve bilgi kirliliğinden arındırıp, <strong>veri</strong>, <strong>kaynak</strong> ve
        <strong>akıl yürütme</strong> üzerinden konuşulur hale getirmek.
      </div>
    </div>
    <div style="padding:16px;border-radius:16px;border:1px solid #e2e8f0;background:#fff;">
      <div style="font-weight:900;">🚀 Misyonumuz</div>
      <ul style="margin:10px 0 0 18px;color:#334155;">
        <li>Doğru bilgiyi görünür kılmak, yanlış bilgiyi azaltmak</li>
        <li>Vatandaş ile temsilcileri aynı zeminde buluşturmak</li>
        <li>Sağlıklı tartışma kültürünü büyütmek</li>
      </ul>
    </div>
    <div style="padding:16px;border-radius:16px;border:1px solid #e2e8f0;background:#fff;">
      <div style="font-weight:900;">🌈 Vizyonumuz</div>
      <div style="margin-top:8px;color:#334155;">
        Türkiye’de politik katılımın dijital alanda <strong>daha adil</strong>, <strong>daha kapsayıcı</strong> ve <strong>daha şeffaf</strong>
        bir standartla mümkün olmasını sağlamak.
      </div>
    </div>
  </div>
  <div style="margin-top:18px;padding:16px;border-radius:16px;border:1px dashed #93c5fd;background:#eff6ff;">
    <div style="font-weight:900;color:#1d4ed8;">✨ Küçük öneri</div>
    <div style="margin-top:8px;color:#1f2937;">
      Profilini tamamladığında deneyimin güçlenir: daha doğru öneriler, daha iyi görünürlük ve daha güvenilir etkileşim.
    </div>
  </div>
</div>
      `.trim(),
    []
  );

  const [branding, setBranding] = useState({
    logo_header_url: '',
    logo_footer_url: '',
    logo_auth_url: '',
    logo_admin_top_url: '',
    logo_admin_bottom_url: '',
  });
  const [welcomeHtml, setWelcomeHtml] = useState('');
  const [uploadingKey, setUploadingKey] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await apiCall('/api/settings', { method: 'GET' }).catch(() => null);
        if (!mounted) return;
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        const d = r?.data && typeof r.data === 'object' ? r.data : {};
        setBranding({
          logo_header_url: String(d.logo_header_url || '').trim(),
          logo_footer_url: String(d.logo_footer_url || '').trim(),
          logo_auth_url: String(d.logo_auth_url || '').trim(),
          logo_admin_top_url: String(d.logo_admin_top_url || '').trim(),
          logo_admin_bottom_url: String(d.logo_admin_bottom_url || '').trim(),
        });
        const wh = String(d.welcome_page_html || '').trim();
        setWelcomeHtml(wh || defaultWelcomeHtml);
      } catch {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleColorChange = (key, value) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const getColorName = (key) => {
    const map = {
      primary: 'Ana',
      secondary: 'İkincil',
      accent: 'Vurgu',
      danger: 'Uyarı',
    };
    return map[key] || key;
  };

  const persistToDb = async (nextTheme, nextFonts) => {
    const payload = {
      theme_primary_color: nextTheme.primaryColor,
      theme_secondary_color: nextTheme.secondaryColor,
      theme_accent_color: nextTheme.accentColor,
      theme_danger_color: nextTheme.dangerColor,
      theme_font_family: nextTheme.fontFamily,
      theme_font_heading: nextFonts.heading,
      theme_font_body: nextFonts.body,
      // Branding + welcome page
      ...branding,
      welcome_page_html: String(welcomeHtml || ''),
    };
    return await apiCall('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
  };

  const handleSave = async () => {
    const nextTheme = {
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      accentColor: colors.accent,
      dangerColor: colors.danger,
      fontFamily: `${fonts.body}, system-ui, sans-serif`,
    };

    // Apply immediately for preview.
    updateTheme(nextTheme);

    setSaving(true);
    setSaveMessage('');
    try {
      const r = await persistToDb(nextTheme, fonts);
      if (r?.success) {
        setSaveMessage('✅ Tema kaydedildi!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        setSaveMessage(`❌ ${r?.error || 'Kaydetme başarısız'}`);
      }
    } catch (e) {
      setSaveMessage(`❌ ${String(e?.message || 'Bir hata oluştu')}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const defaultColors = {
      primary: '#009FD6',
      secondary: '#10b981',
      accent: '#f59e0b',
      danger: '#ef4444',
    };
    const defaultFonts = { heading: 'Inter', body: 'Inter' };
    setColors(defaultColors);
    setFonts(defaultFonts);

    const nextTheme = {
      primaryColor: defaultColors.primary,
      secondaryColor: defaultColors.secondary,
      accentColor: defaultColors.accent,
      dangerColor: defaultColors.danger,
      fontFamily: 'Inter, system-ui, sans-serif',
    };
    updateTheme(nextTheme);
    resetTheme();

    setSaving(true);
    setSaveMessage('');
    try {
      const r = await persistToDb(nextTheme, defaultFonts);
      if (r?.success) {
        setSaveMessage('✅ Tema varsayılana döndürüldü.');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        setSaveMessage(`❌ ${r?.error || 'Kaydetme başarısız'}`);
      }
    } catch (e) {
      setSaveMessage(`❌ ${String(e?.message || 'Bir hata oluştu')}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Tasarım & Tema Editörü</h1>
          <p className="text-gray-600">Sitenin görünümünü özelleştirin</p>
        </div>
        
        <div className="flex gap-3">
          {saveMessage && (
            <span className={`self-center text-sm font-medium ${saveMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-6 h-6 sm:w-5 sm:h-5" />
            Sıfırla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-6 h-6 sm:w-5 sm:h-5" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>

      {schemaSql ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="font-black">DB tablosu eksik: `site_settings`</div>
          <div className="text-sm mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Color Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Renk Paleti</h3>
            
            <div className="grid grid-cols-2 gap-6">
              {Object.entries(colors).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    {getColorName(key)} Rengi
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-300"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                      placeholder="#009FD6"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Typography */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Tipografi</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Başlık Fontu</label>
                <select value={fonts.heading} onChange={(e) => setFonts(prev => ({ ...prev, heading: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option value="Inter">Inter</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Montserrat">Montserrat</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gövde Fontu</label>
                <select value={fonts.body} onChange={(e) => setFonts(prev => ({ ...prev, body: e.target.value }))} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option value="Inter">Inter</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Roboto">Roboto</option>
                </select>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Logo Ayarları</h3>
            <div className="text-sm text-gray-600 mb-4">
              Sol üst, sol alt ve giriş ekranları için ayrı logolar tanımlayabilirsiniz. URL yapıştırabilir veya dosya yükleyebilirsiniz (PNG/JPG/WEBP/SVG).
            </div>

            {[
              { key: 'logo_header_url', label: 'Sol Üst Logo (Header)' },
              { key: 'logo_footer_url', label: 'Sol Alt Logo (Footer)' },
              { key: 'logo_auth_url', label: 'Üye Giriş/Kayıt Logo (Auth)' },
              { key: 'logo_admin_top_url', label: 'Admin Sol Üst Logo' },
              { key: 'logo_admin_bottom_url', label: 'Admin Sol Alt Logo' },
            ].map((row) => (
              <div key={row.key} className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">{row.label}</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={branding[row.key] || ''}
                    onChange={(e) => setBranding((p) => ({ ...p, [row.key]: e.target.value }))}
                    placeholder="https://... veya /assets/..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none"
                  />
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer font-bold">
                    <Upload className="w-5 h-5" />
                    {uploadingKey === row.key ? 'Yükleniyor…' : 'Yükle'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        setUploadingKey(row.key);
                        try {
                          const reader = new FileReader();
                          const dataUrl = await new Promise((resolve, reject) => {
                            reader.onload = () => resolve(String(reader.result || ''));
                            reader.onerror = () => reject(new Error('Dosya okunamadı.'));
                            reader.readAsDataURL(file);
                          });
                          const r = await apiCall('/api/storage/upload', {
                            method: 'POST',
                            body: JSON.stringify({
                              bucket: 'uploads',
                              folder: 'branding',
                              dataUrl,
                              contentType: file.type,
                            }),
                          });
                          const url = String(r?.data?.publicUrl || '').trim();
                          if (!url) throw new Error('Upload URL alınamadı.');
                          setBranding((p) => ({ ...p, [row.key]: url }));
                        } catch (err) {
                          setSaveMessage(`❌ ${String(err?.message || 'Logo yüklenemedi')}`);
                        } finally {
                          setUploadingKey('');
                        }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-bold"
                    onClick={() => setBranding((p) => ({ ...p, [row.key]: '' }))}
                    title="Temizle"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Temizle
                  </button>
                </div>
                {branding[row.key] ? (
                  <div className="mt-2">
                    <img src={branding[row.key]} alt={row.label} className="h-10 w-auto object-contain" />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Welcome Page Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Karşılama Sayfası (Hoş Geldiniz)</h3>
            <div className="text-sm text-gray-600 mb-3">
              Yeni kullanıcı “Hoş geldiniz” bildirimine tıklayınca açılacak sayfa. HTML olarak düzenlenir.
            </div>
            <textarea
              value={welcomeHtml}
              onChange={(e) => setWelcomeHtml(e.target.value)}
              rows={10}
              placeholder="Karşılama HTML..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue outline-none font-mono text-xs"
            />
            <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-black text-gray-700 inline-flex items-center gap-2">
                <Eye className="w-4 h-4" /> Önizleme
              </div>
              <iframe
                title="Karşılama Önizleme"
                sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                className="w-full h-[420px] bg-white"
                srcDoc={`<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0;padding:16px;">${String(
                  welcomeHtml || ''
                )}</body></html>`}
              />
            </div>
          </div>
        </div>
        
        {/* Önizleme */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Önizleme</h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: colors.primary + '20' }}>
                <div style={{ color: colors.primary }} className="font-bold text-lg mb-2">Ana Renk</div>
                <p className="text-sm text-gray-600">Bu renk butonlar ve linkler için kullanılır</p>
              </div>
              
              <div className="p-4 rounded-lg" style={{ backgroundColor: colors.secondary + '20' }}>
                <div style={{ color: colors.secondary }} className="font-bold text-lg mb-2">İkincil Renk</div>
                <p className="text-sm text-gray-600">İkincil öğeler için</p>
              </div>
              
              <div className="p-4 rounded-lg" style={{ backgroundColor: colors.accent + '20' }}>
                <div style={{ color: colors.accent }} className="font-bold text-lg mb-2">Vurgu Rengi</div>
                <p className="text-sm text-gray-600">Vurgular için</p>
              </div>
              
              <div className="p-4 rounded-lg" style={{ backgroundColor: colors.danger + '20' }}>
                <div style={{ color: colors.danger }} className="font-bold text-lg mb-2">Uyarı Rengi</div>
                <p className="text-sm text-gray-600">Uyarılar için</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
