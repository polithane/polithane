/**
 * Assign MP party memberships from a pasted plain-text list.
 *
 * - Matches by users.full_name (robust Turkish normalization)
 * - Ensures "YENİ YOL" exists in parties (slug: yeni-yol)
 * - Updates:
 *    - users.party_id
 *    - users.user_type = 'mp'
 *    - users.province (election district)
 *    - upserts mp_profiles(user_id, province)
 *
 * Run:
 *   node scripts/assign-mp-parties-from-text.js
 */
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const MP_LIST_TEXT = `
ADANA
Abdullah DOĞRU
AK Parti
Ahmet ZENBİLCİ
BAĞIMSIZ
Ayhan BARUT
CHP
Ayşe Sibel ERSOY
MHP
Ayyüce TÜRKEŞ TAŞ
İYİ Parti
Bilal BİLİCİ
CHP
Burhanettin BULUT
CHP
Faruk AYTEK
AK Parti
Muharrem VARLI
MHP
Müzeyyen ŞEVKİN
CHP
Orhan SÜMER
CHP
Ömer ÇELİK
AK Parti
Sadullah KISACIK
YENİ YOL
Sunay KARAMIK
AK Parti
Tulay HATIMOĞULLARI ORUÇ
DEM PARTİ
ADIYAMAN
Hüseyin ÖZHAN
AK Parti
İshak ŞAN
AK Parti
Mustafa ALKAYIŞ
AK Parti
Resul KURT
AK Parti
AFYONKARAHİSAR
Ali ÖZKAYA
AK Parti
Hakan Şeref OLGUN
İYİ Parti
Hasan ARSLAN
AK Parti
İbrahim YURDUNUSEVEN
AK Parti
Mehmet TAYTAK
MHP
AĞRI
Heval BOZDAĞ
DEM PARTİ
Nejla DEMİR
DEM PARTİ
Ruken KİLERCİ
AK Parti
Sırrı SAKİK
DEM PARTİ
AKSARAY
Cengiz AYDOĞDU
AK Parti
Hüseyin ALTINSOY
AK Parti
Ramazan KAŞLI
MHP
Turan YALDIR
İYİ Parti
AMASYA
Haluk İPEK
AK Parti
Hasan ÇİLEZ
AK Parti
Reşat KARAGÖZ
CHP
ANKARA
Adnan BEKER
CHP
Ahmet Eşref FAKIBABA
İYİ Parti
Ahmet Fethan BAYKOÇ
AK Parti
Aliye TİMİSİ ERSEVER
CHP
Asuman ERDOĞAN
AK Parti
Aylin YAMAN
CHP
Deniz DEMİR
CHP
Fuat OKTAY
AK Parti
Gamze TAŞCIER
CHP
İdris ŞAHİN
YENİ YOL
Jülide SARIEROĞLU
AK Parti
Koray AYDIN
BAĞIMSIZ
Kurtcan ÇELEBİ
AK Parti
Kürşad ZORLU
AK Parti
Leyla ŞAHİN USTA
AK Parti
Lütfiye Selva ÇAM
AK Parti
Mesut DOĞAN
YENİ YOL
Mevlüt KARAKAYA
MHP
Murat ALPARSLAN
AK Parti
Murat EMİR
CHP
Mustafa Nedim YAMALI
AK Parti
Okan KONURALP
CHP
Orhan YEGİN
AK Parti
Osman GÖKÇEK
AK Parti
Ömer İLERİ
AK Parti
Sadir DURMAZ
MHP
Sadullah ERGİN
YENİ YOL
Semra DİNÇER
CHP
Tekin BİNGÖL
CHP
Umut AKDOĞAN
CHP
Vedat BİLGİN
AK Parti
Yaşar YILDIRIM
MHP
Yıldırım Tuğrul TÜRKEŞ
AK Parti
Yüksel ARSLAN
İYİ Parti
Zehranur AYDEMİR
AK Parti
Zeynep YILDIZ
AK Parti
ANTALYA
Abdurrahman BAŞKAN
MHP
Aliye COŞAR
CHP
Atay USLU
AK Parti
Aykut KAYA
CHP
Cavit ARI
CHP
Hakkı Saruhan OLUÇ
DEM PARTİ
Hilmi DURGUN
MHP
İbrahim Ethem TAŞ
AK Parti
Kemal ÇELİK
AK Parti
Mevlüt ÇAVUŞOĞLU
AK Parti
Mustafa ERDEM
CHP
Mustafa KÖSE
AK Parti
Serap YAZICI ÖZBUDUN
AK Parti
Sururi ÇORABATIR
CHP
Şerafettin KILIÇ
YENİ YOL
Tuba VURAL ÇOKAL
AK Parti
Uğur POYRAZ
İYİ Parti
ARDAHAN
Kaan KOÇ
AK Parti
Özgür Erdem İNCESU
CHP
ARTVİN
Faruk ÇELİK
AK Parti
Uğur BAYRAKTUTAN
CHP
AYDIN
Bülent TEZCAN
CHP
Evrim KARAKOZ
CHP
Hüseyin YILDIZ
CHP
Mustafa SAVAŞ
AK Parti
Ömer KARAKAŞ
İYİ Parti
Ömer ÖZMEN
AK Parti
Seda SARIBAŞ
AK Parti
Süleyman BÜLBÜL
CHP
BALIKESİR
Ali Taylan ÖZTAYLAN
AK Parti
Belgin UYGUR
AK Parti
Burak DALGIN
BAĞIMSIZ
Ekrem Gökay YÜKSEL
MHP
Ensar AYTEKİN
CHP
İsmail OK
AK Parti
Mustafa CANBEY
AK Parti
Serkan SARI
CHP
Turhan ÇÖMEZ
İYİ Parti
BARTIN
Aysu BANKOĞLU
CHP
Yusuf Ziya ALDATMAZ
AK Parti
BATMAN
Ferhat NASIROĞLU
AK Parti
Keskin BAYINDIR
DBP
Mehmet Rüştü TİRYAKİ
DEM PARTİ
Serkan RAMANLI
HÜDA PAR
Zeynep ODUNCU KUTEVİ
DEM PARTİ
BAYBURT
Orhan ATEŞ
AK Parti
BİLECİK
Halil ELDEMİR
AK Parti
Yaşar TÜZÜN
CHP
BİNGÖL
Feyzi BERDİBEK
AK Parti
Ömer Faruk HÜLAKÜ
DEM PARTİ
Zeki KORKUTATA
AK Parti
BİTLİS
Hüseyin OLAN
DEM PARTİ
Semra ÇAĞLAR GÖKALP
DEM PARTİ
Turan BEDİRHANOĞLU
AK Parti
BOLU
İsmail AKGÜL
BAĞIMSIZ
Türker ATEŞ
CHP
Yüksel COŞKUNYÜREK
AK Parti
BURDUR
Adem KORKMAZ
AK Parti
İzzet AKBULUT
CHP
Mustafa OĞUZ
AK Parti
BURSA
Ahmet KILIÇ
AK Parti
Ayhan SALMAN
AK Parti
Cemalettin Kani TORUN
YENİ YOL
Efkan ALA
AK Parti
Emel GÖZÜKARA DURMAZ
AK Parti
Emine YAVUZ GÖZGEÇ
AK Parti
Fevzi ZIRHLIOĞLU
MHP
Hasan ÖZTÜRK
CHP
Hasan TOKTAŞ
İYİ Parti
İsmet BÜYÜKATAMAN
MHP
Kayıhan PALA
CHP
Mehmet ATMACA
YENİ YOL
Muhammet Müfit AYDIN
AK Parti
Mustafa VARANK
AK Parti
Mustafa YAVUZ
AK Parti
Nurhayat ALTACA KAYIŞOĞLU
CHP
Orhan SARIBAL
CHP
Osman MESTEN
AK Parti
Refik ÖZEN
AK Parti
Yüksel Selçuk TÜRKOĞLU
İYİ Parti
ÇANAKKALE
Ayhan GİDER
AK Parti
İsmet GÜNEŞHAN
CHP
Özgür CEYLAN
CHP
Rıdvan UZ
İYİ Parti
ÇANKIRI
Muhammet Emin AKBAŞOĞLU
AK Parti
Pelin YILIK
MHP
ÇORUM
Mehmet TAHTASIZ
CHP
Oğuzhan KAYA
AK Parti
Vahit KAYRICI
MHP
Yusuf AHLATCI
AK Parti
DENİZLİ
Cahit ÖZKAN
AK Parti
Gülizar BİÇER KARACA
CHP
Nilgün ÖK
AK Parti
Sema SİLKİN ÜN
YENİ YOL
Şahin TİN
AK Parti
Şeref ARPACI
CHP
Yasin ÖZTÜRK
İYİ Parti
DİYARBAKIR
Adalet KAYA
DEM PARTİ
Berdan ÖZTÜRK
DEM PARTİ
Ceylan AKÇA CUPOLO
DEM PARTİ
Halide TÜRKOĞLU
DEM PARTİ
Mehmet KAMAÇ
DEM PARTİ
Mehmet Galip ENSARİOĞLU
AK Parti
Mehmet Sait YAZ
AK Parti
Mustafa Sezgin TANRIKULU
CHP
Osman Cengiz ÇANDAR
DEM PARTİ
Serhat EREN
DEM PARTİ
Sevilay ÇELENK ÖZEN
DEM PARTİ
Suna KEPOLU ATAMAN
AK Parti
DÜZCE
Ayşe KEŞİR
AK Parti
Ercan ÖZTÜRK
AK Parti
Talih ÖZCAN
CHP
EDİRNE
Ahmet Baran YAZGAN
CHP
Ediz ÜN
BAĞIMSIZ
Fatma AKSAL
AK Parti
Mehmet AKALIN
İYİ Parti
ELAZIĞ
Ejder AÇIKKAPI
AK Parti
Erol KELEŞ
AK Parti
Gürsel EROL
CHP
Mahmut Rıdvan NAZIRLI
AK Parti
Semih IŞIKVER
MHP
ERZİNCAN
Mustafa SARIGÜL
CHP
Süleyman KARAMAN
AK Parti
ERZURUM
Abdurrahim FIRAT
AK Parti
Fatma ÖNCÜ
AK Parti
Kamil AYDIN
MHP
Mehmet Emin ÖZ
AK Parti
Meral DANIŞ BEŞTAŞ
DEM PARTİ
Selami ALTINOK
AK Parti
ESKİŞEHİR
Ayşen GÜRCAN
AK Parti
Fatih DÖNMEZ
AK Parti
İbrahim ARSLAN
CHP
İdris Nebi HATİPOĞLU
AK Parti
Jale Nur SÜLLÜ
CHP
Utku ÇAKIRÖZER
CHP
GAZİANTEP
Abdulhamit GÜL
AK Parti
Ali ŞAHİN
AK Parti
Bünyamin BOZGEYİK
AK Parti
Derya BAKBAK
AK Parti
Ertuğrul KAYA
YENİ YOL
Hasan ÖZTÜRKMEN
CHP
İrfan ÇELİKASLAN
AK Parti
Mehmet Eyup ÖZKEÇECİ
AK Parti
Mehmet Mustafa GÜRBAN
İYİ Parti
Melih MERİÇ
CHP
Mesut BOZATLI
AK Parti
Sermet ATAY
MHP
Sevda KARACA DEMİR
EMEP
Şahzade DEMİR
HÜDA PAR
GİRESUN
Ali TEMÜR
AK Parti
Elvan IŞIK GEZMİŞ
CHP
Ertuğrul Gazi KONAL
MHP
Nazım ELMAS
AK Parti
GÜMÜŞHANE
Celalettin KÖSE
AK Parti
Musa KÜÇÜK
MHP
HAKKARİ
Onur DÜŞÜNMEZ
DEM PARTİ
Öznur BARTİN
DEM PARTİ
Vezir Coşkun PARLAK
DEM PARTİ
HATAY
Abdulkadir ÖZEL
AK Parti
Adem YEŞİLDAL
AK Parti
Adnan Şefik ÇİRKİN
İYİ Parti
Hüseyin YAYMAN
AK Parti
Kemal KARAHAN
AK Parti
Lütfi KAŞIKÇI
MHP
Mehmet GÜZELMANSUR
CHP
Necmettin ÇALIŞKAN
YENİ YOL
Nermin YILDIRIM KARA
CHP
Servet MULLAOĞLU
CHP
IĞDIR
Cantürk ALAGÖZ
AK Parti
Yılmaz HUN
DEM PARTİ
ISPARTA
Hasan Basri SÖNMEZ
BAĞIMSIZ
Hikmet Yalım HALICI
CHP
Mehmet Uğur GÖKGÖZ
AK Parti
Osman ZABUN
AK Parti
İSTANBUL
Adem YILDIRIM
AK Parti
Ahmet ŞIK
TİP
Ahmet Ersagun YÜCEL
AK Parti
Ali GÖKÇEK
CHP
Ayşe Sibel YANIKÖMEROĞLU
CHP
Azmi EKİNCİ
AK Parti
Bayram ŞENOCAK
AK Parti
Behiye EKER
AK Parti
Birol AYDIN
YENİ YOL
Burak AKBURAK
İYİ Parti
Bülent KAYA
YENİ YOL
Büşra PAKER
AK Parti
Celal ADAN
MHP
Celal FIRAT
DEM PARTİ
Cemal ENGİNYURT
CHP
Cengiz ÇİÇEK
DEM PARTİ
Cüneyt YÜKSEL
AK Parti
Çiçek OTLU
DEM PARTİ
Çiğdem KILIÇGÜN UÇAR
DBP
Derya AYAYDIN
AK Parti
Doğan BEKİN
YENİDEN REFAH
Doğan DEMİR
CHP
Edip Semih YALÇIN
MHP
Elif ESEN
YENİ YOL
Engin ALTAY
CHP
Erdoğan TOPRAK
CHP
Erkan BAŞ
TİP
Erkan KANDEMİR
AK Parti
Ersin BEYAZ
İYİ Parti
Evrim RIZVANOĞLU
CHP
Fethi AÇIKEL
CHP
Feti YILDIZ
MHP
Gamze AKKUŞ İLGEZDİ
CHP
Gökan ZEYBEK
CHP
Gökhan GÜNAYDIN
CHP
Halis DALKILIÇ
AK Parti
Halit YEREBAKAN
AK Parti
Hasan KARAL
YENİ YOL
Hasan TURAN
AK Parti
Hulusi ŞENTÜRK
AK Parti
İlhan KESİCİ
CHP
İsa Mesih ŞAHİN
BAĞIMSIZ
İskender BAYHAN
EMEP
İsmail ERDEM
AK Parti
İsmail Emrah KARAYEL
AK Parti
İsmail Faruk AKSU
MHP
İzzet Ulvi YÖNTER
MHP
Kadri Enis BERBEROĞLU
CHP
Keziban KONUKCU KOK
DEM PARTİ
Medeni YILMAZ
YENİ YOL
Mehmet Önder AKSAKAL
DSP
Mehmet Satuk Buğra KAVUNCU
İYİ Parti
Mehmet Selim ENSARİOĞLU
AK Parti
Muhammed Ali Fatih ERBAKAN
YENİDEN REFAH
Mustafa DEMİR
AK Parti
Mustafa KAYA
YENİ YOL
Mustafa YENEROĞLU
BAĞIMSIZ
Mustafa Cihan PAÇACI
İYİ Parti
Mustafa Hulki CEVİZOĞLU
AK Parti
Müşerref Pervin Tuba DURGUT
AK Parti
Namık TAN
CHP
Nilhan AYAN
AK Parti
Nimet ÖZDEMİR
CHP
Numan KURTULMUŞ
AK Parti
Nurettin ALAN
AK Parti
Oğuz ÜÇÜNCÜ
AK Parti
Oğuz Kaan SALICI
CHP
Özgül SAKİ
DEM PARTİ
Özgür KARABAT
CHP
Özlem ZENGİN
AK Parti
Rabia İLHAN
AK Parti
Rümeysa KADAK
AK Parti
Saliha Sera KADIGİL
TİP
Seda GÖREN
AK Parti
Selim TEMURCİ
BAĞIMSIZ
Sena Nur ÇELİK KANAT
AK Parti
Serkan BAYRAM
AK Parti
Sevan SIVACIOĞLU
AK Parti
Seyithan İZSİZ
AK Parti
Suat ÖZÇAĞDAŞ
CHP
Suat PAMUKÇU
AK Parti
Süleyman SOYLU
AK Parti
Şamil AYRIM
AK Parti
Şengül KARSLI
AK Parti
Tuğba IŞIK ERCAN
AK Parti
Turan Taşkın ÖZER
CHP
Türkan ELÇİ
CHP
Ümmügülşen ÖZTÜRK
AK Parti
Yahya ÇELİK
AK Parti
Yıldız KONAL SÜSLÜ
AK Parti
Yunus EMRE
CHP
Yücel Arzen HACIOĞULLARI
AK Parti
Yüksel Mansur KILINÇ
CHP
Zafer SIRAKAYA
AK Parti
Zekeriya YAPICIOĞLU
HÜDA PAR
Zeynel EMRE
CHP
İZMİR
Ahmet Tuncay ÖZKAN
CHP
Burcugül ÇUBUK
DEM PARTİ
Ceyda BÖLÜNMEZ ÇANKIRI
AK Parti
Deniz YÜCEL
CHP
Dursun Müsavat DERVİŞOĞLU
İYİ Parti
Ednan ARSLAN
CHP
Eyyüp Kadir İNAN
AK Parti
Fehmi Alpay ÖZALAN
AK Parti
Gökçe GÖKÇEN
CHP
Haydar ALTINTAŞ
DP
Hüsmen KIRKPINAR
İYİ Parti
İbrahim AKIN
DEM PARTİ
Mahir POLAT
CHP
Mahmut Atilla KAYA
AK Parti
Mehmet Ali ÇELEBİ
AK Parti
Mehmet Muharrem KASAPOĞLU
AK Parti
Mehmet Salih UZUN
CHP
Murat BAKAN
CHP
Mustafa BİLİCİ
YENİ YOL
Rahmi Aşkın TÜRELİ
CHP
Rıfat Turuntay NALBANTOĞLU
CHP
Seda KÂYA ÖSEN
CHP
Sevda ERDAN KILIÇ
CHP
Şebnem BURSALI
AK Parti
Tamer OSMANAĞAOĞLU
MHP
Ümit ÖZLALE
CHP
Yaşar KIRKPINAR
AK Parti
Yüksel TAŞKIN
CHP
KAHRAMANMARAŞ
Ali ÖZTUNÇ
CHP
İrfan KARATUTLU
YENİ YOL
Mehmet ŞAHİN
AK Parti
Mevlüt KURT
AK Parti
Ömer Oruç Bilal DEBGİCİ
AK Parti
Tuba KÖKSAL
AK Parti
Vahit KİRİŞCİ
AK Parti
Zuhal KARAKOÇ
MHP
KARABÜK
Cem ŞAHİN
AK Parti
Cevdet AKAY
CHP
Durmuş Ali KESKİNKILIÇ
AK Parti
KARAMAN
İsmail Atakan ÜNVER
CHP
Osman SAĞLAM
AK Parti
Selman Oğuzhan ESER
AK Parti
KARS
Adem ÇALKIN
AK Parti
Gülüstan KILIÇ KOÇYİĞİT
DEM PARTİ
İnan Akgün ALP
CHP
KASTAMONU
Fatma Serap EKMEKCİ
AK Parti
Halil ULUAY
AK Parti
KAYSERİ
Aşkın GENÇ
CHP
Ayşe BÖHÜRLER
AK Parti
Dursun ATAŞ
AK Parti
Hulusi AKAR
AK Parti
İsmail ÖZDEMİR
MHP
Mahmut ARIKAN
SAADET Partisi
Murat Cahid CINGI
AK Parti
Mustafa Baki ERSOY
MHP
Sayın Bayar ÖZSOY
AK Parti
Şaban ÇOPUROĞLU
AK Parti
KIRIKKALE
Halil ÖZTÜRK
MHP
Mustafa KAPLAN
AK Parti
KIRKLARELİ
Ahmet Gökhan SARIÇAM
AK Parti
Fahri ÖZKAN
CHP
Vecdi GÜNDOĞDU
CHP
KIRŞEHİR
Metin İLHAN
CHP
Necmettin ERKAN
AK Parti
KİLİS
Ahmet Salih DAL
AK Parti
Mustafa DEMİR
BAĞIMSIZ
KOCAELİ
Cemil YAMAN
AK Parti
Harun Özgür YILDIZLI
CHP
Lütfü TÜRKKAN
İYİ Parti
Mehmet AŞILA
YENİDEN REFAH
Mehmet Akif YILMAZ
AK Parti
Mühip KANKO
CHP
Nail ÇİLER
CHP
Ömer Faruk GERGERLİOĞLU
DEM PARTİ
Radiye Sezer KATIRCIOĞLU
AK Parti
Sadettin HÜLAGÜ
AK Parti
Saffet SANCAKLI
MHP
Sami ÇAKIR
AK Parti
Veysal TİPİOĞLU
AK Parti
KONYA
Abdullah AĞRALI
AK Parti
Ali YÜKSEL
YENİDEN REFAH
Barış BEKTAŞ
CHP
Hasan EKİCİ
AK Parti
Konur Alp KOÇAK
MHP
Latif SELVİ
AK Parti
Mehmet BAYKAN
AK Parti
Meryem GÖKA
AK Parti
Mustafa KALAYCI
MHP
Mustafa Hakan ÖZER
AK Parti
Orhan ERDEM
AK Parti
Selman ÖZBOYACI
AK Parti
Tahir AKYÜREK
AK Parti
Ünal KARAMAN
AK Parti
Ziya ALTUNYALDIZ
AK Parti
KÜTAHYA
Adil BİÇER
AK Parti
Ahmet ERBAŞ
MHP
Ali Fazıl KASAP
CHP
İsmail Çağlar BAYIRCI
AK Parti
Mehmet DEMİR
AK Parti
MALATYA
Abdurrahman BABACAN
AK Parti
Bülent TÜFENKCİ
AK Parti
İhsan KOCA
AK Parti
İnanç Siraç Kara ÖLMEZTOPRAK
AK Parti
Mehmet Celal FENDOĞLU
MHP
Veli AĞBABA
CHP
MANİSA
Ahmet Mücahit ARINÇ
AK Parti
Ahmet Vehbi BAKIRLIOĞLU
CHP
Bahadır Nahit YENİŞEHİRLİOĞLU
AK Parti
Bekir BAŞEVİRGEN
CHP
Erkan AKÇAY
MHP
Murat BAYBATUR
AK Parti
Özgür ÖZEL
CHP
Selma Aliye KAVAF
CHP
Şenol SUNAT
İYİ Parti
Tamer AKKAL
AK Parti
MARDİN
Beritan GÜNEŞ ALTIN
DEM PARTİ
Faruk KILIÇ
AK Parti
George ASLAN
DEM PARTİ
Kamuran TANHAN
DEM PARTİ
Muhammed ADAK
AK Parti
Salihe AYDENİZ
DEM PARTİ
MERSİN
Ali BOZAN
DEM PARTİ
Ali KIRATLI
AK Parti
Ali Mahir BAŞARIR
CHP
Burhanettin KOCAMAZ
İYİ Parti
Faruk DİNÇ
HÜDA PAR
Gülcan KIŞ
CHP
Hasan Ufuk ÇAKIR
BAĞIMSIZ
Havva Sibel SÖYLEMEZ
AK Parti
Levent UYSAL
MHP
Mehmet Emin EKMEN
YENİ YOL
Nureddin NEBATİ
AK Parti
Perihan KOCA DOĞAN
DEM PARTİ
Talat DİNÇER
CHP
MUĞLA
Cumhur UZUN
CHP
Gizem ÖZCAN
CHP
Kadem METE
AK Parti
Metin ERGUN
İYİ Parti
Selçuk ÖZDAĞ
YENİ YOL
Süreyya ÖNEŞ DERİCİ
CHP
Yakup OTGÖZ
AK Parti
MUŞ
Mehmet Emin ŞİMŞEK
AK Parti
Sezai TEMELLİ
DEM PARTİ
Sümeyye BOZ ÇAKI
DEM PARTİ
NEVŞEHİR
Emre ÇALIŞKAN
AK Parti
Filiz KILIÇ
MHP
Süleyman ÖZGÜN
AK Parti
NİĞDE
Cevahir UZKURT
AK Parti
Cumali İNCE
MHP
Ömer Fethi GÜRER
CHP
ORDU
İbrahim Ufuk KAYNAK
AK Parti
Mahmut ÖZER
AK Parti
Mustafa ADIGÜZEL
CHP
Mustafa HAMARAT
AK Parti
Naci ŞANLITÜRK
MHP
Seyit TORUN
CHP
OSMANİYE
Asu KAYA
CHP
Derya YANIK
AK Parti
Devlet BAHÇELİ
MHP
Seydi GÜLSOY
AK Parti
RİZE
Harun MERTOĞLU
AK Parti
Muhammed AVCI
AK Parti
Tahsin OCAKLI
CHP
SAKARYA
Ali İNCİ
AK Parti
Ayça TAŞKENT
CHP
Çiğdem ERDOĞAN
AK Parti
Ertuğrul KOCACIK
AK Parti
Lütfi BAYRAKTAR
AK Parti
Muhammed Levent BÜLBÜL
MHP
Murat KAYA
AK Parti
Ümit DİKBAYIR
CHP
SAMSUN
Çiğdem KARAASLAN
AK Parti
Erhan USTA
İYİ Parti
Ersan AKSU
AK Parti
İlyas TOPSAKAL
MHP
Mehmet KARAMAN
YENİ YOL
Mehmet MUŞ
AK Parti
Murat ÇAN
CHP
Orhan KIRCALI
AK Parti
Yusuf Ziya YILMAZ
AK Parti
SİİRT
Mervan GÜL
AK Parti
Sabahat ERDOĞAN SARITAŞ
DEM PARTİ
Tuncer BAKIRHAN
DEM PARTİ
SİNOP
Barış KARADENİZ
CHP
Nazım MAVİŞ
AK Parti
SİVAS
Abdullah GÜLER
AK Parti
Ahmet ÖZYÜREK
MHP
Hakan AKSU
AK Parti
Rukiye TOY
AK Parti
Ulaş KARASU
CHP
ŞANLIURFA
Abdulkadir Emin ÖNEN
AK Parti
Abdürrahim DUSAK
AK Parti
Bekir BOZDAĞ
AK Parti
Cevahir Asuman YAZMACI
AK Parti
Dilan KUNT AYAN
DEM PARTİ
Ferit ŞENYAŞAR
DEM PARTİ
Hikmet BAŞAK
AK Parti
İbrahim EYYÜPOĞLU
AK Parti
İbrahim ÖZYAVUZ
MHP
Mahmut TANAL
CHP
Mehmet Ali CEVHERİ
AK Parti
Mehmet Faruk PINARBAŞI
AK Parti
Mithat SANCAR
DEM PARTİ
Ömer ÖCALAN
DEM PARTİ
ŞIRNAK
Arslan TATAR
AK Parti
Ayşegül DOĞAN
DEM PARTİ
Mehmet Zeki İRMEZ
DEM PARTİ
Nevroz UYSAL ASLAN
DEM PARTİ
TEKİRDAĞ
Cem AVŞAR
CHP
Çiğdem KONCAGÜL
AK Parti
Faik ÖZTRAK
CHP
Gökhan DİKTAŞ
AK Parti
İlhami Özcan AYGUN
CHP
Mestan ÖZCAN
AK Parti
Nurten YONTAR
CHP
Selcan TAŞCI
İYİ Parti
TOKAT
Cüneyt ALDEMİR
AK Parti
Kadim DURMAZ
CHP
Mustafa ARSLAN
AK Parti
Yusuf BEYAZIT
AK Parti
Yücel BULUT
MHP
TRABZON
Adil KARAİSMAİLOĞLU
AK Parti
Mustafa ŞEN
AK Parti
Sibel SUİÇMEZ
CHP
Vehbi KOÇ
AK Parti
Yavuz AYDIN
İYİ Parti
Yılmaz BÜYÜKAYDIN
AK Parti
TUNCELİ
Ayten KORDU
DEM PARTİ
UŞAK
Ali KARAOBA
CHP
Fahrettin TUĞRUL
AK Parti
İsmail GÜNEŞ
AK Parti
VAN
Burhan KAYATÜRK
AK Parti
Gülcan KAÇMAZ SAYYİĞİT
DEM PARTİ
Gülderen VARLİ
DEM PARTİ
Kayhan TÜRKMENOĞLU
AK Parti
Mahmut DİNDAR
DEM PARTİ
Pervin BULDAN
DEM PARTİ
Sinan ÇİFTYÜREK
DEM PARTİ
Zülküf UÇAR
DEM PARTİ
YALOVA
Ahmet BÜYÜKGÜMÜŞ
AK Parti
Meliha AKYOL
AK Parti
Tahsin BECAN
CHP
YOZGAT
Abdulkadir AKGÜL
AK Parti
İbrahim Ethem SEDEF
MHP
Lütfullah KAYALAR
İYİ Parti
Süleyman ŞAHAN
AK Parti
ZONGULDAK
Ahmet ÇOLAKOĞLU
AK Parti
Deniz YAVUZYILMAZ
CHP
Eylem Ertuğ ERTUĞRUL
CHP
Muammer AVCI
AK Parti
Saffet BOZKURT
AK Parti
`;

