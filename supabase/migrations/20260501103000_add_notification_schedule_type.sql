ALTER TABLE public.notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_type_key_check;
ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_type_key_check
  CHECK (type_key = ANY (ARRAY['domain_expiry_reminder', 'notification_schedule', 'auth_activity', 'resource_change', 'settings_change']::text[]));

ALTER TABLE public.notification_deliveries DROP CONSTRAINT IF EXISTS notification_deliveries_type_key_check;
ALTER TABLE public.notification_deliveries ADD CONSTRAINT notification_deliveries_type_key_check
  CHECK (type_key = ANY (ARRAY['domain_expiry_reminder', 'notification_schedule', 'auth_activity', 'resource_change', 'settings_change']::text[]));
