import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registrar } from './audit-logger.js';

// Mock the database pool
vi.mock('../../db/pool.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
}));

import { query } from '../../db/pool.js';

const mockedQuery = vi.mocked(query);

describe('AuditLoggerService - registrar', () => {
  beforeEach(() => {
    mockedQuery.mockClear();
  });

  it('inserts an audit log row with all fields', async () => {
    await registrar('ecf_generado', { ncf: 'E310000000001' }, 'user-1', 'inv-1');

    expect(mockedQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockedQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO fiscal_audit_log');
    expect(params).toEqual([
      'ecf_generado',
      'inv-1',
      'user-1',
      JSON.stringify({ ncf: 'E310000000001' }),
    ]);
  });

  it('passes null for invoice_id when not provided', async () => {
    await registrar('config_actualizada', { campo: 'rnc' }, 'user-2');

    expect(mockedQuery).toHaveBeenCalledOnce();
    const [, params] = mockedQuery.mock.calls[0];
    expect(params![1]).toBeNull();
  });

  it('serialises datos object to JSON', async () => {
    const datos = { a: 1, nested: { b: true } };
    await registrar('ecf_enviado', datos, 'user-3', 'inv-2');

    const [, params] = mockedQuery.mock.calls[0];
    expect(params![3]).toBe(JSON.stringify(datos));
  });

  it('propagates database errors', async () => {
    mockedQuery.mockRejectedValueOnce(new Error('connection lost'));

    await expect(
      registrar('ecf_anulado', {}, 'user-4', 'inv-3'),
    ).rejects.toThrow('connection lost');
  });
});
