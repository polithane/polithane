/**
 * Teşkilat Etkinlikleri Sayfası
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { organization } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { Calendar, MapPin, Users, Plus, ArrowLeft, Loader2, Clock, Edit, Trash2 } from 'lucide-react';

export const OrgEventsPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventDate: '',
    location: '',
    address: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await organization.getEvents();
      if (response.success) {
        setEvents(response.events || []);
      }
    } catch (error) {
      console.error('Events fetch error:', error);
      toast.error('Etkinlikler alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.eventDate) {
      toast.error('Başlık ve tarih zorunludur.');
      return;
    }

    try {
      setCreating(true);
      const response = await organization.createEvent(formData);
      if (response.success) {
        toast.success('Etkinlik oluşturuldu!');
        setShowCreateModal(false);
        setFormData({ title: '', description: '', eventDate: '', location: '', address: '' });
        await fetchEvents();
      }
    } catch (error) {
      console.error('Create event error:', error);
      toast.error(error.message || 'Etkinlik oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await organization.deleteEvent(eventId);
      if (response.success) {
        toast.success('Etkinlik silindi.');
        await fetchEvents();
        if (selectedEvent?.id === eventId) {
          setSelectedEvent(null);
        }
      }
    } catch (error) {
      console.error('Delete event error:', error);
      toast.error('Etkinlik silinemedi.');
    }
  };

  const canCreateEvent = ['metropolitan_mayor', 'provincial_chair', 'district_mayor', 'district_chair'].includes(
    user?.politician_type
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <a
              href="/organization"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </a>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Teşkilat Etkinlikleri</h1>
              <p className="text-sm text-gray-600">Etkinlik yönetimi ve katılım takibi</p>
            </div>
          </div>
          {canCreateEvent && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
            >
              <Plus className="w-5 h-5" />
              Yeni Etkinlik
            </button>
          )}
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Etkinlik Listesi */}
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 font-semibold">Henüz etkinlik yok</p>
                {canCreateEvent && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 text-primary-blue hover:underline"
                  >
                    İlk etkinliği oluştur
                  </button>
                )}
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`bg-white rounded-xl shadow-lg border-2 cursor-pointer transition-all hover:shadow-xl ${
                    selectedEvent?.id === event.id ? 'border-primary-blue' : 'border-gray-200'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-black text-gray-900">{event.title}</h3>
                      <span className="text-xs bg-blue-100 text-primary-blue px-2 py-1 rounded-full font-semibold">
                        {event.task_count || 0} Görev
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(event.event_date).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <Users className="w-4 h-4" />
                        <span className="text-xs">Oluşturan: {event.creator_name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detay Paneli */}
          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-120px)]">
            {selectedEvent ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-2xl font-black text-gray-900">{selectedEvent.title}</h2>
                  <div className="flex gap-2">
                    {selectedEvent.created_by === user?.id && (
                      <button
                        onClick={() => handleDeleteEvent(selectedEvent.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary-blue flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase">Tarih & Saat</p>
                      <p className="text-sm font-bold text-gray-900">
                        {new Date(selectedEvent.event_date).toLocaleDateString('tr-TR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-gray-700">
                        {new Date(selectedEvent.event_date).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {selectedEvent.location && (
                    <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600 font-semibold uppercase">Konum</p>
                        <p className="text-sm font-bold text-gray-900">{selectedEvent.location}</p>
                        {selectedEvent.address && (
                          <p className="text-sm text-gray-700 mt-1">{selectedEvent.address}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedEvent.description && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Açıklama</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedEvent.description}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900">Görevler</h3>
                    <span className="text-xs bg-blue-100 text-primary-blue px-2 py-1 rounded-full font-semibold">
                      {selectedEvent.task_count || 0} Görev
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Görev detaylarını görmek için "Görevler" modülüne gidin.
                  </p>
                  <a
                    href="/organization/tasks"
                    className="mt-3 inline-block text-primary-blue hover:underline font-semibold text-sm"
                  >
                    Görevleri Görüntüle →
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center h-full flex items-center justify-center">
                <div>
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-semibold">Bir etkinlik seçin</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Etkinlik Oluştur Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-gray-900">Yeni Etkinlik Oluştur</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Etkinlik Başlığı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Tarih & Saat <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Konum</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue"
                  placeholder="Örn: Parti Merkezi"
                  maxLength={300}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Adres</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue resize-y"
                  rows={2}
                  placeholder="Detaylı adres..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue resize-y"
                  rows={4}
                  placeholder="Etkinlik hakkında detaylı bilgi..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-primary-blue text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    'Etkinlik Oluştur'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgEventsPage;
