import { useState } from 'react';
import { Avatar } from '../components/common/Avatar';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { formatTimeAgo } from '../utils/formatters';
import { mockUsers } from '../mock/users';

export const MessagesPage = () => {
  const [selectedConv, setSelectedConv] = useState(null);
  const [conversations] = useState([
    { id: 1, user: mockUsers[4], lastMessage: 'Merhaba, nasılsın?', unread: 2, time: '2025-11-15T10:00:00Z' },
    { id: 2, user: mockUsers[5], lastMessage: 'Teşekkürler', unread: 0, time: '2025-11-14T15:30:00Z' },
  ]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-main py-8">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[600px]">
          {/* Konuşma Listesi */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold">Mesajlar</h2>
            </div>
            <div className="overflow-y-auto h-full">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedConv?.id === conv.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar src={conv.user.profile_image} size="48px" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold truncate">{conv.user.full_name}</span>
                        {conv.unread > 0 && (
                          <Badge variant="danger" size="small">{conv.unread}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatTimeAgo(conv.time)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Mesaj Thread */}
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col">
            {selectedConv ? (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar src={selectedConv.user.profile_image} size="40px" />
                    <div>
                      <h3 className="font-semibold">{selectedConv.user.full_name}</h3>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <div className="bg-primary-blue text-white rounded-lg px-4 py-2 max-w-[70%]">
                        Merhaba!
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 max-w-[70%]">
                        {selectedConv.lastMessage}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input placeholder="Mesajınızı yazın..." className="flex-1" />
                    <Button>Gönder</Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Bir konuşma seçin
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
