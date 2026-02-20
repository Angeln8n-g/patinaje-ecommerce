import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  ColorOption,
  isValidHex,
  parseColorOption,
  formatColorOption,
} from "@/lib/skating-store/color-utils";

// Feature: product-color-variants, Property 1: Round-trip de formato/parseo de opciones de color
// **Validates: Requirements 3.1, 3.2, 3.4**

// Generator: valid hex color string "#RRGGBB"
const hexDigitArb = fc.constantFrom(
  ..."0123456789abcdef".split("")
);
const validHexArb = fc
  .tuple(hexDigitArb, hexDigitArb, hexDigitArb, hexDigitArb, hexDigitArb, hexDigitArb)
  .map((digits) => `#${digits.join("")}`);

// Generator: alphanumeric non-empty name (no special chars, avoids ":#" separator issue)
const colorNameArb = fc.stringMatching(/^[a-zA-Z0-9]+$/, { minLength: 1, maxLength: 30 });

// Generator: valid ColorOption
const colorOptionArb: fc.Arbitrary<ColorOption> = fc.record({
  name: colorNameArb,
  hex: validHexArb,
});

describe("Property 1: Round-trip de formato/parseo de opciones de color", () => {
  it("formatColorOption then parseColorOption produces equivalent object", () => {
    fc.assert(
      fc.property(colorOptionArb, (original) => {
        const formatted = formatColorOption(original);
        const parsed = parseColorOption(formatted);

        expect(parsed).not.toBeNull();
        expect(parsed!.name).toBe(original.name);
        expect(parsed!.hex.toLowerCase()).toBe(original.hex.toLowerCase());
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: product-color-variants, Property 2: Validación rechaza hex inválidos y nombres vacíos
// **Validates: Requirements 2.6, 3.3**

// Generator: strings that do NOT match /^#[0-9A-Fa-f]{6}$/
const invalidHexArb = fc.string().filter((s) => !/^#[0-9A-Fa-f]{6}$/.test(s));

describe("Property 2: Validación rechaza hex inválidos y nombres vacíos", () => {
  it("isValidHex returns false for any string not matching hex pattern", () => {
    fc.assert(
      fc.property(invalidHexArb, (invalidHex) => {
        expect(isValidHex(invalidHex)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("parseColorOption rejects ColorOption with empty name", () => {
    fc.assert(
      fc.property(validHexArb, (hex) => {
        // Format with empty name: ":#HexCode"
        const formatted = `:${hex}`;
        const parsed = parseColorOption(formatted);
        expect(parsed).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it("parseColorOption rejects ColorOption with invalid hex", () => {
    fc.assert(
      fc.property(colorNameArb, invalidHexArb, (name, invalidHex) => {
        const formatted = `${name}:${invalidHex}`;
        const parsed = parseColorOption(formatted);
        expect(parsed).toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});
