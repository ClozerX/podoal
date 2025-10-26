import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Supabase 클라이언트 생성 (환경 변수 없어도 에러 없이 생성)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 환경 변수가 제대로 설정되었는지 확인
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://placeholder.supabase.co' && 
         supabaseAnonKey !== 'placeholder-key'
}

export interface RankingRecord {
  id?: string
  nickname: string
  total_time: number
  captcha_time: number
  round_times: number[]
  created_at?: string
}

