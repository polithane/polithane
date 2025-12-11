# 🚀 SUPABASE IMPLEMENTATION GUIDE

> **Step-by-step guide ile Polithane projesini Supabase'e geçirme rehberi**

---

## 📋 İÇERİK

1. [Hazırlık](#1-hazirlik)
2. [Supabase Setup](#2-supabase-setup)
3. [Database Migration](#3-database-migration)
4. [Storage Migration](#4-storage-migration)
5. [Frontend Update](#5-frontend-update)
6. [Testing](#6-testing)
7. [Deployment](#7-deployment)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. HAZIRLIK

### 1.1 Backup (KRİTİK!)

```bash
# Neon database backup
pg_dump $DATABASE_URL > backups/neon_backup_$(date +%Y%m%d).sql

# CHP photos backup (if not in git)
cd public/assets/profiles/politicians
tar -czf ~/polithane_chp_photos_backup.tar.gz .

# Git commit (ensure everything is committed)
git add .
git commit -m "Pre-Supabase migration backup"
git push origin main
```

### 1.2 Package Installation

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Verify installation
npm list @supabase/supabase-js
# Expected: @supabase/supabase-js@2.39.0 (or later)
```

---

## 2. SUPABASE SETUP

### 2.1 Create Supabase Account

1. Go to https://supabase.com
2. Sign up with GitHub (recommended)
3. Verify email

### 2.2 Create New Project

```yaml
Organization: polithane (or personal)
Project Name: polithane-production
Database Password: [GÜÇLÜ ŞİFRE - KAYDET!]
Region: Europe West (Frankfurt) # En yakın Türkiye'ye
Pricing: Free
```

⚠️ **ÖNEMLİ:** Database password'ü güvenli bir yere kaydet (1Password, LastPass, etc.)

### 2.3 Get API Keys

1. Supabase Dashboard → Settings → API
2. Copy these values:

```bash
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... # GİZLİ!
```

### 2.4 Setup Environment Variables

**Backend (.env):**

```bash
# Create/edit server/.env
cd server
touch .env

# Add these:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci... # Service role key

# Direct database connection (for migrations)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Keep existing for now (will remove later)
# EMAIL_SERVICE=sendgrid
# EMAIL_PASSWORD=...
```

**Frontend (.env.local):**

```bash
# Create/edit .env.local
touch .env.local

# Add these:
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci... # Anon key (public - güvenli)

# Keep existing for backward compatibility
# VITE_API_URL=http://localhost:5000/api
```

**Verify:**

```bash
# Check environment variables are loaded
node -e "console.log(require('dotenv').config())"
```

---

## 3. DATABASE MIGRATION

### 3.1 Run Migration Script

**Option A: Supabase Dashboard (Easy)**

1. Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/001_polithane_initial_schema.sql`
3. Copy-paste entire content
4. Click "Run"
5. Wait for completion (~30 seconds)

**Option B: Supabase CLI (Recommended)**

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref xxxxx

# Run migration
supabase db push
```

**Option C: psql (Advanced)**

```bash
# Using direct connection
psql $DATABASE_URL < supabase/migrations/001_polithane_initial_schema.sql
```

### 3.2 Verify Schema

```sql
-- In Supabase SQL Editor:

-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected tables:
-- ✅ parties
-- ✅ users
-- ✅ mp_profiles
-- ✅ posts
-- ✅ comments
-- ✅ likes
-- ✅ follows
-- ✅ notifications
-- ✅ messages

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- All should show: rowsecurity = true
```

### 3.3 Import Data from Neon

**Export from Neon:**

```bash
# Option 1: Neon Dashboard
1. Neon Console → Database → Export
2. Download SQL dump

# Option 2: pg_dump
pg_dump $NEON_DATABASE_URL \
  --data-only \
  --table=parties \
  --table=users \
  --table=posts \
  --table=comments \
  --table=likes \
  --table=follows \
  > neon_data_export.sql
```

**Import to Supabase:**

```bash
# Clean up SQL (remove conflicting statements)
sed -i '/SET /d' neon_data_export.sql
sed -i '/SELECT pg_catalog/d' neon_data_export.sql

# Import
psql $SUPABASE_DATABASE_URL < neon_data_export.sql
```

**Verify Data:**

```sql
-- Check row counts match
SELECT 'users' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'posts', COUNT(*) FROM posts
UNION ALL
SELECT 'parties', COUNT(*) FROM parties
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
UNION ALL
SELECT 'likes', COUNT(*) FROM likes
UNION ALL
SELECT 'follows', COUNT(*) FROM follows;

-- Compare with Neon counts
```

---

## 4. STORAGE MIGRATION

### 4.1 Create Storage Buckets

1. Supabase Dashboard → Storage
2. Create buckets:

**Avatars Bucket:**
```yaml
Name: avatars
Public: true
File size limit: 5MB
Allowed MIME types: image/jpeg, image/png, image/webp
```

**Covers Bucket:**
```yaml
Name: covers
Public: true
File size limit: 10MB
Allowed MIME types: image/jpeg, image/png, image/webp
```

**Posts Bucket:**
```yaml
Name: posts
Public: true
File size limit: 20MB
Allowed MIME types: image/*, video/*
```

### 4.2 Setup Storage Policies

Go to: Storage → [bucket] → Policies

**For each bucket, add:**

```sql
-- Public read
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Users can update own files
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

Repeat for `covers` and `posts` buckets.

### 4.3 Migrate CHP Photos

```bash
# Install dependencies
cd supabase/scripts
npm install

# Set environment variables
export SUPABASE_URL=https://xxxxx.supabase.co
export SUPABASE_SERVICE_KEY=eyJhbGci...

# Run migration
npm run migrate:photos

# Expected output:
# 🚀 Starting CHP Politicians Photos Migration
# 📸 Found 2024 photos to migrate
# 📤 Starting upload...
# ✅ Successful: 2024/2024
# 🔄 Updating database URLs...
# ✅ All photos migrated successfully!
```

**Tahmini süre:** 20-30 dakika

**If errors occur:**

```bash
# Retry failed uploads
npm run migrate:photos

# Check logs
tail -f migration.log

# Manual verification
ls -la ../../public/assets/profiles/politicians/ | wc -l
# Should match uploaded count
```

### 4.4 Verify Storage

```sql
-- Check storage usage
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM(COALESCE(metadata->>'size', '0')::bigint) / 1024 / 1024 as total_mb
FROM storage.objects
GROUP BY bucket_id;

-- Expected:
-- avatars | 2024 | ~250MB
```

**Frontend Test:**

```javascript
// Open browser console on polithane.com
const testUrl = 'https://xxxxx.supabase.co/storage/v1/object/public/avatars/politicians/test.jpg';
fetch(testUrl).then(r => console.log('Status:', r.status));
// Expected: Status: 200 (or 404 if file doesn't exist)
```

---

## 5. FRONTEND UPDATE

### 5.1 Replace API Service

**Backup old file:**

```bash
cp src/utils/api.js src/utils/api_OLD.js
```

**Use new Supabase client:**

```bash
# Already created: src/lib/supabase.js
# No action needed
```

### 5.2 Update Auth Context

**Replace AuthContext:**

```bash
# Backup
mv src/contexts/AuthContext.jsx src/contexts/AuthContext_OLD.jsx

# Use new Supabase version
mv src/contexts/AuthContextSupabase.jsx src/contexts/AuthContext.jsx
```

**Update imports across app:**

```bash
# Check all imports
grep -r "AuthContext" src/

# Should still work (same exports)
```

### 5.3 Update Components

#### Example: HomePage.jsx

**Before:**

```javascript
import { posts as postsApi } from '../utils/api';

const fetchPosts = async () => {
  const data = await postsApi.getAll({ category });
  setPosts(data.data);
};
```

**After:**

```javascript
import { db } from '../lib/supabase';

const fetchPosts = async () => {
  const { posts } = await db.getPosts({ category });
  setPosts(posts);
};
```

#### Example: PostCard.jsx

**Before:**

```javascript
const handleLike = async () => {
  await postsApi.like(post.id);
  setLiked(!liked);
};
```

**After:**

```javascript
import { useAuth } from '../contexts/AuthContext';

const { profile } = useAuth();

const handleLike = async () => {
  if (!profile) {
    toast.error('Beğenmek için giriş yapın');
    return;
  }
  
  const result = await db.toggleLike(post.id, profile.id);
  setLiked(result.liked);
};
```

#### Example: ProfilePage.jsx

**Before:**

```javascript
const handleUpload = async (e) => {
  const formData = new FormData();
  formData.append('avatar', e.target.files[0]);
  
  await usersApi.updateProfile(formData);
};
```

**After:**

```javascript
import { storage } from '../lib/supabase';

const handleUpload = async (e) => {
  const file = e.target.files[0];
  const url = await storage.uploadAvatar(profile.id, file);
  
  await db.updateProfile(profile.id, { avatar_url: url });
};
```

### 5.4 Batch Update Script

```bash
# Find all API calls
grep -rn "import.*from.*'.*api'" src/ > api_imports.txt

# Review and update manually
# Most common replacements:
# - postsApi.getAll() → db.getPosts()
# - usersApi.getByUsername() → db.getUserProfile()
# - messagesApi.send() → supabase.from('messages').insert()
```

### 5.5 Add Realtime Features (New!)

**Example: Notification Bell**

```javascript
// src/components/NotificationBell.jsx
import { useEffect, useState } from 'react';
import { realtime, db } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function NotificationBell() {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    // Subscribe to new notifications
    const subscription = realtime.subscribeToNotifications(
      profile.id,
      (notification) => {
        console.log('New notification:', notification);
        setUnreadCount(prev => prev + 1);
        toast.info('Yeni bildirim!');
      }
    );

    // Load initial unread count
    db.getNotifications(profile.id).then(notifications => {
      const unread = notifications.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    });

    return () => {
      realtime.unsubscribe(subscription);
    };
  }, [profile]);

  return (
    <button className="relative">
      <BellIcon />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
```

---

## 6. TESTING

### 6.1 Local Testing

```bash
# Start dev server
npm run dev

# Open browser
open http://localhost:5173
```

**Test Checklist:**

- [ ] Homepage loads
- [ ] Posts appear
- [ ] Avatar images load (CHP politicians)
- [ ] Login works
- [ ] Register works
- [ ] Create post works
- [ ] Upload image works
- [ ] Like post works
- [ ] Comment works
- [ ] Follow user works
- [ ] Profile page works
- [ ] Messages work
- [ ] Notifications work (realtime)

### 6.2 Browser Console Check

```javascript
// Check Supabase connection
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

// Check auth state
const { data } = await supabase.auth.getSession();
console.log('Auth session:', data.session);

// Test query
const { data: posts } = await supabase.from('posts').select('*').limit(5);
console.log('Sample posts:', posts);
```

### 6.3 Common Issues

**Issue: "Invalid API key"**

```bash
# Solution: Check .env.local
cat .env.local | grep SUPABASE

# Ensure keys are correct
# Restart dev server
npm run dev
```

**Issue: "Row Level Security" error**

```sql
-- Solution: Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'posts';

-- If missing, re-run migration
```

**Issue: Images not loading**

```bash
# Check storage bucket is public
# Supabase Dashboard → Storage → avatars → Settings
# Public: ✅ ON
```

---

## 7. DEPLOYMENT

### 7.1 Update Environment Variables

**Vercel Dashboard:**

1. Go to: vercel.com → polithane → Settings → Environment Variables
2. Add:

```
VITE_SUPABASE_URL = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGci...
```

3. Remove old:
```
VITE_API_URL (delete)
```

### 7.2 Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "feat: Migrate to Supabase (database, storage, auth)"
git push origin main

# Vercel will auto-deploy
# Or manual:
vercel --prod
```

### 7.3 Verify Production

```bash
# Check deployment
open https://polithane.vercel.app

# Test critical flows:
# 1. Homepage loads
# 2. Images load (Supabase CDN)
# 3. Auth works
# 4. Upload works
```

### 7.4 Monitor Errors

**Sentry (if setup):**

```bash
# Check for errors
# sentry.io → polithane → Issues
```

**Vercel Logs:**

```bash
# Real-time logs
vercel logs polithane --follow
```

**Supabase Logs:**

```bash
# Supabase Dashboard → Logs
# Check for:
# - Failed queries
# - Auth errors
# - Storage errors
```

---

## 8. TROUBLESHOOTING

### Common Errors

#### Error: "Invalid JWT"

**Cause:** Token expired or invalid

**Solution:**

```javascript
// Force sign out and re-login
await supabase.auth.signOut();
window.location.reload();
```

#### Error: "violates row-level security policy"

**Cause:** RLS policy restricting access

**Solution:**

```sql
-- Check policy
SELECT * FROM pg_policies 
WHERE tablename = 'posts' 
  AND policyname LIKE '%insert%';

-- If missing, add policy:
CREATE POLICY "Authenticated users can create posts"
ON posts FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

#### Error: "Storage bucket not found"

**Cause:** Bucket doesn't exist or wrong name

**Solution:**

```bash
# List buckets
supabase storage list

# Create if missing
# Dashboard → Storage → New Bucket
```

#### Error: "Failed to fetch"

**Cause:** CORS or network issue

**Solution:**

```javascript
// Check Supabase URL is correct
console.log(import.meta.env.VITE_SUPABASE_URL);

// Check network tab in DevTools
// Should see: https://xxxxx.supabase.co/rest/v1/...
```

### Performance Issues

#### Slow queries

```sql
-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id_created 
ON posts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_post_id 
ON comments(post_id);
```

#### Too many realtime connections

```javascript
// Cleanup subscriptions properly
useEffect(() => {
  const subscription = realtime.subscribeToNewPosts(callback);
  
  return () => {
    realtime.unsubscribe(subscription); // ⚠️ IMPORTANT
  };
}, []);
```

### Rollback Plan

**If migration fails catastrophically:**

```bash
# 1. Restore old .env
cp .env.local.backup .env.local

# 2. Revert code changes
git revert HEAD~1

# 3. Restore Neon database (if modified)
psql $NEON_DATABASE_URL < backups/neon_backup_20241211.sql

# 4. Deploy old version
git push origin main --force
vercel --prod

# 5. Notify users (if downtime)
```

---

## 9. POST-MIGRATION

### 9.1 Cleanup

```bash
# After 1 week of stable operation:

# 1. Close Railway project
# railway.app → polithane → Settings → Delete

# 2. Close Neon database
# neon.tech → polithane → Settings → Delete

# 3. Remove binary files from git
git rm -r public/assets/profiles/politicians/
git commit -m "chore: Remove politician photos (migrated to Supabase Storage)"
git push

# 4. Remove old API code
rm -rf server/routes/
rm -rf server/middleware/auth.js
git commit -m "chore: Remove old Express backend"
```

### 9.2 Documentation

Update README.md:

```markdown
## Tech Stack

- **Frontend:** React 18 + Vite + TailwindCSS
- **Backend:** Supabase (PostgreSQL + Storage + Auth + Realtime)
- **Hosting:** Vercel
- **Email:** SendGrid
```

### 9.3 Team Training

Share with team:

1. `SUPABASE_MIGRATION_PLAN.md` - Overview
2. `SUPABASE_IMPLEMENTATION_GUIDE.md` - This file
3. `src/lib/supabase.js` - API reference
4. Supabase Dashboard access (invite team members)

---

## 🎉 CONGRATULATIONS!

You've successfully migrated Polithane to Supabase!

**What you achieved:**

✅ Migrated 2000+ CHP photos to cloud storage  
✅ Simplified tech stack (3 platforms → 2)  
✅ Enabled realtime features  
✅ Prepared for mobile apps  
✅ Reduced monthly costs  
✅ Improved developer productivity  

**Next steps:**

1. Monitor for 1 week
2. Collect user feedback
3. Start mobile app development (React Native + Supabase SDK ready!)
4. Enable advanced features (OAuth, push notifications)

---

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Supabase GitHub](https://github.com/supabase/supabase)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)

---

**Need help? Contact the team! 💬**
