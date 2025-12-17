import { Lock, EyeOff, ShieldCheck } from 'lucide-react';

export const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-10">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary-blue" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Gizlilik Politikası</h1>
              <p className="text-sm text-gray-600">Kişisel verilerin korunması ve platform gizliliği.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <ShieldCheck className="w-5 h-5 text-primary-blue" /> Güvenlik
              </div>
              <p className="text-sm text-gray-700 mt-2">
                Hesap güvenliği, oturum yönetimi ve kötüye kullanım önleme mekanizmaları uygulanır.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <EyeOff className="w-5 h-5 text-primary-blue" /> Gizlilik tercihleri
              </div>
              <p className="text-sm text-gray-700 mt-2">
                Gizlilik ayarlarınız; profil görünürlüğü ve bildirim tercihleri gibi seçeneklerle yönetilebilir.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <Lock className="w-5 h-5 text-primary-blue" /> Veri minimizasyonu
              </div>
              <p className="text-sm text-gray-700 mt-2">
                Hizmet için gerekli olmayan veriler istenmez; saklama süreleri ve silme süreçleri şeffaftır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

