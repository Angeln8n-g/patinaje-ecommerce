import type { TemplateVariable } from './types';

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: 'nombre_usuario', label: 'Nombre del Usuario', exampleValue: 'Juan Pérez' },
  { key: 'email_usuario', label: 'Email del Usuario', exampleValue: 'juan@ejemplo.com' },
  { key: 'nombre_tienda', label: 'Nombre de la Tienda', exampleValue: 'Hunykho Store' },
  { key: 'url_tienda', label: 'URL de la Tienda', exampleValue: 'https://hunykho.com' },
  { key: 'fecha_actual', label: 'Fecha Actual', exampleValue: '2024-01-15' },
];

export function replaceVariables(html: string, values: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export function replaceWithExampleValues(html: string): string {
  const values: Record<string, string> = {};
  for (const variable of TEMPLATE_VARIABLES) {
    values[variable.key] = variable.exampleValue;
  }
  return replaceVariables(html, values);
}
