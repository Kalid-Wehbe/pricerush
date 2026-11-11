
const RULES = [
  {
    name: "meat_seafood",
    tags: [
      "meats-and-their-products",
      "meat-products",
      "sausages",
      "hot-dogs",
      "fishes",
      "seafood",
    ],
  },
  {
    name: "produce",
    tags: [
      "vegetables",
      "fruits",
      "leaf-vegetables",
      "spinaches",
      "salads",
    ],
  },
  {
    name: "condiments",
    tags: [
      "condiments",
      "sauces",
      "dressings",
      "mayonnaises",
      "hummus",
      "dips",
      "spreads",
    ],
  },
  {
    name: "snacks",
    tags: [
      "snacks",
      "crisps",
      "chips",
      "crackers",
      "nuts",
      "seeds",
      "candies",
      "biscuits",
    ],
  },
  {
    name: "desserts",
    tags: [
      "desserts",
      "chocolates",
      "cakes",
      "ice-creams",
      "pastries",
    ],
  },
  {
    name: "dairy",
    tags: [
      "dairies",
      "milks",
      "yogurts",
      "cheeses",
    ],
  },
  {
    name: "frozen",
    tags: [
      "frozen-foods",
      "frozen-meals",
    ],
  },
  {
    name: "beverages",
    tags: [
      "waters",
      "juices",
      "sodas",
      "coffees",
      "teas",
      "energy-drinks",
      "water-enhancers",
      "soft-drinks",
    ],
  },
  {
    name: "pantry",
    tags: [
      "cereals",
      "pastas",
      "rice",
      "canned-foods",
      "cooking-helpers",
      "flours",
      "oils",
    ],
  },
];

export function getProductCategory(product) {
  const tags = (product?.categories_tags ?? [])
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.replace(/^en:/, "").toLowerCase());

  for (const rule of RULES) {
    if (
      tags.some((tag) =>
        rule.tags.some(
          (keyword) =>
            tag === keyword ||
            tag.startsWith(`${keyword}-`) ||
            tag.endsWith(`-${keyword}`)
        )
      )
    ) {
      return rule.name;
    }
  }

  return null;
}
