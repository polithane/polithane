import { useMemo } from 'react';
import { usePublicSite } from '../contexts/PublicSiteContext';

const defaultWelcomeHtml = `
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
`.trim();

export const WelcomePage = () => {
  const { site } = usePublicSite();
  const html = useMemo(() => {
    const v = site?.welcomePageHtml;
    const s = String(v || '').trim();
    return s || defaultWelcomeHtml;
  }, [site?.welcomePageHtml]);

  return (
    <div className="container-main py-6 sm:py-10">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl p-5 sm:p-8 shadow-sm">
        <iframe
          title="Karşılama"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          className="w-full min-h-[640px] bg-white rounded-xl"
          srcDoc={`<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0;padding:0;">${html}</body></html>`}
        />
      </div>
    </div>
  );
};

