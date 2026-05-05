import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function getConstraints() {
  const { data, error } = await supabase.rpc('get_foreign_keys');
  console.log("RPC result:", data || error);
}
getConstraints();
