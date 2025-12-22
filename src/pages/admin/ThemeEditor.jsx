import { useState } from 'react';
import { Save, RotateCcw, Eye, Download, Upload } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeEditor = () => {
  const { theme, updateTheme, resetTheme } = useTheme();
  
  const [colors, setColors] = useState({
    primary: theme.primaryColor || '#009FD6',
    secondary: theme.secondaryColor || '#10b981',
    accent: theme.accentColor || '#f59e0b',
    danger: theme.dangerColor || '#ef4444',
  });
  
  const [fonts, setFonts] = useState({
    heading: 'Inter',
    body: 'Inter',
  });

  const handleColorChange = (key, value) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateTheme({
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      accentColor: colors.accent,
      dangerColor: colors.danger,
    });
    alert('Tema kaydedildi!');
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Tasarım & Tema Editörü</h1>
          <p className="text-gray-600">Sitenin görünümünü özelleştirin</p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={resetTheme} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 sm:w-5 sm:h-5" />
            Sıfırla
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 flex items-center gap-2">
            <Save className="w-6 h-6 sm:w-5 sm:h-5" />
            Kaydet
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Color Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Renk Paleti</h3>
            
            <div className="grid grid-cols-2 gap-6">
              {Object.entries(colors).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 capitalize">
                    {key} Renk
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
                <div style={{ color: colors.accent }} className="font-bold text-lg mb-2">Accent Renk</div>
                <p className="text-sm text-gray-600">Vurgular için</p>
              </div>
              
              <div className="p-4 rounded-lg" style={{ backgroundColor: colors.danger + '20' }}>
                <div style={{ color: colors.danger }} className="font-bold text-lg mb-2">Danger Renk</div>
                <p className="text-sm text-gray-600">Uyarılar için</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
