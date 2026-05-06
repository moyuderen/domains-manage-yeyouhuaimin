-- Fix check constraints on notification tables
-- The original migration used `create table if not exists` which does not update
-- constraints on existing tables. This migration drops and re-adds them.

-- notification_endpoints
ALTER TABLE public.notification_endpoints DROP CONSTRAINT IF EXISTS notification_endpoints_channel_key_check;
ALTER TABLE public.notification_endpoints ADD CONSTRAINT notification_endpoints_channel_key_check
  CHECK (channel_key = ANY (ARRAY['telegram', 'email', 'webhook']::text[]));

-- notification_preferences
ALTER TABLE public.notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_type_key_check;
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_type_key_check
  CHECK (type_key = ANY (ARRAY['domain_expiry_reminder', 'notification_schedule', 'auth_activity', 'resource_change', 'settings_change']::text[]));

-- notification_deliveries
ALTER TABLE public.notification_deliveries DROP CONSTRAINT IF EXISTS notification_deliveries_type_key_check;
ALTER TABLE public.notification_deliveries ADD CONSTRAINT notification_deliveries_type_key_check
  CHECK (type_key = ANY (ARRAY['domain_expiry_reminder', 'notification_schedule', 'auth_activity', 'resource_change', 'settings_change']::text[]));

ALTER TABLE public.notification_deliveries DROP CONSTRAINT IF EXISTS notification_deliveries_channel_key_check;
ALTER TABLE public.notification_deliveries ADD CONSTRAINT notification_deliveries_channel_key_check
  CHECK (channel_key = ANY (ARRAY['telegram', 'email', 'webhook']::text[]));

ALTER TABLE public.notification_deliveries DROP CONSTRAINT IF EXISTS notification_deliveries_status_check;
ALTER TABLE public.notification_deliveries ADD CONSTRAINT notification_deliveries_status_check
  CHECK (status = ANY (ARRAY['pending', 'sent', 'failed', 'skipped']::text[]));

ALTER TABLE public.notification_deliveries DROP CONSTRAINT IF EXISTS notification_deliveries_level_check;
ALTER TABLE public.notification_deliveries ADD CONSTRAINT notification_deliveries_level_check
  CHECK (level = ANY (ARRAY['info', 'warning', 'critical']::text[]));
