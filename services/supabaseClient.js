// supabaseClient.js
// Shared Supabase client for payment storage

const { createClient } = require('@supabase/supabase-js');

// ✅ Hardcoded Supabase credentials (only do this for testing / internal project)
const SUPABASE_URL = 'https://afpxaivaihxphwoqkwyl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmcHhhaXZhaWh4cGh3b3Frd3lsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk2NDYyOCwiZXhwIjoyMDc4NTQwNjI4fQ.G62unSabl0lD6qKC91-qP0Tc2JU5OmOgVkl52SMJ2AI';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('⚠️  Supabase configuration missing. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = { supabase };
