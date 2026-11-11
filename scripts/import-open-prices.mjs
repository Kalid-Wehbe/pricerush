
import { createClient } from "@supabase/supabase-js";
import { getProductCategory } from "./product-categories.mjs";

const BASE_URL = "https://prices.openfoodfacts.org/api/v1/prices";
const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const MAX_AGE_DAYS = 90;

const DRY_RUN = !process.argv.includes("--write");

const cutoff = new Date();
cutoff.setUTCDate(cutoff.getUTCDate() - MAX_AGE_DAYS);

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isValid(item) {
  const name = item.product?.product_name;
  const image = item.product?.image_url;

  return (
    item.currency === "USD" &&
    item.location?.osm_address_country_code === "US" &&
    typeof name === "string" &&
    name.trim().length >= 5 &&
    typeof image === "string" &&
    image.startsWith("https://") &&
    Number.isFinite(Number(item.price)) &&
    Number(item.price) > 0 &&
    item.price_is_discounted === false &&
    item.duplicate_of == null &&
    Boolean(item.date) &&
    new Date(`${item.date}T00:00:00Z`) >= cutoff
  );
}

async function collectProducts() {
  const candidates = new Map();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(BASE_URL);

    url.searchParams.set("currency", "USD");
    url.searchParams.set("size", String(PAGE_SIZE));
    url.searchParams.set("page", String(page));
    url.searchParams.set("order_by", "-date");

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Open Prices page ${page}: HTTP ${response.status}`
      );
    }

    const data = await response.json();
    const items = data.items ?? [];

    let accepted = 0;

    for (const item of items) {
      if (!isValid(item)) continue;

      const barcode = item.product?.code;
      const category = getProductCategory(item.product);

      if (!barcode || !category || item.id == null) {
        continue;
      }

      const listingId = String(item.id);

      if (candidates.has(barcode)) continue;

      candidates.set(barcode, {
        source_provider: "open_prices",
        source_listing_id: listingId,
        title: item.product.product_name.trim(),
        image_url: item.product.image_url,
        product_url:
          `https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`,
        price: Number(item.price),
        currency: "USD",
        category,
        item_condition: "new",
        availability: "unknown",
        shipping_price: null,
        status: "pending",
        source_data: {
          price_record_id: item.id,
          barcode,
          store: item.location?.osm_name ?? null,
          observation_date: item.date,
          proof_id: item.proof_id ?? null,
          country: "US",
          original_categories:
            item.product.categories_tags ?? [],
          price_type: "observed_retail_price",
        },
        fetched_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      });

      accepted++;
    }

    console.log(
      `Page ${page}: ${items.length} records, ` +
      `${accepted} new candidates`
    );

    if (items.length < PAGE_SIZE) break;

    const lastDate = items.at(-1)?.date;

    if (
      lastDate &&
      new Date(`${lastDate}T00:00:00Z`) < cutoff
    ) {
      break;
    }

    if (page < MAX_PAGES) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );
    }
  }

  return [...candidates.values()];
}

async function main() {
  console.log(
    DRY_RUN
      ? "MODE: DRY RUN (no database writes)"
      : "MODE: DATABASE WRITE"
  );

  const candidates = await collectProducts();

  const categoryCounts = {};

  for (const candidate of candidates) {
    categoryCounts[candidate.category] =
      (categoryCounts[candidate.category] ?? 0) + 1;
  }

  console.log("\n========== SUMMARY ==========");
  console.log("Candidates:", candidates.length);
  console.table(categoryCounts);

  if (DRY_RUN) {
    console.log(
      "\nDry run complete. Nothing was written to Supabase."
    );
    return;
  }

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

  const BATCH_SIZE = 50;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from("product_candidates")
      .upsert(batch, {
         onConflict: "source_provider,source_listing_id",
         ignoreDuplicates: true,
      });

    if (error) {
      throw new Error(
        `Supabase import failed: ${error.message}`
      );
    }

    console.log(
      `Imported ${Math.min(i + BATCH_SIZE, candidates.length)}` +
      ` / ${candidates.length}`
    );
  }

  console.log("\nImport completed.");
  console.log(
    "Candidates remain pending until explicitly validated."
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
