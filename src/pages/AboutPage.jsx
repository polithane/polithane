import { ShieldCheck, Users, MessageSquareText } from 'lucide-react';

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-10">
        <div className="bg-white border border-gray-200 rounded-3xl p-6 md:p-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary-blue" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Hakkımızda</h1>
              <p className="text-sm text-gray-600">Polithane: özgür, açık ve şeffaf siyaset.</p>
            </div>
          </div>

          <div className="prose prose-gray max-w-none">
            <p>
              Polithane, farklı görüşlerin bir arada konuşabildiği, doğrulanabilir bilgiyle beslenen ve şeffaflığı
              merkeze alan bir sosyal siyaset platformudur.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <Users className="w-5 h-5 text-primary-blue" /> Topluluk
              </div>
              <div className="text-sm text-gray-700 mt-2">
                Üyeler; siyasetçi, teşkilat, medya ve vatandaş profilleriyle aynı zeminde etkileşim kurar.
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <MessageSquareText className="w-5 h-5 text-primary-blue" /> Diyalog
              </div>
              <div className="text-sm text-gray-700 mt-2">
                Hakaret/şiddet/zararlı içeriklere karşı moderasyon; fikir çeşitliliğine ise tam alan.
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50">
              <div className="flex items-center gap-2 font-black text-gray-900">
                <ShieldCheck className="w-5 h-5 text-primary-blue" /> Şeffaflık
              </div>
              <div className="text-sm text-gray-700 mt-2">
                Polit Puan gibi mekaniklerin mantığı anlaşılır ve takip edilebilir şekilde sunulur.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

