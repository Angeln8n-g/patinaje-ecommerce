import { describe, it, expect, vi } from 'vitest';
import {
  calcularDelay,
  mapearEstadoDGII,
  parsearRespuestaDGII,
  ejecutarConReintentos,
  MAX_RETRIES,
  BASE_DELAY_MS,
} from './dgii-client.js';
import type { EstadoDGII, EstadoInterno } from '../types.js';

// ============================================================
// Unit tests for DGIIClientService pure logic
// Tests state mapping, retry delay calculation, response parsing,
// and retry behavior (no actual HTTP calls or database).
// ============================================================

describe('mapearEstadoDGII', () => {
  const cases: [EstadoDGII, EstadoInterno][] = [
    ['Aceptado', 'aceptado'],
    ['Rechazado', 'rechazado'],
    ['AceptadoCondicional', 'aceptado_condicional'],
    ['EnProceso', 'en_proceso'],
    ['Anulado', 'anulado'],
  ];

  it.each(cases)('maps "%s" to "%s"', (dgii, expected) => {
    expect(mapearEstadoDGII(dgii)).toBe(expected);
  });

  it('covers all EstadoDGII values', () => {
    const allEstados: EstadoDGII[] = ['Aceptado', 'Rechazado', 'AceptadoCondicional', 'EnProceso', 'Anulado'];
    for (const estado of allEstados) {
      expect(mapearEstadoDGII(estado)).toBeDefined();
    }
  });
});

describe('calcularDelay', () => {
  it('returns 1000ms for attempt 0', () => {
    expect(calcularDelay(0)).toBe(1000);
  });

  it('returns 2000ms for attempt 1', () => {
    expect(calcularDelay(1)).toBe(2000);
  });

  it('returns 4000ms for attempt 2', () => {
    expect(calcularDelay(2)).toBe(4000);
  });

  it('returns 8000ms for attempt 3', () => {
    expect(calcularDelay(3)).toBe(8000);
  });

  it('returns 16000ms for attempt 4', () => {
    expect(calcularDelay(4)).toBe(16000);
  });

  it('follows exponential pattern: BASE_DELAY_MS * 2^attempt', () => {
    for (let i = 0; i < 5; i++) {
      expect(calcularDelay(i)).toBe(BASE_DELAY_MS * Math.pow(2, i));
    }
  });
});


describe('parsearRespuestaDGII', () => {
  it('parses a complete DGII response', () => {
    const xml = `
      <Respuesta>
        <TrackId>TRK-12345</TrackId>
        <Estado>Aceptado</Estado>
        <Mensaje>Comprobante recibido correctamente</Mensaje>
      </Respuesta>
    `;
    const result = parsearRespuestaDGII(xml);
    expect(result.trackId).toBe('TRK-12345');
    expect(result.estado).toBe('Aceptado');
    expect(result.mensajes).toEqual(['Comprobante recibido correctamente']);
  });

  it('parses response with multiple messages', () => {
    const xml = `
      <Respuesta>
        <TrackId>TRK-999</TrackId>
        <Estado>Rechazado</Estado>
        <Mensaje>Error en campo RNC</Mensaje>
        <Mensaje>Formato de fecha inválido</Mensaje>
      </Respuesta>
    `;
    const result = parsearRespuestaDGII(xml);
    expect(result.trackId).toBe('TRK-999');
    expect(result.estado).toBe('Rechazado');
    expect(result.mensajes).toHaveLength(2);
    expect(result.mensajes[0]).toBe('Error en campo RNC');
    expect(result.mensajes[1]).toBe('Formato de fecha inválido');
  });

  it('defaults to EnProceso for unknown estado', () => {
    const xml = '<Respuesta><TrackId>TRK-1</TrackId><Estado>Desconocido</Estado></Respuesta>';
    const result = parsearRespuestaDGII(xml);
    expect(result.estado).toBe('EnProceso');
  });

  it('handles missing TrackId gracefully', () => {
    const xml = '<Respuesta><Estado>Aceptado</Estado></Respuesta>';
    const result = parsearRespuestaDGII(xml);
    expect(result.trackId).toBe('');
    expect(result.estado).toBe('Aceptado');
  });

  it('handles missing Estado gracefully', () => {
    const xml = '<Respuesta><TrackId>TRK-1</TrackId></Respuesta>';
    const result = parsearRespuestaDGII(xml);
    expect(result.trackId).toBe('TRK-1');
    expect(result.estado).toBe('EnProceso');
  });

  it('handles empty response', () => {
    const result = parsearRespuestaDGII('');
    expect(result.trackId).toBe('');
    expect(result.estado).toBe('EnProceso');
    expect(result.mensajes).toEqual([]);
  });

  it('parses AceptadoCondicional estado', () => {
    const xml = '<Respuesta><TrackId>TRK-AC</TrackId><Estado>AceptadoCondicional</Estado></Respuesta>';
    const result = parsearRespuestaDGII(xml);
    expect(result.estado).toBe('AceptadoCondicional');
  });

  it('parses Anulado estado', () => {
    const xml = '<Respuesta><TrackId>TRK-AN</TrackId><Estado>Anulado</Estado></Respuesta>';
    const result = parsearRespuestaDGII(xml);
    expect(result.estado).toBe('Anulado');
  });
});

