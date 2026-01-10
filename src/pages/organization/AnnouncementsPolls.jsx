/**
 * Teşkilat Duyurular & Anketler Sayfası
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { organization } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { Megaphone, BarChart3, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export const OrgAnnouncementsPollsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('announcements'); // 'announcements' | 'polls'
  const [announcements, setAnnouncements] = useState([]);
  const [polls, setPolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [pollResults, setPollResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'announcements') {
      fetchAnnouncements();
    } else {
      fetchPolls();
    }
  }, [activeTab]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await organization.getAnnouncements();
      if (response.success) {
        setAnnouncements(response.announcements || []);
      }
    } catch (error) {
      console.error('Announcements fetch error:', error);
      toast.error('Duyurular alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const response = await organization.getPolls();
      if (response.success) {
        setPolls(response.polls || []);
      }
    } catch (error) {
      console.error('Polls fetch error:', error);
      toast.error('Anketler alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAnnouncementRead = async (id) => {
    try {
      await organization.markAnnouncementRead(id);
      await fetchAnnouncements();
    } catch (error) {
      console.error('Mark read error:', error);
    }
  };

  const handleVotePoll = async (pollId, optionIndex) => {
    try {
      const response = await organization.votePoll(pollId, optionIndex);
      if (response.success) {
        toast.success('Oyunuz kaydedildi!');
        await fetchPolls();
        if (selectedPoll?.id === pollId) {
          await fetchPollResults(pollId);
        }
      }
    } catch (error) {
      console.error('Vote error:', error);
      toast.error(error.message || 'Oy kullanılamadı.');
    }
  };

  const fetchPollResults = async (pollId) => {
    try {
      const response = await organization.getPollResults(pollId);
      if (response.success) {
        setPollResults(response.results || []);
      }
    } catch (error) {
      console.error('Results fetch error:', error);
      toast.error('Sonuçlar alınamadı.');
    }
  };

  const handleSelectPoll = (poll) => {
    setSelectedPoll(poll);
    fetchPollResults(poll.id);
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
              <h1 className="text-2xl font-black text-gray-900">Duyurular & Anketler</h1>
              <p className="text-sm text-gray-600">Parti içi bilgilendirme ve oy kullanma</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-6 py-3 font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'announcements'
                ? 'border-primary-blue text-primary-blue'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Megaphone className="w-5 h-5" />
            Duyurular
          </button>
          <button
            onClick={() => setActiveTab('polls')}
            className={`px-6 py-3 font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'polls'
                ? 'border-primary-blue text-primary-blue'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Anketler
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-blue" />
          </div>
        ) : (
          <>
            {/* Duyurular Tab */}
            {activeTab === 'announcements' && (
              <div className="space-y-4">
                {announcements.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                    <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-semibold">Henüz duyuru yok</p>
                  </div>
                ) : (
                  announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`bg-white rounded-xl shadow-lg border-2 p-6 transition-all ${
                        announcement.is_read ? 'border-gray-200' : 'border-primary-blue'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-black text-gray-900 flex-1">{announcement.title}</h3>
                        {!announcement.is_read && (
                          <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            Yeni
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">{announcement.content}</p>

                      <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                        <span>
                          Yayınlayan: <strong>{announcement.creator_name}</strong>
                        </span>
                        <span>
                          {new Date(announcement.created_at).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      {!announcement.is_read && (
                        <button
                          onClick={() => handleMarkAnnouncementRead(announcement.id)}
                          className="mt-3 text-primary-blue hover:underline font-semibold text-sm"
                        >
                          Okundu olarak işaretle
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Anketler Tab */}
            {activeTab === 'polls' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Anket Listesi */}
                <div className="space-y-4">
                  {polls.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                      <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 font-semibold">Henüz anket yok</p>
                    </div>
                  ) : (
                    polls.map((poll) => (
                      <div
                        key={poll.id}
                        onClick={() => handleSelectPoll(poll)}
                        className={`bg-white rounded-xl shadow-lg border-2 p-6 cursor-pointer transition-all hover:shadow-xl ${
                          selectedPoll?.id === poll.id ? 'border-primary-blue' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-black text-gray-900 flex-1">{poll.title}</h3>
                          {poll.has_voted && (
                            <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                          )}
                        </div>

                        {poll.description && (
                          <p className="text-sm text-gray-600 mb-3">{poll.description}</p>
                        )}

                        <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                          <span>
                            {poll.total_votes || 0} oy
                          </span>
                          <span>
                            {poll.is_anonymous ? '🔒 Gizli' : '👥 Açık'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Anket Detay */}
                <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-120px)]">
                  {selectedPoll ? (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                      <div className="mb-6">
                        <div className="flex items-start justify-between mb-3">
                          <h2 className="text-2xl font-black text-gray-900">{selectedPoll.title}</h2>
                          {selectedPoll.has_voted && (
                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                              Oy Kullandınız
                            </span>
                          )}
                        </div>
                        {selectedPoll.description && (
                          <p className="text-sm text-gray-600">{selectedPoll.description}</p>
                        )}
                      </div>

                      {/* Anket Seçenekleri ve Sonuçlar */}
                      {pollResults ? (
                        <div className="space-y-3">
                          {pollResults.map((result) => {
                            const totalVotes = pollResults.reduce((sum, r) => sum + r.voteCount, 0);
                            const percentage = totalVotes > 0 ? Math.round((result.voteCount / totalVotes) * 100) : 0;

                            return (
                              <div key={result.index}>
                                {!selectedPoll.has_voted ? (
                                  <button
                                    onClick={() => handleVotePoll(selectedPoll.id, result.index)}
                                    className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-primary-blue hover:bg-blue-50 transition-all font-semibold"
                                  >
                                    {result.option}
                                  </button>
                                ) : (
                                  <div className="p-4 border border-gray-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-semibold text-gray-900">{result.option}</span>
                                      <span className="text-sm font-bold text-primary-blue">{percentage}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                      <div
                                        className="bg-primary-blue h-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                      />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{result.voteCount} oy</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-primary-blue" />
                        </div>
                      )}

                      <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
                        <p>
                          Toplam: <strong>{selectedPoll.total_votes || 0}</strong> oy
                        </p>
                        <p className="mt-1">
                          Oluşturan: <strong>{selectedPoll.creator_name}</strong>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center h-full flex items-center justify-center">
                      <div>
                        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 font-semibold">Bir anket seçin</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OrgAnnouncementsPollsPage;
