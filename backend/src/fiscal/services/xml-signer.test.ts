import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';
import forge from 'node-forge';
import {
  firmarXML,
  firmarXMLConPEM,
  verificarFirma,
  validarCertificado,
  extraerCredenciales,
} from './xml-signer.js';
import type { CertificadoConfig } from '../types.js';

// ============================================================
// Unit tests for XMLSignerService
// Requirements: 2.1, 2.2, 2.3
// ============================================================

/** Helper: generate a self-signed PKCS12 (.p12) certificate using node-forge */
function generarCertificadoPrueba(opts: {
  diasValido?: number;
  cn?: string;
} = {}): { p12Buffer: Buffer; privateKeyPem: string; certificatePem: string } {
  const { diasValido = 365, cn = 'Test Fiscal Cert' } = opts;

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';

  const now = new Date();
  cert.validity.notBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000); // yesterday
  cert.validity.notAfter = new Date(now.getTime() + diasValido * 24 * 60 * 60 * 1000);

  const attrs = [{ name: 'commonName', value: cn }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
  const certificatePem = forge.pki.certificateToPem(cert);

  // Create PKCS12
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, 'testpass', {
    algorithm: '3des',
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  const p12Buffer = Buffer.from(p12Der, 'binary');

  return { p12Buffer, privateKeyPem, certificatePem };
}

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ECF>
  <Encabezado>
    <TipoeCF>31</TipoeCF>
    <eNCF>E310000000001</eNCF>
  </Encabezado>
  <DetallesItems>
    <Item><Nombre>Skateboard</Nombre><Cantidad>1</Cantidad></Item>
  </DetallesItems>
</ECF>`;

let validCert: ReturnType<typeof generarCertificadoPrueba>;
let expiredCert: ReturnType<typeof generarCertificadoPrueba>;

beforeAll(() => {
  validCert = generarCertificadoPrueba({ diasValido: 365 });
  expiredCert = generarCertificadoPrueba({ diasValido: -30 }); // expired 30 days ago
});


// --- extraerCredenciales ---

describe('extraerCredenciales', () => {
  it('extracts private key and certificate from a valid .p12', () => {
    const config: CertificadoConfig = {
      archivoP12: validCert.p12Buffer,
      password: 'testpass',
    };
    const { privateKey, certificate } = extraerCredenciales(config);

    expect(privateKey).toMatch(/-----BEGIN (RSA )?PRIVATE KEY-----/);
    expect(certificate).toContain('-----BEGIN CERTIFICATE-----');
  });

  it('throws when .p12 buffer is empty', () => {
    const config: CertificadoConfig = {
      archivoP12: Buffer.alloc(0),
      password: 'testpass',
    };
    expect(() => extraerCredenciales(config)).toThrow('vacío');
  });

  it('throws when password is incorrect', () => {
    const config: CertificadoConfig = {
      archivoP12: validCert.p12Buffer,
      password: 'wrong-password',
    };
    expect(() => extraerCredenciales(config)).toThrow();
  });

  it('throws when buffer is not a valid PKCS12', () => {
    const config: CertificadoConfig = {
      archivoP12: Buffer.from('not-a-p12-file'),
      password: 'testpass',
    };
    expect(() => extraerCredenciales(config)).toThrow();
  });
});

// --- validarCertificado ---

describe('validarCertificado', () => {
  it('returns valid for a non-expired certificate', () => {
    const result = validarCertificado(validCert.certificatePem);
    expect(result.valido).toBe(true);
    expect(result.expiraEn.getTime()).toBeGreaterThan(Date.now());
    expect(result.mensaje).toBeUndefined();
  });

  it('returns invalid for an expired certificate with descriptive message', () => {
    const result = validarCertificado(expiredCert.certificatePem);
    expect(result.valido).toBe(false);
    expect(result.expiraEn.getTime()).toBeLessThan(Date.now());
    expect(result.mensaje).toContain('expiró');
  });

  it('returns invalid for a malformed PEM string', () => {
    const result = validarCertificado('not-a-certificate');
    expect(result.valido).toBe(false);
    expect(result.mensaje).toContain('no es válido');
  });
});

// --- firmarXML ---

describe('firmarXML', () => {
  it('signs XML and produces output containing XMLDSig elements', () => {
    const config: CertificadoConfig = {
      archivoP12: validCert.p12Buffer,
      password: 'testpass',
    };
    const signed = firmarXML(SAMPLE_XML, config);

    expect(signed).toContain('<Signature');
    expect(signed).toContain('<SignedInfo');
    expect(signed).toContain('<SignatureValue');
    expect(signed).toContain('<KeyInfo');
    expect(signed).toContain('<X509Certificate');
  });

  it('throws when certificate is expired', () => {
    const config: CertificadoConfig = {
      archivoP12: expiredCert.p12Buffer,
      password: 'testpass',
    };
    expect(() => firmarXML(SAMPLE_XML, config)).toThrow('expiró');
  });

  it('throws when .p12 password is wrong', () => {
    const config: CertificadoConfig = {
      archivoP12: validCert.p12Buffer,
      password: 'bad-password',
    };
    expect(() => firmarXML(SAMPLE_XML, config)).toThrow();
  });

  it('preserves original XML content in the signed output', () => {
    const config: CertificadoConfig = {
      archivoP12: validCert.p12Buffer,
      password: 'testpass',
    };
    const signed = firmarXML(SAMPLE_XML, config);

    expect(signed).toContain('<ECF');
    expect(signed).toContain('E310000000001');
    expect(signed).toContain('Skateboard');
  });
});

// --- firmarXMLConPEM ---

describe('firmarXMLConPEM', () => {
  it('signs XML using PEM key and certificate directly', () => {
    const signed = firmarXMLConPEM(
      SAMPLE_XML,
      validCert.privateKeyPem,
      validCert.certificatePem,
    );

    expect(signed).toContain('<Signature');
    expect(signed).toContain('<SignatureValue');
  });

  it('throws when PEM certificate is expired', () => {
    expect(() =>
      firmarXMLConPEM(
        SAMPLE_XML,
        expiredCert.privateKeyPem,
        expiredCert.certificatePem,
      ),
    ).toThrow('expiró');
  });
});

// --- verificarFirma ---

describe('verificarFirma', () => {
  it('returns true for a correctly signed XML', () => {
    const signed = firmarXMLConPEM(
      SAMPLE_XML,
      validCert.privateKeyPem,
      validCert.certificatePem,
    );
    expect(verificarFirma(signed)).toBe(true);
  });

  it('returns false when signature content is tampered with', () => {
    const signed = firmarXMLConPEM(
      SAMPLE_XML,
      validCert.privateKeyPem,
      validCert.certificatePem,
    );
    // Tamper with the XML content after signing
    const tampered = signed.replace('Skateboard', 'TamperedItem');
    expect(verificarFirma(tampered)).toBe(false);
  });

  it('returns false for unsigned XML', () => {
    expect(verificarFirma(SAMPLE_XML)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(verificarFirma('')).toBe(false);
  });

  it('returns false for XML with no X509Certificate', () => {
    const noKeyInfo = '<ECF><Signature><SignedInfo/><SignatureValue>abc</SignatureValue></Signature></ECF>';
    expect(verificarFirma(noKeyInfo)).toBe(false);
  });
});
