import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables! Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Define User types based on our custom 'usersvivai' table
export type UserRole = 'admin' | 'operaio';

export interface UserProfile {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  ruolo: UserRole;
  created_at: string;
}
