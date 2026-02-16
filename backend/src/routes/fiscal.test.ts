import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// Mock all external dependencies before importing the router
vi.mock('../db/pool.js', () => ({
  query: vi.fn(),
}));
vi.mock('../fiscal/utils/tax-calculator.js', () => ({
  calcularITBIS: vi.fn(),
}));
vi.mock('../fiscal/utils/encryption.js', () => ({
  descifrar: vi.fn(),
}));
vi.mock('../fiscal/services/ncf-manager.js', () => ({
  obtenerSiguienteNCF: vi.fn(),
}));
vi.mock('../fiscal/services/xml-generator.js', () => ({
  generarXML: vi.fn(),
}));
vi.mock('../fiscal/services/xml-signer.js', () => ({
  firmarXML: vi.fn(),
}));
vi.mock('../fiscal/services/dgii-client.js', () => ({
  enviarECF: vi.fn(),
  mapearEstadoDGII: vi.fn(),
}));
vi.mock('../fiscal/services/audit-logger.js', () => ({
  registrar: vi.fn(),
}));
vi.mock('../lib/auth.js', () => ({
  requireAuth: (_req: any, _res: any, next: any) => next(),
  requireRole: (..._roles: string[]) => (_req: any, _res: any, next: any) => next(),
}));

import { query } from '../db/pool.js';

const mockedQuery = vi.mocked(query);

/**
 * Helper: extract the route handler from the Express router stack.
 * Express stores routes in router.stack[].route with path and methods.
 */
async function getHandler(method: string, path: string) {
  // Dynamic import so mocks are in place
  const mod = await import('./fiscal.js');
  const router = mod.default;
  const stack = (router as any).stack as any[];
  for (const layer of stack) {
    if (
      layer.route &&
      layer.route.path === path &&
      layer.route.methods[method]
    ) {
      // The actual handler is the last function in the route stack
      const handlers = layer.route.stack;
      return handlers[handlers.length - 1].handle as (
        req: Partial<Request>,
        res: Partial<Response>,
      ) => Promise<void>;
    }
  }
  throw new Error('Handler not found for ' + method.toUpperCase() + ' ' + path);
}

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

// ============================================================
// GET /invoices — Listing endpoint
// ============================================================

describe('GET /invoices — list e-CF', () => {
  let handler: (req: Partial<Request>, res: Partial<Response>) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    handler = await getHandler('get', '/invoices');
  });

  it('returns paginated results with no filters', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total: '5' }], rowCount: 1 } as any) // count
      .mockResolvedValueOnce({
        rows: [
          { id: 'inv-1', ncf: 'E310000000001', estado_dgii: 'aceptado' },
          { id: 'inv-2', ncf: 'E310000000002', estado_dgii: 'pendiente_envio' },
        ],
        rowCount: 2,
      } as any);

    const req: any = { query: {} };
    const res = mockRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledOnce();
    const body = res.json.mock.calls[0][0];
    expect(body.data).toHaveLength(2);
    expect(body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 5,
      totalPages: 1,
    });
  });

  it('applies fecha_desde filter', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const req: any = { query: { fecha_desde: '2025-01-01' } };
    const res = mockRes();

    await handler(req, res);

    // The count query should include the WHERE clause
    const countSql = mockedQuery.mock.calls[0][0] as string;
    expect(countSql).toContain('created_at >= $1');
    const countParams = mockedQuery.mock.calls[0][1] as any[];
    expect(countParams).toContain('2025-01-01');
  });

  it('applies fecha_hasta filter', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const req: any = { query: { fecha_hasta: '2025-06-30' } };
    const res = mockRes();

    await handler(req, res);

    const countSql = mockedQuery.mock.calls[0][0] as string;
    expect(countSql).toContain('created_at <=');
    expect(countSql).toContain('::date');
  });

  it('applies estado filter', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const req: any = { query: { estado: 'aceptado' } };
    const res = mockRes();

    await handler(req, res);

    const countSql = mockedQuery.mock.calls[0][0] as string;
    expect(countSql).toContain('estado_dgii = $1');
    const countParams = mockedQuery.mock.calls[0][1] as any[];
    expect(countParams).toContain('aceptado');
  });

  it('applies tipo filter', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const req: any = { query: { tipo: '31' } };
    const res = mockRes();

    await handler(req, res);

    const countSql = mockedQuery.mock.calls[0][0] as string;
    expect(countSql).toContain('tipo_comprobante = $1');
    const countParams = mockedQuery.mock.calls[0][1] as any[];
    expect(countParams).toContain('31');
  });

  it('combines multiple filters', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const req: any = {
      query: {
        fecha_desde: '2025-01-01',
        estado: 'rechazado',
        tipo: '32',
      },
    };
    const res = mockRes();

    await handler(req, res);

    const countSql = mockedQuery.mock.calls[0][0] as string;
    expect(countSql).toContain('created_at >= $1');
    expect(countSql).toContain('estado_dgii = $2');
    expect(countSql).toContain('tipo_comprobante = $3');
  });

  it('respects page and limit params', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total: '50' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const req: any = { query: { page: '3', limit: '10' } };
    const res = mockRes();

    await handler(req, res);

    // Data query should have LIMIT 10 OFFSET 20
    const dataParams = mockedQuery.mock.calls[1][1] as any[];
    expect(dataParams).toContain(10); // limit
    expect(dataParams).toContain(20); // offset = (3-1)*10
  });

  it('caps limit at 100', async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as any)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const req: any = { query: { limit: '500' } };
    const res = mockRes();

    await handler(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.pagination.limit).toBe(100);
  });

  it('returns 500 on database error', async () => {
    mockedQuery.mockRejectedValueOnce(new Error('db down'));

    const req: any = { query: {} };
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'db down' });
  });
});

// ============================================================
// GET /invoices/:id — Detail endpoint
// ============================================================

describe('GET /invoices/:id — detail e-CF', () => {
  let handler: (req: Partial<Request>, res: Partial<Response>) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    handler = await getHandler('get', '/invoices/:id');
  });

  it('returns the full invoice when found', async () => {
    const invoice = {
      id: 'inv-1',
      ncf: 'E310000000001',
      xml_original: '<ECF>...</ECF>',
      xml_firmado: '<ECF signed>...</ECF>',
      estado_dgii: 'aceptado',
    };
    mockedQuery.mockResolvedValueOnce({ rows: [invoice], rowCount: 1 } as any);

    const req: any = { params: { id: 'inv-1' } };
    const res = mockRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith(invoice);
    // Should include XML fields (full detail)
    expect(res.json.mock.calls[0][0]).toHaveProperty('xml_original');
    expect(res.json.mock.calls[0][0]).toHaveProperty('xml_firmado');
  });

  it('returns 404 when invoice not found', async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

    const req: any = { params: { id: 'nonexistent' } };
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Comprobante fiscal no encontrado',
    });
  });

  it('returns 500 on database error', async () => {
    mockedQuery.mockRejectedValueOnce(new Error('connection lost'));

    const req: any = { params: { id: 'inv-1' } };
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'connection lost' });
  });
});
