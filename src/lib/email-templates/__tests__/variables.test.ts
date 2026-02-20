import { describe, it, expect } from 'vitest';
import {
  TEMPLATE_VARIABLES,
  replaceVariables,
  replaceWithExampleValues,
} from '../variables';

describe('TEMPLATE_VARIABLES', () => {
  it('contains all five required variables', () => {
    const keys = TEMPLATE_VARIABLES.map((v) => v.key);
    expect(keys).toEqual([
      'nombre_usuario',
      'email_usuario',
      'nombre_tienda',
      'url_tienda',
      'fecha_actual',
    ]);
  });

  it('each variable has key, label, and exampleValue', () => {
    for (const v of TEMPLATE_VARIABLES) {
      expect(v.key).toBeTruthy();
      expect(v.label).toBeTruthy();
      expect(v.exampleValue).toBeTruthy();
    }
  });
});

describe('replaceVariables', () => {
  it('replaces a single variable', () => {
    const html = '<p>Hola {{nombre_usuario}}</p>';
    const result = replaceVariables(html, { nombre_usuario: 'Ana' });
    expect(result).toBe('<p>Hola Ana</p>');
  });

  it('replaces multiple different variables', () => {
    const html = '<p>{{nombre_usuario}} - {{email_usuario}}</p>';
    const result = replaceVariables(html, {
      nombre_usuario: 'Ana',
      email_usuario: 'ana@test.com',
    });
    expect(result).toBe('<p>Ana - ana@test.com</p>');
  });

  it('replaces multiple occurrences of the same variable', () => {
    const html = '{{nombre_usuario}} y {{nombre_usuario}}';
    const result = replaceVariables(html, { nombre_usuario: 'Ana' });
    expect(result).toBe('Ana y Ana');
  });

  it('leaves unmatched placeholders intact', () => {
    const html = '{{nombre_usuario}} {{desconocido}}';
    const result = replaceVariables(html, { nombre_usuario: 'Ana' });
    expect(result).toBe('Ana {{desconocido}}');
  });

  it('returns original html when values map is empty', () => {
    const html = '<p>{{nombre_usuario}}</p>';
    const result = replaceVariables(html, {});
    expect(result).toBe(html);
  });

  it('handles html with no variables', () => {
    const html = '<p>Sin variables</p>';
    const result = replaceVariables(html, { nombre_usuario: 'Ana' });
    expect(result).toBe('<p>Sin variables</p>');
  });
});

describe('replaceWithExampleValues', () => {
  it('replaces all known variables with example values', () => {
    const html =
      '{{nombre_usuario}} {{email_usuario}} {{nombre_tienda}} {{url_tienda}} {{fecha_actual}}';
    const result = replaceWithExampleValues(html);
    expect(result).toBe(
      'Juan Pérez juan@ejemplo.com Hunykho Store https://hunykho.com 2024-01-15'
    );
  });

  it('leaves unknown variables intact', () => {
    const html = '{{nombre_usuario}} {{otra_variable}}';
    const result = replaceWithExampleValues(html);
    expect(result).toBe('Juan Pérez {{otra_variable}}');
  });

  it('handles html with no variables', () => {
    const html = '<p>Texto plano</p>';
    const result = replaceWithExampleValues(html);
    expect(result).toBe('<p>Texto plano</p>');
  });
});
