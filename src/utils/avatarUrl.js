export function normalizeAvatarUrl(input) {
  const url = String(input || '').trim();
  if (!url) return '';

  // If it's a Supabase Storage public avatar URL, proxy it to avoid browser-side 400 spam.
  // Example: https://<project>.supabase.co/storage/v1/object/public/avatars/...
  if (/^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\//i.test(url)) {
    return `/api/avatar?u=${encodeURIComponent(url)}`;
  }

  // Normalize remote URLs to be safely encoded (avoid Turkish chars breaking).
  if (/^https?:\/\//i.test(url)) {
    try {
      // If already percent-encoded, keep as-is.
      if (url.includes('%')) return url;
      return encodeURI(url);
    } catch {
      return url;
    }
  }

  // Local paths (e.g. /favicon.ico) pass through.
  return url;
}

