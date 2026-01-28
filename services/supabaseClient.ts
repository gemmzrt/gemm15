import { createClient } from '@supabase/supabase-js';

// Access environment variables safely
const env = (import.meta as any).env;

const url = env?.VITE_SUPABASE_URL;
const key = env?.VITE_SUPABASE_ANON_KEY;

// Detect if we are in "Mock Mode" (Offline Demo)
// This happens if variables are missing or are the placeholders
export const isMockMode = !url || !key || url.includes('placeholder');

// Use placeholders to initialize the client so it doesn't crash, 
// but we will gate the calls in App.tsx using `isMockMode`.
const supabaseUrl = url || 'https://placeholder.supabase.co';
const supabaseAnonKey = key || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    }
});