import { createClient } from '@supabase/supabase-js';

// These environment variables will be provided by the user in the AI Studio environment
// Fallback to the user-provided values if env vars are missing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zpugtmnizkfgcvuhezh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdWd0bW5pemNrZmdjdnVoZXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjQwOTMsImV4cCI6MjA4NzY0MDA5M30._CErlcf78AUsYBHBLmV5GNlHHKvZUtRIDCYdRs4Wqnw';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co';

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey
);