function normalizePartyLabel(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase('tr-TR');
}

function normalizeProvince(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase('tr-TR');
}

function normalizeName(value) {
  const s = String(value || '').trim().replace(/\s+/g, ' ');
  const upper = s.toLocaleUpperCase('tr-TR');
  const trToAscii = upper
    .replace(/İ/g, 'I')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/Â/g, 'A')
    .replace(/Ê/g, 'E')
    .replace(/Î/g, 'I')
    .replace(/Ô/g, 'O')
    .replace(/Û/g, 'U');
  return trToAscii.replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function parseMpList(text) {
  const lines = String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const records = [];
  let currentProvince = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const next = lines[i + 1] || '';

    const isAllUpper = /^[A-ZÇĞİÖŞÜ ]+$/.test(line) && line === line.toLocaleUpperCase('tr-TR');
    const nextHasLower = /[a-zçğıöşü]/.test(next);

    if (isAllUpper && nextHasLower) {
      currentProvince = normalizeProvince(line);
      continue;
    }

    // Expect: name line followed by party line
    const name = line;
    const party = lines[i + 1];
    if (!party) break;
    if (!currentProvince) {
      throw new Error(`Province not set before name: "${name}"`);
    }
    records.push({
      province: currentProvince,
      name: name.trim(),
      partyLabel: party.trim(),
    });
    i++; // skip party line
  }

  return records;
}

