import { createClient } from '@supabase/supabase-js';

// Use environment variables in hosted deployments; keep fallback for local dev.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hamfzlaadrpkfqqwznsf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbWZ6bGFhZHJwa2ZxcXd6bnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDA2NTQsImV4cCI6MjA5MDY3NjY1NH0.Y4SHWG90N0X3Zvgo_sp2eutSoGszyUNuK4HWQ_0rPLQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
