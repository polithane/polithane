import { useEffect, useState } from 'react';
import { Mail, Edit, Trash2, Eye, Plus } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';

export const EmailTemplates = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schemaSql, setSchemaSql] = useState('');
  const [templates, setTemplates] = useState([]);

  const [draft, setDraft] = useState({ name: '', type: 'other', subject: '', content_html: '', is_active: true });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await adminApi.getEmailTemplates().catch(() => null);
      if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
      if (!r?.success) throw new Error(r?.error || 'Şablonlar yüklenemedi.');
      setTemplates(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setError(String(e?.message || 'Şablonlar yüklenemedi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTypeBadge = (type) => {
    const badges = {
      welcome: { color: 'bg-green-100 text-green-700', text: 'Hoş Geldin' },
      password_reset: { color: 'bg-red-100 text-red-700', text: 'Şifre' },
      email_verification: { color: 'bg-blue-100 text-blue-700', text: 'Doğrulama' },
      weekly_digest: { color: 'bg-purple-100 text-purple-700', text: 'Özet' },
    };
    const badge = badges[type] || { color: 'bg-gray-100 text-gray-700', text: 'Diğer' };
    return (
      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">E-posta Şablonları</h1>
          <p className="text-gray-600">Otomatik e-posta şablonlarını düzenleyin</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 font-black"
        >
          Yenile
        </button>
      </div>

      {error ? <div className="mb-4 text-sm text-red-600 font-semibold">{error}</div> : null}
      {loading ? <div className="mb-4 text-sm text-gray-600">Yükleniyor…</div> : null}

      {schemaSql ? (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-black text-amber-900">DB tablosu eksik: `admin_email_templates`</div>
          <div className="text-sm text-amber-900 mt-1">Supabase SQL Editor’da şu SQL’i çalıştırın:</div>
          <pre className="mt-3 p-3 rounded-lg bg-white border border-amber-200 overflow-auto text-xs text-gray-800">{schemaSql}</pre>
        </div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500 mb-1">Toplam Şablon</div>
          <div className="text-2xl font-black text-gray-900">{templates.length}</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-sm text-blue-600 mb-1">Aktif Şablon</div>
          <div className="text-2xl font-black text-blue-700">{templates.filter((t) => t.is_active !== false).length}</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="text-sm text-green-600 mb-1">Bu Ay Gönderilen</div>
          <div className="text-2xl font-black text-green-700">—</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-sm text-purple-600 mb-1">Açılma Oranı</div>
          <div className="text-2xl font-black text-purple-700">—</div>
        </div>
      </div>

      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-6 h-6 text-primary-blue" />
          <div className="text-lg font-black text-gray-900">Yeni Şablon</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={draft.name}
            onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            placeholder="Şablon adı"
            className="px-4 py-3 border border-gray-300 rounded-lg"
          />
          <select
            value={draft.type}
            onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))}
            className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
          >
            <option value="welcome">welcome</option>
            <option value="password_reset">password_reset</option>
            <option value="email_verification">email_verification</option>
            <option value="weekly_digest">weekly_digest</option>
            <option value="other">other</option>
          </select>
          <input
            value={draft.subject}
            onChange={(e) => setDraft((p) => ({ ...p, subject: e.target.value }))}
            placeholder="Konu"
            className="px-4 py-3 border border-gray-300 rounded-lg md:col-span-2"
          />
          <textarea
            value={draft.content_html}
            onChange={(e) => setDraft((p) => ({ ...p, content_html: e.target.value }))}
            placeholder="HTML içerik"
            className="px-4 py-3 border border-gray-300 rounded-lg md:col-span-2"
            rows={6}
          />
          <button
            type="button"
            disabled={creating}
            onClick={async () => {
              if (creating) return;
              setCreating(true);
              setError('');
              try {
                const r = await adminApi.createEmailTemplate(draft).catch(() => null);
                if (!r?.success) {
                  if (r?.schemaMissing && r?.requiredSql) setSchemaSql(String(r.requiredSql || ''));
                  throw new Error(r?.error || 'Şablon oluşturulamadı.');
                }
                setDraft({ name: '', type: draft.type || 'other', subject: '', content_html: '', is_active: true });
                await load();
              } catch (e) {
                setError(String(e?.message || 'Şablon oluşturulamadı.'));
              } finally {
                setCreating(false);
              }
            }}
            className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-600 font-black disabled:opacity-60 md:col-span-2"
          >
            {creating ? 'Ekleniyor…' : 'Şablon Ekle'}
          </button>
        </div>
      </div>

      {/* Templates List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Şablon Adı</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Konu</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Tür</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Kullanım</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Son Güncelleme</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {templates.map((template) => (
              <tr key={template.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary-blue" />
                    </div>
                    <span className="font-semibold text-gray-900">{template.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-700">{template.subject}</span>
                </td>
                <td className="px-6 py-4">{getTypeBadge(template.type)}</td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-gray-700">{template.usage_count.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-500">{template.last_updated}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={() => setSelectedTemplate(template)}
                      title="Görüntüle"
                    >
                      <Eye className="w-6 h-6 sm:w-5 sm:h-5 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Düzenle"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <Edit className="w-6 h-6 sm:w-5 sm:h-5 text-primary-blue" />
                    </button>
                    <button
                      type="button"
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sil"
                      onClick={async () => {
                        // eslint-disable-next-line no-alert
                        if (!window.confirm('Şablon silinsin mi?')) return;
                        const r = await adminApi.deleteEmailTemplate(template.id).catch(() => null);
                        if (!r?.success) {
                          setError(r?.error || 'Silinemedi.');
                          return;
                        }
                        await load();
                      }}
                    >
                      <Trash2 className="w-6 h-6 sm:w-5 sm:h-5 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {templates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-600">
                  Henüz şablon yok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Şablon Önizleme */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900">{selectedTemplate.name}</h3>
                <button 
                  onClick={() => setSelectedTemplate(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">Konu: {selectedTemplate.subject}</p>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                {/* Render in a sandboxed iframe to avoid XSS in admin context */}
                <iframe
                  title="E-posta Önizleme"
                  sandbox=""
                  className="w-full h-[420px] bg-white rounded-lg border border-gray-200"
                  srcDoc={`<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0;padding:16px;font-family:Arial,sans-serif;line-height:1.6;color:#111827;">${String(
                    selectedTemplate.content_html || ''
                  )}</body></html>`}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditingTemplate(selectedTemplate);
                  setSelectedTemplate(null);
                }}
                className="flex-1 px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
              >
                Düzenle
              </button>
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTemplate ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="text-xl font-black text-gray-900">Şablon Düzenle</div>
              <button type="button" onClick={() => setEditingTemplate(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-3">
              <input
                value={editingTemplate.name || ''}
                onChange={(e) => setEditingTemplate((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
              <input
                value={editingTemplate.subject || ''}
                onChange={(e) => setEditingTemplate((p) => ({ ...p, subject: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
              <textarea
                value={editingTemplate.content_html || ''}
                onChange={(e) => setEditingTemplate((p) => ({ ...p, content_html: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                rows={10}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-5 py-3 rounded-xl bg-primary-blue text-white font-black hover:bg-blue-600"
                  onClick={async () => {
                    const id = editingTemplate.id;
                    const r = await adminApi
                      .updateEmailTemplate(id, {
                        name: editingTemplate.name,
                        subject: editingTemplate.subject,
                        content_html: editingTemplate.content_html,
                        type: editingTemplate.type,
                        is_active: editingTemplate.is_active !== false,
                      })
                      .catch(() => null);
                    if (!r?.success) {
                      setError(r?.error || 'Güncellenemedi.');
                      return;
                    }
                    setEditingTemplate(null);
                    await load();
                  }}
                >
                  Kaydet
                </button>
                <button type="button" className="px-5 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 font-semibold" onClick={() => setEditingTemplate(null)}>
                  Vazgeç
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
