import { useEffect, useMemo, useState } from 'react';
import { Save, Landmark, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { apiCall } from '../../utils/api';
import { currentParliamentDistribution } from '../../data/parliamentDistribution';

const tryParseJson = (v) => {
  if (v && typeof v === 'object') return v;
  const s = String(v ?? '').trim();
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

export const ParliamentManagement = () => {
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [schemaSql, setSchemaSql] = useState('');

  const [info, setInfo] = useState({
    legislatureName: 'TBMM',
    legislatureYear: '',
    termStart: '',
    termEnd: '',
    speakerName: '',
    speakerProfileId: '',
    description: '',
    officials: [],
  });

  const [distribution, setDistribution] = useState(
    (Array.isArray(currentParliamentDistribution) ? currentParliamentDistribution : []).map((p) => ({
      name: p.name,
      shortName: p.shortName,
      seats: p.seats,
      color: p.color,
      slug: '',
      logo_url: '',
    }))
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const r = await apiCall('/api/settings', { method: 'GET' });
        if (!mounted) return;
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        if (!r?.success) return;
        const d = r?.data && typeof r.data === 'object' ? r.data : {};
        const dist = tryParseJson(d.parliament_distribution);
        const inf = tryParseJson(d.parliament_info);
        if (Array.isArray(dist) && dist.length > 0) {
          setDistribution(
            dist
              .map((p) => ({
                name: String(p?.name || '').trim(),
                shortName: String(p?.shortName || p?.short_name || '').trim(),
                seats: Math.max(0, Number(p?.seats || 0) || 0),
                color: String(p?.color || '').trim(),
                slug: String(p?.slug || '').trim(),
                logo_url: String(p?.logo_url || '').trim(),
              }))
              .filter((p) => p.shortName && p.name)
          );
        }
        if (inf && typeof inf === 'object') {
          setInfo((prev) => ({
            ...prev,
            legislatureName: String(inf.legislatureName || inf.legislature_name || prev.legislatureName).trim(),
            legislatureYear: String(inf.legislatureYear || inf.legislature_year || prev.legislatureYear).trim(),
            termStart: String(inf.termStart || inf.term_start || prev.termStart).trim(),
            termEnd: String(inf.termEnd || inf.term_end || prev.termEnd).trim(),
            speakerName: String(inf.speakerName || inf.speaker_name || prev.speakerName).trim(),
            speakerProfileId: String(inf.speakerProfileId || inf.speaker_profile_id || prev.speakerProfileId).trim(),
            description: String(inf.description || prev.description).trim(),
            officials: Array.isArray(inf.officials)
              ? inf.officials
                  .map((o) => ({
                    role: String(o?.role || '').trim(),
                    name: String(o?.name || '').trim(),
                    profileId: String(o?.profileId || o?.profile_id || '').trim(),
                  }))
                  .filter((o) => o.role && o.name)
              : prev.officials,
          }));
        }
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const totalSeats = useMemo(
    () => (Array.isArray(distribution) ? distribution.reduce((sum, p) => sum + (Number(p?.seats || 0) || 0), 0) : 0),
    [distribution]
  );

  const addRow = () => {
    setDistribution((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      { name: '', shortName: '', seats: 0, color: '#6B7280', slug: '', logo_url: '' },
    ]);
  };

  const removeRow = (idx) => {
    setDistribution((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : []));
  };

  const updateRow = (idx, patch) => {
    setDistribution((prev) =>
      (Array.isArray(prev) ? prev : []).map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  };

  const fillFromDbParties = async () => {
    setLoading(true);
    setSaveMessage('');
    try {
      const r = await apiCall('/api/parties', { method: 'GET' }).catch(() => null);
      const list = Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [];
      const keyOf = (s) => String(s || '').trim().toUpperCase('tr-TR');
      const byShort = new Map(
        (list || [])
          .map((p) => [keyOf(p?.short_name || ''), p])
          .filter(([k]) => k)
      );

      setDistribution((prev) =>
        (Array.isArray(prev) ? prev : []).map((row) => {
          const match = byShort.get(keyOf(row?.shortName)) || null;
          if (!match) return row;
          return {
            ...row,
            // Prefer DB canonical names/branding if admin left empty
            name: String(row?.name || '').trim() ? row.name : String(match?.name || row?.name || '').trim(),
            color: String(row?.color || '').trim() ? row.color : String(match?.color || row?.color || '').trim(),
            slug: String(row?.slug || '').trim() ? row.slug : String(match?.slug || row?.slug || '').trim(),
            logo_url: String(row?.logo_url || '').trim()
              ? row.logo_url
              : String(match?.logo_url || match?.logoUrl || row?.logo_url || '').trim(),
          };
        })
      );
      setSaveMessage('✅ Partilerden dolduruldu');
      setTimeout(() => setSaveMessage(''), 2500);
    } catch (e) {
      setSaveMessage(`❌ ${e?.message || 'Partilerden doldurulamadı'}`);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setLoading(true);
    setSaveMessage('');
    try {
      const payload = {
        parliament_info: {
          legislatureName: info.legislatureName,
          legislatureYear: info.legislatureYear,
          termStart: info.termStart,
          termEnd: info.termEnd,
          speakerName: info.speakerName,
          speakerProfileId: info.speakerProfileId,
          description: info.description,
          officials: Array.isArray(info.officials)
            ? info.officials
                .map((o) => ({
                  role: String(o?.role || '').trim(),
                  name: String(o?.name || '').trim(),
                  profileId: String(o?.profileId || '').trim(),
                }))
                .filter((o) => o.role && o.name)
            : [],
        },
        parliament_distribution: (Array.isArray(distribution) ? distribution : [])
          .map((p) => ({
            name: String(p?.name || '').trim(),
            shortName: String(p?.shortName || '').trim(),
            seats: Math.max(0, Number(p?.seats || 0) || 0),
            color: String(p?.color || '').trim(),
            slug: String(p?.slug || '').trim(),
            logo_url: String(p?.logo_url || '').trim(),
          }))
          .filter((p) => p.shortName && p.name),
      };
      const r = await apiCall('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
      if (r?.success) {
        setSaveMessage('✅ Kaydedildi');
        setTimeout(() => setSaveMessage(''), 2500);
      } else {
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        setSaveMessage(`❌ ${r?.error || 'Kaydedilemedi'}`);
      }
    } catch (e) {
      setSaveMessage(`❌ ${e?.message || 'Kaydedilemedi'}`);
    } finally {
      setLoading(false);
    }
  };

  const addOfficial = () => {
    setInfo((prev) => ({
      ...prev,
      officials: [...(Array.isArray(prev.officials) ? prev.officials : []), { role: '', name: '', profileId: '' }],
    }));
  };
  const removeOfficial = (idx) => {
    setInfo((prev) => ({
      ...prev,
      officials: (Array.isArray(prev.officials) ? prev.officials : []).filter((_, i) => i !== idx),
    }));
  };
  const updateOfficial = (idx, patch) => {
    setInfo((prev) => ({
      ...prev,
      officials: (Array.isArray(prev.officials) ? prev.officials : []).map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    }));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Landmark className="w-7 h-7 text-primary-blue" />
            Meclis Yönetimi
          </h1>
          <p className="text-sm text-gray-600">Ana sayfadaki meclis dağılımı ve “Meclis Dağılımı” sayfası buradan yönetilir.</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMessage ? (
            <span className={`text-sm font-bold ${saveMessage.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {saveMessage}
            </span>
          ) : null}
          <button
            onClick={save}
            disabled={loading}
            className="px-5 py-3 bg-primary-blue text-white rounded-xl hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-6 h-6 sm:w-5 sm:h-5" />
            {loading ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>

      {schemaSql ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="font-black">DB tablosu eksik: `site_settings`</div>
          <div className="text-sm mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="text-lg font-black text-gray-900 mb-4">Genel Bilgiler</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-700">Kurum Adı</label>
            <input
              value={info.legislatureName}
              onChange={(e) => setInfo((p) => ({ ...p, legislatureName: e.target.value }))}
              className="w-full mt-1 border border-gray-300 rounded-xl p-3"
              placeholder="TBMM"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Yasama Yılı</label>
            <input
              value={info.legislatureYear}
              onChange={(e) => setInfo((p) => ({ ...p, legislatureYear: e.target.value }))}
              className="w-full mt-1 border border-gray-300 rounded-xl p-3"
              placeholder="28. Dönem"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Başlangıç Tarihi</label>
            <input
              value={info.termStart}
              onChange={(e) => setInfo((p) => ({ ...p, termStart: e.target.value }))}
              className="w-full mt-1 border border-gray-300 rounded-xl p-3"
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Bitiş Tarihi</label>
            <input
              value={info.termEnd}
              onChange={(e) => setInfo((p) => ({ ...p, termEnd: e.target.value }))}
              className="w-full mt-1 border border-gray-300 rounded-xl p-3"
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Meclis Başkanı</label>
            <input
              value={info.speakerName}
              onChange={(e) => setInfo((p) => ({ ...p, speakerName: e.target.value }))}
              className="w-full mt-1 border border-gray-300 rounded-xl p-3"
              placeholder="Ad Soyad"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700">Başkan Profil ID (ops.)</label>
            <input
              value={info.speakerProfileId}
              onChange={(e) => setInfo((p) => ({ ...p, speakerProfileId: e.target.value }))}
              className="w-full mt-1 border border-gray-300 rounded-xl p-3"
              placeholder="Kullanıcı ID"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-gray-700">Açıklama (ops.)</label>
            <textarea
              value={info.description}
              onChange={(e) => setInfo((p) => ({ ...p, description: e.target.value }))}
              className="w-full mt-1 border border-gray-300 rounded-xl p-3 min-h-[90px]"
              placeholder="Meclis hakkında kısa açıklama…"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-lg font-black text-gray-900">Meclis Yönetimi (Diğer Görevliler)</div>
            <div className="text-xs text-gray-500 mt-1">Rol + isim zorunlu, profil ID opsiyonel.</div>
          </div>
          <button
            type="button"
            onClick={addOfficial}
            className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Yeni Görevli
          </button>
        </div>

        <div className="space-y-3">
          {(Array.isArray(info.officials) ? info.officials : []).map((o, idx) => (
            <div key={`${o.role || 'role'}-${idx}`} className="border border-gray-200 rounded-2xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end">
                <div className="md:col-span-3">
                  <label className="text-xs font-bold text-gray-500">Rol</label>
                  <input
                    value={o.role}
                    onChange={(e) => updateOfficial(idx, { role: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-xl p-2.5"
                    placeholder="Örn: Başkanvekili"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs font-bold text-gray-500">İsim</label>
                  <input
                    value={o.name}
                    onChange={(e) => updateOfficial(idx, { name: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-xl p-2.5"
                    placeholder="Ad Soyad"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-gray-500">Profil ID (ops.)</label>
                  <input
                    value={o.profileId}
                    onChange={(e) => updateOfficial(idx, { profileId: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-xl p-2.5"
                    placeholder="ID"
                  />
                </div>
                <div className="md:col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => removeOfficial(idx)}
                    className="p-2 rounded-xl border border-gray-300 hover:bg-gray-50"
                    aria-label="Sil"
                  >
                    <Trash2 className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {(Array.isArray(info.officials) ? info.officials.length : 0) === 0 ? (
            <div className="text-sm text-gray-600">Henüz görevli eklenmedi.</div>
          ) : null}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-lg font-black text-gray-900">Sandalye Dağılımı</div>
            <div className="text-xs text-gray-500 mt-1">Toplam sandalye: {totalSeats}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fillFromDbParties}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-900 font-black flex items-center gap-2 disabled:opacity-50"
              title="Parti Yönetimi'ndeki logo/slug/renk alanlarını buraya taşır"
            >
              <RefreshCw className="w-5 h-5" />
              Partilerden Doldur
            </button>
            <button
              type="button"
              onClick={addRow}
              className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Yeni Satır
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {(distribution || []).map((p, idx) => (
            <div key={`${p.shortName || 'row'}-${idx}`} className="border border-gray-200 rounded-2xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-500">Parti Adı</label>
                  <input
                    value={p.name}
                    onChange={(e) => updateRow(idx, { name: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-xl p-2.5"
                    placeholder="Parti adı"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Kısa Ad</label>
                  <input
                    value={p.shortName}
                    onChange={(e) => updateRow(idx, { shortName: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-xl p-2.5"
                    placeholder="CHP"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Sandalye</label>
                  <input
                    value={p.seats}
                    onChange={(e) => updateRow(idx, { seats: Number(e.target.value || 0) })}
                    className="w-full mt-1 border border-gray-300 rounded-xl p-2.5"
                    type="number"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Renk</label>
                  <input
                    value={p.color}
                    onChange={(e) => updateRow(idx, { color: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-xl p-2.5"
                    placeholder="#009FD6"
                  />
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="p-2 rounded-xl border border-gray-300 hover:bg-gray-50"
                    aria-label="Sil"
                  >
                    <Trash2 className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs font-bold text-gray-500">Party Slug (ops.)</label>
                  <input
                    value={p.slug}
                    onChange={(e) => updateRow(idx, { slug: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-xl p-2.5"
                    placeholder="chp"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Logo URL (ops.)</label>
                  <input
                    value={p.logo_url}
                    onChange={(e) => updateRow(idx, { logo_url: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-xl p-2.5"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

