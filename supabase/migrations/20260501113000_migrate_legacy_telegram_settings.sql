WITH legacy AS (
  SELECT
    NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_bot_token')), '') AS bot_token,
    NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_chat_id')), '') AS chat_id,
    NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_enabled')), '') AS enabled_text,
    CASE
      WHEN NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_expiry_days')), '') ~ '^\d+$'
        THEN NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_expiry_days')), '')::int
      ELSE 30
    END AS expiry_days,
    CASE
      WHEN NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_notify_hour')), '') ~ '^\d+$'
        THEN GREATEST(0, LEAST(23, NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_notify_hour')), '')::int))
      ELSE 9
    END AS notify_hour,
    COALESCE(NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_notify_timezone')), ''), 'Asia/Shanghai') AS notify_timezone
  FROM public.settings
  WHERE key IN (
    'telegram_bot_token',
    'telegram_chat_id',
    'telegram_enabled',
    'telegram_expiry_days',
    'telegram_notify_hour',
    'telegram_notify_timezone'
  )
)
INSERT INTO public.notification_endpoints (
  channel_key,
  name,
  enabled,
  config,
  last_verified_at
)
SELECT
  'telegram',
  'Telegram',
  CASE WHEN LOWER(COALESCE(enabled_text, '')) = 'true' THEN true ELSE false END,
  jsonb_strip_nulls(jsonb_build_object(
    'botToken', bot_token,
    'chatId', chat_id
  )),
  NULL
FROM legacy
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notification_endpoints
  WHERE channel_key = 'telegram'
)
AND (
  bot_token IS NOT NULL
  OR chat_id IS NOT NULL
  OR enabled_text IS NOT NULL
);

WITH legacy AS (
  SELECT
    NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_bot_token')), '') AS bot_token,
    NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_chat_id')), '') AS chat_id
  FROM public.settings
  WHERE key IN ('telegram_bot_token', 'telegram_chat_id')
)
UPDATE public.notification_endpoints AS endpoint
SET config = jsonb_strip_nulls(
  endpoint.config
  || CASE
    WHEN NULLIF(BTRIM(COALESCE(endpoint.config->>'botToken', '')), '') IS NULL AND legacy.bot_token IS NOT NULL
      THEN jsonb_build_object('botToken', legacy.bot_token)
    ELSE '{}'::jsonb
  END
  || CASE
    WHEN NULLIF(BTRIM(COALESCE(endpoint.config->>'chatId', '')), '') IS NULL AND legacy.chat_id IS NOT NULL
      THEN jsonb_build_object('chatId', legacy.chat_id)
    ELSE '{}'::jsonb
  END
)
FROM legacy
WHERE endpoint.channel_key = 'telegram'
AND (
  (NULLIF(BTRIM(COALESCE(endpoint.config->>'botToken', '')), '') IS NULL AND legacy.bot_token IS NOT NULL)
  OR (NULLIF(BTRIM(COALESCE(endpoint.config->>'chatId', '')), '') IS NULL AND legacy.chat_id IS NOT NULL)
);

WITH legacy AS (
  SELECT
    NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_enabled')), '') AS enabled_text,
    CASE
      WHEN NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_expiry_days')), '') ~ '^\d+$'
        THEN NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_expiry_days')), '')::int
      ELSE 30
    END AS expiry_days
  FROM public.settings
  WHERE key IN ('telegram_enabled', 'telegram_expiry_days')
)
INSERT INTO public.notification_preferences (
  user_id,
  type_key,
  enabled,
  config
)
SELECT
  'default',
  'domain_expiry_reminder',
  CASE
    WHEN LOWER(COALESCE(enabled_text, '')) = 'true' THEN true
    WHEN LOWER(COALESCE(enabled_text, '')) = 'false' THEN false
    ELSE true
  END,
  jsonb_build_object('expiryDays', expiry_days)
FROM legacy
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notification_preferences
  WHERE user_id = 'default' AND type_key = 'domain_expiry_reminder'
)
AND enabled_text IS NOT NULL;

WITH legacy AS (
  SELECT
    CASE
      WHEN NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_expiry_days')), '') ~ '^\d+$'
        THEN NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_expiry_days')), '')::int
      ELSE 30
    END AS expiry_days
  FROM public.settings
  WHERE key = 'telegram_expiry_days'
)
UPDATE public.notification_preferences AS preference
SET config = preference.config || jsonb_build_object('expiryDays', legacy.expiry_days)
FROM legacy
WHERE preference.user_id = 'default'
AND preference.type_key = 'domain_expiry_reminder'
AND preference.config->'expiryDays' IS NULL;

WITH legacy AS (
  SELECT
    CASE
      WHEN NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_notify_hour')), '') ~ '^\d+$'
        THEN GREATEST(0, LEAST(23, NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_notify_hour')), '')::int))
      ELSE 9
    END AS notify_hour,
    COALESCE(NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_notify_timezone')), ''), 'Asia/Shanghai') AS notify_timezone
  FROM public.settings
  WHERE key IN ('telegram_notify_hour', 'telegram_notify_timezone')
)
INSERT INTO public.notification_preferences (
  user_id,
  type_key,
  enabled,
  config
)
SELECT
  'default',
  'notification_schedule',
  true,
  jsonb_build_object(
    'notifyHour', notify_hour,
    'notifyTimezone', notify_timezone
  )
FROM legacy
WHERE NOT EXISTS (
  SELECT 1
  FROM public.notification_preferences
  WHERE user_id = 'default' AND type_key = 'notification_schedule'
);

WITH legacy AS (
  SELECT
    CASE
      WHEN NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_notify_hour')), '') ~ '^\d+$'
        THEN GREATEST(0, LEAST(23, NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_notify_hour')), '')::int))
      ELSE 9
    END AS notify_hour,
    COALESCE(NULLIF(BTRIM(MAX(value) FILTER (WHERE key = 'telegram_notify_timezone')), ''), 'Asia/Shanghai') AS notify_timezone
  FROM public.settings
  WHERE key IN ('telegram_notify_hour', 'telegram_notify_timezone')
)
UPDATE public.notification_preferences AS preference
SET config = preference.config
  || CASE
    WHEN preference.config->'notifyHour' IS NULL THEN jsonb_build_object('notifyHour', legacy.notify_hour)
    ELSE '{}'::jsonb
  END
  || CASE
    WHEN preference.config->'notifyTimezone' IS NULL THEN jsonb_build_object('notifyTimezone', legacy.notify_timezone)
    ELSE '{}'::jsonb
  END
FROM legacy
WHERE preference.user_id = 'default'
AND preference.type_key = 'notification_schedule'
AND (
  preference.config->'notifyHour' IS NULL
  OR preference.config->'notifyTimezone' IS NULL
);
