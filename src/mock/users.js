// Mock kullanıcı verileri - Güncel Milletvekili Listesi ile uyumlu
import { getProfileImagePath } from '../utils/imagePaths.js';
import { membersOfParliament } from '../data/membersOfParliament.js';
import { CITY_CODES } from '../utils/constants.js';

// Parti isimlerini party_id'ye çeviren mapping
const partyNameToId = {
  'AK Parti': 1,
  'CHP': 2,
  'DEM PARTİ': 3,
  'MHP': 4,
  'İYİ Parti': 5,
  'YENİ YOL': 6,
  'YENİDEN REFAH': 7,
  'HÜDA PAR': 8,
  'TİP': 9,
  'DBP': 10,
  'EMEP': 11,
  'SAADET Partisi': 12,
  'DSP': 13,
  'DP': 14,
  'BAĞIMSIZ': null
};

// Şehir isimlerini kodlara çeviren mapping
const cityNameToCode = Object.entries(CITY_CODES).reduce((acc, [code, name]) => {
  acc[name.toUpperCase()] = code;
  return acc;
}, {});

// Milletvekillerinden kullanıcı oluştur
const mpUsers = membersOfParliament.map((mp, index) => {
  const userId = index + 1;
  const nameParts = mp.name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');
  const username = `${firstName.toLowerCase()}_${lastName.toLowerCase().replace(/\s+/g, '_')}`;
  const partyId = partyNameToId[mp.party] || null;
  const cityCode = cityNameToCode[mp.city] || null;
  
  return {
    user_id: userId,
    username: username,
    email: `${username}@tbmm.gov.tr`,
    full_name: mp.name,
    profile_image: getProfileImagePath('politician', 'mp', username, userId),
    bio: `${mp.party} Milletvekili - ${mp.city}`,
    user_type: 'politician',
    politician_type: 'mp',
    party_id: partyId,
    city_code: cityCode,
    verification_badge: true,
    polit_score: Math.floor(Math.random() * 50000) + 5000,
    follower_count: Math.floor(Math.random() * 100000) + 10000,
    following_count: Math.floor(Math.random() * 200) + 50,
    post_count: Math.floor(Math.random() * 500) + 50,
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
  };
});

// Medya kullanıcıları - 40 farklı medya kuruluşu
const mediaOutlets = [
  { name: 'Habertürk', domain: 'haberturk.com' },
  { name: 'Hürriyet', domain: 'hurriyet.com.tr' },
  { name: 'CNN Türk', domain: 'cnnturk.com' },
  { name: 'NTV', domain: 'ntv.com.tr' },
  { name: 'TRT Haber', domain: 'trthaber.com' },
  { name: 'Sözcü', domain: 'sozcu.com.tr' },
  { name: 'Cumhuriyet', domain: 'cumhuriyet.com.tr' },
  { name: 'Milliyet', domain: 'milliyet.com.tr' },
  { name: 'Sabah', domain: 'sabah.com.tr' },
  { name: 'Yeni Şafak', domain: 'yenisafak.com' },
  { name: 'Akit', domain: 'yeniakit.com.tr' },
  { name: 'Star', domain: 'star.com.tr' },
  { name: 'Takvim', domain: 'takvim.com.tr' },
  { name: 'Posta', domain: 'posta.com.tr' },
  { name: 'Vatan', domain: 'gazetevatan.com' },
  { name: 'Karar', domain: 'gazetekarar.com' },
  { name: 'BirGün', domain: 'birgun.net' },
  { name: 'Evrensel', domain: 'evrensel.net' },
  { name: 'Anadolu Ajansı', domain: 'aa.com.tr' },
  { name: 'DHA', domain: 'dha.com.tr' },
  { name: 'İHA', domain: 'iha.com.tr' },
  { name: 'BBC Türkçe', domain: 'bbc.com/turkce' },
  { name: 'Euronews Türkçe', domain: 'euronews.com/tr' },
  { name: 'DW Türkçe', domain: 'dw.com/tr' },
  { name: 'Bloomberg HT', domain: 'bloomberght.com' },
  { name: 'Ekonomim', domain: 'ekonomim.com' },
  { name: 'Para', domain: 'para.com.tr' },
  { name: 'Dünya', domain: 'dunya.com' },
  { name: 'Haber7', domain: 'haber7.com' },
  { name: 'Mynet', domain: 'mynet.com' },
  { name: 'Ensonhaber', domain: 'ensonhaber.com' },
  { name: 'Haber Global', domain: 'haberglobal.com.tr' },
  { name: 'A Haber', domain: 'ahaber.com.tr' },
  { name: 'Show Haber', domain: 'showhaber.com' },
  { name: 'Kanal D', domain: 'kanald.com.tr' },
  { name: 'Fox Haber', domain: 'fox.com.tr' },
  { name: 'TV100', domain: 'tv100.com' },
  { name: 'TGRT Haber', domain: 'tgrthaber.com.tr' },
  { name: 'Ulusal Kanal', domain: 'ulusal.com.tr' },
  { name: 'Halk TV', domain: 'halktv.com.tr' }
];

