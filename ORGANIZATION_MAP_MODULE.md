# 🗺️ Teşkilat Yapılanması ve Harita Modülü - Detaylı Dokümantasyon

## Genel Bakış

Teşkilat yapılanması modülü, Türkiye'nin siyasi parti teşkilat yapısını interaktif harita üzerinde görselleştirir ve yönetir. Sistem, İl → İlçe → Mahalle → Sandık hiyerarşisini destekler.

## Hiyerarşik Yapı

```
Türkiye (Country Level)
│
├── Parti Genel Merkezi (Headquarters)
│   │
│   ├── İl Teşkilatları (81 Province Organizations)
│   │   ├── İl Başkanı (Province Leader)
│   │   ├── İl Yönetim Kurulu (Province Board)
│   │   │
│   │   ├── Kadın Kolları İl Başkanlığı (Women's Branch)
│   │   │   └── İlçe Kadın Kolları
│   │   │
│   │   ├── Gençlik Kolları İl Başkanlığı (Youth Branch)
│   │   │   └── İlçe Gençlik Kolları
│   │   │
│   │   └── İlçe Teşkilatları (District Organizations)
│   │       ├── İlçe Başkanı (District Leader)
│   │       ├── İlçe Yönetim Kurulu
│   │       │
│   │       ├── Kadın Kolları İlçe Başkanlığı
│   │       ├── Gençlik Kolları İlçe Başkanlığı
│   │       │
│   │       └── Mahalle Teşkilatları (Neighborhood Organizations)
│   │           ├── Mahalle Temsilcisi (Neighborhood Representative)
│   │           │
│   │           └── Sandık Görevlileri (Polling Station Workers)
│   │               └── Sandık Başkanı (Polling Station Leader)
│   │
│   └── Özel Birimler (Special Units)
│       ├── Gençlik Kolları Genel Merkez
│       ├── Kadın Kolları Genel Merkez
│       └── Diğer Kollar
```

## Veri Modeli

### Organization Entity

```typescript
interface Organization {
  id: UUID;
  partyId: UUID;
  type: OrganizationType;
  parentId?: UUID; // Self-referencing for hierarchy
  name: string;
  leaderId?: UUID;
  memberCount: number;
  activeMemberCount: number;
  location: {
    coordinates: [number, number]; // [longitude, latitude]
    city: string;
    district?: string;
    neighborhood?: string;
  };
  statistics: {
    averagePolitPuan: number;
    postCount: number;
    activeUserCount: number;
    activityScore: number; // 0-1
  };
  hierarchy: {
    parent?: Organization;
    children: Organization[];
    depth: number; // Hiyerarşi derinliği
  };
  createdAt: Date;
  updatedAt: Date;
}

enum OrganizationType {
  PROVINCE = 'province',
  DISTRICT = 'district',
  NEIGHBORHOOD = 'neighborhood',
  POLLING_STATION = 'polling_station',
  WOMEN_BRANCH = 'women_branch',
  YOUTH_BRANCH = 'youth_branch',
  HEADQUARTERS = 'headquarters'
}
```

### Organization Member Entity

```typescript
interface OrganizationMember {
  id: UUID;
  organizationId: UUID;
  userId: UUID;
  role: string; // 'leader', 'member', 'coordinator', etc.
  position?: string;
  joinedAt: Date;
  status: 'active' | 'inactive' | 'suspended';
  responsibilities?: string[];
}
```

## Harita Modülü Özellikleri

### 1. Zoom Seviyeleri

#### Ülke Görünümü (Country View)
- **Zoom Level:** 1-5
- **Gösterilen:** İl bazlı teşkilatlar
- **Marker'lar:** İl başkanları, milletvekilleri
- **Heatmap:** İl bazlı parti gücü, aktivite

#### İl Görünümü (Province View)
- **Zoom Level:** 6-8
- **Gösterilen:** İlçe bazlı teşkilatlar
- **Marker'lar:** İlçe başkanları, belediye başkanları
- **Heatmap:** İlçe bazlı aktivite, gündem

#### İlçe Görünümü (District View)
- **Zoom Level:** 9-11
- **Gösterilen:** Mahalle bazlı teşkilatlar
- **Marker'lar:** Mahalle temsilcileri
- **Heatmap:** Mahalle bazlı vatandaş geri bildirimi

#### Mahalle Görünümü (Neighborhood View)
- **Zoom Level:** 12-15
- **Gösterilen:** Sandık bazlı teşkilatlar
- **Marker'lar:** Sandık görevlileri
- **Heatmap:** Sandık bazlı seçim sonuçları (seçim döneminde)

### 2. Renk Kodlaması

