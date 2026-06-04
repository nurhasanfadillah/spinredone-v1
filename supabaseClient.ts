
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase URL and Anon Key
const SUPABASE_URL = 'https://hhmwurtgqognyaocsooo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhobXd1cnRncW9nbnlhb2Nzb29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3Nzg0MzIsImV4cCI6MjA4NTM1NDQzMn0.8-8T9UIZMRyNrxBrdf_9XJU1xMyMdp4HPwI_n8Q2xUo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
