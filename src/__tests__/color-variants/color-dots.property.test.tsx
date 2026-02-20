// @vitest-environment jsdom
// Feature: product-color-variants, Property 9: Truncamiento de puntos de color a maxVisible
// **Validates: Requirements 6.2**

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { render } from "@testing-library/react";
import { ColorDots } from "@/components/skating-store/products/ColorDots";
import { ColorOption } from "@/lib/skating-store/color-utils";

// --- Generators ---

// Valid hex color string "#RRGGBB"
const hexDigitArb = fc.constantFrom(..."0123456789abcdef".split(""));
const validHexArb = hexDigitArb
  .chain(() =>
    fc
      .tuple(hexDigitArb, hexDigitArb, hexDigitArb, hexDigitArb, hexDigitArb, hexDigitArb)
      .map((digits) => `#${digits.join("")}`)
  );

// Generator: array of unique ColorOption items
const uniqueColorOptionsArb = (minLength: number, maxLength: number): fc.Arbitrary<ColorOption[]> =>
  fc
    .array(
      fc.record({
        name: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,14}$/, { minLength: 1, maxLength: 15 }),
        hex: validHexArb,
      }),
      { minLength: Math.max(minLength, 1), maxLength }
    )
    .map((colors) => {
      // Deduplicate by name
      const seen = new Set<string>();
      return colors.filter((c) => {
        const lower = c.name.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });
    })
    .filter((colors) => colors.length >= minLength);

// maxVisible arbitrary: positive integer between 1 and 20
const maxVisibleArb = fc.integer({ min: 1, max: 20 });

describe("Property 9: Truncamiento de puntos de color a maxVisible", () => {
  it("shows min(N, M) color circles for any list of N colors and maxVisible M", () => {
    fc.assert(
      fc.property(
        uniqueColorOptionsArb(1, 25),
        maxVisibleArb,
        (colors, maxVisible) => {
          const { container } = render(
            <ColorDots colors={colors} maxVisible={maxVisible} />
          );

          const circles = container.querySelectorAll('[aria-label^="Color "]');
          const expected = Math.min(colors.length, maxVisible);
          expect(circles.length).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('shows "+{N-M}" indicator when N > M', () => {
    fc.assert(
      fc.property(
        uniqueColorOptionsArb(2, 25),
        maxVisibleArb,
        (colors, maxVisible) => {
          fc.pre(colors.length > maxVisible);

          const { container } = render(
            <ColorDots colors={colors} maxVisible={maxVisible} />
          );

          const remaining = colors.length - maxVisible;
          const indicator = container.querySelector(
            "span.text-xs"
          );
          expect(indicator).not.toBeNull();
          expect(indicator!.textContent).toBe(`+${remaining}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does not show "+" indicator when N <= M', () => {
    fc.assert(
      fc.property(
        uniqueColorOptionsArb(1, 20),
        maxVisibleArb,
        (colors, maxVisible) => {
          fc.pre(colors.length <= maxVisible);

          const { container } = render(
            <ColorDots colors={colors} maxVisible={maxVisible} />
          );

          const indicator = container.querySelector(
            "span.text-xs"
          );
          expect(indicator).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
