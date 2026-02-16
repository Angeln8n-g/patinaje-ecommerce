import crypto from 'node:crypto';
import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import type { CertificadoConfig } from '../types.js';

// ============================================================
// XMLSignerService — Digital signature for e-CF documents
// Uses XMLDSig standard via xml-crypto + Node.js crypto
// Requirements: 2.1, 2.2, 2.3
// ============================================================

/**
 * Extracts the private key (PEM) and X509 certificate (PEM) from a PKCS12 (.p12) buffer.
 * Uses node-forge for PKCS12 parsing.
 */
export function extraerCredenciales(config: CertificadoConfig): {
  privateKey: string;
  certificate: string;
} {
  const { archivoP12, password } = config;

  if (!archivoP12 || archivoP12.length === 0) {
    throw new Error('El archivo .p12 del certificado está vacío o no fue proporcionado');
  }

  try {
    const p12Der = forge.util.createBuffer(archivoP12.toString('binary'));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extract certificate
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];
    if (!certBag || certBag.length === 0 || !certBag[0].cert) {
      throw new Error('No se pudo extraer el certificado del archivo .p12');
    }
    const certificatePem = forge.pki.certificateToPem(certBag[0].cert);

    // Extract private key
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (!keyBag || keyBag.length === 0 || !keyBag[0].key) {
      throw new Error('No se pudo extraer la clave privada del archivo .p12');
    }
    const privateKeyPem = forge.pki.privateKeyToPem(keyBag[0].key);

    return { privateKey: privateKeyPem, certificate: certificatePem };
  } catch (err) {
    if (err instanceof Error && (
      err.message.includes('certificado') ||
      err.message.includes('expirado')
    )) {
      throw err;
    }
    throw new Error(
      `Error al procesar el certificado .p12: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}


/**
 * Validates that a certificate is not expired and is properly formatted.
 * Accepts either a PEM string or a CertificadoConfig (PKCS12).
 */
export function validarCertificado(certPem: string): { valido: boolean; expiraEn: Date; mensaje?: string } {
  try {
    const x509 = new crypto.X509Certificate(certPem);
    const expiraEn = new Date(x509.validTo);
    const now = new Date();

    if (expiraEn < now) {
      return {
        valido: false,
        expiraEn,
        mensaje: `El certificado digital expiró el ${expiraEn.toISOString().split('T')[0]}. Debe renovar el certificado para continuar firmando documentos.`,
      };
    }

    return { valido: true, expiraEn };
  } catch (err) {
    return {
      valido: false,
      expiraEn: new Date(0),
      mensaje: `El certificado digital no es válido: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}


/**
 * Signs an XML document using XMLDSig with the provided PKCS12 certificate.
 *
 * - Validates the certificate is not expired before signing.
 * - Applies enveloped XMLDSig signature.
 * - Throws if the certificate is expired or invalid.
 *
 * @param xml - The XML string to sign
 * @param certificado - PKCS12 certificate config (buffer + password)
 * @returns The signed XML string with embedded XMLDSig signature
 */
export function firmarXML(xml: string, certificado: CertificadoConfig): string {
  // 1. Extract credentials from PKCS12
  const { privateKey, certificate } = extraerCredenciales(certificado);

  // 2. Validate certificate is not expired
  const validacion = validarCertificado(certificate);
  if (!validacion.valido) {
    throw new Error(validacion.mensaje || 'Certificado digital inválido');
  }

  // 3. Sign with XMLDSig using xml-crypto
  const sig = new SignedXml({
    privateKey,
    publicCert: certificate,
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  });

  sig.addReference({
    xpath: '//*[local-name()="ECF"]',
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
  });

  sig.computeSignature(xml, {
    location: { reference: '//*[local-name()="ECF"]', action: 'append' },
  });

  return sig.getSignedXml();
}

/**
 * Signs an XML document using pre-extracted PEM key and certificate.
 * Useful for testing and when credentials are already available.
 */
export function firmarXMLConPEM(xml: string, privateKeyPem: string, certificatePem: string): string {
  const validacion = validarCertificado(certificatePem);
  if (!validacion.valido) {
    throw new Error(validacion.mensaje || 'Certificado digital inválido');
  }

  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certificatePem,
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  });

  sig.addReference({
    xpath: '//*[local-name()="ECF"]',
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
  });

  sig.computeSignature(xml, {
    location: { reference: '//*[local-name()="ECF"]', action: 'append' },
  });

  return sig.getSignedXml();
}

/**
 * Verifies the XMLDSig signature of a signed XML document.
 *
 * @param xmlFirmado - The signed XML string to verify
 * @returns true if the signature is valid, false otherwise
 */
export function verificarFirma(xmlFirmado: string): boolean {
  try {
    // Extract the certificate from the KeyInfo in the signed XML
    const certMatch = xmlFirmado.match(
      /<X509Certificate>([\s\S]*?)<\/X509Certificate>/
    );

    if (!certMatch || !certMatch[1]) {
      return false;
    }

    const certBase64 = certMatch[1].replace(/\s/g, '');
    const certPem = `-----BEGIN CERTIFICATE-----\n${certBase64}\n-----END CERTIFICATE-----`;

    const sig = new SignedXml({ publicCert: certPem });

    // Find the Signature node
    const signatureMatch = xmlFirmado.match(/<Signature[\s>][\s\S]*?<\/Signature>/);
    if (!signatureMatch) {
      return false;
    }

    sig.loadSignature(signatureMatch[0]);
    const result = sig.checkSignature(xmlFirmado);

    return result;
  } catch {
    return false;
  }
}
