import { describe, it, expect } from 'vitest';
import {
  generarXML,
  parsearXML,
  validarContraXSD,
  formatearXML,
} from './xml-generator.js';
import type { ECFData } from '../types.js';

/** Helper: builds a valid ECFData object for testing */
function makeECFData(overrides?: Partial<ECFData>): ECFData {
  return {
    ncf: 'E310000000001',
    tipoComprobante: '31',
    emisor: {
      rnc: '123456789',
      razonSocial: 'Skate Shop SRL',
      nombreComercial: 'Skate Shop',
      direccion: 'Calle Principal #1, Santo Domingo',
      telefono: '8095551234',
      correo: 'info@skateshop.do',
    },
    comprador: {
      rnc: '98765432101',
      nombre: 'Empresa Compradora SRL',
      tipo: 'persona_juridica',
    },
    items: [
      {
        nombre: 'Skateboard Pro',
        cantidad: 2,
        precioUnitario: 1500,
        montoGravado: 3000,
        itbis: 540,
      },
      {
        nombre: 'Ruedas 54mm',
        cantidad: 1,
        precioUnitario: 800,
        montoGravado: 800,
        itbis: 144,
      },
    ],
    subtotal: 3800,
    totalITBIS: 684,
    total: 4484,
    fechaEmision: new Date('2025-01-15'),
    ordenId: 'order-uuid-001',
    ...overrides,
  };
}

describe('generarXML', () => {
  it('generates valid XML with all required elements', () => {
    const data = makeECFData();
    const xml = generarXML(data);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<ECF>');
    expect(xml).toContain('<Encabezado>');
    expect(xml).toContain('<IdDoc>');
    expect(xml).toContain('<TipoeCF>31</TipoeCF>');
    expect(xml).toContain('<NCF>E310000000001</NCF>');
    expect(xml).toContain('<Emisor>');
    expect(xml).toContain('<RNCEmisor>123456789</RNCEmisor>');
    expect(xml).toContain('<Comprador>');
    expect(xml).toContain('<DetallesItems>');
    expect(xml).toContain('<Totales>');
  });

  it('includes RNC for persona_juridica buyer', () => {
    const data = makeECFData({
      comprador: {
        rnc: '98765432101',
        nombre: 'Corp SRL',
        tipo: 'persona_juridica',
      },
    });
    const xml = generarXML(data);
    expect(xml).toContain('<RNCComprador>98765432101</RNCComprador>');
  });

  it('omits RNC for consumidor_final buyer', () => {
    const data = makeECFData({
      tipoComprobante: '32',
      comprador: {
        nombre: 'Juan Pérez',
        tipo: 'consumidor_final',
      },
    });
    const xml = generarXML(data);
    expect(xml).not.toContain('<RNCComprador>');
    expect(xml).toContain('<TipoeCF>32</TipoeCF>');
  });

  it('includes optional emisor fields when present', () => {
    const data = makeECFData();
    const xml = generarXML(data);
    expect(xml).toContain('<NombreComercial>Skate Shop</NombreComercial>');
    expect(xml).toContain('<Telefono>8095551234</Telefono>');
    expect(xml).toContain('<Correo>info@skateshop.do</Correo>');
  });

  it('omits optional emisor fields when absent', () => {
    const data = makeECFData({
      emisor: {
        rnc: '123456789',
        razonSocial: 'Skate Shop SRL',
        direccion: 'Calle Principal #1',
      },
    });
    const xml = generarXML(data);
    expect(xml).not.toContain('<NombreComercial>');
    expect(xml).not.toContain('<Telefono>');
    expect(xml).not.toContain('<Correo>');
  });

  it('formats date as YYYY-MM-DD', () => {
    const data = makeECFData({ fechaEmision: new Date('2025-06-30') });
    const xml = generarXML(data);
    expect(xml).toContain('<FechaEmision>2025-06-30</FechaEmision>');
  });

  it('serializes multiple items', () => {
    const data = makeECFData();
    const xml = generarXML(data);
    expect(xml).toContain('<Nombre>Skateboard Pro</Nombre>');
    expect(xml).toContain('<Nombre>Ruedas 54mm</Nombre>');
    expect(xml).toContain('<Cantidad>2</Cantidad>');
  });
});

