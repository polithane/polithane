/**
 * Teşkilat Görevler & Mazeretler Sayfası
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { organization } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { 
  ClipboardList, ArrowLeft, Loader2, CheckCircle, XCircle, Clock,
  AlertCircle, ThumbsUp, ThumbsDown, UserPlus
} from 'lucide-react';

export const OrgTasksPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'excuses'
  const [tasks, setTasks] = useState([]);
  const [excuses, setExcuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedExcuse, setSelectedExcuse] = useState(null);
  const [excuseText, setExcuseText] = useState('');
  const [showExcuseModal, setShowExcuseModal] = useState(false);
  const [showDecideModal, setShowDecideModal] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (activeTab === 'my') {
      fetchMyTasks();
    } else {
      fetchPendingExcuses();
    }
  }, [activeTab]);

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      const response = await organization.getMyTasks();
      if (response.success) {
        setTasks(response.tasks || []);
      }
    } catch (error) {
      console.error('Tasks fetch error:', error);
      toast.error('Görevler alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingExcuses = async () => {
    try {
      setLoading(true);
      const response = await organization.getPendingExcuses();
      if (response.success) {
        setExcuses(response.excuses || []);
      }
    } catch (error) {
      console.error('Excuses fetch error:', error);
      toast.error('Mazeretler alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTask = async (taskId) => {
    try {
      setProcessing(true);
      const response = await organization.acceptTask(taskId);
      if (response.success) {
        toast.success('Görev kabul edildi!');
        await fetchMyTasks();
      }
    } catch (error) {
      console.error('Accept task error:', error);
      toast.error('Görev kabul edilemedi.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitExcuse = async (e) => {
    e.preventDefault();
    if (!excuseText.trim()) {
      toast.error('Mazeret açıklaması zorunludur.');
      return;
    }

    try {
      setProcessing(true);
      const response = await organization.submitExcuse(selectedTask.id, excuseText);
      if (response.success) {
        toast.success('Mazeret bildirildi.');
        setShowExcuseModal(false);
        setExcuseText('');
        setSelectedTask(null);
        await fetchMyTasks();
      }
    } catch (error) {
      console.error('Submit excuse error:', error);
      toast.error('Mazeret bildirilemedi.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecideExcuse = async (decision) => {
    try {
      setProcessing(true);
      const response = await organization.decideExcuse(selectedExcuse.id, {
        decision,
        decisionNote: decisionNote.trim() || null,
      });
      if (response.success) {
        toast.success(`Mazeret ${decision === 'accepted' ? 'kabul edildi' : 'reddedildi'}.`);
        setShowDecideModal(false);
        setDecisionNote('');
        setSelectedExcuse(null);
        await fetchPendingExcuses();
      }
    } catch (error) {
      console.error('Decide excuse error:', error);
      toast.error('İşlem başarısız.');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Bekliyor', icon: Clock },
      accepted: { bg: 'bg-green-100', text: 'text-green-700', label: 'Kabul Edildi', icon: CheckCircle },
      excused: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Mazeretli', icon: AlertCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Reddedildi', icon: XCircle },
      completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Tamamlandı', icon: CheckCircle },
    };

    const style = styles[status] || styles.pending;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1 ${style.bg} ${style.text} px-2 py-1 rounded-full text-xs font-semibold`}>
        <Icon className="w-3 h-3" />
        {style.label}
      </span>
    );
  };

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
              <h1 className="text-2xl font-black text-gray-900">Görev Yönetimi</h1>
              <p className="text-sm text-gray-600">Atanan görevler ve mazeret takibi</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-6 py-3 font-bold transition-colors border-b-2 ${
              activeTab === 'my'
                ? 'border-primary-blue text-primary-blue'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Benim Görevlerim
          </button>
          <button
            onClick={() => setActiveTab('excuses')}
            className={`px-6 py-3 font-bold transition-colors border-b-2 ${
              activeTab === 'excuses'
                ? 'border-primary-blue text-primary-blue'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Bekleyen Mazeretler
            {excuses.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {excuses.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-blue" />
          </div>
        ) : (
          <>
            {/* Benim Görevlerim Tab */}
            {activeTab === 'my' && (
              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                    <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-semibold">Henüz görev atanmamış</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-black text-gray-900">{task.title}</h3>
                            {getStatusBadge(task.status)}
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>📅 {task.event_title}</span>
                            <span>👤 Atayan: {task.assigned_by_name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Görev Aksiyonları */}
                      {task.status === 'pending' && (
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => handleAcceptTask(task.id)}
                            disabled={processing}
                            className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 font-semibold"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Görevi Kabul Et
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setShowExcuseModal(true);
                            }}
                            disabled={processing}
                            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 font-semibold"
                          >
                            <AlertCircle className="w-5 h-5" />
                            Mazeret Bildir
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Bekleyen Mazeretler Tab */}
            {activeTab === 'excuses' && (
              <div className="space-y-4">
                {excuses.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-semibold">Bekleyen mazeret yok</p>
                  </div>
                ) : (
                  excuses.map((excuse) => (
                    <div key={excuse.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-black text-gray-900">{excuse.task_title}</h3>
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold">
                              Mazeret Bekliyor
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            📅 Etkinlik: {excuse.event_title}
                          </p>
                          <p className="text-sm text-gray-600 mb-3">
                            👤 Kullanıcı: <strong>{excuse.user_name}</strong> (@{excuse.user_username})
                          </p>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                            <p className="text-xs text-yellow-700 font-semibold uppercase mb-1">Mazeret Açıklaması:</p>
                            <p className="text-sm text-gray-800">{excuse.excuse_text}</p>
                          </div>
                        </div>
                      </div>

                      {/* Mazeret Aksiyonları */}
                      <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setSelectedExcuse(excuse);
                            setShowDecideModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-semibold"
                        >
                          <ThumbsUp className="w-5 h-5" />
                          Kabul Et
                        </button>
                        <button
                          onClick={() => {
                            setSelectedExcuse(excuse);
                            setShowDecideModal(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-semibold"
                        >
                          <ThumbsDown className="w-5 h-5" />
                          Reddet
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Mazeret Bildir Modal */}
      {showExcuseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-black text-gray-900">Mazeret Bildir</h3>
              <p className="text-sm text-gray-600 mt-1">
                Görev: <strong>{selectedTask?.title}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmitExcuse} className="p-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Mazeret Açıklaması <span className="text-red-500">*</span>
              </label>
              <textarea
                value={excuseText}
                onChange={(e) => setExcuseText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue resize-y"
                rows={5}
                placeholder="Mazeretinizi detaylı olarak açıklayın..."
                required
              />

              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowExcuseModal(false);
                    setExcuseText('');
                    setSelectedTask(null);
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="flex-1 bg-primary-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 font-semibold"
                >
                  {processing ? 'Gönderiliyor...' : 'Mazeret Bildir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mazeret Karar Modal */}
      {showDecideModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-black text-gray-900">Mazeret Değerlendirme</h3>
              <p className="text-sm text-gray-600 mt-1">
                Kullanıcı: <strong>{selectedExcuse?.user_name}</strong>
              </p>
            </div>

            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-xs text-yellow-700 font-semibold uppercase mb-1">Mazeret:</p>
                <p className="text-sm text-gray-800">{selectedExcuse?.excuse_text}</p>
              </div>

              <label className="block text-sm font-bold text-gray-700 mb-2">
                Karar Notu (Opsiyonel)
              </label>
              <textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-blue resize-y"
                rows={3}
                placeholder="Kararınız hakkında not ekleyebilirsiniz..."
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowDecideModal(false);
                    setDecisionNote('');
                    setSelectedExcuse(null);
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDecideExcuse('accepted')}
                  disabled={processing}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 font-semibold"
                >
                  Kabul Et
                </button>
                <button
                  onClick={() => handleDecideExcuse('rejected')}
                  disabled={processing}
                  className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 font-semibold"
                >
                  Reddet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrgTasksPage;
