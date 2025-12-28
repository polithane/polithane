import { useEffect, useMemo, useState } from 'react';
import { Bell, Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';

export const NotificationRules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schemaSql, setSchemaSql] = useState('');

  const [channels, setChannels] = useState({
    in_app_enabled: true,
    push_enabled: false,
    email_enabled: true,
    sms_enabled: false,
  });
  const [channelsSql, setChannelsSql] = useState('');
  const [channelsBusy, setChannelsBusy] = useState(false);

  const [createDraft, setCreateDraft] = useState({
    name: '',
    description: '',
    trigger: '',
    enabled: true,
    priority: 'normal',
    channels: ['in_app'],
  });
  const [createBusy, setCreateBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [rRules, rChannels] = await Promise.all([
        adminApi.getNotificationRules().catch(() => null),
        adminApi.getNotificationChannels().catch(() => null),
      ]);
      if (rRules?.schemaMissing && rRules?.requiredSql) setSchemaSql(String(rRules.requiredSql || ''));
      if (!rRules?.success) throw new Error(rRules?.error || 'Kurallar yüklenemedi.');
      setRules(Array.isArray(rRules.data) ? rRules.data : []);

      if (rChannels?.schemaMissing && rChannels?.requiredSql) setChannelsSql(String(rChannels.requiredSql || ''));
      if (rChannels?.success && rChannels?.data) {
        setChannels({
          in_app_enabled: rChannels.data.in_app_enabled !== false,
          push_enabled: !!rChannels.data.push_enabled,
          email_enabled: rChannels.data.email_enabled !== false,
          sms_enabled: !!rChannels.data.sms_enabled,
        });
      }
    } catch (e) {
      setError(String(e?.message || 'Kurallar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRule = (id) => {
    const rid = String(id || '');
    const cur = rules.find((r) => String(r.id) === rid);
    const nextEnabled = !(cur?.enabled !== false);
    setRules((prev) => prev.map((r) => (String(r.id) === rid ? { ...r, enabled: nextEnabled } : r)));
    adminApi.updateNotificationRule(rid, { enabled: nextEnabled }).catch(() => loadAll());
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      high: { color: 'bg-red-100 text-red-700', text: 'Yüksek' },
      normal: { color: 'bg-yellow-100 text-yellow-700', text: 'Normal' },
      low: { color: 'bg-gray-100 text-gray-700', text: 'Düşük' },
    };
    const badge = badges[priority] || badges.normal;
    return (
      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const getChannelBadges = (channels) => {
    const channelNames = {
      in_app: 'Uygulama İçi',
      push: 'Anlık Bildirim',
      email: 'E-posta',
      sms: 'SMS',
    };
    return (
      <div className="flex flex-wrap gap-2">
        {(channels || []).map(channel => (
          <span key={channel} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
            {channelNames[channel]}
          </span>
        ))}
      </div>
    );
  };

  const activeCount = useMemo(() => rules.filter((r) => r.enabled).length, [rules]);

  const startEdit = (rule) => {
    setEditId(String(rule?.id || ''));
    setEditDraft({
      name: String(rule?.name || ''),
      description: String(rule?.description || ''),
      trigger: String(rule?.trigger || ''),
      enabled: rule?.enabled !== false,
      priority: String(rule?.priority || 'normal'),
      channels: Array.isArray(rule?.channels) ? rule.channels : ['in_app'],
    });
  };

  const saveEdit = async () => {
    if (!editId || !editDraft) return;
    try {
      await adminApi.updateNotificationRule(editId, editDraft);
      setEditId(null);
      setEditDraft(null);
      await loadAll();
    } catch (e) {
      setError(String(e?.message || 'Kaydedilemedi.'));
    }
  };

  const deleteRule = async (id) => {
    const rid = String(id || '');
    if (!rid) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Bu kural silinsin mi?')) return;
    try {
      await adminApi.deleteNotificationRule(rid);
      await loadAll();
    } catch (e) {
      setError(String(e?.message || 'Silinemedi.'));
    }
  };

  const createRule = async () => {
    if (createBusy) return;
    setCreateBusy(true);
    setError('');
    try {
      const r = await adminApi.createNotificationRule(createDraft).catch((e) => ({ success: false, error: e?.message }));
      if (!r?.success) {
        if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
        throw new Error(r?.error || 'Kural oluşturulamadı.');
      }
      setCreateDraft({ name: '', description: '', trigger: '', enabled: true, priority: 'normal', channels: ['in_app'] });
      await loadAll();
    } catch (e) {
      setError(String(e?.message || 'Kural oluşturulamadı.'));
    } finally {
      setCreateBusy(false);
    }
  };

  const saveChannels = async () => {
    if (channelsBusy) return;
    setChannelsBusy(true);
    setError('');
    try {
      const r = await adminApi.updateNotificationChannels(channels).catch(() => null);
      if (!r?.success) {
        if (r?.schemaMissing && r?.requiredSql) setChannelsSql(String(r.requiredSql || ''));
        throw new Error(r?.error || 'Kanal ayarları kaydedilemedi.');
      }
    } catch (e) {
      setError(String(e?.message || 'Kanal ayarları kaydedilemedi.'));
    } finally {
      setChannelsBusy(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">Bildirim Kuralları</h1>
          <p className="text-gray-600">Kurallar veritabanından yönetilir (mock yok)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAll}
            className="px-4 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-semibold"
          >
            Yenile
          </button>
        </div>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      {schemaSql ? (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-black text-amber-900">DB tablosu eksik: `admin_notification_rules`</div>
          <div className="text-sm text-amber-900 mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Toplam Kural</div>
          <div className="text-2xl font-black text-gray-900">{rules.length}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Aktif Kural</div>
          <div className="text-2xl font-black text-green-700">{activeCount}</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-sm text-blue-600 mb-1">Kanal Ayarları</div>
          <div className="text-2xl font-black text-blue-700">—</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm text-purple-600 mb-1">Bildirimler</div>
          <div className="text-2xl font-black text-purple-700">—</div>
        </div>
      </div>

      {/* Create */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-6 h-6 text-primary-blue" />
          <div className="text-lg font-black text-gray-900">Yeni Kural</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={createDraft.name}
            onChange={(e) => setCreateDraft((p) => ({ ...p, name: e.target.value }))}
            placeholder="Kural adı"
            className="px-4 py-3 border border-gray-300 rounded-lg"
          />
          <input
            value={createDraft.trigger}
            onChange={(e) => setCreateDraft((p) => ({ ...p, trigger: e.target.value }))}
            placeholder="Tetikleyici (ör: new_comment)"
            className="px-4 py-3 border border-gray-300 rounded-lg"
          />
          <input
            value={createDraft.description}
            onChange={(e) => setCreateDraft((p) => ({ ...p, description: e.target.value }))}
            placeholder="Açıklama"
            className="px-4 py-3 border border-gray-300 rounded-lg md:col-span-2"
          />
          <select
            value={createDraft.priority}
            onChange={(e) => setCreateDraft((p) => ({ ...p, priority: e.target.value }))}
            className="px-4 py-3 border border-gray-300 rounded-lg"
          >
            <option value="high">Yüksek</option>
            <option value="normal">Normal</option>
            <option value="low">Düşük</option>
          </select>
          <div className="flex flex-wrap items-center gap-2">
            {['in_app', 'push', 'email', 'sms'].map((c) => {
              const checked = createDraft.channels.includes(c);
              return (
                <label key={c} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setCreateDraft((p) => ({
                        ...p,
                        channels: e.target.checked ? [...p.channels, c] : p.channels.filter((x) => x !== c),
                      }));
                    }}
                  />
                  {c}
                </label>
              );
            })}
          </div>
          <button
            type="button"
            onClick={createRule}
            disabled={createBusy}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-black disabled:opacity-60"
          >
            <Plus className="w-5 h-5" />
            {createBusy ? 'Ekleniyor…' : 'Kural Ekle'}
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{rule.name}</h3>
                  {getPriorityBadge(rule.priority)}
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`ml-auto ${rule.enabled ? 'text-green-500' : 'text-gray-400'}`}
                  >
                    {rule.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">{rule.description}</p>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Tetikleyici:</span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">{rule.trigger}</code>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Kanallar:</span>
                    {getChannelBadges(rule.channels)}
                  </div>
                </div>

                {editId === String(rule.id) && editDraft ? (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      value={editDraft.name}
                      onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg"
                    />
                    <input
                      value={editDraft.trigger}
                      onChange={(e) => setEditDraft((p) => ({ ...p, trigger: e.target.value }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg"
                    />
                    <input
                      value={editDraft.description}
                      onChange={(e) => setEditDraft((p) => ({ ...p, description: e.target.value }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg md:col-span-2"
                    />
                    <select
                      value={editDraft.priority}
                      onChange={(e) => setEditDraft((p) => ({ ...p, priority: e.target.value }))}
                      className="px-4 py-3 border border-gray-300 rounded-lg"
                    >
                      <option value="high">Yüksek</option>
                      <option value="normal">Normal</option>
                      <option value="low">Düşük</option>
                    </select>
                    <div className="flex flex-wrap items-center gap-2">
                      {['in_app', 'push', 'email', 'sms'].map((c) => {
                        const checked = editDraft.channels.includes(c);
                        return (
                          <label key={c} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setEditDraft((p) => ({
                                  ...p,
                                  channels: e.target.checked ? [...p.channels, c] : p.channels.filter((x) => x !== c),
                                }));
                              }}
                            />
                            {c}
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        className="px-4 py-3 rounded-lg bg-primary-blue text-white font-black hover:bg-blue-600"
                      >
                        Kaydet
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(null);
                          setEditDraft(null);
                        }}
                        className="px-4 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 font-semibold"
                      >
                        Vazgeç
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  type="button"
                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                  onClick={() => startEdit(rule)}
                >
                  <Edit className="w-5 h-5 text-primary-blue" />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Channels Configuration */}
      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Bildirim Kanalları Ayarları</h3>
        {channelsSql ? (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="font-black text-amber-900">DB tablosu eksik: `admin_notification_channels`</div>
            <div className="text-sm text-amber-900 mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
            <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{channelsSql}</pre>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Uygulama İçi</h4>
              <button
                type="button"
                onClick={() => setChannels((p) => ({ ...p, in_app_enabled: !p.in_app_enabled }))}
                className={channels.in_app_enabled ? 'text-green-500' : 'text-gray-400'}
                title="Aç/Kapat"
              >
                {channels.in_app_enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
            <p className="text-sm text-gray-600">Platform içinde anlık bildirimler</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">Anlık Bildirim</h4>
              <button
                type="button"
                onClick={() => setChannels((p) => ({ ...p, push_enabled: !p.push_enabled }))}
                className={channels.push_enabled ? 'text-green-500' : 'text-gray-400'}
                title="Aç/Kapat"
              >
                {channels.push_enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
            <p className="text-sm text-gray-600">Mobil ve masaüstü anlık bildirimler</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">E-posta</h4>
              <button
                type="button"
                onClick={() => setChannels((p) => ({ ...p, email_enabled: !p.email_enabled }))}
                className={channels.email_enabled ? 'text-green-500' : 'text-gray-400'}
                title="Aç/Kapat"
              >
                {channels.email_enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
            <p className="text-sm text-gray-600">E-posta ile bildirim gönderimi</p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-gray-900">SMS</h4>
              <button
                type="button"
                onClick={() => setChannels((p) => ({ ...p, sms_enabled: !p.sms_enabled }))}
                className={channels.sms_enabled ? 'text-green-500' : 'text-gray-400'}
                title="Aç/Kapat"
              >
                {channels.sms_enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
            <p className="text-sm text-gray-600">SMS bildirimleri (entegrasyon bu sürümde yok)</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={saveChannels}
            disabled={channelsBusy}
            className="px-5 py-3 rounded-xl bg-gray-900 text-white font-black hover:bg-black disabled:opacity-60"
          >
            {channelsBusy ? 'Kaydediliyor…' : 'Kanal Ayarlarını Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};
