import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Declarăm o variabilă globală pentru a păstra instanța
const globalForSupabase = global as unknown as { supabase: ReturnType<typeof createClient> };

// Exportăm instanța existentă sau creăm una nouă dacă nu există
export const supabase = globalForSupabase.supabase || createClient(supabaseUrl, supabaseAnonKey);

// În modul de dezvoltare, salvăm instanța în obiectul global pentru a preveni duplicarea la Hot Reload
if (process.env.NODE_ENV !== 'production') globalForSupabase.supabase = supabase;
