
const url =
  "https://prices.openfoodfacts.org/api/v1/prices?currency=USD&size=100&order_by=-date";

async function main() {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();

  const item = data.items.find(
    (entry) =>
      entry.location?.osm_address_country_code === "US" &&
      entry.product?.product_name &&
      entry.product?.image_url &&
      entry.price_is_discounted === false
  );

  if (!item) {
    console.log("No suitable record found.");
    return;
  }

  console.log(
    JSON.stringify(
      {
        priceRecordId: item.id,
        barcode: item.product?.code,
        name: item.product?.product_name,
        imageUrl: item.product?.image_url,
        price: item.price,
        currency: item.currency,
        observationDate: item.date,
        store: item.location?.osm_name,
        country: item.location?.osm_address_country_code,
        proofId: item.proof_id,
        discounted: item.price_is_discounted,
        categories: item.product?.categories_tags,
      },
      null,
      2
    )
  );
}

main().catch(console.error);
