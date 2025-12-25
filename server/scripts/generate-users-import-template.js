/**
 * Generates an Excel template for bulk user import.
 *
 * Output (repo root): ./users_import_template.xlsx
 *
 * Run:
 *   node server/scripts/generate-users-import-template.js
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_PATH = path.join(__dirname, '../../users_import_template.xlsx');

function sheet(headers, exampleRow = {}) {
  // First row = headers, second row = example (optional)
  const rows = [];
  rows.push(Object.fromEntries(headers.map((h) => [h, h])));
  if (exampleRow && Object.keys(exampleRow).length) rows.push(exampleRow);
  return XLSX.utils.json_to_sheet(rows, { skipHeader: true });
}

function main() {
  const wb = XLSX.utils.book_new();

  // USERS (base)
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        'import_key',
        'full_name',
        'user_type',
        'username',
        'province',
        'district_name',
        'party_slug',
        'politician_type',
        'bio',
        'avatar_url',
        'cover_url',
        'is_verified',
        'is_active',
        'is_admin',
        'email_verified',
        'is_automated',
        'metadata',
      ],
      {
        import_key: 'U0001',
        full_name: 'Ad Soyad',
        user_type: 'citizen',
        username: '',
        province: 'İstanbul',
        district_name: 'Kadıköy',
        party_slug: '',
        politician_type: '',
        bio: '',
        avatar_url: '',
        cover_url: '',
        is_verified: 'TRUE',
        is_active: 'TRUE',
        is_admin: 'FALSE',
        email_verified: 'TRUE',
        is_automated: 'FALSE',
        metadata: '{"notes":"opsiyonel"}',
      }
    ),
    'users'
  );

  // MP PROFILES
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        'import_key',
        'parliament_id',
        'election_district',
        'current_term',
        'total_terms',
        'first_election_date',
        'parliamentary_group',
        'group_position',
        'main_commission',
        'sub_commissions',
        'commission_chairman_of',
        'expertise_areas',
        'education_background',
        'previous_profession',
        'website_url',
        'social_media_activity_level',
      ],
      {
        import_key: 'U0002',
        parliament_id: 'TBMM12345',
        election_district: 'Ankara',
        current_term: 28,
        total_terms: 2,
        first_election_date: '2018-06-24',
        parliamentary_group: 'CHP Grubu',
        group_position: '',
        main_commission: '',
        sub_commissions: 'Komisyon A; Komisyon B',
        commission_chairman_of: '',
        expertise_areas: 'ekonomi; hukuk',
        education_background: '',
        previous_profession: '',
        website_url: '',
        social_media_activity_level: 'medium',
      }
    ),
    'mp_profiles'
  );

  // PARTY OFFICIAL PROFILES
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        'import_key',
        'position_title',
        'position_level',
        'organization_unit',
        'province',
        'district',
        'position_start_date',
        'position_end_date',
        'responsibilities',
        'committee_memberships',
        'office_phone',
        'office_email',
        'office_address',
        'party_membership_number',
      ],
      {
        import_key: 'U0003',
        position_title: 'İl Başkanı',
        position_level: 'provincial',
        organization_unit: 'İl Başkanlığı',
        province: 'İzmir',
        district: '',
        position_start_date: '2024-01-01',
        position_end_date: '',
        responsibilities: 'organizasyon; iletişim',
        committee_memberships: '',
        office_phone: '',
        office_email: '',
        office_address: '',
        party_membership_number: '',
      }
    ),
    'party_official_profiles'
  );

  // CITIZEN PROFILES
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        'import_key',
        'birth_year',
        'gender',
        'province',
        'district',
        'education_level',
        'university',
        'graduation_year',
        'field_of_study',
        'profession',
        'sector',
        'company_name',
        'interested_topics',
        'political_stance',
        'is_first_time_voter',
        'show_province',
        'show_education',
        'show_profession',
      ],
      {
        import_key: 'U0001',
        birth_year: 1995,
        gender: 'prefer_not_to_say',
        province: 'İstanbul',
        district: 'Kadıköy',
        education_level: 'lisans',
        university: '',
        graduation_year: '',
        field_of_study: '',
        profession: '',
        sector: 'özel',
        company_name: '',
        interested_topics: 'ekonomi; eğitim',
        political_stance: '',
        is_first_time_voter: 'FALSE',
        show_province: 'TRUE',
        show_education: 'TRUE',
        show_profession: 'TRUE',
      }
    ),
    'citizen_profiles'
  );

  // PARTY MEMBER PROFILES
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        'import_key',
        'membership_number',
        'membership_start_date',
        'membership_end_date',
        'is_active_member',
        'membership_type',
        'membership_status',
        'youth_branch_member',
        'women_branch_member',
        'senior_branch_member',
        'volunteer_roles',
        'campaign_contributions',
        'completed_trainings',
        'certifications',
        'previous_parties',
        'receive_party_news',
        'receive_event_invitations',
        'available_for_volunteering',
      ],
      {
        import_key: 'U0004',
        membership_number: '',
        membership_start_date: '2020-05-10',
        membership_end_date: '',
        is_active_member: 'TRUE',
        membership_type: 'regular',
        membership_status: 'active',
        youth_branch_member: 'FALSE',
        women_branch_member: 'FALSE',
        senior_branch_member: 'FALSE',
        volunteer_roles: '',
        campaign_contributions: '',
        completed_trainings: '',
        certifications: '',
        previous_parties: '',
        receive_party_news: 'TRUE',
        receive_event_invitations: 'TRUE',
        available_for_volunteering: 'FALSE',
      }
    ),
    'party_member_profiles'
  );

  // MEDIA PROFILES
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        'import_key',
        'profession_title',
        'specialization',
        'beat',
        'current_employer',
        'employer_type',
        'position',
        'employment_start_date',
        'press_card_number',
        'content_types',
        'coverage_areas',
        'languages',
        'published_books',
        'documentary_works',
        'awards',
        'social_media_reach',
        'avg_article_views',
        'avg_tv_viewers',
      ],
      {
        import_key: 'U0005',
        profession_title: 'Gazeteci',
        specialization: 'siyaset; ekonomi',
        beat: 'TBMM',
        current_employer: '',
        employer_type: 'digital',
        position: '',
        employment_start_date: '',
        press_card_number: '',
        content_types: 'haber; analiz',
        coverage_areas: 'TBMM; siyasi partiler',
        languages: 'tr; en',
        published_books: '',
        documentary_works: '',
        awards: '',
        social_media_reach: '',
        avg_article_views: '',
        avg_tv_viewers: '',
      }
    ),
    'media_profiles'
  );

  // EX-POLITICIAN PROFILES
  XLSX.utils.book_append_sheet(
    wb,
    sheet(
      [
        'import_key',
        'career_summary',
        'total_years_in_politics',
        'retirement_date',
        'retirement_reason',
        'highest_position',
        'highest_position_start_date',
        'highest_position_end_date',
        'served_as_minister',
        'ministerial_positions',
        'total_parliamentary_terms',
        'political_legacy',
        'published_books',
        'current_status',
        'current_activities',
      ],
      {
        import_key: 'U0006',
        career_summary: '',
        total_years_in_politics: '',
        retirement_date: '',
        retirement_reason: '',
        highest_position: '',
        highest_position_start_date: '',
        highest_position_end_date: '',
        served_as_minister: 'FALSE',
        ministerial_positions: '',
        total_parliamentary_terms: '',
        political_legacy: '',
        published_books: '',
        current_status: '',
        current_activities: '',
      }
    ),
    'ex_politician_profiles'
  );

  // README sheet (instructions)
  const readmeRows = [
    ['KULLANIM', ''],
    ['1) users sheet zorunlu: import_key, full_name, user_type', 'email ve şifre BU TEMPLATE\'TE YOK (senin isteğin).'],
    ['2) Diğer sheet\'lerde import_key ile eşleştir', 'Sadece ilgili user_type için satır ekle.'],
    ['3) Çoklu değerler', 'Değerleri ; ile ayır (örn: ekonomi; eğitim).'],
    ['4) Boolean alanlar', 'TRUE/FALSE yaz.'],
    ['5) party_slug', 'partiler tablosundaki slug ile aynı olmalı (örn: chp).'],
  ];
  const wsReadme = XLSX.utils.aoa_to_sheet(readmeRows);
  XLSX.utils.book_append_sheet(wb, wsReadme, 'README');

  XLSX.writeFile(wb, OUT_PATH);
  // eslint-disable-next-line no-console
  console.log(`✅ Template created: ${OUT_PATH}`);
}

main();