describe('parsearXML', () => {
  it('round-trips ECFData through XML and back', () => {
    const original = makeECFData();
    const xml = generarXML(original);
    const parsed = parsearXML(xml);

    expect(parsed.ncf).toBe(original.ncf);
    expect(parsed.tipoComprobante).toBe(original.tipoComprobante);
    expect(parsed.emisor.rnc).toBe(original.emisor.rnc);
    expect(parsed.emisor.razonSocial).toBe(original.emisor.razonSocial);
    expect(parsed.comprador.nombre).toBe(original.comprador.nombre);
    expect(parsed.comprador.tipo).toBe(original.comprador.tipo);
    expect(parsed.comprador.rnc).toBe(original.comprador.rnc);
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0].nombre).toBe('Skateboard Pro');
    expect(parsed.items[0].cantidad).toBe(2);
    expect(parsed.items[0].precioUnitario).toBe(1500);
    expect(parsed.subtotal).toBe(3800);
    expect(parsed.totalITBIS).toBe(684);
    expect(parsed.total).toBe(4484);
    expect(parsed.ordenId).toBe('order-uuid-001');
  });

  it('round-trips consumidor_final without RNC', () => {
    const original = makeECFData({
      tipoComprobante: '32',
      comprador: { nombre: 'Cliente Final', tipo: 'consumidor_final' },
    });
    const xml = generarXML(original);
    const parsed = parsearXML(xml);

    expect(parsed.comprador.tipo).toBe('consumidor_final');
    expect(parsed.comprador.rnc).toBeUndefined();
    expect(parsed.tipoComprobante).toBe('32');
  });

  it('handles a single item correctly', () => {
    const original = makeECFData({
      items: [
        {
          nombre: 'Solo Item',
          cantidad: 1,
          precioUnitario: 500,
          montoGravado: 500,
          itbis: 90,
        },
      ],
    });
    const xml = generarXML(original);
    const parsed = parsearXML(xml);

    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].nombre).toBe('Solo Item');
  });
});

describe('validarContraXSD', () => {
  it('returns valid for a well-formed e-CF XML', () => {
    const xml = generarXML(makeECFData());
    const result = validarContraXSD(xml);
    expect(result.valido).toBe(true);
    expect(result.errores).toHaveLength(0);
  });

  it('returns errors for malformed XML', () => {
    const result = validarContraXSD('not xml at all <<<');
    expect(result.valido).toBe(false);
    expect(result.errores.length).toBeGreaterThan(0);
  });

  it('returns error when ECF root is missing', () => {
    const result = validarContraXSD('<Root><Something/></Root>');
    expect(result.valido).toBe(false);
    expect(result.errores).toContain('Falta el elemento raíz ECF');
  });

  it('returns error when Encabezado is missing', () => {
    const xml = '<ECF><DetallesItems><Item><Nombre>X</Nombre></Item></DetallesItems><Totales><Subtotal>0</Subtotal><TotalITBIS>0</TotalITBIS><Total>0</Total></Totales></ECF>';
    const result = validarContraXSD(xml);
    expect(result.valido).toBe(false);
    expect(result.errores).toContain('Falta el elemento Encabezado');
  });

  it('returns error when Totales is missing', () => {
    const xml = generarXML(makeECFData());
    const withoutTotales = xml.replace(/<Totales>[\s\S]*?<\/Totales>/, '');
    const result = validarContraXSD(withoutTotales);
    expect(result.valido).toBe(false);
    expect(result.errores).toContain('Falta el elemento Totales');
  });

  it('returns error when DetallesItems is missing', () => {
    const xml = generarXML(makeECFData());
    const withoutItems = xml.replace(/<DetallesItems>[\s\S]*?<\/DetallesItems>/, '');
    const result = validarContraXSD(withoutItems);
    expect(result.valido).toBe(false);
    expect(result.errores).toContain('Falta el elemento DetallesItems');
  });
});

describe('formatearXML', () => {
  it('pretty-prints a compact XML string', () => {
    const compact = '<ECF><Encabezado><IdDoc><TipoeCF>31</TipoeCF><NCF>E31001</NCF><FechaEmision>2025-01-01</FechaEmision></IdDoc><Emisor><RNCEmisor>123456789</RNCEmisor><RazonSocial>Test</RazonSocial><Direccion>Dir</Direccion></Emisor><Comprador><Nombre>C</Nombre><Tipo>consumidor_final</Tipo></Comprador></Encabezado><DetallesItems><Item><Nombre>A</Nombre><Cantidad>1</Cantidad><PrecioUnitario>10</PrecioUnitario><MontoGravado>10</MontoGravado><ITBIS>1.8</ITBIS></Item></DetallesItems><Totales><Subtotal>10</Subtotal><TotalITBIS>1.8</TotalITBIS><Total>11.8</Total></Totales><OrdenId>o1</OrdenId></ECF>';
    const formatted = formatearXML(compact);

    expect(formatted).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    // Should have indentation (newlines + spaces)
    expect(formatted).toContain('\n');
    expect(formatted.split('\n').length).toBeGreaterThan(5);
  });

  it('preserves data after formatting', () => {
    const data = makeECFData();
    const xml = generarXML(data);
    const formatted = formatearXML(xml);
    const parsed = parsearXML(formatted);

    expect(parsed.ncf).toBe(data.ncf);
    expect(parsed.total).toBe(data.total);
  });
});
