import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Tolerante a configuración faltante: si no hay URL/key, exporta null en vez de
// explotar en import-time (el guard de App.jsx muestra la pantalla de setup).
// Ningún caller debe usar `supabase` cuando envConfigured es false.
export const envConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = envConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;