export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(url && anonKey && url !== 'https://placeholder.supabase.co' && anonKey !== 'placeholder-anon-key')
}
