import { Target, Sparkles, Shield } from 'lucide-react';

export const MissionPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-10">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Misyonumuz</h1>
              <p className="text-sm text-gray-600">Toplum için daha anlaşılır ve hesap verebilir bir siyaset.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <Sparkles className="w-5 h-5 text-purple-600" /> Kaliteli içerik
              </div>
              <p className="text-sm text-gray-700 mt-2">
                Bilgiye dayalı, kaynak gösterilebilir ve toplumsal faydayı büyüten paylaşımları öne çıkarmayı hedefleriz.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <Shield className="w-5 h-5 text-purple-600" /> Güvenli alan
              </div>
              <p className="text-sm text-gray-700 mt-2">
                Hakaret, taciz, spam ve zararlı içeriklere karşı güçlü kurallar ve tutarlı moderasyon uygularız.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <Target className="w-5 h-5 text-purple-600" /> Şeffaflık
              </div>
              <p className="text-sm text-gray-700 mt-2">
                Platform içi etkileşimlerin ve skorlamaların mantığını anlaşılır kılar; kullanıcıya kontrol sunarız.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

