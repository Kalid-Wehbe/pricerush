
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
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

  console.log("Running PriceRush product validation...");

  const { data, error } = await supabase.rpc(
    "validate_product_candidates"
  );

  if (error) {
    throw new Error(
      `Validation failed: ${error.message}`
    );
  }

  console.log("\n========== RESULTS ==========");
  console.table(data);

  console.log("\nValidation completed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