async function ensureYeniYol(pool) {
  const slug = 'yeni-yol';
  const shortName = 'YENİ YOL';
  const name = 'Yeni Yol';

  const { rows } = await pool.query(
    `
      insert into parties (slug, short_name, name, description, is_active)
      values ($1, $2, $3, $4, true)
      on conflict (slug) do update set
        short_name = excluded.short_name,
        name = excluded.name,
        description = excluded.description,
        updated_at = now()
      returning id, slug
    `,
    [slug, shortName, name, 'Yeni Yol siyasi oluşumu.']
  );

  return rows[0].id;
}

function mapPartyLabelToSlug(label) {
  const v = normalizePartyLabel(label);

  // Normalize common variations
  if (v === 'AK PARTI' || v === 'AK PARTİ') return 'akp';
  if (v === 'CHP') return 'chp';
  if (v === 'MHP') return 'mhp';
  if (v === 'İYİ PARTİ' || v === 'IYI PARTI' || v === 'IYI PARTİ') return 'iyi';
  if (v === 'DEM PARTİ' || v === 'DEM PARTI' || v === 'DEM') return 'dem';
  if (v === 'BAĞIMSIZ' || v === 'BAGIMSIZ') return 'bagimsiz';
  if (v === 'DBP') return 'dbp';
  if (v === 'HÜDA PAR' || v === 'HUDA PAR' || v === 'HÜDAPAR' || v === 'HUDAPAR') return 'hurdava';
  if (v === 'TİP' || v === 'TIP') return 'tip';
  if (v === 'YENİDEN REFAH' || v === 'YRP') return 'yrp';
  if (v === 'DSP') return 'dsp';
  if (v === 'EMEP') return 'emep';
  if (v === 'DP') return 'dp';
  if (v === 'SAADET PARTİSİ' || v === 'SAADET PARTISI' || v === 'SP') return 'saadet';
  if (v === 'YENİ YOL') return 'yeni-yol';

  return null;
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const records = parseMpList(MP_LIST_TEXT);
  console.log(`📄 Parsed MPs: ${records.length}`);

  // Ensure "YENİ YOL" exists first (some MPs depend on it)
  await ensureYeniYol(pool);

  const parties = (await pool.query('select id, slug, short_name, name from parties')).rows;
  const partyIdBySlug = new Map(parties.map((p) => [p.slug, p.id]));

  const users = (
    await pool.query('select id, full_name, province, user_type, party_id from users')
  ).rows;

  const usersByNormName = new Map();
  for (const u of users) {
    const key = normalizeName(u.full_name);
    if (!usersByNormName.has(key)) usersByNormName.set(key, []);
    usersByNormName.get(key).push(u);
  }

  let updated = 0;
  let alreadyOk = 0;
  let notFound = 0;
  let ambiguous = 0;
  let partyMissing = 0;

  const notFoundList = [];
  const ambiguousList = [];
  const partyMissingList = [];

  // Use a transaction so partial runs are consistent
  const client = await pool.connect();
  try {
    await client.query('begin');

    for (const rec of records) {
      const partySlug = mapPartyLabelToSlug(rec.partyLabel);
      if (!partySlug) {
        partyMissing++;
        partyMissingList.push({ ...rec, reason: 'unmapped party label' });
        continue;
      }

      const partyId = partyIdBySlug.get(partySlug);
      if (!partyId) {
        partyMissing++;
        partyMissingList.push({ ...rec, reason: `party slug not found in DB: ${partySlug}` });
        continue;
      }

      const key = normalizeName(rec.name);
      const candidates = usersByNormName.get(key) || [];

      if (candidates.length === 0) {
        notFound++;
        notFoundList.push(rec);
        continue;
      }

      let target = null;
      if (candidates.length === 1) {
        target = candidates[0];
      } else {
        const provinceKey = normalizeProvince(rec.province);
        const provinceMatches = candidates.filter(
          (u) => normalizeProvince(u.province || '') === provinceKey
        );
        if (provinceMatches.length === 1) {
          target = provinceMatches[0];
        }
      }

      if (!target) {
        ambiguous++;
        ambiguousList.push({ rec, candidates: candidates.map((c) => ({ id: c.id, full_name: c.full_name, province: c.province, user_type: c.user_type })) });
        continue;
      }

      const needsUpdate =
        String(target.party_id || '') !== String(partyId) ||
        target.user_type !== 'mp' ||
        normalizeProvince(target.province || '') !== normalizeProvince(rec.province);

      if (!needsUpdate) {
        alreadyOk++;
        continue;
      }

      await client.query(
        `
          update users
          set party_id = $1,
              user_type = 'mp',
              province = $2,
              updated_at = now()
          where id = $3
        `,
        [partyId, rec.province, target.id]
      );

      await client.query(
        `
          insert into mp_profiles (user_id, province, is_active_mp)
          values ($1, $2, true)
          on conflict (user_id) do update set
            province = excluded.province,
            is_active_mp = true,
            updated_at = now()
        `,
        [target.id, rec.province]
      );

      updated++;
    }

    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ MP party assignment finished');
  console.log(`- Updated: ${updated}`);
  console.log(`- Already correct: ${alreadyOk}`);
  console.log(`- Not found: ${notFound}`);
  console.log(`- Ambiguous: ${ambiguous}`);
  console.log(`- Party missing/unmapped: ${partyMissing}`);
  console.log('='.repeat(70));

  if (notFoundList.length) {
    console.log('\n❓ Not found (full_name match failed):');
    for (const r of notFoundList) console.log(`- [${r.province}] ${r.name} -> ${r.partyLabel}`);
  }

  if (partyMissingList.length) {
    console.log('\n⚠️ Party missing/unmapped:');
    for (const r of partyMissingList)
      console.log(`- [${r.province}] ${r.name} -> ${r.partyLabel} (${r.reason})`);
  }

  if (ambiguousList.length) {
    console.log('\n⚠️ Ambiguous matches (manual check needed):');
    for (const a of ambiguousList) {
      console.log(`- [${a.rec.province}] ${a.rec.name} -> ${a.rec.partyLabel}`);
      for (const c of a.candidates) console.log(`    - ${c.id} | ${c.full_name} | ${c.province || '-'} | ${c.user_type}`);
    }
  }
}

main().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});

