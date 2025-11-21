import { mockUsers } from './users.js';

// Mesaj mock data
export const mockConversations = [
  {
    conversation_id: 1,
    participant_id: 2, // Kemal Kılıçdaroğlu
    last_message: 'Yarınki toplantı için hazırladığım sunumu gönderdim.',
    last_message_time: '2025-11-20T10:30:00Z',
    unread_count: 2,
    is_archived: false,
    is_muted: false,
    message_type: 'regular' // regular, request
  },
  {
    conversation_id: 2,
    participant_id: 1, // Recep Tayyip Erdoğan
    last_message: 'Teşekkür ederim, inceleyeceğim.',
    last_message_time: '2025-11-20T09:15:00Z',
    unread_count: 0,
    is_archived: false,
    is_muted: false,
    message_type: 'regular'
  },
  {
    conversation_id: 3,
    participant_id: 5, // Devlet Bahçeli
    last_message: 'Anlaştık, görüşmek üzere.',
    last_message_time: '2025-11-19T18:45:00Z',
    unread_count: 1,
    is_archived: false,
    is_muted: false,
    message_type: 'regular'
  },
  {
    conversation_id: 4,
    participant_id: 10,
    last_message: 'Merhaba, size bir önerim var...',
    last_message_time: '2025-11-19T14:20:00Z',
    unread_count: 1,
    is_archived: false,
    is_muted: false,
    message_type: 'request' // Mesaj isteği
  },
  {
    conversation_id: 5,
    participant_id: 15,
    last_message: 'Projeniz hakkında konuşmak isterim.',
    last_message_time: '2025-11-19T11:30:00Z',
    unread_count: 3,
    is_archived: false,
    is_muted: false,
    message_type: 'request'
  },
  {
    conversation_id: 6,
    participant_id: 3,
    last_message: 'İyi günler dilerim 👋',
    last_message_time: '2025-11-18T16:00:00Z',
    unread_count: 0,
    is_archived: false,
    is_muted: true,
    message_type: 'regular'
  }
];

// Mesaj detayları
export const mockMessages = {
  1: [ // conversation_id: 1
    {
      message_id: 101,
      conversation_id: 1,
      sender_id: 2,
      receiver_id: 'currentUser',
      message_text: 'Merhaba! Yarınki toplantı için hazır mısınız?',
      created_at: '2025-11-20T09:00:00Z',
      is_read: true
    },
    {
      message_id: 102,
      conversation_id: 1,
      sender_id: 'currentUser',
      receiver_id: 2,
      message_text: 'Merhaba, evet hazırım. Sunumunuzu bekliyorum.',
      created_at: '2025-11-20T09:15:00Z',
      is_read: true
    },
    {
      message_id: 103,
      conversation_id: 1,
      sender_id: 2,
      receiver_id: 'currentUser',
      message_text: 'Yarınki toplantı için hazırladığım sunumu gönderdim.',
      created_at: '2025-11-20T10:30:00Z',
      is_read: false
    },
    {
      message_id: 104,
      conversation_id: 1,
      sender_id: 2,
      receiver_id: 'currentUser',
      message_text: 'Lütfen gözden geçirip geri dönüş yapın.',
      created_at: '2025-11-20T10:31:00Z',
      is_read: false
    }
  ],
  2: [
    {
      message_id: 201,
      conversation_id: 2,
      sender_id: 'currentUser',
      receiver_id: 1,
      message_text: 'Geçen hafta gönderdiğim raporu incelediniz mi?',
      created_at: '2025-11-20T08:00:00Z',
      is_read: true
    },
    {
      message_id: 202,
      conversation_id: 2,
      sender_id: 1,
      receiver_id: 'currentUser',
      message_text: 'Teşekkür ederim, inceleyeceğim.',
      created_at: '2025-11-20T09:15:00Z',
      is_read: true
    }
  ],
  3: [
    {
      message_id: 301,
      conversation_id: 3,
      sender_id: 5,
      receiver_id: 'currentUser',
      message_text: 'Bugün saat 3\'te müsait misiniz?',
      created_at: '2025-11-19T17:30:00Z',
      is_read: true
    },
    {
      message_id: 302,
      conversation_id: 3,
      sender_id: 'currentUser',
      receiver_id: 5,
      message_text: 'Evet müsaitim, görüşelim.',
      created_at: '2025-11-19T18:00:00Z',
      is_read: true
    },
    {
      message_id: 303,
      conversation_id: 3,
      sender_id: 5,
      receiver_id: 'currentUser',
      message_text: 'Anlaştık, görüşmek üzere.',
      created_at: '2025-11-19T18:45:00Z',
      is_read: false
    }
  ]
};

// Mesaj üret
export const generateMockMessages = (conversationId, count = 20) => {
  const messages = [];
  const sampleTexts = [
    'Merhaba!',
    'Nasılsınız?',
    'Yarınki toplantı için hazır mısınız?',
    'Teşekkür ederim.',
    'Anlaştık, görüşmek üzere.',
    'Bilgilendirme için sağolun.',
    'Güzel bir paylaşım olmuş.',
    'Fikrinizi merak ediyorum.',
    'Proje hakkında konuşabilir miyiz?',
    'İyi çalışmalar dilerim.'
  ];
  
  for (let i = 0; i < count; i++) {
    const isFromMe = i % 2 === 0;
    messages.push({
      message_id: conversationId * 1000 + i,
      conversation_id: conversationId,
      sender_id: isFromMe ? 'currentUser' : conversationId,
      receiver_id: isFromMe ? conversationId : 'currentUser',
      message_text: sampleTexts[Math.floor(Math.random() * sampleTexts.length)],
      created_at: new Date(Date.now() - (count - i) * 60 * 60 * 1000).toISOString(),
      is_read: i < count - 3
    });
  }
  
  return messages;
};

// Kullanıcı mesaj ayarları
export const mockMessageSettings = {
  user_id: 'currentUser',
  message_reception: 'everyone', // everyone, friends, nobody
  show_read_receipts: true,
  show_online_status: true,
  allow_message_requests: true
};