#### Parti Gücü Gösterimi
```typescript
interface PartyStrength {
  partyId: UUID;
  color: string; // Parti rengi
  intensity: number; // 0-1, üye sayısına göre
  opacity: number; // 0.3-1.0
}

// Örnek: AK Parti (Kırmızı)
// 1000+ üye: opacity 1.0, intensity 1.0
// 500-1000 üye: opacity 0.7, intensity 0.7
// 100-500 üye: opacity 0.5, intensity 0.5
// <100 üye: opacity 0.3, intensity 0.3
```

#### Aktivite Heatmap
```typescript
interface ActivityHeatmap {
  coordinates: [number, number];
  intensity: number; // 0-1
  metrics: {
    postCount: number;
    interactionCount: number;
    activeUserCount: number;
    averagePolitPuan: number;
  };
}

// Renk skalası:
// Düşük aktivite: Mavi (#3B82F6)
// Orta aktivite: Sarı (#FBBF24)
// Yüksek aktivite: Turuncu (#F97316)
// Çok yüksek: Kırmızı (#EF4444)
```

### 3. Marker Türleri

```typescript
interface MapMarker {
  id: UUID;
  type: MarkerType;
  coordinates: [number, number];
  data: {
    user?: User;
    organization?: Organization;
    role?: string;
  };
  icon: string; // Icon URL
  color: string; // Marker rengi
}

enum MarkerType {
  PROVINCE_LEADER = 'province_leader',
  DISTRICT_LEADER = 'district_leader',
  MP = 'mp',
  MAYOR = 'mayor',
  NEIGHBORHOOD_REP = 'neighborhood_rep',
  POLLING_STATION_LEADER = 'polling_station_leader',
  WOMEN_BRANCH_LEADER = 'women_branch_leader',
  YOUTH_BRANCH_LEADER = 'youth_branch_leader'
}
```

### 4. Filtreleme Seçenekleri

```typescript
interface MapFilters {
  partyId?: UUID; // Parti bazlı filtreleme
  organizationType?: OrganizationType; // Teşkilat tipi
  role?: UserRole; // Kullanıcı rolü
  dateRange?: {
    start: Date;
    end: Date;
  };
  activityLevel?: 'low' | 'medium' | 'high'; // Aktivite seviyesi
  showHeatmap?: boolean; // Heatmap göster/gizle
  showMarkers?: boolean; // Marker'ları göster/gizle
  heatmapType?: 'activity' | 'partisan' | 'sentiment'; // Heatmap tipi
}
```

## Harita UI Bileşenleri

### 1. Ana Harita Container

```typescript
// components/OrganizationMap.tsx
interface OrganizationMapProps {
  initialZoom?: number;
  initialCenter?: [number, number];
  filters?: MapFilters;
  onMarkerClick?: (marker: MapMarker) => void;
  onRegionClick?: (organization: Organization) => void;
}

export function OrganizationMap({
  initialZoom = 6,
  initialCenter = [32.8597, 39.9334], // Ankara
  filters,
  onMarkerClick,
  onRegionClick
}: OrganizationMapProps) {
  // Leaflet/Mapbox implementation
  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url="..." />
      <OrganizationMarkers filters={filters} onClick={onMarkerClick} />
      <ActivityHeatmap filters={filters} />
      <PartyStrengthLayer filters={filters} />
    </MapContainer>
  );
}
```

### 2. Marker Popup

```typescript
// components/MarkerPopup.tsx
interface MarkerPopupProps {
  marker: MapMarker;
  onProfileClick: (userId: string) => void;
}

export function MarkerPopup({ marker, onProfileClick }: MarkerPopupProps) {
  return (
    <div className="marker-popup">
      <div className="popup-header">
        <img src={marker.data.user?.avatarUrl} alt="Avatar" />
        <div>
          <h3>{marker.data.user?.name}</h3>
          <span className="role-badge">{marker.data.role}</span>
        </div>
      </div>
      
      <div className="popup-content">
        <p><strong>Görev:</strong> {marker.data.organization?.name}</p>
        <p><strong>Üye Sayısı:</strong> {marker.data.organization?.memberCount}</p>
        <p><strong>Ortalama PolitPuan:</strong> {marker.data.organization?.statistics.averagePolitPuan}</p>
      </div>
      
      <div className="popup-actions">
        <button onClick={() => onProfileClick(marker.data.user!.id)}>
          Profili Görüntüle
        </button>
      </div>
    </div>
  );
}
```

### 3. Filtre Paneli

