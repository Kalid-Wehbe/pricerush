
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_DATE = "2026-11-12";

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase credentials.");
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  console.log("Preparing challenge for:", TEST_DATE);

  const { data, error } = await supabase.rpc(
    "prepare_daily_challenge",
    { p_date: TEST_DATE }
  );

  if (error) {
    throw new Error(error.message);
  }

  console.log("Challenge created:", data);
  console.log("Challenge remains unpublished.");
}

main().catch((error) => {
  console.error("Test failed:", error.message);
  process.exitCode = 1;
});
