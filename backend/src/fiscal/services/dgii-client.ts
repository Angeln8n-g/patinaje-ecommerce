import { query } from '../../db/pool.js';
import type { EstadoDGII, EstadoInterno, DGIIResponse, FiscalConfig } from '../types.js';

// ============================================================
// DGIIClientService — Communication with DGII Web Service
// Handles sending e-CF, querying status, and annulment requests.
// Implements retry logic with exponential backoff.
// Requirements: 3.1, 3.2, 3.3, 3.4
// ============================================================

/** Maximum number of retry attempts */
export const MAX_RETRIES = 5;

/** Base delay in milliseconds for exponential backoff (1s, 2s, 4s, 8s, 16s) */
export const BASE_DELAY_MS = 1000;

/**
 * Computes the delay for a given retry attempt using exponential backoff.
 * Attempt 0 → 1s, 1 → 2s, 2 → 4s, 3 → 8s, 4 → 16s
 */
export function calcularDelay(attempt: number): number {
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Maps a DGII external state to the internal database state.
 * Pure function — easy to test independently.
 */
export function mapearEstadoDGII(estadoDGII: EstadoDGII): EstadoInterno {
  const mapping: Record<EstadoDGII, EstadoInterno> = {
    Aceptado: 'aceptado',
    Rechazado: 'rechazado',
    AceptadoCondicional: 'aceptado_condicional',
    EnProceso: 'en_proceso',
    Anulado: 'anulado',
  };
  return mapping[estadoDGII];
}

/**
 * Retrieves the active DGII web service URL from the fiscal_config table.
 * Returns the URL based on the configured environment (pruebas/produccion).
 */
export async function obtenerUrlDGII(): Promise<string> {
  const res = await query(
    `SELECT dgii_ws_url_pruebas, dgii_ws_url_produccion, ambiente
     FROM fiscal_config
     ORDER BY updated_at DESC
     LIMIT 1`,
  );

  if (res.rows.length === 0) {
    throw new Error('No se encontró configuración fiscal. Configure el módulo fiscal antes de enviar comprobantes.');
  }

  const config = res.rows[0] as Pick<FiscalConfig, 'dgii_ws_url_pruebas' | 'dgii_ws_url_produccion' | 'ambiente'>;
  const url = config.ambiente === 'produccion'
    ? config.dgii_ws_url_produccion
    : config.dgii_ws_url_pruebas;

  if (!url) {
    throw new Error(`No se ha configurado la URL del Web Service de la DGII para el ambiente "${config.ambiente}".`);
  }

  return url;
}


/**
 * Parses a DGII XML response into a DGIIResponse object.
 * Extracts trackId, estado, and mensajes from the response body.
 */
export function parsearRespuestaDGII(responseText: string): DGIIResponse {
  // Simple XML parsing for DGII response fields
  const trackIdMatch = responseText.match(/<TrackId>(.*?)<\/TrackId>/);
  const estadoMatch = responseText.match(/<Estado>(.*?)<\/Estado>/);
  const mensajesMatches = [...responseText.matchAll(/<Mensaje>(.*?)<\/Mensaje>/g)];

  const trackId = trackIdMatch?.[1] ?? '';
  const estadoRaw = estadoMatch?.[1] ?? '';
  const mensajes = mensajesMatches.map((m) => m[1]);

  const estadosValidos: EstadoDGII[] = ['Aceptado', 'Rechazado', 'AceptadoCondicional', 'EnProceso', 'Anulado'];
  const estado: EstadoDGII = estadosValidos.includes(estadoRaw as EstadoDGII)
    ? (estadoRaw as EstadoDGII)
    : 'EnProceso';

  return { trackId, estado, mensajes };
}

/**
 * Utility to pause execution for a given number of milliseconds.
 * Extracted for testability (can be overridden in tests).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes an HTTP request to the DGII web service with retry logic.
 * Retries up to MAX_RETRIES times with exponential backoff on network errors.
 *
 * @param url - The DGII web service endpoint URL
 * @param body - The XML body to send
 * @param sleepFn - Sleep function (injectable for testing)
 * @returns The parsed DGIIResponse
 */
export async function ejecutarConReintentos(
  url: string,
  body: string,
  sleepFn: (ms: number) => Promise<void> = sleep,
): Promise<DGIIResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body,
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`DGII respondió con HTTP ${response.status}: ${responseText}`);
      }

      return parsearRespuestaDGII(responseText);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on the last attempt
      if (attempt < MAX_RETRIES - 1) {
        const delay = calcularDelay(attempt);
        await sleepFn(delay);
      }
    }
  }

  throw new Error(
    `No se pudo comunicar con el Web Service de la DGII después de ${MAX_RETRIES} intentos. ` +
    `Último error: ${lastError?.message ?? 'desconocido'}`,
  );
}

/**
 * Sends a signed e-CF XML to the DGII web service.
 * Retrieves the DGII URL from the fiscal_config table.
 *
 * @param xmlFirmado - The signed XML document to send
 * @param sleepFn - Optional sleep function for testing
 * @returns The DGII response with trackId and status
 */
export async function enviarECF(
  xmlFirmado: string,
  sleepFn?: (ms: number) => Promise<void>,
): Promise<DGIIResponse> {
  const baseUrl = await obtenerUrlDGII();
  const url = `${baseUrl}/ecf/enviar`;
  return ejecutarConReintentos(url, xmlFirmado, sleepFn);
}

/**
 * Queries the status of a previously submitted e-CF using its trackId.
 *
 * @param trackId - The tracking ID returned by the DGII on submission
 * @param sleepFn - Optional sleep function for testing
 * @returns The DGII response with current status
 */
export async function consultarEstado(
  trackId: string,
  sleepFn?: (ms: number) => Promise<void>,
): Promise<DGIIResponse> {
  const baseUrl = await obtenerUrlDGII();
  const url = `${baseUrl}/ecf/estado`;
  const body = `<ConsultaEstado><TrackId>${trackId}</TrackId></ConsultaEstado>`;
  return ejecutarConReintentos(url, body, sleepFn);
}

/**
 * Sends an annulment request for an e-CF to the DGII web service.
 *
 * @param xmlAnulacion - The annulment XML document
 * @param sleepFn - Optional sleep function for testing
 * @returns The DGII response confirming the annulment
 */
export async function enviarAnulacion(
  xmlAnulacion: string,
  sleepFn?: (ms: number) => Promise<void>,
): Promise<DGIIResponse> {
  const baseUrl = await obtenerUrlDGII();
  const url = `${baseUrl}/ecf/anular`;
  return ejecutarConReintentos(url, xmlAnulacion, sleepFn);
}
