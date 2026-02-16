# Plan de Implementación: Módulo de Facturación Fiscal (e-CF DGII)

## Visión General

Implementación incremental del módulo de facturación fiscal como componente separado dentro del backend Express y frontend Next.js existentes. Cada tarea construye sobre las anteriores, integrando servicios progresivamente hasta completar el flujo de emisión de e-CF.

## Tareas

- [x] 1. Crear esquema de base de datos y tipos base del módulo fiscal
  - [x] 1.1 Crear migración SQL con las tablas fiscal_invoices, fiscal_sequences, fiscal_config, fiscal_config_history y fiscal_audit_log según el diseño
    - Incluir todos los índices, constraints y relaciones con tablas existentes (skating_orders, profiles)
    - _Requirements: 8.1, 4.1, 11.6_
  - [x] 1.2 Crear interfaces TypeScript para los modelos de datos y tipos del módulo fiscal
    - Definir ECFData, TipoComprobante, DatosEmisor, DatosComprador, ItemFactura, SecuenciaFiscal, EstadoDGII, DGIIResponse, TipoEventoAuditoria
    - Crear archivo `backend/src/fiscal/types.ts`
    - _Requirements: 1.1, 3.2, 4.1, 9.1_

- [x] 2. Implementar validaciones y utilidades fiscales
  - [x] 2.1 Implementar función de validación de RNC (9 u 11 dígitos numéricos)
    - Crear archivo `backend/src/fiscal/utils/validators.ts`
    - _Requirements: 11.4_
  - [ ]* 2.2 Escribir test de propiedad para validación de RNC
    - **Property 21: Validación de formato RNC**
    - **Validates: Requirements 11.4**
  - [x] 2.3 Implementar funciones de cálculo de ITBIS (18%) con redondeo a 2 decimales
    - Crear función calcularITBIS(items) que retorne { subtotal, totalITBIS, total }
    - Agregar en `backend/src/fiscal/utils/tax-calculator.ts`
    - _Requirements: 1.3_
  - [ ]* 2.4 Escribir test de propiedad para cálculo de ITBIS
    - **Property 2: Cálculo correcto de ITBIS**
    - **Validates: Requirements 1.3**
  - [x] 2.5 Implementar utilidades de cifrado AES-256 para contraseñas de certificados
    - Crear funciones cifrar(texto, clave) y descifrar(textoCifrado, clave)
    - Agregar en `backend/src/fiscal/utils/encryption.ts`
    - _Requirements: 2.4, 8.3_
  - [ ]* 2.6 Escribir test de propiedad para round-trip de cifrado
    - **Property 7: Round-trip de cifrado de certificado**
    - **Validates: Requirements 2.4, 8.3**

- [x] 3. Checkpoint - Verificar que las utilidades base funcionan correctamente
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implementar XMLGeneratorService y serialización XML
  - [x] 4.1 Implementar XMLGeneratorService con métodos generarXML, parsearXML, validarContraXSD y formatearXML
    - Crear archivo `backend/src/fiscal/services/xml-generator.ts`
    - Usar librería `fast-xml-parser` para serialización/deserialización
    - Implementar lógica de tipo de comprador (persona jurídica con RNC, consumidor final sin RNC con tipo '32')
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 9.1, 9.2, 9.3, 9.4_
  - [ ]* 4.2 Escribir test de propiedad para round-trip de serialización XML
    - **Property 18: Round-trip de serialización XML**
    - **Validates: Requirements 9.3**
  - [ ]* 4.3 Escribir test de propiedad para validación XSD del XML generado
    - **Property 1: Generación de XML produce documentos válidos contra XSD**
    - **Validates: Requirements 1.1, 1.6**
  - [ ]* 4.4 Escribir test de propiedad para tipo de comprador en el documento
    - **Property 3: Tipo de comprador determina contenido del documento**
    - **Validates: Requirements 1.4, 1.5**

- [x] 5. Implementar NCFManagerService para gestión de secuencias fiscales
  - [x] 5.1 Implementar NCFManagerService con métodos obtenerSiguienteNCF, verificarDisponibilidad y registrarSecuencia
    - Crear archivo `backend/src/fiscal/services/ncf-manager.ts`
    - Usar transacciones con SELECT FOR UPDATE para garantizar unicidad bajo concurrencia
    - Implementar lógica de alerta al 80% y bloqueo de secuencias agotadas/vencidas
    - _Requirements: 1.2, 4.1, 4.2, 4.3, 4.4_
  - [ ]* 5.2 Escribir test de propiedad para unicidad y secuencialidad de NCF
    - **Property 4: Unicidad y secuencialidad de NCF**
    - **Validates: Requirements 1.2, 4.2**
  - [ ]* 5.3 Escribir test de propiedad para alerta de agotamiento al 80%
    - **Property 10: Alerta de agotamiento de secuencia al 80%**
    - **Validates: Requirements 4.3**
  - [ ]* 5.4 Escribir test de propiedad para bloqueo de secuencia agotada/vencida
    - **Property 11: Secuencia agotada o vencida bloquea emisión**
    - **Validates: Requirements 4.4**

