/**
 * Validates color variant options format.
 * Each option must be "Name:#HexCode" with non-empty name and valid 7-char hex.
 * Returns an error message string or null if valid.
 */
export function validateColorOptions(options: any[]): string | null {
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (typeof opt !== 'string') {
      return `variant_options[${i}] debe ser un string`;
    }
    const separatorIndex = opt.indexOf(':#');
    if (separatorIndex === -1) {
      return `variant_options[${i}] ("${opt}") debe tener formato "Nombre:#HexCode"`;
    }
    const name = opt.substring(0, separatorIndex);
    const hex = opt.substring(separatorIndex + 1);
    if (!name.trim()) {
      return `variant_options[${i}] tiene nombre vacío`;
    }
    if (!hexRegex.test(hex)) {
      return `variant_options[${i}] tiene código hex inválido ("${hex}"). Formato esperado: #RRGGBB`;
    }
  }
  return null;
}
