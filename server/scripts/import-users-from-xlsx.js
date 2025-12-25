/**
 * Bulk import users from an Excel/CSV file located in repo root.
 *
 * Default file: ./users_import.xlsx
 *
 * Supported headers (case-insensitive; spaces/diacritics ignored):
 * - email (required)
 * - full_name (required)
 * - username (optional; if empty it will be generated)
 * - password (optional if password_hash is provided)
 * - password_hash (optional if password is provided)
 * - user_type, politician_type, province, district_name, city_code
 * - bio, avatar_url, cover_url
 * - party_id OR party_slug OR party_name
 * - is_active, is_verified, is_admin, email_verified, is_automated
 * - metadata (JSON)
 *
 * Usage:
 *   node server/scripts/import-users-from-xlsx.js ./users_import.xlsx --dry-run
 *   node server/scripts/import-users-from-xlsx.js ./users_import.xlsx --upsert
 *
 * Notes:
 * - Requires DATABASE_URL env.
 * - In --upsert mode, existing users are matched by email (case-insensitive) and updated.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import bcrypt from 'bcryptjs';
import { sql, closeDb } from '../db.js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

function parseArgs(argv) {
  const args = {
    file: argv[2] || './users_import.xlsx',
    sheet: null,
    dryRun: false,
    upsert: false,
    stopOnError: false,
    report: './users_import_report.json',
  };

  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--upsert') args.upsert = true;
    else if (a === '--stop-on-error') args.stopOnError = true;
    else if (a === '--sheet') args.sheet = argv[++i] || null;
    else if (a === '--report') args.report = argv[++i] || args.report;
  }
  return args;
}

function toAsciiKey(value) {
  // Normalize headers: lowercase, remove Turkish diacritics, strip non-alnum to underscores.
  const turkishMap = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u' };
  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((ch) => turkishMap[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeRowKeys(row) {
  const out = {};
  for (const [k, v] of Object.entries(row || {})) {
    const nk = toAsciiKey(k);
    if (!nk) continue;
    // Keep last write wins; also keep original if needed for debugging.
    out[nk] = v;
  }
  return out;
}

function toBool(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const s = String(value).trim().toLowerCase();
  if (!s) return null;
  if (['1', 'true', 'yes', 'y', 'evet', 'e'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'hayir', 'hayır', 'h'].includes(s)) return false;
  return null;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  // Simple, good-enough for import validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function validateUsernameFormat(username) {
  const u = String(username || '').trim();
  if (u.length > 15) return { ok: false, error: 'username en fazla 15 karakter olmalı' };
  if (u.length < 5) return { ok: false, error: 'username en az 5 karakter olmalı' };
  if (!/^[a-zA-Z0-9._-]+$/.test(u)) return { ok: false, error: 'username sadece harf/rakam/._- içerebilir' };
  if (/^[-._]/.test(u) || /[-._]$/.test(u)) return { ok: false, error: 'username -._ ile başlayamaz/bitemez' };
  if (
    u.includes('..') ||
    u.includes('--') ||
    u.includes('__') ||
    u.includes('.-') ||
    u.includes('-.') ||
    u.includes('._') ||
    u.includes('_.') ||
    u.includes('-_') ||
    u.includes('_-')
  ) {
    return { ok: false, error: 'username ardışık özel karakter içeremez' };
  }
  return { ok: true };
}

function normalizeUsernameBase(value) {
  if (!value) return '';
  const turkishMap = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u' };
  let out = String(value).trim().split('').map((ch) => turkishMap[ch] ?? ch).join('').toLowerCase();
  out = out.replace(/^@+/, '').replace(/[\s-]+/g, '_').replace(/[^a-z0-9_.-]/g, '');
  out = out.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  // Enforce 15 max (matches users route validation)
  out = out.slice(0, 15);
  // Min 5 chars: pad with underscores
  if (out && out.length < 5) out = (out + '_____').slice(0, 5);
  // Must not start with special char; if so prefix with 'u'
  if (out && /^[-._]/.test(out)) out = (`u${out}`).slice(0, 15);
  // Must not end with special char
  out = out.replace(/[-._]+$/g, '');
  if (out && out.length < 5) out = (out + '_____').slice(0, 5);
  return out;
}

function ensureUniqueUsername(base, taken) {
  let candidate = normalizeUsernameBase(base) || 'user_1';
  // Normalize again to be safe
  candidate = candidate.slice(0, 15);
  if (!taken.has(candidate)) {
    taken.add(candidate);
    return candidate;
  }
  for (let i = 2; i < 10000; i++) {
    const suffix = String(i);
    const core = candidate.slice(0, Math.max(1, 15 - (suffix.length + 1)));
    const c = `${core}_${suffix}`.slice(0, 15);
    if (!taken.has(c)) {
      taken.add(c);
      return c;
    }
  }
  const fallback = `user_${Date.now().toString().slice(-8)}`.slice(0, 15);
  taken.add(fallback);
  return fallback;
}

async function getTableColumns(table) {
  const rows = await sql(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1`,
    [table]
  );
  return new Set(rows.map((r) => r.column_name));
}

async function getColumnInfo(table, column) {
  const [row] = await sql(
    `SELECT data_type, udt_name
     FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, column]
  );
  return row || null;
}

async function getUserTypeAllowedValues() {
  // Find CHECK constraints on users.user_type and parse IN (...)
  const rows = await sql(
    `
    SELECT pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname='public'
      AND t.relname='users'
      AND c.contype='c'
      AND pg_get_constraintdef(c.oid) ILIKE '%user_type%'
    `
  );
  const defs = rows.map((r) => String(r.def || ''));
  // Try first constraint that looks like "user_type IN (...)"
  for (const d of defs) {
    const m = d.match(/user_type\s+IN\s*\(([^)]+)\)/i);
    if (!m) continue;
    const inner = m[1];
    const values = inner
      .split(',')
      .map((x) => x.trim())
      .map((x) => x.replace(/^'/, '').replace(/'$/, ''))
      .filter(Boolean);
    if (values.length) return new Set(values);
  }
  return null; // No constraint found; accept anything
}

async function resolvePartyId({ party_id, party_slug, party_name, partiesCols }) {
  const hasPartyId = !!String(party_id || '').trim();
  const hasSlug = !!String(party_slug || '').trim();
  const hasName = !!String(party_name || '').trim();
  if (!hasPartyId && !hasSlug && !hasName) return null;

  if (hasPartyId) {
    return String(party_id).trim();
  }

  // Prefer slug if available
  if (hasSlug && partiesCols.has('slug')) {
    const slug = String(party_slug).trim().toLowerCase();
    const [row] = await sql(`SELECT id FROM parties WHERE LOWER(slug) = LOWER($1) LIMIT 1`, [slug]);
    return row?.id ?? null;
  }

  if (hasName && partiesCols.has('name')) {
    const name = String(party_name).trim();
    const [row] = await sql(`SELECT id FROM parties WHERE name = $1 LIMIT 1`, [name]);
    return row?.id ?? null;
  }

  return null;
}

function safeJson(value) {
  if (value === null || value === undefined) return {};
  if (typeof value === 'object') return value;
  const s = String(value).trim();
  if (!s) return {};
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const filePath = path.isAbsolute(args.file) ? args.file : path.join(process.cwd(), args.file);

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set (required for import)');
  }

  const usersCols = await getTableColumns('users');
  const partiesCols = await getTableColumns('parties').catch(() => new Set());
  const allowedUserTypes = await getUserTypeAllowedValues();

  const partyIdInfo = usersCols.has('party_id') ? await getColumnInfo('users', 'party_id') : null;
  const partyTableIdInfo = partiesCols.size ? await getColumnInfo('parties', 'id') : null;

  // Read workbook
  const wb = XLSX.readFile(filePath);
  const sheetName = args.sheet || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet not found: ${sheetName}`);
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  // Normalize headers
  const rows = rawRows.map(normalizeRowKeys);

  // Track existing usernames/emails to reduce conflicts.
  // We keep it incremental: each insert updates the taken set.
  const takenUsernames = new Set();
  const takenEmails = new Set();
  // Load current usernames/emails (may be large; but avoids per-row queries and gives faster validation)
  const existing = await sql(`SELECT username, email FROM users`);
  for (const r of existing) {
    if (r.username) takenUsernames.add(String(r.username).toLowerCase());
    if (r.email) takenEmails.add(String(r.email).toLowerCase());
  }

  const report = {
    file: args.file,
    sheet: sheetName,
    dryRun: args.dryRun,
    upsert: args.upsert,
    totalRows: rows.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Begin transaction unless dry-run
  if (!args.dryRun) await sql('BEGIN');

  try {
    for (let idx = 0; idx < rows.length; idx++) {
      const r0 = rows[idx] || {};
      const rowNum = idx + 2; // Excel header = row 1

      // Accept some aliases
      const r = {
        ...r0,
        // common Turkish aliases
        full_name: r0.full_name ?? r0.ad_soyad ?? r0.adsoyad ?? r0.ad_soyad_ ?? r0.ad,
        email: r0.email ?? r0.e_posta ?? r0.eposta ?? r0.mail,
        username: r0.username ?? r0.kullanici_adi ?? r0.kullaniciadi,
        password: r0.password ?? r0.sifre ?? r0.sifre_ ?? r0.parola,
        password_hash: r0.password_hash ?? r0.sifre_hash ?? r0.parola_hash,
        province: r0.province ?? r0.il,
        district_name: r0.district_name ?? r0.ilce ?? r0.ilce_adi,
        party_slug: r0.party_slug ?? r0.parti_slug,
        party_name: r0.party_name ?? r0.parti_adi ?? r0.parti,
        party_id: r0.party_id ?? r0.parti_id,
        is_active: r0.is_active ?? r0.aktif,
        is_verified: r0.is_verified ?? r0.dogrulanmis ?? r0.onayli,
        is_admin: r0.is_admin ?? r0.admin,
        email_verified: r0.email_verified ?? r0.email_dogrulandi ?? r0.mail_dogrulandi,
        is_automated: r0.is_automated ?? r0.otomatik,
      };

      const email = normalizeEmail(r.email);
      const fullName = String(r.full_name || '').trim();

      const rowErrors = [];
      if (!email) rowErrors.push('email zorunlu');
      if (email && !isValidEmail(email)) rowErrors.push('email formatı geçersiz');
      if (!fullName) rowErrors.push('full_name zorunlu');

      // password or password_hash
      const pw = String(r.password || '').trim();
      const pwHashIn = String(r.password_hash || '').trim();
      if (!pw && !pwHashIn) rowErrors.push('password veya password_hash zorunlu');

      // user_type validation (if constraint exists)
      let userType = String(r.user_type || '').trim();
      if (!userType && usersCols.has('user_type')) {
        userType = 'citizen'; // matches current register default
      }
      if (allowedUserTypes && userType && !allowedUserTypes.has(userType)) {
        rowErrors.push(`user_type izinli değil: ${userType} (izinli: ${Array.from(allowedUserTypes).join(', ')})`);
      }

      // Resolve/generate username
      let username = String(r.username || '').trim();
      if (!username) {
        username = normalizeUsernameBase(email.split('@')[0] || fullName) || 'user_1';
        username = ensureUniqueUsername(username, takenUsernames);
      } else {
        username = String(username).trim().toLowerCase();
        const v = validateUsernameFormat(username);
        if (!v.ok) rowErrors.push(v.error);
        if (takenUsernames.has(username)) {
          rowErrors.push('username zaten var (unique ihlali)');
        }
      }

      // Unique email check (for insert mode)
      if (!args.upsert && email && takenEmails.has(email)) {
        rowErrors.push('email zaten var (unique ihlali)');
      }

      // Booleans (optional)
      const isActive = usersCols.has('is_active') ? (toBool(r.is_active) ?? true) : undefined;
      const isAdmin = usersCols.has('is_admin') ? (toBool(r.is_admin) ?? false) : undefined;
      const isAutomated = usersCols.has('is_automated') ? (toBool(r.is_automated) ?? false) : undefined;

      let isVerified = undefined;
      if (usersCols.has('is_verified')) {
        const b = toBool(r.is_verified);
        if (b !== null) isVerified = b;
        else isVerified = userType === 'citizen'; // align with register default
      }

      let emailVerified = undefined;
      if (usersCols.has('email_verified')) {
        const b = toBool(r.email_verified);
        if (b !== null) emailVerified = b;
        else emailVerified = true; // default to allow login
      }

      // Metadata JSON (optional)
      let metadata = undefined;
      if (usersCols.has('metadata') && Object.prototype.hasOwnProperty.call(r, 'metadata')) {
        const parsed = safeJson(r.metadata);
        if (parsed === null) rowErrors.push('metadata geçersiz JSON');
        else metadata = parsed;
      }

      // Party resolution (optional)
      let partyId = null;
      if (usersCols.has('party_id')) {
        partyId = await resolvePartyId({
          party_id: r.party_id,
          party_slug: r.party_slug,
          party_name: r.party_name,
          partiesCols,
        });
        if ((r.party_id || r.party_slug || r.party_name) && !partyId) {
          rowErrors.push('party bulunamadı (party_id / party_slug / party_name)');
        }
      }

      // Normalize partyId for uuid/int if needed (best-effort; pg will validate)
      if (partyId !== null && partyIdInfo && partyTableIdInfo) {
        // If users.party_id is uuid but parties.id isn't, or vice versa, it's already inconsistent in DB.
        // We'll still pass through and let DB error; but surface a clearer message.
        const up = (partyIdInfo.udt_name || '').toLowerCase();
        const pp = (partyTableIdInfo.udt_name || '').toLowerCase();
        if (up && pp && up !== pp) {
          rowErrors.push(`party_id tip uyumsuzluğu: users.party_id=${up}, parties.id=${pp} (DB şemasını kontrol edin)`);
        }
      }

      if (rowErrors.length) {
        report.skipped++;
        report.errors.push({ row: rowNum, email, username, errors: rowErrors, raw: pick(r, ['email', 'full_name', 'username', 'user_type']) });
        if (args.stopOnError) throw new Error(`Row ${rowNum} validation failed: ${rowErrors.join('; ')}`);
        continue;
      }

      // Create password_hash if password provided
      const passwordHash = pw ? await bcrypt.hash(pw, 10) : pwHashIn;

      // Build insert/update payload based on existing DB columns
      const payload = {};
      if (usersCols.has('email')) payload.email = email;
      if (usersCols.has('username')) payload.username = username;
      if (usersCols.has('full_name')) payload.full_name = fullName;
      if (usersCols.has('password_hash')) payload.password_hash = passwordHash;
      if (usersCols.has('user_type') && userType) payload.user_type = userType;
      if (usersCols.has('politician_type') && r.politician_type) payload.politician_type = String(r.politician_type).trim() || null;
      if (usersCols.has('province') && r.province) payload.province = String(r.province).trim() || null;
      if (usersCols.has('district_name') && r.district_name) payload.district_name = String(r.district_name).trim() || null;
      if (usersCols.has('city_code') && r.city_code) payload.city_code = String(r.city_code).trim() || null;
      if (usersCols.has('bio') && Object.prototype.hasOwnProperty.call(r, 'bio')) payload.bio = String(r.bio || '').trim() || null;
      if (usersCols.has('avatar_url') && r.avatar_url) payload.avatar_url = String(r.avatar_url).trim() || null;
      if (usersCols.has('cover_url') && r.cover_url) payload.cover_url = String(r.cover_url).trim() || null;
      if (usersCols.has('party_id')) payload.party_id = partyId;
      if (usersCols.has('is_active')) payload.is_active = isActive;
      if (usersCols.has('is_admin')) payload.is_admin = isAdmin;
      if (usersCols.has('is_automated')) payload.is_automated = isAutomated;
      if (usersCols.has('is_verified')) payload.is_verified = isVerified;
      if (usersCols.has('email_verified')) payload.email_verified = emailVerified;
      if (usersCols.has('metadata') && metadata !== undefined) payload.metadata = JSON.stringify(metadata);

      if (args.dryRun) {
        report.inserted++;
        takenEmails.add(email);
        takenUsernames.add(username);
        continue;
      }

      if (!args.upsert) {
        // INSERT
        const cols = Object.keys(payload);
        const vals = cols.map((_, i) => `$${i + 1}`).join(', ');
        const colList = cols.join(', ');
        const params = cols.map((c) => payload[c]);

        // If metadata is JSON string, cast to jsonb
        const text = `
          INSERT INTO users (${colList})
          VALUES (${vals})
          RETURNING id
        `;
        // eslint-disable-next-line no-await-in-loop
        await sql(text, params);
        report.inserted++;
      } else {
        // UPSERT by email
        const cols = Object.keys(payload).filter((c) => c !== 'email'); // email is match key
        const params = [email, ...cols.map((c) => payload[c])];
        const set = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
        const q = `
          WITH up AS (
            UPDATE users SET ${set}
            WHERE LOWER(email) = LOWER($1)
            RETURNING id
          )
          SELECT id FROM up
          UNION ALL
          SELECT (INSERT INTO users (${Object.keys(payload).join(', ')})
                  VALUES (${Object.keys(payload).map((_, i) => `$${i + 1}`).join(', ')})
                  RETURNING id) -- not valid SQL, will be replaced below
        `;
        // We can't do the above union trick easily with parametrized SQL without building a correct query.
        // Instead: try UPDATE, if 0 rows then INSERT.
        // eslint-disable-next-line no-await-in-loop
        const updated = await sql(`UPDATE users SET ${set} WHERE LOWER(email)=LOWER($1) RETURNING id`, params);
        if (updated && updated.length) {
          report.updated++;
        } else {
          const insertCols = Object.keys(payload);
          const insertVals = insertCols.map((_, i) => `$${i + 1}`).join(', ');
          const insertParams = insertCols.map((c) => payload[c]);
          // eslint-disable-next-line no-await-in-loop
          await sql(`INSERT INTO users (${insertCols.join(', ')}) VALUES (${insertVals}) RETURNING id`, insertParams);
          report.inserted++;
        }
      }

      takenEmails.add(email);
      takenUsernames.add(username);
    }

    if (!args.dryRun) await sql('COMMIT');
  } catch (err) {
    if (!args.dryRun) await sql('ROLLBACK');
    throw err;
  } finally {
    // Write report file
    try {
      const fs = await import('fs/promises');
      const reportPath = path.isAbsolute(args.report) ? args.report : path.join(process.cwd(), args.report);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    } catch (e) {
      // don't fail import if report write fails
      // eslint-disable-next-line no-console
      console.error('⚠️ report write failed:', e?.message || e);
    }
    await closeDb();
  }

  // eslint-disable-next-line no-console
  console.log('✅ Import finished:', {
    totalRows: report.totalRows,
    inserted: report.inserted,
    updated: report.updated,
    skipped: report.skipped,
    reportFile: args.report,
  });
  if (report.errors.length) {
    // eslint-disable-next-line no-console
    console.log(`⚠️ ${report.errors.length} satır atlandı. Detaylar raporda: ${args.report}`);
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('❌ Import failed:', e?.message || e);
  process.exit(1);
});

