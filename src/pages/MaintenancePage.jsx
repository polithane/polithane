import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePublicSite } from '../contexts/PublicSiteContext';

export const MaintenancePage = () => {
  const { site } = usePublicSite();

  const title = useMemo(() => String(site?.siteName || 'Polithane').trim(), [site?.siteName]);
  const email = useMemo(() => String(site?.supportEmail || site?.contactEmail || '').trim(), [site?.supportEmail, site?.contactEmail]);
  const slogan = useMemo(() => String(site?.siteSlogan || '').trim(), [site?.siteSlogan]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <div className="text-2xl font-black text-gray-900">{title}</div>
        {slogan ? <div className="mt-1 text-sm text-gray-600">{slogan}</div> : null}

        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="font-black">Bakım modu aktif</div>
          <div className="mt-1 text-sm">
            Şu anda sistemde bakım çalışması var. Lütfen biraz sonra tekrar deneyin.
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/login-new"
            className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-black"
          >
            Admin girişi
          </Link>
          <Link
            to="/"
            className="px-5 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 font-black text-gray-900"
          >
            Ana sayfa
          </Link>
        </div>

        {email ? (
          <div className="mt-6 text-xs text-gray-500">
            Destek: <a className="underline" href={`mailto:${email}`}>{email}</a>
          </div>
        ) : null}
      </div>
    </div>
  );
};

