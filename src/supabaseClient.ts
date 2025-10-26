import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface RankingRecord {
  id?: string
  nickname: string
  total_time: number
  captcha_time: number
  round_times: number[]
  created_at?: string
}

