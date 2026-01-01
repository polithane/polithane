-- ============================================
-- Admin tables RLS hardening (Supabase warning cleanup)
-- ============================================
-- Goal:
-- - Remove Supabase Security Advisor warnings: "RLS Disabled in Public"
-- - Keep backend (service_role) working without breaking admin APIs
--
-- Notes:
-- - In Supabase, the `service_role` key bypasses RLS.
-- - Once RLS is enabled and NO policies are created, `anon` and `authenticated`
--   roles get no access by default.
-- - Our app's backend uses the service role key for admin tables, so it stays functional.
--
-- If you later want admin users (authenticated) to query these tables directly from client,
-- add explicit policies with extreme care.

-- Enable RLS on admin_* tables (idempotent)
alter table if exists public.admin_payment_transactions enable row level security;
alter table if exists public.admin_email_templates enable row level security;
alter table if exists public.admin_notification_rules enable row level security;
alter table if exists public.admin_revenue_entries enable row level security;
alter table if exists public.admin_security_events enable row level security;
alter table if exists public.admin_workflows enable row level security;
alter table if exists public.admin_api_keys enable row level security;
alter table if exists public.admin_sources enable row level security;
alter table if exists public.admin_payment_plans enable row level security;
alter table if exists public.admin_ads enable row level security;

-- (Optional) Make intent explicit: revoke default grants (best-effort).
-- Supabase often manages grants, but these help tighten exposure.
revoke all on table public.admin_payment_transactions from anon, authenticated;
revoke all on table public.admin_email_templates from anon, authenticated;
revoke all on table public.admin_notification_rules from anon, authenticated;
revoke all on table public.admin_revenue_entries from anon, authenticated;
revoke all on table public.admin_security_events from anon, authenticated;
revoke all on table public.admin_workflows from anon, authenticated;
revoke all on table public.admin_api_keys from anon, authenticated;
revoke all on table public.admin_sources from anon, authenticated;
revoke all on table public.admin_payment_plans from anon, authenticated;
revoke all on table public.admin_ads from anon, authenticated;