const journalistNames = [
  'Ayşe Demir', 'Mehmet Yılmaz', 'Fatma Kaya', 'Ahmet Özdemir', 'Zeynep Arslan',
  'Can Şahin', 'Elif Çelik', 'Mustafa Aydın', 'Selin Yıldız', 'Burak Kurt',
  'Deniz Öztürk', 'Ece Aksoy', 'Emre Koç', 'Gizem Uzun', 'Hakan Doğan',
  'İrem Polat', 'Kerem Bulut', 'Lale Taş', 'Mert Kılıç', 'Naz Erdem',
  'Onur Yavuz', 'Pelin Caner', 'Rıza Tekin', 'Simge Ateş', 'Tolga Bayrak',
  'Ufuk Karaca', 'Vildan Şen', 'Yasemin Duran', 'Zafer Güven', 'Aslı Toprak',
  'Berk Soylu', 'Ceren Akın', 'Doruk Eren', 'Ebru Kara', 'Furkan Şimşek',
  'Gül Mutlu', 'Hande Aksoy', 'İlker Yaman', 'Jale Sezer', 'Kaan Özkan'
];

const mediaUsers = mediaOutlets.map((outlet, index) => ({
  user_id: mpUsers.length + index + 1,
  username: `${journalistNames[index].split(' ')[0].toLowerCase()}_${outlet.domain.split('.')[0]}`,
  email: `${journalistNames[index].split(' ')[0].toLowerCase()}@${outlet.domain}`,
  full_name: journalistNames[index],
  profile_image: getProfileImagePath('media', null, `${journalistNames[index].split(' ')[0].toLowerCase()}_medya`, mpUsers.length + index + 1),
  bio: `Gazeteci - ${outlet.name}`,
  user_type: 'media',
  verification_badge: true,
  polit_score: Math.floor(Math.random() * 20000) + 5000,
  follower_count: Math.floor(Math.random() * 80000) + 20000,
  following_count: Math.floor(Math.random() * 1000) + 300,
  post_count: Math.floor(Math.random() * 400) + 100,
  created_at: new Date(Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000).toISOString()
}));

// Teşkilat kullanıcıları - 60 kişi (il/ilçe başkanları, belediye başkanları, MYK üyeleri, vb.)
const organizationTypes = ['provincial_chair', 'district_chair', 'metropolitan_mayor', 'district_mayor', 'myk_member', 'vice_chair', 'other'];
const organizationTitles = {
  'provincial_chair': 'İl Başkanı',
  'district_chair': 'İlçe Başkanı',
  'metropolitan_mayor': 'Büyükşehir Belediye Başkanı',
  'district_mayor': 'İlçe Belediye Başkanı',
  'myk_member': 'MYK Üyesi',
  'vice_chair': 'Genel Başkan Yardımcısı',
  'other': 'Parti Yöneticisi'
};

const organizationNames = [
  'Hasan Öztürk', 'Merve Kılıç', 'Barış Yıldırım', 'Seda Acar', 'Cem Koçak',
  'Aylin Erdoğan', 'Serkan Turan', 'Gökçe Demirtaş', 'Okan Şentürk', 'Nihan Aksoy',
  'Erdem Çetin', 'Didem Karaca', 'Kürşat Yavuz', 'Elif Özcan', 'Taner Bozkurt',
  'Pınar Güneş', 'Volkan Kılıçarslan', 'Esra Çakır', 'Murat Sevinç', 'Sevgi Aydoğdu',
  'Alper Bayram', 'Neslihan Koç', 'Selim Tan', 'Burcu Özer', 'İbrahim Sönmez',
  'Özge Türker', 'Hüseyin Aydın', 'Nilüfer Arslan', 'Ramazan Kurt', 'Serap Yılmaz',
  'Ömer Kaya', 'Yeşim Çelik', 'Tahir Şahin', 'Gülşah Doğan', 'Recep Özdemir',
  'Sibel Yıldız', 'Kadir Aksoy', 'Tuğba Ergin', 'Mehmet Ali Tekin', 'Zehra Bulut',
  'Mansur Yavaş', 'Ekrem İmamoğlu', 'Tunç Soyer', 'Ahmet Öküzcüoğlu', 'Mehmet Oktay',
  'Fatma Şahin', 'Alinur Aktaş', 'Murat Kurum', 'Recep Gürkan', 'Mevlüt Uysal',
  'Cemil Deveci', 'Hasan Can Kaya', 'İsmail Altay', 'Yusuf Bahadır', 'Canan Akın',
  'Beyza Sarı', 'Deniz Çınar', 'Efe Yalçın', 'Gamze Toprak', 'Hüseyin Özkan'
];

