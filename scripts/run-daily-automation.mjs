
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const WRITE_MODE = process.argv.includes("--write");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Return a date in YYYY-MM-DD format using UTC.
function utcDate(offset = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

// Find a challenge for a specific date.
async function getChallenge(date) {
  const { data, error } = await supabase
    .from("daily_challenges")
    .select("id, challenge_date, is_active, published_at")
    .eq("challenge_date", date)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not check challenge for ${date}: ${error.message}`
    );
  }

  return data;
}

// Publish today's prepared challenge.
async function publishToday(today) {
  const challenge = await getChallenge(today);

  if (!challenge) {
    console.log(
      `No challenge prepared for ${today}. Skipping publication.`
    );
    return;
  }

  if (challenge.is_active && challenge.published_at) {
    console.log("Today's challenge is already published.");
    return;
  }

  if (!WRITE_MODE) {
    console.log(
      `DRY RUN: Would publish today's challenge ${challenge.id}`
    );
    return;
  }

  console.log(`Publishing today's challenge ${challenge.id}...`);

  const { error } = await supabase.rpc(
    "publish_daily_challenge",
    { p_challenge_id: challenge.id }
  );

  if (error) {
    // Another automation run may have published it.
    const updated = await getChallenge(today);

    if (updated?.is_active && updated?.published_at) {
      console.log("Challenge was published by another run.");
      return;
    }

    throw new Error(
      `Challenge publication failed: ${error.message}`
    );
  }

  const published = await getChallenge(today);

  if (!published?.is_active || !published?.published_at) {
    throw new Error(
      "Publication RPC succeeded, but challenge is not active."
    );
  }

  console.log("Today's challenge published successfully!");
}

// Run an existing Node.js script.
function runScript(script, args = []) {
  console.log(`\nRunning ${script}...`);

  const result = spawnSync(
    process.execPath,
    [script, ...args],
    {
      stdio: "inherit",
      env: process.env,
      timeout: 180000,
    }
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${script} failed with exit code ${result.status}`
    );
  }

  console.log(`${script} completed successfully.`);
}

// Import and validate new product candidates.
function refreshProducts() {
  if (!WRITE_MODE) {
    console.log(
      "DRY RUN: Would import and validate products."
    );
    return;
  }

  runScript("scripts/import-open-prices.mjs", ["--write"]);
  runScript("scripts/validate-products.mjs");
}

// Prepare tomorrow's challenge if it does not exist.
async function prepareTomorrow(tomorrow) {
  const existing = await getChallenge(tomorrow);

  if (existing) {
    console.log(
      `Tomorrow's challenge already exists: ${existing.id}`
    );
    console.log("Skipping preparation.");
    return;
  }

  if (!WRITE_MODE) {
    console.log(
      `DRY RUN: Would prepare challenge for ${tomorrow}`
    );
    return;
  }

  console.log(`Preparing challenge for ${tomorrow}...`);

  const { data, error } = await supabase.rpc(
    "prepare_daily_challenge",
    { p_date: tomorrow }
  );

  if (error) {
    // Another run may have created the same challenge.
    const created = await getChallenge(tomorrow);

    if (created) {
      console.log(
        `Challenge already prepared by another run: ${created.id}`
      );
      return;
    }

    throw new Error(
      `Challenge preparation failed: ${error.message}`
    );
  }

  console.log("Challenge preparation completed.");
  console.log("Challenge ID:", data);
}

// Main daily automation.
async function main() {
  const today = utcDate();
  const tomorrow = utcDate(1);

  console.log("=================================");
  console.log("PriceRush Daily Automation");
  console.log("=================================");
  console.log("UTC today:", today);
  console.log("UTC tomorrow:", tomorrow);
  console.log(
    "Mode:",
    WRITE_MODE ? "DATABASE WRITE" : "DRY RUN"
  );

  // 1. Publish today's challenge first.
  console.log("\n[1/3] Checking today's publication...");
  await publishToday(today);

  // 2. Refresh the product database.
  console.log("\n[2/3] Refreshing product database...");

  let refreshFailed = false;

  try {
    refreshProducts();
  } catch (error) {
    refreshFailed = true;
    console.error("Product refresh failed:", error);
    console.log(
      "Continuing with existing validated candidates."
    );
  }

  // 3. Prepare tomorrow's challenge.
  console.log("\n[3/3] Checking tomorrow's challenge...");
  await prepareTomorrow(tomorrow);

  if (refreshFailed) {
    throw new Error(
      "Daily automation completed, but product refresh failed."
    );
  }

  console.log("\n=================================");
  console.log("Daily automation completed!");
  console.log("=================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
