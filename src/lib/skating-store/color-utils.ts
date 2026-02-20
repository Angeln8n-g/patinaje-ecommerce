export interface ColorOption {
  name: string;
  hex: string;
}

/** Valida formato hexadecimal "#RRGGBB" */
export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

/** Parsea "Rojo:#FF0000" → { name: "Rojo", hex: "#FF0000" } */
export function parseColorOption(option: string): ColorOption | null {
  const separatorIndex = option.lastIndexOf(":#");
  if (separatorIndex === -1) return null;

  const name = option.substring(0, separatorIndex);
  const hex = option.substring(separatorIndex + 1);

  if (!name || !isValidHex(hex)) return null;

  return { name, hex };
}

/** Formatea { name: "Rojo", hex: "#FF0000" } → "Rojo:#FF0000" */
export function formatColorOption(color: ColorOption): string {
  return `${color.name}:${color.hex}`;
}

/** Extrae ColorOption[] desde variant_options string[] */
export function parseColorOptions(options: string[]): ColorOption[] {
  return options
    .map(parseColorOption)
    .filter((opt): opt is ColorOption => opt !== null);
}

/** Obtiene el hex de un color por nombre desde variant_options */
export function getColorHex(
  options: string[],
  colorName: string
): string | null {
  const colors = parseColorOptions(options);
  const found = colors.find((c) => c.name === colorName);
  return found?.hex ?? null;
}