```typescript
// components/MapFilters.tsx
export function MapFiltersPanel({
  filters,
  onFiltersChange
}: {
  filters: MapFilters;
  onFiltersChange: (filters: MapFilters) => void;
}) {
  return (
    <div className="map-filters-panel">
      <h3>Filtreler</h3>
      
      <div className="filter-group">
        <label>Parti</label>
        <Select
          value={filters.partyId}
          onChange={(value) => onFiltersChange({ ...filters, partyId: value })}
          options={parties.map(p => ({ value: p.id, label: p.name }))}
        />
      </div>
      
      <div className="filter-group">
        <label>Teşkilat Tipi</label>
        <Select
          value={filters.organizationType}
          onChange={(value) => onFiltersChange({ ...filters, organizationType: value })}
          options={Object.values(OrganizationType).map(t => ({ value: t, label: t }))}
        />
      </div>
      
      <div className="filter-group">
        <label>Heatmap Tipi</label>
        <Select
          value={filters.heatmapType}
          onChange={(value) => onFiltersChange({ ...filters, heatmapType: value })}
          options={[
            { value: 'activity', label: 'Aktivite' },
            { value: 'partisan', label: 'Partizanlık' },
            { value: 'sentiment', label: 'Duygu Analizi' }
          ]}
        />
      </div>
      
      <div className="filter-group">
        <label>
          <input
            type="checkbox"
            checked={filters.showHeatmap}
            onChange={(e) => onFiltersChange({ ...filters, showHeatmap: e.target.checked })}
          />
          Heatmap Göster
        </label>
      </div>
      
      <div className="filter-group">
        <label>
          <input
            type="checkbox"
            checked={filters.showMarkers}
            onChange={(e) => onFiltersChange({ ...filters, showMarkers: e.target.checked })}
          />
          Marker'ları Göster
        </label>
      </div>
    </div>
  );
}
```

### 4. Bölge Detay Paneli

```typescript
// components/RegionDetailPanel.tsx
export function RegionDetailPanel({
  organization,
  onClose
}: {
  organization: Organization;
  onClose: () => void;
}) {
  return (
    <div className="region-detail-panel">
      <div className="panel-header">
        <h2>{organization.name}</h2>
        <button onClick={onClose}>×</button>
      </div>
      
      <div className="panel-content">
        <div className="statistics">
          <div className="stat-item">
            <span className="label">Üye Sayısı</span>
            <span className="value">{organization.memberCount}</span>
          </div>
          <div className="stat-item">
            <span className="label">Aktif Üye</span>
            <span className="value">{organization.activeMemberCount}</span>
          </div>
          <div className="stat-item">
            <span className="label">Ortalama PolitPuan</span>
            <span className="value">{organization.statistics.averagePolitPuan}</span>
          </div>
          <div className="stat-item">
            <span className="label">Aktivite Skoru</span>
            <span className="value">
              {(organization.statistics.activityScore * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        
        {organization.leader && (
          <div className="leader-section">
            <h3>Lider</h3>
            <UserCard user={organization.leader} />
          </div>
        )}
        
        <div className="hierarchy-section">
          <h3>Alt Teşkilatlar</h3>
          {organization.hierarchy.children.map(child => (
            <OrganizationCard
              key={child.id}
              organization={child}
              onClick={() => {/* Navigate to child */}}
            />
          ))}
        </div>
        
        <div className="members-section">
          <h3>Üyeler</h3>
          <MemberList organizationId={organization.id} />
        </div>
      </div>
    </div>
  );
}
```

## API Endpoints

### Get Organizations

```http
GET /api/v1/organizations?partyId=uuid&type=province&city=Istanbul
```

### Get Organization Map Data

```http
GET /api/v1/organizations/map?partyId=uuid&zoomLevel=province&bounds=28,40,30,42
```

**Response:**
```json
{
  "organizations": [
    {
      "id": "uuid",
      "name": "İstanbul İl Teşkilatı",
      "type": "province",
      "location": {
        "coordinates": [28.9784, 41.0082],
        "city": "Istanbul"
      },
      "leader": {
        "id": "uuid",
        "name": "Mehmet Demir",
        "avatarUrl": "https://..."
      },
      "memberCount": 1234,
      "statistics": {
        "averagePolitPuan": 567,
        "activityScore": 0.75
      }
    }
  ],
  "markers": [
    {
      "id": "uuid",
      "type": "province_leader",
      "coordinates": [28.9784, 41.0082],
      "data": {
        "userId": "uuid",
        "organizationId": "uuid"
      }
    }
  ],
  "heatmap": {
    "type": "activity",
    "data": [
      {
        "coordinates": [28.9784, 41.0082],
        "intensity": 0.75
      }
    ]
  }
}
```

### Get Organization Hierarchy

