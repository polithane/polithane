import { Cookie, SlidersHorizontal, ShieldCheck } from 'lucide-react';

export const CookiePolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-10">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Cookie className="w-6 h-6 text-amber-700" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Çerez Politikası</h1>
              <p className="text-sm text-gray-600">Çerezler ve benzeri teknolojiler hakkında.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <ShieldCheck className="w-5 h-5 text-amber-700" /> Zorunlu çerezler
              </div>
              <p className="text-sm text-gray-700 mt-2">
                Oturum, güvenlik ve temel işlevler için gereklidir (örn: giriş durumunuz).
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <SlidersHorizontal className="w-5 h-5 text-amber-700" /> Tercihler
              </div>
              <p className="text-sm text-gray-700 mt-2">
                Görünüm ve bildirim ayarları gibi tercihlerinizi hatırlamak için kullanılabilir.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <Cookie className="w-5 h-5 text-amber-700" /> Analiz
              </div>
              <p className="text-sm text-gray-700 mt-2">
                Performans ve kullanım analizleri için sınırlı ölçüde kullanılabilir (varsa).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

