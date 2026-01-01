import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';

const Badge = ({ status }) => {
  const s = String(status || '').trim();
  const map = {
    queued: 'bg-yellow-100 text-yellow-700',
    running: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  const cls = map[s] || 'bg-gray-100 text-gray-700';
  return <span className={`px-3 py-1 rounded-full text-xs font-black ${cls}`}>{s || '—'}</span>;
};

export const JobQueue = () => {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [schemaSql, setSchemaSql] = useState('');
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminApi.getJobs({ limit: 200 }).catch(() => null);
      if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
      if (!r?.success) throw new Error(r?.error || 'Job listesi yüklenemedi.');
      const list = Array.isArray(r.data) ? r.data : [];
      setJobs(list);
      if (selected) {
        const id = String(selected?.id || '');
        const fresh = list.find((j) => String(j?.id || '') === id) || null;
        setSelected(fresh);
      }
    } catch (e) {
      setError(String(e?.message || 'Job listesi yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = Array.isArray(jobs) ? jobs : [];
    if (statusFilter) list = list.filter((j) => String(j?.status || '') === String(statusFilter));
    if (typeFilter) list = list.filter((j) => String(j?.job_type || '') === String(typeFilter));
    return list;
  }, [jobs, statusFilter, typeFilter]);

  const types = useMemo(() => {
    const set = new Set((jobs || []).map((j) => String(j?.job_type || '')).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  const processQueued = async () => {
    setProcessing(true);
    setError('');
    try {
      const r = await adminApi.processJobs({ limit: 10 }).catch(() => null);
      if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
      if (!r?.success) throw new Error(r?.error || 'Job işlenemedi.');
      await load();
    } catch (e) {
      setError(String(e?.message || 'Job işlenemedi.'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Job Kuyruğu</h1>
          <p className="text-gray-600">Tarama / otomasyon gibi işler burada kuyruğa alınır ve çalıştırılır.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 font-black inline-flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Yenile
          </button>
          <button
            type="button"
            onClick={processQueued}
            disabled={processing}
            className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-black inline-flex items-center gap-2 disabled:opacity-60"
          >
            {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            Kuyruğu Çalıştır
          </button>
        </div>
      </div>

      {schemaSql ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="font-black">DB tablosu eksik: `admin_jobs`</div>
          <div className="text-sm mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="text-sm font-black text-gray-900">Filtre</div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg bg-white">
          <option value="">Tüm durumlar</option>
          <option value="queued">queued</option>
          <option value="running">running</option>
          <option value="success">success</option>
          <option value="failed">failed</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg bg-white">
          <option value="">Tüm tipler</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs text-gray-500">{filtered.length} kayıt</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filtered.map((j) => {
              const isSelected = String(selected?.id || '') === String(j?.id || '');
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => setSelected(j)}
                  className={`w-full text-left p-4 hover:bg-gray-50 ${isSelected ? 'bg-gray-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-black text-gray-900 truncate">{String(j.job_type || '—')}</div>
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        {String(j.requested_at || '').slice(0, 19)} • id: <span className="font-mono">{String(j.id || '').slice(0, 8)}…</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={j.status} />
                      {String(j.status) === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : null}
                      {String(j.status) === 'failed' ? <XCircle className="w-5 h-5 text-red-600" /> : null}
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 ? <div className="p-6 text-sm text-gray-600">Job yok.</div> : null}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-lg font-black text-gray-900 mb-3">Detay</div>
          {!selected ? (
            <div className="text-sm text-gray-600">Soldan bir job seçin.</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-black text-gray-900">{String(selected.job_type || '—')}</div>
                <Badge status={selected.status} />
              </div>
              <div className="text-xs text-gray-500">
                requested_at: {String(selected.requested_at || '').slice(0, 19) || '—'}
                <br />
                started_at: {String(selected.started_at || '').slice(0, 19) || '—'}
                <br />
                finished_at: {String(selected.finished_at || '').slice(0, 19) || '—'}
              </div>
              <div>
                <div className="text-xs font-black text-gray-600 uppercase mb-1">payload</div>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 overflow-auto max-h-[200px]">
                  {JSON.stringify(selected.payload || {}, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-xs font-black text-gray-600 uppercase mb-1">result</div>
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 overflow-auto max-h-[240px]">
                  {JSON.stringify(selected.result || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