- [x] 6. Implementar XMLSignerService para firma digital
  - [x] 6.1 Implementar XMLSignerService con métodos firmarXML y verificarFirma
    - Crear archivo `backend/src/fiscal/services/xml-signer.ts`
    - Usar librería `xml-crypto` para XMLDSig
    - Implementar validación de certificado (expiración, formato)
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ]* 6.2 Escribir test de propiedad para validez de firma digital
    - **Property 5: Validez de firma digital**
    - **Validates: Requirements 2.1, 2.2**
  - [ ]* 6.3 Escribir test de propiedad para rechazo de certificado inválido
    - **Property 6: Rechazo de certificado inválido**
    - **Validates: Requirements 2.3**

- [x] 7. Checkpoint - Verificar servicios core (XML, NCF, Firma)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implementar DGIIClientService y AuditLoggerService
  - [x] 8.1 Implementar DGIIClientService con métodos enviarECF, consultarEstado y enviarAnulacion
    - Crear archivo `backend/src/fiscal/services/dgii-client.ts`
    - Implementar lógica de reintentos (máx. 5, espera exponencial)
    - Implementar mapeo de estados DGII a estados internos
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 8.2 Escribir test de propiedad para mapeo de estados DGII
    - **Property 8: Mapeo correcto de estados DGII**
    - **Validates: Requirements 3.2**
  - [x] 8.3 Implementar AuditLoggerService con método registrar
    - Crear archivo `backend/src/fiscal/services/audit-logger.ts`
    - Insertar registros en fiscal_audit_log con evento, invoice_id, usuario_id, datos y timestamp
    - _Requirements: 3.5, 7.4_
  - [ ]* 8.4 Escribir test de propiedad para completitud del log de auditoría
    - **Property 9: Completitud del log de auditoría**
    - **Validates: Requirements 3.5, 7.4**

- [x] 9. Implementar PDFGeneratorService
  - [x] 9.1 Implementar PDFGeneratorService con método generarPDF
    - Crear archivo `backend/src/fiscal/services/pdf-generator.ts`
    - Usar librería `pdfkit` para generación de PDF
    - Usar librería `qrcode` para generar código QR con URL de validación DGII
    - Incluir NCF, RNC emisor, datos del comprador, ítems, subtotal, ITBIS, total
    - _Requirements: 5.1, 5.2, 5.3_
  - [ ]* 9.2 Escribir test de propiedad para URL del QR
    - **Property 12: URL del QR contiene parámetros requeridos**
    - **Validates: Requirements 5.2**

- [x] 10. Implementar rutas API fiscales y lógica de negocio
  - [x] 10.1 Crear router fiscal con endpoint de emisión de e-CF (POST /api/fiscal/invoices)
    - Crear archivo `backend/src/routes/fiscal.ts`
    - Orquestar flujo: obtener NCF → generar XML → firmar → almacenar → enviar a DGII → registrar auditoría
    - Proteger con requireAuth y requireRole('ADMIN', 'SELLER')
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 3.5, 8.1_
  - [x] 10.2 Implementar endpoints de listado y detalle de e-CF (GET /api/fiscal/invoices, GET /api/fiscal/invoices/:id)
    - Implementar filtros por rango de fechas, estado y tipo de comprobante
    - Proteger con requireRole('ADMIN')
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ]* 10.3 Escribir test de propiedad para filtros de facturas
    - **Property 19: Filtros retornan solo facturas coincidentes**
    - **Validates: Requirements 10.2**
  - [x] 10.4 Implementar endpoint de anulación (POST /api/fiscal/invoices/:id/annul)
    - Validar que el e-CF no esté ya anulado
    - Generar XML de anulación, enviar a DGII, actualizar estado, registrar auditoría
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]* 10.5 Escribir test de propiedad para rechazo de anulación duplicada
    - **Property 15: Rechazo de anulación duplicada**
    - **Validates: Requirements 7.3**
  - [x] 10.6 Implementar endpoints de acuse de recibo y aprobación comercial (POST /api/fiscal/invoices/:id/ack, POST /api/fiscal/invoices/:id/approval)
    - Actualizar campos acuse_recibido, acuse_fecha, aprobacion_comercial, aprobacion_fecha
    - _Requirements: 6.1, 6.2_
  - [ ]* 10.7 Escribir test de propiedad para actualización de acuse y aprobación
    - **Property 13: Actualización de estado por acuse y aprobación**
    - **Validates: Requirements 6.1, 6.2**
  - [x] 10.8 Implementar endpoint de reenvío (POST /api/fiscal/invoices/:id/resend) y descarga de PDF (GET /api/fiscal/invoices/:id/pdf)
    - _Requirements: 3.4, 5.1_
  - [x] 10.9 Implementar endpoints de dashboard y resumen (GET /api/fiscal/dashboard)
    - Retornar conteos por estado y uso de secuencias
    - _Requirements: 10.4_
  - [ ]* 10.10 Escribir test de propiedad para conteos del dashboard
    - **Property 20: Conteos del dashboard coinciden con datos reales**
    - **Validates: Requirements 10.4**

