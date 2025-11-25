import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DbEvent {
  id: string;
  name: string;
  slug: string;
  dates: string[];
  start_time: string;
  end_time: string;
  timezone: string;
  name_option: 'required' | 'optional' | 'anonymous';
  created_at: string;
}

export interface DbAvailability {
  id: string;
  event_id: string;
  participant_name: string;
  slots: string[];
  session_token: string | null;
  submitted_at: string;
}
