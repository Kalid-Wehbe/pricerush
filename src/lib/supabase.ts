
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ksannqtvpetpgssawicw.supabase.co";

const supabaseKey =
  "sb_publishable_Az9gBfnMH59kx9DuFIKHQA_-X8ftWlc";

export const supabase = createClient(supabaseUrl, supabaseKey);
