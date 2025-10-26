import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// 디버깅: 환경 변수 로드 확인
console.log('🔍 Supabase Config Debug:')
console.log('URL:', supabaseUrl)
console.log('Key (first 20 chars):', supabaseAnonKey.substring(0, 20) + '...')
console.log('Is Configured:', supabaseUrl !== 'https://placeholder.supabase.co' && supabaseAnonKey !== 'placeholder-key')

// Supabase 클라이언트 생성 (환경 변수 없어도 에러 없이 생성)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 환경 변수가 제대로 설정되었는지 확인
export const isSupabaseConfigured = () => {
  const isConfigured = supabaseUrl !== 'https://placeholder.supabase.co' && 
         supabaseAnonKey !== 'placeholder-key'
  console.log('🔍 isSupabaseConfigured called:', isConfigured)
  return isConfigured
}

export interface RankingRecord {
  id?: string
  nickname: string
  total_time: number
  captcha_time: number
  round_times: number[]
  created_at?: string
}