describe('ejecutarConReintentos', () => {
  const noopSleep = async (_ms: number) => {};

  it('returns response on first successful attempt', async () => {
    const mockResponse = new Response(
      '<Respuesta><TrackId>TRK-1</TrackId><Estado>Aceptado</Estado></Respuesta>',
      { status: 200 },
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

    const result = await ejecutarConReintentos('https://dgii.test/ecf', '<xml/>', noopSleep);
    expect(result.trackId).toBe('TRK-1');
    expect(result.estado).toBe('Aceptado');

    vi.restoreAllMocks();
  });

  it('retries on network failure and succeeds on second attempt', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(
        new Response(
          '<Respuesta><TrackId>TRK-2</TrackId><Estado>EnProceso</Estado></Respuesta>',
          { status: 200 },
        ),
      );

    const sleepSpy = vi.fn(noopSleep);
    const result = await ejecutarConReintentos('https://dgii.test/ecf', '<xml/>', sleepSpy);

    expect(result.trackId).toBe('TRK-2');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalledTimes(1);
    expect(sleepSpy).toHaveBeenCalledWith(1000); // first retry delay

    vi.restoreAllMocks();
  });

  it('retries on HTTP error and succeeds on third attempt', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
      .mockResolvedValueOnce(new Response('Server Error', { status: 503 }))
      .mockResolvedValueOnce(
        new Response(
          '<Respuesta><TrackId>TRK-3</TrackId><Estado>Aceptado</Estado></Respuesta>',
          { status: 200 },
        ),
      );

    const sleepSpy = vi.fn(noopSleep);
    const result = await ejecutarConReintentos('https://dgii.test/ecf', '<xml/>', sleepSpy);

    expect(result.trackId).toBe('TRK-3');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(sleepSpy).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenNthCalledWith(1, 1000);
    expect(sleepSpy).toHaveBeenNthCalledWith(2, 2000);

    vi.restoreAllMocks();
  });

  it('throws after MAX_RETRIES failed attempts', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Connection refused'));

    const sleepSpy = vi.fn(noopSleep);

    await expect(
      ejecutarConReintentos('https://dgii.test/ecf', '<xml/>', sleepSpy),
    ).rejects.toThrow(/No se pudo comunicar con el Web Service de la DGII después de 5 intentos/);

    expect(sleepSpy).toHaveBeenCalledTimes(MAX_RETRIES - 1);

    vi.restoreAllMocks();
  });

  it('uses exponential backoff delays between retries', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('timeout'));

    const sleepSpy = vi.fn(noopSleep);

    await expect(
      ejecutarConReintentos('https://dgii.test/ecf', '<xml/>', sleepSpy),
    ).rejects.toThrow();

    // Verify exponential backoff: 1s, 2s, 4s, 8s (4 sleeps for 5 attempts)
    expect(sleepSpy).toHaveBeenNthCalledWith(1, 1000);
    expect(sleepSpy).toHaveBeenNthCalledWith(2, 2000);
    expect(sleepSpy).toHaveBeenNthCalledWith(3, 4000);
    expect(sleepSpy).toHaveBeenNthCalledWith(4, 8000);

    vi.restoreAllMocks();
  });

  it('includes last error message in the thrown error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      ejecutarConReintentos('https://dgii.test/ecf', '<xml/>', noopSleep),
    ).rejects.toThrow(/ECONNREFUSED/);

    vi.restoreAllMocks();
  });

  it('sends correct headers and body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('<Respuesta><TrackId>T</TrackId><Estado>Aceptado</Estado></Respuesta>', { status: 200 }),
    );

    await ejecutarConReintentos('https://dgii.test/ecf', '<ECF>data</ECF>', noopSleep);

    expect(fetchSpy).toHaveBeenCalledWith('https://dgii.test/ecf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: '<ECF>data</ECF>',
    });

    vi.restoreAllMocks();
  });
});
