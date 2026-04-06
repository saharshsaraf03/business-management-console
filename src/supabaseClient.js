import { createClient } from '@supabase/supabase-js';

// ============================================================
// Replace these placeholder values with your Supabase project
// credentials found at: Project Settings → API
// ============================================================
const SUPABASE_URL = 'https://uijkwfiathigirtprwxe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpamt3ZmlhdGhpZ2lydHByd3hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODMyMjgsImV4cCI6MjA5MDQ1OTIyOH0.X7jQoHUdAbDOdG8ZowuprnPAg9KLWgsL0L477KOFv0M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
