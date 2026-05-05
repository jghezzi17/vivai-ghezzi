import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function getTableInfo(table) {
  const { data, error } = await supabase.from(table).select('*').limit(1);
  console.log(`Table ${table} columns:`, data ? Object.keys(data[0] || {}) : error);
}
await getTableInfo('interventi');
await getTableInfo('intervento_articoli');
await getTableInfo('intervento_operai');
