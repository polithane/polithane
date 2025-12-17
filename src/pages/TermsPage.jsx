import { FileText, Shield, AlertTriangle } from 'lucide-react';

export const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-10">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
              <FileText className="w-6 h-6 text-gray-700" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Kullanım Şartları</h1>
              <p className="text-sm text-gray-600">Bu sayfa genel bilgilendirme amaçlıdır.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <Shield className="w-5 h-5 text-primary-blue" /> Topluluk Kuralları
              </div>
              <p className="text-sm text-gray-700 mt-2">
                Hakaret, taciz, nefret söylemi, spam ve zararlı içerikler yasaktır. İçerikler gerektiğinde moderasyona
                alınabilir veya kaldırılabilir.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 p-6 bg-yellow-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <AlertTriangle className="w-5 h-5 text-yellow-700" /> Sorumluluk
              </div>
              <p className="text-sm text-gray-800 mt-2">
                Paylaşılan içeriklerin sorumluluğu içerik sahibine aittir. Platform, mevzuata uygun şekilde gerekli
                durumlarda işlem yapabilir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

