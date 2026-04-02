import { createClient } from '@supabase/supabase-js';

// Hardcode Supabase credentials so bad injected env values can't break the URL
const supabaseUrl = 'https://hamfzlaadrpkfqqwznsf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhbWZ6bGFhZHJwa2ZxcXd6bnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDA2NTQsImV4cCI6MjA5MDY3NjY1NH0.Y4SHWG90N0X3Zvgo_sp2eutSoGszyUNuK4HWQ_0rPLQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
