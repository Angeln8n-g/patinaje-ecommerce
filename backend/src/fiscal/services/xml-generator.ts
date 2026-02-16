import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import type { ECFData, ValidationResult } from '../types.js';

// Builder: JS → XML
const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
});

// Parser: XML → JS
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
});

/**
 * Builds the JS object structure that maps to the DGII e-CF XML schema.
 */
function buildECFObject(data: ECFData): Record<string, unknown> {
  const comprador: Record<string, unknown> = {
    Nombre: data.comprador.nombre,
    Tipo: data.comprador.tipo,
  };

  if (data.comprador.tipo === 'persona_juridica' && data.comprador.rnc) {
    comprador.RNCComprador = data.comprador.rnc;
  }

  const items = data.items.map((item) => ({
    Nombre: item.nombre,
    Cantidad: String(item.cantidad),
    PrecioUnitario: String(item.precioUnitario),
    MontoGravado: String(item.montoGravado),
    ITBIS: String(item.itbis),
  }));

  return {
    ECF: {
      Encabezado: {
        IdDoc: {
          TipoeCF: data.tipoComprobante,
          NCF: data.ncf,
          FechaEmision: formatDate(data.fechaEmision),
        },
        Emisor: {
          RNCEmisor: data.emisor.rnc,
          RazonSocial: data.emisor.razonSocial,
          ...(data.emisor.nombreComercial && {
            NombreComercial: data.emisor.nombreComercial,
          }),
          Direccion: data.emisor.direccion,
          ...(data.emisor.telefono && { Telefono: data.emisor.telefono }),
          ...(data.emisor.correo && { Correo: data.emisor.correo }),
        },
        Comprador: comprador,
      },
      DetallesItems: { Item: items },
      Totales: {
        Subtotal: String(data.subtotal),
        TotalITBIS: String(data.totalITBIS),
        Total: String(data.total),
      },
      OrdenId: data.ordenId,
    },
  };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Generates an XML string conforming to the DGII e-CF structure.
 */
export function generarXML(data: ECFData): string {
  const obj = buildECFObject(data);
  const xml: string = xmlBuilder.build(obj);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}

/**
 * Parses an e-CF XML string back into an ECFData object.
 */
export function parsearXML(xml: string): ECFData {
  const parsed = xmlParser.parse(xml);
  const ecf = parsed.ECF;
  const enc = ecf.Encabezado;
  const idDoc = enc.IdDoc;
  const emisorNode = enc.Emisor;
  const compradorNode = enc.Comprador;
  const totales = ecf.Totales;

  // Items may be a single object or an array
  const rawItems = ecf.DetallesItems.Item;
  const itemsArr = Array.isArray(rawItems) ? rawItems : [rawItems];

  const items = itemsArr.map((it: Record<string, string>) => ({
    nombre: it.Nombre,
    cantidad: Number(it.Cantidad),
    precioUnitario: Number(it.PrecioUnitario),
    montoGravado: Number(it.MontoGravado),
    itbis: Number(it.ITBIS),
  }));

  return {
    ncf: idDoc.NCF,
    tipoComprobante: idDoc.TipoeCF,
    emisor: {
      rnc: emisorNode.RNCEmisor,
      razonSocial: emisorNode.RazonSocial,
      ...(emisorNode.NombreComercial && {
        nombreComercial: emisorNode.NombreComercial,
      }),
      direccion: emisorNode.Direccion,
      ...(emisorNode.Telefono && { telefono: emisorNode.Telefono }),
      ...(emisorNode.Correo && { correo: emisorNode.Correo }),
    },
    comprador: {
      nombre: compradorNode.Nombre,
      tipo: compradorNode.Tipo,
      ...(compradorNode.RNCComprador && {
        rnc: compradorNode.RNCComprador,
      }),
    },
    items,
    subtotal: Number(totales.Subtotal),
    totalITBIS: Number(totales.TotalITBIS),
    total: Number(totales.Total),
    fechaEmision: new Date(idDoc.FechaEmision),
    ordenId: ecf.OrdenId,
  };
}

/**
 * Validates XML structure against expected e-CF elements.
 * Performs basic structural validation (we don't have the actual DGII XSD file).
 */
export function validarContraXSD(xml: string): ValidationResult {
  const errores: string[] = [];

  // 1. Must be parseable XML
  let parsed: Record<string, unknown>;
  try {
    parsed = xmlParser.parse(xml);
  } catch {
    return { valido: false, errores: ['El XML no es válido o está malformado'] };
  }

  const ecf = parsed.ECF as Record<string, unknown> | undefined;
  if (!ecf) {
    errores.push('Falta el elemento raíz ECF');
    return { valido: false, errores };
  }

  // 2. Encabezado
  const enc = ecf.Encabezado as Record<string, unknown> | undefined;
  if (!enc) {
    errores.push('Falta el elemento Encabezado');
  } else {
    if (!enc.IdDoc) errores.push('Falta el elemento Encabezado/IdDoc');
    else {
      const idDoc = enc.IdDoc as Record<string, unknown>;
      if (!idDoc.TipoeCF) errores.push('Falta el campo IdDoc/TipoeCF');
      if (!idDoc.NCF) errores.push('Falta el campo IdDoc/NCF');
      if (!idDoc.FechaEmision) errores.push('Falta el campo IdDoc/FechaEmision');
    }
    if (!enc.Emisor) errores.push('Falta el elemento Encabezado/Emisor');
    else {
      const emisor = enc.Emisor as Record<string, unknown>;
      if (!emisor.RNCEmisor) errores.push('Falta el campo Emisor/RNCEmisor');
      if (!emisor.RazonSocial) errores.push('Falta el campo Emisor/RazonSocial');
    }
    if (!enc.Comprador) errores.push('Falta el elemento Encabezado/Comprador');
    else {
      const comp = enc.Comprador as Record<string, unknown>;
      if (!comp.Nombre) errores.push('Falta el campo Comprador/Nombre');
      if (!comp.Tipo) errores.push('Falta el campo Comprador/Tipo');
    }
  }

  // 3. DetallesItems
  const detalles = ecf.DetallesItems as Record<string, unknown> | undefined;
  if (!detalles) {
    errores.push('Falta el elemento DetallesItems');
  } else if (!detalles.Item) {
    errores.push('Falta el elemento DetallesItems/Item');
  }

  // 4. Totales
  const totales = ecf.Totales as Record<string, unknown> | undefined;
  if (!totales) {
    errores.push('Falta el elemento Totales');
  } else {
    if (!totales.Subtotal) errores.push('Falta el campo Totales/Subtotal');
    if (!totales.TotalITBIS) errores.push('Falta el campo Totales/TotalITBIS');
    if (!totales.Total) errores.push('Falta el campo Totales/Total');
  }

  return { valido: errores.length === 0, errores };
}

/**
 * Pretty-prints an XML string with proper indentation.
 */
export function formatearXML(xml: string): string {
  const parsed = xmlParser.parse(xml);
  const formatted: string = xmlBuilder.build(parsed);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${formatted}`;
}