const cityCodes = ['34', '06', '35', '16', '07', '01', '27', '38', '26', '41', '58', '33', '42', '43', '44', '21', '22', '25', '28', '29', '31', '32', '36', '37', '39', '46', '47', '48', '52', '54'];
const districtNames = ['Çankaya', 'Keçiören', 'Karşıyaka', 'Bornova', 'Konak', 'Muratpaşa', 'Kepez', 'Büyükçekmece', 'Kadıköy', 'Üsküdar', 'Beylikdüzü', 'Ataşehir', 'Maltepe'];

const organizationUsers = organizationNames.map((name, index) => {
  const userId = mpUsers.length + mediaUsers.length + index + 1;
  const orgType = organizationTypes[index % organizationTypes.length];
  const partyId = (index % 7) + 1; // 7 ana parti arasında dağıt
  const firstName = name.split(' ')[0];
  const lastName = name.split(' ').slice(1).join(' ');
  const username = `${firstName.toLowerCase()}_${lastName.toLowerCase().replace(/\s+/g, '_')}_org`;
  const cityCode = cityCodes[index % cityCodes.length];
  const districtName = districtNames[index % districtNames.length];
  
  // Belediye başkanları için Polit Score daha yüksek
  const isPolitScoreRange = ['metropolitan_mayor', 'district_mayor'].includes(orgType) 
    ? { min: 15000, max: 40000 } 
    : { min: 2000, max: 10000 };
  
  return {
    user_id: userId,
    username: username,
    email: `${username}@parti.org.tr`,
    full_name: name,
    profile_image: getProfileImagePath('politician', orgType, username, userId),
    bio: organizationTitles[orgType],
    user_type: 'politician',
    politician_type: orgType,
    party_id: partyId,
    city_code: cityCode,
    district_name: orgType === 'district_mayor' ? districtName : null,
    verification_badge: true,
    polit_score: Math.floor(Math.random() * (isPolitScoreRange.max - isPolitScoreRange.min)) + isPolitScoreRange.min,
    follower_count: Math.floor(Math.random() * 50000) + 10000,
    following_count: Math.floor(Math.random() * 500) + 100,
    post_count: Math.floor(Math.random() * 300) + 50,
    created_at: new Date(Date.now() - Math.random() * 730 * 24 * 60 * 60 * 1000).toISOString()
  };
});

// Eski siyasetçiler - 40 kişi
const exPoliticianNames = [
  'Bülent Arınç', 'İsmail Cem', 'Deniz Baykal', 'Süleyman Demirel', 'Mesut Yılmaz',
  'Tansu Çiller', 'Necmettin Erbakan', 'Devlet Bahçeli (Eski)', 'Meral Akşener (Eski)', 'Ali Babacan (Eski)',
  'Kemal Derviş', 'Abdüllatif Şener', 'İsmail Kahraman', 'Cemil Çiçek', 'Önder Sav',
  'Hikmet Çetin', 'Mehmet Ali Şahin', 'Koksal Toptan', 'Mehmet Ağar', 'Yaşar Okuyan',
  'Ertuğrul Günay', 'İdris Naim Şahin', 'Hüseyin Çelik', 'Ömer Çelik (Eski)', 'Egemen Bağış',
  'Zafer Çağlayan', 'Nihat Ergün', 'Hayati Yazıcı', 'Faruk Çelik', 'Beşir Atalay',
  'Vecdi Gönül', 'Mehmet Şimşek (Eski)', 'Lütfi Elvan', 'Fikri Işık', 'İsmet Yılmaz',
  'Nabi Avcı', 'Veysi Kaynak', 'Süleyman Soylu (Eski)', 'Kemal Kılıçdaroğlu (Eski)', 'Ekmeleddin İhsanoğlu'
];

