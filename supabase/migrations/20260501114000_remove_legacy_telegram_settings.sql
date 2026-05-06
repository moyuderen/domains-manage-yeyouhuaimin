DELETE FROM public.settings
WHERE key IN ('telegram_bot_token', 'telegram_chat_id')
AND EXISTS (
  SELECT 1
  FROM public.notification_endpoints
  WHERE channel_key = 'telegram'
);

DELETE FROM public.settings
WHERE key = 'telegram_enabled'
AND EXISTS (
  SELECT 1
  FROM public.notification_endpoints
  WHERE channel_key = 'telegram'
)
AND EXISTS (
  SELECT 1
  FROM public.notification_preferences
  WHERE user_id = 'default' AND type_key = 'domain_expiry_reminder'
);

DELETE FROM public.settings
WHERE key = 'telegram_expiry_days'
AND EXISTS (
  SELECT 1
  FROM public.notification_preferences
  WHERE user_id = 'default' AND type_key = 'domain_expiry_reminder'
);

DELETE FROM public.settings
WHERE key IN ('telegram_notify_hour', 'telegram_notify_timezone')
AND EXISTS (
  SELECT 1
  FROM public.notification_preferences
  WHERE user_id = 'default' AND type_key = 'notification_schedule'
);
