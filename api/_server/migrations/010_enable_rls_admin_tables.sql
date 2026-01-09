-- Enable RLS on admin-facing tables exposed to PostgREST.
-- This addresses Supabase Security Advisor warnings (RLS Disabled in Public).
--
-- Design:
-- - Enable RLS
-- - Add a "deny all" policy for anon/authenticated
-- - Backend/worker uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'admin_payment_transactions',
    'admin_email_templates',
    'admin_notification_rules',
    'admin_revenue_entries',
    'admin_security_events',
    'admin_workflows',
    'admin_api_keys',
    'admin_sources',
    'admin_payment_plans',
    'admin_ads',
    'media_jobs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', t);

    -- Create deny policy if missing
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t
        AND policyname = 'deny_anon_authenticated'
    ) THEN
      EXECUTE format(
        'CREATE POLICY deny_anon_authenticated ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);',
        t
      );
    END IF;
  END LOOP;
END $$;

