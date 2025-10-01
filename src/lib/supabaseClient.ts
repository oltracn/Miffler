import { createClient } from '@supabase/supabase-js';
// Try to read env from @env (react-native-dotenv) or fallback to process.env
let SUPABASE_URL: string | undefined;
let SUPABASE_ANON_KEY: string | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const env = require('@env');
  SUPABASE_URL = env.SUPABASE_URL;
  SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
} catch (e) {
  SUPABASE_URL = process.env.SUPABASE_URL as string | undefined;
  SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string | undefined;
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Throwing here will break the app if env is not configured. Caller may handle.
  console.warn('Warning: SUPABASE_URL or SUPABASE_ANON_KEY is not set. Supabase client may fail to initialize.');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');
