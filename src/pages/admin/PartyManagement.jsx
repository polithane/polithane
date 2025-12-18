import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Save, Trash2, X, Flag, AlertCircle, Layers, UserCheck, MapPin, Building2, Mail, Phone, Globe } from 'lucide-react';
import { admin as adminApi } from '../../utils/api';

export const PartyManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    short_name: '',
    slug: '',
    color: '',
    logo_url: '',
    is_active: true,
  });

  const [editParty, setEditParty] = useState(null);
  const editForm = useMemo(() => {
    if (!editParty) return null;
    return {
      id: editParty.id,
      name: editParty.name || '',
      short_name: editParty.short_name || '',
      slug: editParty.slug || '',
      color: editParty.color || '',
      logo_url: editParty.logo_url || '',
      is_active: !!editParty.is_active,
    };
  }, [editParty]);
  const [editDraft, setEditDraft] = useState(null);

  // Advanced hierarchy modal
  const [hierOpen, setHierOpen] = useState(false);
  const [hierParty, setHierParty] = useState(null);
  const [hierLoading, setHierLoading] = useState(false);
  const [hierData, setHierData] = useState(null);
  const [assignDraft, setAssignDraft] = useState({
    user_id: '',
    unit_type: 'provincial_chair',
    province: '',
    district_name: '',
    title: '',
    contact_phone: '',
    contact_email: '',
    contact_website: '',
  });

  const openHierarchy = async (party) => {
    setHierParty(party);
    setHierOpen(true);
    setHierLoading(true);
    setHierData(null);
    setError('');
    try {
      const r = await adminApi.getPartyHierarchy(party.id);
      if (!r?.success) throw new Error(r?.error || 'Hiyerarşi yüklenemedi.');
      setHierData(r.data || null);
    } catch (e) {
      setError(e?.message || 'Hiyerarşi yüklenemedi.');
      setHierData(null);
    } finally {
      setHierLoading(false);
    }
  };

  const load = async (page = pagination.page) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: pagination.limit };
      if (search.trim()) params.search = search.trim();
      if (activeFilter === 'true' || activeFilter === 'false') params.is_active = activeFilter;
      const res = await adminApi.getParties(params);
      if (!res?.success) throw new Error(res?.error || 'Partiler yüklenemedi.');
      setRows(res.data || []);
      setPagination(res.pagination || { page, limit: pagination.limit, total: 0, totalPages: 1 });
    } catch (e) {
      setError(e?.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editParty) {
      setEditDraft(null);
      return;
    }
    setEditDraft(editForm);
  }, [editParty, editForm]);

  const onCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: createForm.name.trim(),
        short_name: createForm.short_name.trim(),
        slug: createForm.slug.trim() || undefined,
        color: createForm.color.trim() || undefined,
        logo_url: createForm.logo_url.trim() || undefined,
        is_active: !!createForm.is_active,
      };
      const res = await adminApi.createParty(payload);
      if (!res?.success) throw new Error(res?.error || 'Parti oluşturulamadı.');
      setCreateForm({ name: '', short_name: '', slug: '', color: '', logo_url: '', is_active: true });
      setCreateOpen(false);
      await load(1);
    } catch (e) {
      setError(e?.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!editDraft?.id) return;
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: editDraft.name.trim(),
        short_name: editDraft.short_name.trim(),
        slug: editDraft.slug.trim(),
        color: editDraft.color.trim() || null,
        logo_url: editDraft.logo_url.trim() || null,
        is_active: !!editDraft.is_active,
      };
      const res = await adminApi.updateParty(editDraft.id, payload);
      if (!res?.success) throw new Error(res?.error || 'Güncellenemedi.');
      setEditParty(null);
      await load(pagination.page);
    } catch (e) {
      setError(e?.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (id) => {
    if (!id) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm('Partiyi pasif yapmak istiyor musunuz?')) return;
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.deleteParty(id);
      if (!res?.success) throw new Error(res?.error || 'Silinemedi.');
      await load(pagination.page);
    } catch (e) {
      setError(e?.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Flag className="w-7 h-7 text-primary-blue" />
            Parti Yönetimi
          </h1>
          <p className="text-sm text-gray-600">
            Partiler (şimdilik) — il/ilçe teşkilat & belediye modülleri bu ekranın altına eklenecek.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen((v) => !v)}
          className="inline-flex items-center gap-2 bg-primary-blue hover:bg-blue-600 text-white font-bold px-4 py-3 rounded-xl shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Yeni Parti
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ara: parti adı / kısa ad / slug"
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-blue focus:border-primary-blue outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-3 bg-white"
          >
            <option value="">Tümü</option>
            <option value="true">Aktif</option>
            <option value="false">Pasif</option>
          </select>
          <button
            onClick={() => load(1)}
            className="bg-gray-900 hover:bg-black text-white font-bold px-4 py-3 rounded-xl"
          >
            Filtrele
          </button>
        </div>
      </div>

      {createOpen && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900">Yeni Parti Oluştur</h3>
            <button onClick={() => setCreateOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Parti Adı</label>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full mt-1 border border-gray-300 rounded-xl p-3"
                placeholder="Örn: Cumhuriyet Halk Partisi"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Kısa Ad</label>
              <input
                value={createForm.short_name}
                onChange={(e) => setCreateForm((p) => ({ ...p, short_name: e.target.value }))}
                className="w-full mt-1 border border-gray-300 rounded-xl p-3"
                placeholder="Örn: CHP"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Slug (ops.)</label>
              <input
                value={createForm.slug}
                onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))}
                className="w-full mt-1 border border-gray-300 rounded-xl p-3"
                placeholder="örn: chp"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Renk (ops.)</label>
              <input
                value={createForm.color}
                onChange={(e) => setCreateForm((p) => ({ ...p, color: e.target.value }))}
                className="w-full mt-1 border border-gray-300 rounded-xl p-3"
                placeholder="#FF0000"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">Logo URL (ops.)</label>
              <input
                value={createForm.logo_url}
                onChange={(e) => setCreateForm((p) => ({ ...p, logo_url: e.target.value }))}
                className="w-full mt-1 border border-gray-300 rounded-xl p-3"
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={createForm.is_active}
                  onChange={(e) => setCreateForm((p) => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                Aktif
              </label>
              <button
                onClick={onCreate}
                disabled={loading || !createForm.name.trim() || !createForm.short_name.trim()}
                className="bg-primary-blue hover:bg-blue-600 text-white font-bold px-5 py-3 rounded-xl disabled:opacity-50"
              >
                Oluştur
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Toplam: <span className="font-bold text-gray-900">{pagination.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={loading || pagination.page <= 1}
              onClick={() => load(pagination.page - 1)}
              className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50"
            >
              Önceki
            </button>
            <div className="text-sm text-gray-600">
              {pagination.page} / {pagination.totalPages}
            </div>
            <button
              disabled={loading || pagination.page >= pagination.totalPages}
              onClick={() => load(pagination.page + 1)}
              className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Parti</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">Durum</th>
                <th className="px-5 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">{p.id}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.logo_url ? (
                        <img src={p.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100" />
                      )}
                      <div>
                        <div className="font-bold text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.short_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{p.slug}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openHierarchy(p)}
                        className="px-3 py-2 rounded-lg bg-gray-900 hover:bg-black text-white font-semibold inline-flex items-center gap-2"
                        title="Gelişmiş hiyerarşi / iletişim"
                      >
                        <Layers className="w-4 h-4" />
                        Gelişmiş
                      </button>
                      <button
                        onClick={() => setEditParty(p)}
                        className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 font-semibold"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold inline-flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Pasifleştir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-500">
                    Sonuç bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editParty && editDraft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900">Parti Düzenle</h3>
              <button onClick={() => setEditParty(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-gray-700">Parti Adı</label>
                <input
                  value={editDraft.name}
                  onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-xl p-3"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Kısa Ad</label>
                <input
                  value={editDraft.short_name}
                  onChange={(e) => setEditDraft((p) => ({ ...p, short_name: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-xl p-3"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Slug</label>
                <input
                  value={editDraft.slug}
                  onChange={(e) => setEditDraft((p) => ({ ...p, slug: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-xl p-3"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Renk</label>
                <input
                  value={editDraft.color}
                  onChange={(e) => setEditDraft((p) => ({ ...p, color: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-xl p-3"
                  placeholder="#RRGGBB"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Logo URL</label>
                <input
                  value={editDraft.logo_url}
                  onChange={(e) => setEditDraft((p) => ({ ...p, logo_url: e.target.value }))}
                  className="w-full mt-1 border border-gray-300 rounded-xl p-3"
                  placeholder="https://..."
                />
              </div>
              <div className="md:col-span-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={editDraft.is_active}
                    onChange={(e) => setEditDraft((p) => ({ ...p, is_active: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  Aktif
                </label>
                <button
                  onClick={onSave}
                  disabled={loading || !editDraft.name.trim() || !editDraft.short_name.trim() || !editDraft.slug.trim()}
                  className="bg-gray-900 hover:bg-black text-white font-bold px-5 py-3 rounded-xl inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hierOpen && hierParty && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-semibold">Gelişmiş Yönetim</div>
                <div className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <Layers className="w-6 h-6 text-primary-blue" />
                  {hierParty.name}
                </div>
              </div>
              <button
                onClick={() => {
                  setHierOpen(false);
                  setHierParty(null);
                  setHierData(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div className="font-black text-gray-900 mb-2 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-primary-blue" />
                    Yetki / İrtibat Ataması
                  </div>
                  <div className="text-xs text-gray-600 mb-3">
                    Seçtiğiniz kullanıcıya birim görevi ve iletişim bilgisi atanır (kullanıcı metadata alanına kaydedilir).
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-600">Kullanıcı</label>
                      <select
                        value={assignDraft.user_id}
                        onChange={(e) => setAssignDraft((p) => ({ ...p, user_id: e.target.value }))}
                        className="mt-1 w-full border border-gray-300 rounded-xl p-3 bg-white"
                      >
                        <option value="">Seçiniz...</option>
                        {(hierData?.users?.officials || []).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} (@{u.username}) — {u.politician_type || u.user_type}
                          </option>
                        ))}
                        {(hierData?.users?.mps || []).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} (@{u.username}) — mp
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600">Birim Tipi</label>
                      <select
                        value={assignDraft.unit_type}
                        onChange={(e) => setAssignDraft((p) => ({ ...p, unit_type: e.target.value }))}
                        className="mt-1 w-full border border-gray-300 rounded-xl p-3 bg-white"
                      >
                        <option value="provincial_chair">İl Başkanı</option>
                        <option value="district_chair">İlçe Başkanı</option>
                        <option value="metropolitan_mayor">Büyükşehir Belediye Başkanı</option>
                        <option value="district_mayor">İlçe Belediye Başkanı</option>
                        <option value="party_official">Teşkilat Görevlisi</option>
                        <option value="mp">Milletvekili</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-600">İl</label>
                        <input
                          value={assignDraft.province}
                          onChange={(e) => setAssignDraft((p) => ({ ...p, province: e.target.value }))}
                          className="mt-1 w-full border border-gray-300 rounded-xl p-3"
                          placeholder="Örn: Ankara"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600">İlçe (ops.)</label>
                        <input
                          value={assignDraft.district_name}
                          onChange={(e) => setAssignDraft((p) => ({ ...p, district_name: e.target.value }))}
                          className="mt-1 w-full border border-gray-300 rounded-xl p-3"
                          placeholder="Örn: Çankaya"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600">Ünvan (ops.)</label>
                      <input
                        value={assignDraft.title}
                        onChange={(e) => setAssignDraft((p) => ({ ...p, title: e.target.value }))}
                        className="mt-1 w-full border border-gray-300 rounded-xl p-3"
                        placeholder="Örn: İl Başkan Yard."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
                          <Phone className="w-4 h-4" /> Telefon (ops.)
                        </label>
                        <input
                          value={assignDraft.contact_phone}
                          onChange={(e) => setAssignDraft((p) => ({ ...p, contact_phone: e.target.value }))}
                          className="mt-1 w-full border border-gray-300 rounded-xl p-3"
                          placeholder="05xx..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
                          <Mail className="w-4 h-4" /> E‑posta (ops.)
                        </label>
                        <input
                          value={assignDraft.contact_email}
                          onChange={(e) => setAssignDraft((p) => ({ ...p, contact_email: e.target.value }))}
                          className="mt-1 w-full border border-gray-300 rounded-xl p-3"
                          placeholder="ornek@..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Web (ops.)
                      </label>
                      <input
                        value={assignDraft.contact_website}
                        onChange={(e) => setAssignDraft((p) => ({ ...p, contact_website: e.target.value }))}
                        className="mt-1 w-full border border-gray-300 rounded-xl p-3"
                        placeholder="https://..."
                      />
                    </div>

                    <button
                      type="button"
                      disabled={hierLoading || !assignDraft.user_id || !assignDraft.unit_type}
                      onClick={async () => {
                        try {
                          setHierLoading(true);
                          const payload = {
                            user_id: Number(assignDraft.user_id),
                            unit: {
                              unit_type: assignDraft.unit_type,
                              province: assignDraft.province || null,
                              district_name: assignDraft.district_name || null,
                              title: assignDraft.title || null,
                              contact: {
                                phone: assignDraft.contact_phone || null,
                                email: assignDraft.contact_email || null,
                                website: assignDraft.contact_website || null,
                              },
                            },
                          };
                          const r = await adminApi.assignPartyUnit(hierParty.id, payload);
                          if (!r?.success) throw new Error(r?.error || 'Atama kaydedilemedi.');
                          const fresh = await adminApi.getPartyHierarchy(hierParty.id);
                          if (fresh?.success) setHierData(fresh.data || null);
                          setAssignDraft((p) => ({ ...p, title: '', district_name: '', contact_phone: '', contact_email: '', contact_website: '' }));
                        } catch (e) {
                          setError(e?.message || 'Atama kaydedilemedi.');
                        } finally {
                          setHierLoading(false);
                        }
                      }}
                      className="w-full bg-primary-blue hover:bg-blue-600 text-white font-black px-4 py-3 rounded-xl disabled:opacity-50"
                    >
                      {hierLoading ? 'Kaydediliyor…' : 'Ata / Kaydet'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {hierLoading && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 text-gray-600">Yükleniyor…</div>
                )}

                {!hierLoading && hierData && (
                  <>
                    <div className="bg-white border border-gray-200 rounded-2xl p-4">
                      <div className="font-black text-gray-900 mb-2">Özet</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                          <div className="text-xs text-gray-500">Vekil</div>
                          <div className="text-xl font-black">{hierData.counts.mps}</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                          <div className="text-xs text-gray-500">Teşkilat</div>
                          <div className="text-xl font-black">{hierData.counts.party_officials}</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                          <div className="text-xs text-gray-500">İl Başkanı</div>
                          <div className="text-xl font-black">{hierData.counts.provincial_chairs}</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                          <div className="text-xs text-gray-500">İlçe Başkanı</div>
                          <div className="text-xl font-black">{hierData.counts.district_chairs}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-4">
                      <div className="font-black text-gray-900 mb-3 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary-blue" />
                        Atamalar (Yetki/İletişim)
                      </div>
                      {(hierData.assignments || []).length === 0 ? (
                        <div className="text-sm text-gray-600">Henüz bir atama yok.</div>
                      ) : (
                        <div className="space-y-3">
                          {(hierData.assignments || []).map((a, idx) => {
                            const unit = a.unit || {};
                            const contact = unit.contact || {};
                            return (
                              <div key={`${a.user_id}-${unit.key}-${idx}`} className="border border-gray-200 rounded-xl p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <Avatar src={a.avatar_url} size="44px" />
                                    <div className="min-w-0">
                                      <div className="font-black text-gray-900 truncate">{a.full_name}</div>
                                      <div className="text-xs text-gray-500 truncate">@{a.username}</div>
                                      <div className="text-xs text-gray-700 mt-1 inline-flex items-center gap-2">
                                        <span className="px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-primary-blue font-bold">
                                          {unit.unit_type}
                                        </span>
                                        {unit.province && (
                                          <span className="inline-flex items-center gap-1 text-gray-600">
                                            <MapPin className="w-3 h-3" /> {unit.province}
                                          </span>
                                        )}
                                        {unit.district_name && <span className="text-gray-600">/ {unit.district_name}</span>}
                                      </div>
                                      {unit.title && <div className="text-xs text-gray-700 mt-1">{unit.title}</div>}
                                      <div className="mt-2 text-xs text-gray-600 space-y-1">
                                        {contact.phone && <div><Phone className="w-3 h-3 inline-block mr-1" /> {contact.phone}</div>}
                                        {contact.email && <div><Mail className="w-3 h-3 inline-block mr-1" /> {contact.email}</div>}
                                        {contact.website && <div><Globe className="w-3 h-3 inline-block mr-1" /> {contact.website}</div>}
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        setHierLoading(true);
                                        const r = await adminApi.unassignPartyUnit(hierParty.id, { user_id: a.user_id, key: unit.key });
                                        if (!r?.success) throw new Error(r?.error || 'Kaldırılamadı.');
                                        const fresh = await adminApi.getPartyHierarchy(hierParty.id);
                                        if (fresh?.success) setHierData(fresh.data || null);
                                      } catch (e) {
                                        setError(e?.message || 'Kaldırılamadı.');
                                      } finally {
                                        setHierLoading(false);
                                      }
                                    }}
                                    className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black"
                                  >
                                    Kaldır
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

