
import { getProductCategory } from "./product-categories.mjs";

const BASE_URL = "https://prices.openfoodfacts.org/api/v1/prices";
const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const MAX_AGE_DAYS = 90;

const cutoff = new Date();
cutoff.setUTCDate(cutoff.getUTCDate() - MAX_AGE_DAYS);

const products = new Map();
const stores = new Map();
const categories = new Map();

let checked = 0;
let totalAvailable = 0;

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
    Number(item.price) > 0 &&
    item.price_is_discounted === false &&
    item.duplicate_of == null &&
    Boolean(item.date) &&
    new Date(`${item.date}T00:00:00Z`) >= cutoff
  );
}

async function main() {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(BASE_URL);

    url.searchParams.set("currency", "USD");
    url.searchParams.set("size", String(PAGE_SIZE));
    url.searchParams.set("page", String(page));
    url.searchParams.set("order_by", "-date");

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Page ${page}: HTTP ${response.status}`);
    }

    const data = await response.json();
    const items = data.items ?? [];

    totalAvailable = data.total;
    checked += items.length;

    let pageValid = 0;

    for (const item of items) {
      // 1. Check price, country, date, name, and image.
      if (!isValid(item)) continue;

      // 2. Require a barcode and prevent duplicates.
      const barcode = item.product?.code;

      if (!barcode || products.has(barcode)) {
        continue;
      }

      // 3. Determine the PriceRush category.
      const category = getProductCategory(item.product);

      // Reject products without a recognized category.
      if (!category) {
        continue;
      }

      // 4. Product passed every filter.
      products.set(barcode, {
        name: item.product.product_name,
        barcode,
        price: Number(item.price),
        currency: item.currency,
        image_url: item.product.image_url,
        category,
        store: item.location?.osm_name || "Unknown",
        date: item.date,
        source_price_id: item.id,
      });

      pageValid++;

      // 5. Track store distribution.
      const store = item.location?.osm_name || "Unknown";

      stores.set(
        store,
        (stores.get(store) || 0) + 1
      );

      // 6. Track category distribution.
      categories.set(
        category,
        (categories.get(category) || 0) + 1
      );
    }

    console.log(
      `Page ${page}: ${items.length} checked, ` +
      `${pageValid} new valid products`
    );

    if (items.length < PAGE_SIZE) {
      break;
    }

    // Stop once observations are older than 90 days.
    const lastDate = items.at(-1)?.date;

    if (
      lastDate &&
      new Date(`${lastDate}T00:00:00Z`) < cutoff
    ) {
      console.log("Reached older prices. Stopping.");
      break;
    }

    // Avoid sending requests too quickly.
    if (page < MAX_PAGES) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );
    }
  }

  console.log("\n========== RESULTS ==========");
  console.log("Total USD records:", totalAvailable);
  console.log("Records checked:", checked);
  console.log("Unique valid products:", products.size);
  console.log("Different stores:", stores.size);
  console.log("Different categories:", categories.size);

  console.log("\nTop stores:");

  console.table(
    [...stores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([store, count]) => ({
        store,
        count,
      }))
  );

  console.log("\nTop categories:");

  console.table(
    [...categories.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        category,
        count,
      }))
  );

  console.log("\nExample products:");

  console.table(
    [...products.values()]
      .slice(0, 10)
      .map((product) => ({
        name: product.name,
        price: product.price,
        category: product.category,
        store: product.store,
        date: product.date,
      }))
  );
}

main().catch((error) => {
  console.error("Collector test failed:", error);
  process.exitCode = 1;
});
