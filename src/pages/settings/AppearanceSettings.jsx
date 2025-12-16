import { useEffect, useMemo, useState } from 'react';
import { Sun, Moon, Monitor, Palette, Type, Layout } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiCall } from '../../utils/api';

export const AppearanceSettings = () => {
  const { darkMode, primaryColor, setDarkMode, setPrimaryColor } = useTheme();
  const { user, updateUser } = useAuth();
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [fontSize, setFontSize] = useState('medium');
  const [compactMode, setCompactMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const savedAppearance = useMemo(() => {
    const meta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
    return meta.appearance_settings && typeof meta.appearance_settings === 'object' ? meta.appearance_settings : null;
  }, [user]);

  useEffect(() => {
    if (!savedAppearance) return;
    if (typeof savedAppearance.darkMode === 'boolean') setDarkMode(savedAppearance.darkMode);
    if (typeof savedAppearance.primaryColor === 'string' && savedAppearance.primaryColor) setPrimaryColor(savedAppearance.primaryColor);
    if (typeof savedAppearance.fontSize === 'string') setFontSize(savedAppearance.fontSize);
    if (typeof savedAppearance.compactMode === 'boolean') setCompactMode(savedAppearance.compactMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAppearance]);

  useEffect(() => {
    setSelectedTheme(darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const colorOptions = [
    { name: 'Mavi', value: '#00aaff', color: 'bg-[#00aaff]' },
    { name: 'Kırmızı', value: '#ff3b30', color: 'bg-red-500' },
    { name: 'Yeşil', value: '#34c759', color: 'bg-green-500' },
    { name: 'Mor', value: '#af52de', color: 'bg-purple-500' },
    { name: 'Turuncu', value: '#ff9500', color: 'bg-orange-500' },
    { name: 'Pembe', value: '#ff2d55', color: 'bg-pink-500' },
  ];

  const applyToDom = (nextFontSize, nextCompact) => {
    const root = document.documentElement;
    root.dataset.fontSize = nextFontSize || 'medium';
    root.dataset.compact = nextCompact ? 'true' : 'false';
  };

  useEffect(() => {
    applyToDom(fontSize, compactMode);
  }, [fontSize, compactMode]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const baseMeta = user && typeof user.metadata === 'object' && user.metadata ? user.metadata : {};
      const appearance_settings = {
        darkMode: !!darkMode,
        primaryColor: String(primaryColor || '').trim(),
        fontSize,
        compactMode: !!compactMode,
      };
      const res = await apiCall('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          metadata: {
            ...baseMeta,
            appearance_settings,
          },
        }),
      });
      if (res?.success && res.data) updateUser(res.data);
      // Ensure ThemeProvider picks up localStorage-backed theme values immediately
      window.dispatchEvent(new Event('theme:apply'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-black text-gray-900 mb-6">Görünüm Ayarları</h2>

      {/* Theme Mode */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Palette className="w-6 h-6 text-primary-blue" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Tema Modu</h3>
            <p className="text-sm text-gray-600">Aydınlık veya karanlık tema seçin</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => {
              setSelectedTheme('light');
              setDarkMode(false);
            }}
            className={`flex flex-col items-center gap-3 p-4 border-2 rounded-xl transition-all ${
              selectedTheme === 'light' ? 'border-primary-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200">
              <Sun className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">Aydınlık</div>
              <div className="text-xs text-gray-500">Gündüz modu</div>
            </div>
          </button>

          <button
            onClick={() => {
              setSelectedTheme('dark');
              setDarkMode(true);
            }}
            className={`flex flex-col items-center gap-3 p-4 border-2 rounded-xl transition-all ${
              selectedTheme === 'dark' ? 'border-primary-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Moon className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">Karanlık</div>
              <div className="text-xs text-gray-500">Gece modu</div>
            </div>
          </button>

          <button
            onClick={() => {
              setSelectedTheme('auto');
              // keep current darkMode; "system" can be added later
            }}
            className={`flex flex-col items-center gap-3 p-4 border-2 rounded-xl transition-all ${
              selectedTheme === 'auto' ? 'border-primary-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-gray-800 rounded-lg flex items-center justify-center">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">Otomatik</div>
              <div className="text-xs text-gray-500">Sistem ayarı</div>
            </div>
          </button>
        </div>
      </div>

      {/* Color Scheme */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Palette className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Renk Şeması</h3>
            <p className="text-sm text-gray-600">Ana rengi seçin</p>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              onClick={() => setPrimaryColor(color.value)}
              className={`flex flex-col items-center gap-2 p-3 border-2 rounded-xl transition-all ${
                primaryColor === color.value ? 'border-gray-900' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-10 h-10 ${color.color} rounded-lg shadow-md`}></div>
              <span className="text-xs font-semibold text-gray-700">{color.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Type className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Yazı Boyutu</h3>
            <p className="text-sm text-gray-600">Metin boyutunu ayarlayın</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setFontSize('small')}
            className={`p-4 border-2 rounded-xl transition-all ${
              fontSize === 'small' ? 'border-primary-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-sm font-semibold text-gray-900 mb-1">Küçük</div>
            <div className="text-xs text-gray-500">Daha fazla içerik</div>
          </button>
          <button
            onClick={() => setFontSize('medium')}
            className={`p-4 border-2 rounded-xl transition-all ${
              fontSize === 'medium' ? 'border-primary-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-base font-semibold text-gray-900 mb-1">Normal</div>
            <div className="text-xs text-gray-500">Varsayılan boyut</div>
          </button>
          <button
            onClick={() => setFontSize('large')}
            className={`p-4 border-2 rounded-xl transition-all ${
              fontSize === 'large' ? 'border-primary-blue bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-lg font-semibold text-gray-900 mb-1">Büyük</div>
            <div className="text-xs text-gray-500">Daha rahat okuma</div>
          </button>
        </div>
      </div>

      {/* Layout Options */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <Layout className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Düzen Seçenekleri</h3>
            <p className="text-sm text-gray-600">Sayfa düzenini özelleştirin</p>
          </div>
        </div>
        <label className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
          <div>
            <div className="font-semibold text-gray-900">Kompakt Mod</div>
            <div className="text-sm text-gray-600">Daha sıkışık içerik görünümü</div>
          </div>
          <input
            type="checkbox"
            checked={compactMode}
            onChange={() => setCompactMode(!compactMode)}
            className="w-5 h-5 text-primary-blue border-gray-300 rounded focus:ring-primary-blue"
          />
        </label>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </div>
  );
};
