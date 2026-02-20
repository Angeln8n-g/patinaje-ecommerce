import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { getVariantPrice } from "@/components/skating-store/products/ProductActions";
import { Product } from "@/types/skating-store";

// Feature: product-color-variants, Property 5: Resolución de precio usa precio de variante o precio base como fallback
// **Validates: Requirements 4.4, 5.5, 7.3**

// --- Generators ---

// Positive price arbitrary
const priceArb = fc.double({ min: 0.01, max: 99999.99, noNaN: true });

// Color name: non-empty alphanumeric string
const colorNameArb = fc.stringMatching(/^[a-zA-Z0-9]+$/, {
  minLength: 1,
  maxLength: 20,
});

// variant_prices: record of color name → positive price (1 to 10 entries)
const variantPricesArb = fc
  .array(fc.tuple(colorNameArb, priceArb), { minLength: 1, maxLength: 10 })
  .map((entries) => Object.fromEntries(entries))
  .filter((rec) => Object.keys(rec).length >= 1);

// Minimal Product factory for testing
function makeProduct(
  basePrice: number,
  variantPrices: Record<string, number>
): Product {
  return {
    id: "test-id",
    name: "Test Product",
    description: "",
    price: basePrice,
    category: "test",
    images: [],
    stock: 10,
    featured: false,
    status: "active",
    variant_type: "color",
    variant_options: Object.keys(variantPrices).map((name) => `${name}:#FF0000`),
    variant_prices: variantPrices,
    created_at: "",
    updated_at: "",
  };
}

describe("Property 5: Resolución de precio usa precio de variante o precio base como fallback", () => {
  it("returns variant price when color exists in variant_prices", () => {
    fc.assert(
      fc.property(priceArb, variantPricesArb, (basePrice, variantPrices) => {
        const product = makeProduct(basePrice, variantPrices);
        const colorNames = Object.keys(variantPrices);
        // Pick a color that exists
        for (const color of colorNames) {
          const resolved = getVariantPrice(product, color);
          expect(resolved).toBe(variantPrices[color]);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("returns base price when color is not in variant_prices", () => {
    fc.assert(
      fc.property(
        priceArb,
        variantPricesArb,
        colorNameArb,
        (basePrice, variantPrices, randomColor) => {
          // Ensure the random color is NOT in variant_prices
          fc.pre(!(randomColor in variantPrices));

          const product = makeProduct(basePrice, variantPrices);
          const resolved = getVariantPrice(product, randomColor);
          expect(resolved).toBe(basePrice);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns base price when no variant is selected (undefined)", () => {
    fc.assert(
      fc.property(priceArb, variantPricesArb, (basePrice, variantPrices) => {
        const product = makeProduct(basePrice, variantPrices);
        const resolved = getVariantPrice(product, undefined);
        expect(resolved).toBe(basePrice);
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: product-color-variants, Property 6: Rango de precios es min-max de variant_prices
// **Validates: Requirements 4.5, 6.3**

/**
 * Computes the price range from variant_prices.
 * Returns { min, max } if there are at least two distinct prices, null otherwise.
 */
function computePriceRange(
  variantPrices: Record<string, number>
): { min: number; max: number } | null {
  const prices = Object.values(variantPrices);
  if (prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return null;
  return { min, max };
}

describe("Property 6: Rango de precios es min-max de variant_prices", () => {
  // Generator: variant_prices with at least 2 entries and at least 2 distinct prices
  const distinctPricesArb = fc
    .array(fc.tuple(colorNameArb, priceArb), { minLength: 2, maxLength: 10 })
    .map((entries) => Object.fromEntries(entries))
    .filter((rec) => {
      const values = Object.values(rec);
      if (values.length < 2) return false;
      return new Set(values).size >= 2;
    });

  it("price range min equals the minimum of all variant prices", () => {
    fc.assert(
      fc.property(distinctPricesArb, (variantPrices) => {
        const range = computePriceRange(variantPrices);
        expect(range).not.toBeNull();

        const allPrices = Object.values(variantPrices);
        const expectedMin = Math.min(...allPrices);
        expect(range!.min).toBe(expectedMin);
      }),
      { numRuns: 100 }
    );
  });

  it("price range max equals the maximum of all variant prices", () => {
    fc.assert(
      fc.property(distinctPricesArb, (variantPrices) => {
        const range = computePriceRange(variantPrices);
        expect(range).not.toBeNull();

        const allPrices = Object.values(variantPrices);
        const expectedMax = Math.max(...allPrices);
        expect(range!.max).toBe(expectedMax);
      }),
      { numRuns: 100 }
    );
  });

  it("returns null when all variant prices are equal", () => {
    fc.assert(
      fc.property(
        fc.array(colorNameArb, { minLength: 2, maxLength: 10 }),
        priceArb,
        (names, singlePrice) => {
          const uniqueNames = [...new Set(names)];
          fc.pre(uniqueNames.length >= 2);

          const variantPrices: Record<string, number> = {};
          for (const name of uniqueNames) {
            variantPrices[name] = singlePrice;
          }

          const range = computePriceRange(variantPrices);
          expect(range).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns null when there is only one variant price entry", () => {
    fc.assert(
      fc.property(colorNameArb, priceArb, (name, price) => {
        const variantPrices: Record<string, number> = { [name]: price };
        const range = computePriceRange(variantPrices);
        expect(range).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});
