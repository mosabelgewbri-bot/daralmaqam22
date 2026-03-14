import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wcwvdlcvkhtupnddjhfj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indjd3ZkbGN2a2h0dXBuZGRqaGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjk1MjIsImV4cCI6MjA4ODgwNTUyMn0.dy3uE747K1NDWFe5SBs5N8M0b6e4QuU9TFmXvcaYu4w';

console.log('Supabase Connection Info:', {
  url: supabaseUrl,
  hasKey: !!supabaseAnonKey
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