const exPoliticianUsers = exPoliticianNames.map((name, index) => {
  const userId = mpUsers.length + mediaUsers.length + organizationUsers.length + index + 1;
  const firstName = name.split(' ')[0];
  const lastName = name.split(' ').slice(1).join(' ').replace(/\(Eski\)/g, '').trim();
  const username = `${firstName.toLowerCase()}_${lastName.toLowerCase().replace(/\s+/g, '_')}_ex`;
  
  return {
    user_id: userId,
    username: username,
    email: `${username}@example.com`,
    full_name: name.replace(' (Eski)', ''),
    profile_image: getProfileImagePath('ex_politician', null, username, userId),
    bio: 'Eski Milletvekili',
    user_type: 'ex_politician',
    verification_badge: true,
    polit_score: Math.floor(Math.random() * 25000) + 8000,
    follower_count: Math.floor(Math.random() * 150000) + 50000,
    following_count: Math.floor(Math.random() * 800) + 200,
    post_count: Math.floor(Math.random() * 500) + 100,
    created_at: new Date(Date.now() - Math.random() * 1095 * 24 * 60 * 60 * 1000).toISOString()
  };
});

// Normal vatandaş kullanıcıları - 50 kişi
const citizenFirstNames = ['Ali', 'Mehmet', 'Ayşe', 'Fatma', 'Ahmet', 'Zeynep', 'Mustafa', 'Elif', 'Can', 'Selin'];
const citizenLastNames = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Arslan', 'Öztürk', 'Kurt', 'Yıldız', 'Aydın'];

const normalUsers = [];
for (let i = 0; i < 50; i++) {
  const userId = mpUsers.length + mediaUsers.length + organizationUsers.length + exPoliticianUsers.length + i + 1;
  const firstName = citizenFirstNames[i % citizenFirstNames.length];
  const lastName = citizenLastNames[Math.floor(Math.random() * citizenLastNames.length)];
  const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${i}`;
  
  normalUsers.push({
    user_id: userId,
    username: username,
    email: `${username}@example.com`,
    full_name: `${firstName} ${lastName}`,
    profile_image: getProfileImagePath('normal', null, username, userId),
    bio: 'Vatandaş',
    user_type: 'normal',
    verification_badge: false,
    polit_score: Math.floor(Math.random() * 2000) + 100,
    follower_count: Math.floor(Math.random() * 500) + 50,
    following_count: Math.floor(Math.random() * 300) + 50,
    post_count: Math.floor(Math.random() * 100) + 5,
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
  });
}

// Tüm kullanıcıları birleştir
export const mockUsers = [...mpUsers, ...mediaUsers, ...organizationUsers, ...exPoliticianUsers, ...normalUsers];

// Daha fazla mock kullanıcı için helper
export const generateMockUsers = (count = 40) => {
  const names = ['Ali', 'Mehmet', 'Ayşe', 'Fatma', 'Mustafa', 'Zeynep', 'Ahmet', 'Elif', 'Can', 'Selin'];
  const surnames = ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Arslan', 'Öztürk', 'Kurt', 'Yıldız', 'Aydın'];
  const cities = ['34', '06', '35', '07', '16', '01', '26', '38', '41', '27'];
  
  const users = [...mockUsers];
  const startId = mockUsers.length + 1;
  
  for (let i = 0; i < count; i++) {
    const userId = startId + i;
    const firstName = names[Math.floor(Math.random() * names.length)];
    const lastName = surnames[Math.floor(Math.random() * surnames.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const userType = ['normal', 'normal', 'normal', 'party_member', 'normal'][Math.floor(Math.random() * 5)];
    
    users.push({
      user_id: userId,
      username: `${firstName.toLowerCase()}_${lastName.toLowerCase()}_${userId}`,
      email: `${firstName.toLowerCase()}${userId}@example.com`,
      full_name: `${firstName} ${lastName}`,
      profile_image: getProfileImagePath(userType === 'party_member' ? 'party_member' : 'normal', null, `${firstName.toLowerCase()}_${lastName.toLowerCase()}`, userId),
      bio: userType === 'party_member' ? 'Parti Üyesi' : 'Vatandaş',
      user_type: userType,
      party_id: userType === 'party_member' ? Math.floor(Math.random() * 14) + 1 : null,
      city_code: city,
      verification_badge: false,
      polit_score: Math.floor(Math.random() * 2000) + 100,
      follower_count: Math.floor(Math.random() * 500) + 50,
      following_count: Math.floor(Math.random() * 300) + 50,
      post_count: Math.floor(Math.random() * 50) + 5,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  return users;
};
