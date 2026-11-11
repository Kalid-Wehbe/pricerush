
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

function utcDate(offset = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

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

async function prepareChallenge(date) {
  const existing = await getChallenge(date);

  if (existing) {
    console.log(`Challenge already exists for ${date}: ${existing.id}`);
    console.log("Skipping preparation.");
    return existing;
  }

  if (!WRITE_MODE) {
    console.log(`DRY RUN: Would prepare challenge for ${date}`);
    return null;
  }

  console.log(`Preparing challenge for ${date}...`);

  const { data, error } = await supabase.rpc(
    "prepare_daily_challenge",
    { p_date: date }
  );

  if (error) {
    const created = await getChallenge(date);

    if (created) {
      console.log(
        `Challenge already prepared by another run: ${created.id}`
      );
      return created;
    }

    throw new Error(
      `Challenge preparation failed for ${date}: ${error.message}`
    );
  }

  const prepared = await getChallenge(date);

  if (!prepared) {
    throw new Error(
      `Preparation returned ${data}, but no challenge was found.`
    );
  }

  console.log(`Challenge prepared successfully: ${prepared.id}`);
  return prepared;
}

async function publishToday(today) {
  const challenge = await getChallenge(today);

  if (!challenge) {
    console.log(`No prepared challenge for ${today}.`);
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
      "Publication returned successfully, but challenge is not active."
    );
  }

  console.log("Today's challenge published successfully!");
}

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

function refreshProducts() {
  if (!WRITE_MODE) {
    console.log("DRY RUN: Would import and validate products.");
    return;
  }

  runScript("scripts/import-open-prices.mjs", ["--write"]);
  runScript("scripts/validate-products.mjs");
}

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

  let failed = false;

  // Step 1: Recover and publish today's challenge.
  console.log("\n[1/3] Recovering and publishing today's challenge...");

  try {
    await prepareChallenge(today);
    await publishToday(today);
  } catch (error) {
    failed = true;
    console.error("Today's challenge failed:", error);
  }

  // Step 2: Import and validate products.
  console.log("\n[2/3] Refreshing product database...");

  try {
    refreshProducts();
  } catch (error) {
    failed = true;
    console.error("Product refresh failed:", error);
    console.log("Continuing with existing validated candidates.");
  }

  // Step 3: Prepare tomorrow's challenge.
  console.log("\n[3/3] Preparing tomorrow's challenge...");

  try {
    await prepareChallenge(tomorrow);
  } catch (error) {
    failed = true;
    console.error("Tomorrow's preparation failed:", error);
  }

  if (failed) {
    throw new Error(
      "Automation finished with one or more failures. Check logs."
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
