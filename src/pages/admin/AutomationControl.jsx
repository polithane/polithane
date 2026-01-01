import { useEffect, useMemo, useState } from 'react';
import { Bot, Play, Pause, RefreshCw, AlertCircle, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';

export const AutomationControl = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schemaSql, setSchemaSql] = useState('');
  const [workflows, setWorkflows] = useState([]);

  const [draftName, setDraftName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminApi.getWorkflows().catch(() => null);
      if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
      if (!r?.success) throw new Error(r?.error || 'İş akışları yüklenemedi.');
      setWorkflows(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError(String(e?.message || 'İş akışları yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const success = workflows.reduce((acc, w) => acc + (Number(w.success_count || 0) || 0), 0);
    const fail = workflows.reduce((acc, w) => acc + (Number(w.fail_count || 0) || 0), 0);
    const active = workflows.filter((w) => String(w.status) === 'running').length;
    return { success, fail, active };
  }, [workflows]);

  const createWorkflow = async () => {
    const name = String(draftName || '').trim();
    if (!name) return;
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      const r = await adminApi.createWorkflow({ name, status: 'paused' }).catch(() => null);
      if (!r?.success) {
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        throw new Error(r?.error || 'İş akışı oluşturulamadı.');
      }
      setDraftName('');
      await load();
    } catch (e) {
      setError(String(e?.message || 'İş akışı oluşturulamadı.'));
    } finally {
      setCreating(false);
    }
  };

  const toggleWorkflow = async (w) => {
    const id = String(w?.id || '');
    if (!id) return;
    const next = String(w.status) === 'running' ? 'paused' : 'running';
    setWorkflows((prev) => prev.map((x) => (String(x.id) === id ? { ...x, status: next } : x)));
    const r = await adminApi.updateWorkflow(id, { status: next }).catch(() => null);
    if (!r?.success) await load();
  };

  const runWorkflowNow = async (w) => {
    const id = String(w?.id || '');
    if (!id) return;
    setError('');
    const r = await adminApi.enqueueJob({ job_type: 'run_workflow', payload: { workflow_id: id } }).catch(() => null);
    if (!r?.success) {
      if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
      setError(r?.error || 'Job oluşturulamadı.');
      return;
    }
    await load();
  };

  const deleteWorkflow = async (w) => {
    const id = String(w?.id || '');
    if (!id) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Bu iş akışı silinsin mi?')) return;
    const r = await adminApi.deleteWorkflow(id).catch(() => null);
    if (!r?.success) {
      setError(r?.error || 'Silinemedi.');
      return;
    }
    await load();
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Otomasyon Kontrolü</h1>
          <p className="text-gray-600">İş akışlarını yönetin</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 font-black inline-flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Yenile
        </button>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      {schemaSql ? (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-black text-amber-900">DB tablosu eksik: `admin_workflows`</div>
          <div className="text-sm text-amber-900 mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
          <div className="text-2xl font-black text-gray-900">{stats.success.toLocaleString('tr-TR')}</div>
          <div className="text-sm text-gray-600">Başarılı (toplam)</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <div className="text-2xl font-black text-gray-900">{stats.fail.toLocaleString('tr-TR')}</div>
          <div className="text-sm text-gray-600">Başarısız (toplam)</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Bot className="w-8 h-8 text-blue-500 mb-2" />
          <div className="text-2xl font-black text-gray-900">{stats.active}</div>
          <div className="text-sm text-gray-600">Çalışan İş Akışı</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-sm text-gray-600 mb-2">Toplam İş Akışı</div>
          <div className="text-2xl font-black text-gray-900">{workflows.length}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-6 h-6 text-primary-blue" />
          <div className="text-lg font-black text-gray-900">Yeni İş Akışı</div>
        </div>
        <div className="flex gap-3">
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="İş akışı adı (örn: Twitter Tarayıcı)"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
          />
          <button
            type="button"
            onClick={createWorkflow}
            disabled={creating}
            className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 font-black disabled:opacity-60"
          >
            {creating ? 'Ekleniyor…' : 'Ekle'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {workflows.map((workflow) => (
          <div key={workflow.id} className="p-6 border-b last:border-b-0 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    String(workflow.status) === 'running' ? 'bg-green-100' : 'bg-gray-100'
                  }`}
                >
                  <Bot className={`w-6 h-6 ${String(workflow.status) === 'running' ? 'text-green-600' : 'text-gray-400'}`} />
                </div>

                <div>
                  <h3 className="font-bold text-gray-900">{workflow.name}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        String(workflow.status) === 'running' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {String(workflow.status) === 'running' ? 'Çalışıyor' : 'Duraklatıldı'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Başarılı / Hata</div>
                  <div className="font-bold text-gray-900">
                    {Number(workflow.success_count || 0) || 0} / <span className="text-red-500">{Number(workflow.fail_count || 0) || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => runWorkflowNow(workflow)}
                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                    title="Şimdi çalıştır (job)"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWorkflow(workflow)}
                    className={`p-2 rounded-lg ${
                      String(workflow.status) === 'running'
                        ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                    }`}
                    title="Başlat/Durdur"
                  >
                    {String(workflow.status) === 'running' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  <button type="button" onClick={() => deleteWorkflow(workflow)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200" title="Sil">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {workflows.length === 0 ? <div className="p-6 text-sm text-gray-600">Henüz iş akışı yok.</div> : null}
      </div>
    </div>
  );
};
