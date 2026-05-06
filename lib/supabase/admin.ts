import { createClient } from '@supabase/supabase-js'

export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('缺少服务端 Supabase 管理员环境变量。')
  }

  return createClient(url, key)
}