```http
GET /api/v1/organizations/:orgId/hierarchy
```

**Response:**
```json
{
  "organization": {
    "id": "uuid",
    "name": "İstanbul İl Teşkilatı",
    "hierarchy": {
      "parent": null,
      "children": [
        {
          "id": "uuid",
          "name": "Kadıköy İlçe Teşkilatı",
          "type": "district",
          "children": [
            {
              "id": "uuid",
              "name": "Acıbadem Mahalle Teşkilatı",
              "type": "neighborhood"
            }
          ]
        }
      ],
      "depth": 3
    }
  }
}
```

## Performans Optimizasyonu

### 1. Veri Yükleme Stratejisi

- **Lazy Loading:** Sadece görünür bölgedeki veriler yüklenir
- **Zoom-based Loading:** Zoom seviyesine göre farklı detay seviyeleri
- **Caching:** Redis'te harita verileri cache'lenir (5 dakika TTL)

### 2. Heatmap Hesaplama

```typescript
// Heatmap verileri backend'de önceden hesaplanır
async function calculateHeatmapData(
  bounds: [number, number, number, number],
  type: 'activity' | 'partisan' | 'sentiment'
): Promise<HeatmapPoint[]> {
  // Grid-based hesaplama (100x100 grid)
  const gridSize = 100;
  const points: HeatmapPoint[] = [];
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = bounds[1] + (bounds[3] - bounds[1]) * (i / gridSize);
      const lng = bounds[0] + (bounds[2] - bounds[0]) * (j / gridSize);
      
      const intensity = await calculateIntensityAtPoint(
        [lng, lat],
        type
      );
      
      if (intensity > 0.1) { // Sadece önemli noktalar
        points.push({
          coordinates: [lng, lat],
          intensity
        });
      }
    }
  }
  
  return points;
}
```

### 3. Marker Clustering

Çok sayıda marker olduğunda clustering kullanılır:

```typescript
import MarkerClusterGroup from 'react-leaflet-markercluster';

<MarkerClusterGroup>
  {markers.map(marker => (
    <Marker key={marker.id} position={marker.coordinates}>
      <Popup>
        <MarkerPopup marker={marker} />
      </Popup>
    </Marker>
  ))}
</MarkerClusterGroup>
```

## Kullanım Senaryoları

### Senaryo 1: İl Başkanı - Teşkilat Yönetimi

1. Haritada kendi ilini seçer
2. İlçe teşkilatlarını görüntüler
3. Aktivite heatmap'ini kontrol eder
4. Düşük aktiviteli bölgeleri tespit eder
5. İlçe başkanlarıyla iletişime geçer

### Senaryo 2: Parti Genel Merkez - Stratejik Analiz

1. Tüm Türkiye görünümünde parti gücünü görüntüler
2. Rakip partilerle karşılaştırma yapar
3. Seçim bölgelerindeki güç dağılımını analiz eder
4. Stratejik kararlar alır

### Senaryo 3: Vatandaş - Yerel Siyasetçi Bulma

1. Kendi mahallesini haritada bulur
2. Mahalle temsilcisini görüntüler
3. Temsilciyle iletişime geçer
4. Yerel gündem konularını takip eder

### Senaryo 4: Gazeteci - Haber Araştırması

1. Belirli bir bölgedeki siyasi aktiviteyi inceler
2. Siyasetçilerin konumlarını görüntüler
3. Gündem heatmap'ini analiz eder
4. Haber için kaynak bulur

## Güvenlik ve Yetkilendirme

### Görünürlük Kuralları

```typescript
function canViewOrganization(
  user: User,
  organization: Organization
): boolean {
  // Sistem admini her şeyi görebilir
  if (user.role === UserRole.SYSTEM_ADMIN) return true;
  
  // Parti admini kendi partisini görebilir
  if (user.role === UserRole.PARTY_ADMIN) {
    return user.partyId === organization.partyId;
  }
  
  // Teşkilat yöneticisi kendi bölgesini görebilir
  if (user.role === UserRole.ORG_LEADER) {
    return isUserInOrganizationHierarchy(user, organization);
  }
  
  // Parti üyesi kendi partisini görebilir
  if (user.role === UserRole.PARTY_MEMBER) {
    return user.partyId === organization.partyId;
  }
  
  // Vatandaş sadece genel bilgileri görebilir
  return organization.type === OrganizationType.PROVINCE ||
         organization.type === OrganizationType.DISTRICT;
}
```

---

*Bu dokümantasyon, teşkilat yapılanması ve harita modülünün tüm detaylarını içermektedir. Implementasyon sırasında bu dokümantasyon referans alınmalıdır.*