- [x] 11. Implementar endpoints de configuración y secuencias
  - [x] 11.1 Implementar endpoints de configuración fiscal (GET/PUT /api/fiscal/config, POST /api/fiscal/config/certificate)
    - Validar formato RNC al guardar
    - Validar certificado al cargar (formato .p12, no expirado)
    - Cifrar contraseña del certificado con AES-256 antes de almacenar
    - Al actualizar configuración, guardar snapshot de la configuración anterior en fiscal_config_history con campos modificados y usuario
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  - [x] 11.2a Implementar endpoint de historial de configuración (GET /api/fiscal/config/history)
    - Retornar lista de cambios con fecha, usuario y campos modificados
    - Proteger con requireRole('ADMIN')
    - _Requirements: 11.7_
  - [ ]* 11.2 Escribir test de propiedad para validación de expiración de certificado
    - **Property 22: Validación de expiración de certificado**
    - **Validates: Requirements 11.5**
  - [x] 11.3 Implementar endpoints de secuencias fiscales (GET/POST /api/fiscal/sequences, GET /api/fiscal/sequences/status)
    - _Requirements: 4.1, 4.3_
  - [x] 11.4 Implementar endpoint de log de auditoría (GET /api/fiscal/audit-log)
    - _Requirements: 3.5_
  - [ ]* 11.5 Escribir test de propiedad para acceso restringido a datos fiscales
    - **Property 17: Acceso restringido a datos fiscales**
    - **Validates: Requirements 8.4**

- [x] 12. Registrar router fiscal en el servidor Express
  - Importar y montar fiscalRoutes en `backend/src/index.ts` bajo `/api/fiscal`
  - _Requirements: todos_

- [x] 13. Checkpoint - Verificar que todos los endpoints del backend funcionan
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implementar panel de administración fiscal en el frontend
  - [x] 14.1 Crear página principal del panel fiscal en `src/app/admin/fiscal/page.tsx`
    - Mostrar dashboard con resumen de comprobantes por estado y uso de secuencias
    - Incluir listado de e-CF con filtros (fecha, estado, tipo)
    - _Requirements: 10.1, 10.2, 10.4_
  - [x] 14.2 Crear página de detalle de e-CF en `src/app/admin/fiscal/[id]/page.tsx`
    - Mostrar datos fiscales completos, estado DGII, historial de auditoría
    - Incluir acciones: reenviar, anular, descargar PDF
    - _Requirements: 10.3_
  - [x] 14.3 Crear página de configuración fiscal en `src/app/admin/fiscal/config/page.tsx`
    - Formulario para datos del emisor (RNC, razón social, dirección, etc.)
    - Selector de ambiente (pruebas/producción) con URLs del Web Service
    - Carga de certificado digital (.p12)
    - _Requirements: 11.1, 11.2, 11.3_
  - [x] 14.4 Crear página de gestión de secuencias fiscales en `src/app/admin/fiscal/sequences/page.tsx`
    - Listado de secuencias con estado y porcentaje de uso
    - Formulario para crear nuevas secuencias
    - Indicadores visuales de alerta (80%+) y agotamiento
    - _Requirements: 4.1, 4.3, 4.4_
  - [x] 14.5 Agregar botón de facturación fiscal en la vista de detalle de orden (admin y seller)
    - Permitir generar e-CF desde una orden completada
    - Seleccionar tipo de comprobante y datos del comprador
    - _Requirements: 1.1, 1.4, 1.5_
  - [x] 14.6 Agregar enlace al panel fiscal en el menú de navegación del admin
    - _Requirements: 10.1_

- [x] 15. Implementar detección de acuse vencido
  - [x] 15.1 Crear función que identifique e-CF con más de 10 días sin acuse de recibo
    - Crear en `backend/src/fiscal/services/overdue-checker.ts`
    - Marcar como pendiente de acuse y registrar alerta en auditoría
    - _Requirements: 6.3_
  - [ ]* 15.2 Escribir test de propiedad para detección de acuse vencido
    - **Property 14: Detección de acuse vencido**
    - **Validates: Requirements 6.3**

- [ ] 16. Escribir tests de propiedad restantes
  - [ ]* 16.1 Escribir test de propiedad para e-CF almacenado contiene XML y referencia a orden
    - **Property 16: e-CF almacenado contiene XML y referencia a orden**
    - **Validates: Requirements 8.1**

- [x] 17. Checkpoint final - Verificar integración completa
  - Ensure all tests pass, ask the user if questions arise.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los tests de propiedades validan correctitud universal con fast-check
- Los tests unitarios validan ejemplos específicos y casos borde
- Se recomienda instalar las dependencias necesarias antes de comenzar: `fast-xml-parser`, `xml-crypto`, `pdfkit`, `qrcode`, `fast-check`
