# Plan de Implementación: Integración Fiscal en Checkout y POS

## Visión General

Integrar el módulo fiscal existente en los flujos de checkout online y POS. El trabajo se divide en: migración DB, lógica de validación y generación fiscal en backend, componente UI compartido, y extensión de checkout y POS.

## Tareas

- [ ] 1. Migración de base de datos y función de validación fiscal
  - [ ] 1.1 Crear migración `backend/src/db/migrations/003_fiscal_checkout_integration.sql`
    - Agregar columnas `wants_fiscal_invoice`, `fiscal_customer_type`, `fiscal_customer_rnc`, `fiscal_invoice_id` a `skating_orders`
    - _Requisitos: 1.1, 1.2_

  - [ ] 1.2 Crear función `validateFiscalData` en `backend/src/routes/orders.ts`
    - Validar `fiscal_customer_type` contra valores permitidos
    - Validar RNC usando `validarRNC` de `backend/src/fiscal/utils/validators.ts` cuando tipo no es `consumidor_final`
    - Aceptar sin RNC cuando tipo es `consumidor_final`
    - Retornar `{ valid: boolean; error?: string }`
    - _Requisitos: 5.1, 5.2, 5.3, 7.1_

  - [ ] 1.3 Crear función `getTipoComprobante` que mapee tipo de comprador a tipo de comprobante
    - `persona_juridica` → `'31'`, `persona_fisica` → `'31'`, `consumidor_final` → `'32'`
    - _Requisitos: 6.4_

  - [ ]* 1.4 Escribir property test para validación fiscal (Propiedad 3)
    - **Propiedad 3: Validación de datos fiscales**
    - Generar combinaciones aleatorias de (wants_fiscal, tipo, rnc) con fast-check
    - Verificar que la función acepta si y solo si las condiciones del requisito se cumplen
    - **Valida: Requisitos 3.5, 3.6, 5.1, 5.2, 5.3**

  - [ ]* 1.5 Escribir property test para mapeo tipo comprador → tipo comprobante (Propiedad 4)
    - **Propiedad 4: Mapeo tipo de comprador a tipo de comprobante**
    - Generar tipos de comprador aleatorios, verificar mapeo correcto
    - **Valida: Requisitos 6.4**

  - [ ]* 1.6 Escribir property test para requerimiento condicional de RNC (Propiedad 6)
    - **Propiedad 6: Requerimiento condicional de RNC**
    - Generar tipos de comprador, verificar que RNC es requerido solo para persona_juridica y persona_fisica
    - **Valida: Requisitos 3.3, 3.4**

- [ ] 2. Backend - Generación automática de e-CF y extensión de endpoints
  - [ ] 2.1 Crear función `generateFiscalInvoiceForOrder` en `backend/src/routes/orders.ts`
    - Obtener config fiscal de DB
    - Construir `ItemFactura[]` desde items del pedido
    - Llamar `calcularITBIS`, `obtenerSiguienteNCF`, `generarXML`, `firmarXML`
    - Insertar en `fiscal_invoices`
    - Intentar `enviarECF` (no bloquear si falla)
    - Registrar auditoría
    - Retornar `fiscal_invoice_id` o `null` si falla
    - _Requisitos: 6.1, 6.2, 6.3, 6.5_

  - [ ] 2.2 Extender `POST /api/orders` para aceptar y procesar datos fiscales
    - Aceptar campos `wants_fiscal_invoice`, `fiscal_customer_type`, `fiscal_customer_rnc`
    - Llamar `validateFiscalData` antes de insertar
    - Incluir campos fiscales en el INSERT
    - Llamar `generateFiscalInvoiceForOrder` post-inserción si `wants_fiscal_invoice=true`
    - Actualizar `fiscal_invoice_id` en el pedido
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_

  - [ ] 2.3 Extender `POST /api/orders/pos` para aceptar y procesar datos fiscales
    - Misma lógica fiscal que 2.2, adaptada al flujo POS con transacción
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_

  - [ ]* 2.4 Escribir property test para persistencia round-trip de datos fiscales (Propiedad 5)
    - **Propiedad 5: Persistencia round-trip de datos fiscales en pedido**
    - Generar datos fiscales válidos, crear pedido via API, consultar y comparar campos
    - **Valida: Requisitos 5.4**

- [ ] 3. Checkpoint - Verificar backend
  - Ejecutar todos los tests, verificar que la migración y endpoints funcionan correctamente. Preguntar al usuario si hay dudas.

- [ ] 4. Frontend - Componente compartido y utilidades de cálculo
  - [ ] 4.1 Crear función `calcularITBISFrontend` en `src/lib/skating-store/fiscal-utils.ts`
    - Calcular ITBIS = round(subtotal × 0.18, 2)
    - Calcular total = subtotal + ITBIS + envío
    - Exportar función `validarRNCFrontend` con regex /^\d{9}$/ o /^\d{11}$/
    - Exportar función `requiresRnc(tipo)` que retorna true para persona_juridica y persona_fisica
    - _Requisitos: 2.1, 2.5, 7.2_

  - [ ]* 4.2 Escribir property test para cálculo de ITBIS (Propiedad 1)
    - **Propiedad 1: Cálculo de ITBIS correcto y redondeado**
    - Generar subtotales aleatorios con fast-check, verificar ITBIS = round(subtotal * 0.18, 2)
    - **Valida: Requisitos 2.1, 2.5**

  - [ ]* 4.3 Escribir property test para invariante de total (Propiedad 2)
    - **Propiedad 2: Invariante de total con y sin comprobante fiscal**
    - Generar pares (subtotal, envío), verificar total con y sin fiscal
    - **Valida: Requisitos 2.3, 2.4**

  - [ ]* 4.4 Escribir property test para consistencia de validación RNC (Propiedad 7)
    - **Propiedad 7: Consistencia de validación RNC entre frontend y backend**
    - Generar strings aleatorios, comparar resultado de validarRNCFrontend vs validarRNC del backend
    - **Valida: Requisitos 7.2**

  - [ ] 4.5 Crear componente `FiscalInvoiceFields` en `src/components/shared/FiscalInvoiceFields.tsx`
    - Toggle "¿Desea comprobante fiscal?"
    - Selector de tipo de comprador (persona_juridica, persona_fisica, consumidor_final)
    - Campo RNC condicional con validación inline usando `validarRNCFrontend`
    - Props: wantsFiscalInvoice, customerType, rnc, callbacks de cambio, rncError
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 5. Frontend - Integración en Checkout
  - [ ] 5.1 Extender `OrderSummary` para mostrar ITBIS
    - Agregar prop `wantsFiscalInvoice: boolean`
    - Cuando es true, mostrar línea "ITBIS (18%)" y recalcular total
    - Usar `calcularITBISFrontend` para el cálculo
    - _Requisitos: 2.1, 2.2, 2.3, 2.4_

  - [ ] 5.2 Extender `CheckoutForm` para incluir campos fiscales
    - Agregar estado para datos fiscales (wantsFiscalInvoice, customerType, rnc)
    - Integrar componente `FiscalInvoiceFields`
    - Pasar datos fiscales en el callback `onSubmit`
    - Bloquear envío si datos fiscales son inválidos
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 5.3 Extender `checkout/page.tsx` y `createOrder`
    - Pasar `wantsFiscalInvoice` a `OrderSummary`
    - Extender `createOrder` en `supabase-queries.ts` para enviar campos fiscales
    - Recalcular total con ITBIS antes de enviar si fiscal está activo
    - _Requisitos: 2.3, 5.4_

- [ ] 6. Frontend - Integración en POS
  - [ ] 6.1 Extender `POSPayment` para incluir campos fiscales
    - Agregar estado para datos fiscales
    - Integrar componente `FiscalInvoiceFields`
    - Mostrar ITBIS y total actualizado cuando fiscal está activo
    - Pasar datos fiscales en el callback `onConfirm`
    - _Requisitos: 4.1, 4.2, 4.3, 4.4_

  - [ ] 6.2 Extender `pos/page.tsx` y `createPOSOrder`
    - Recalcular total con ITBIS cuando fiscal está activo
    - Extender `createPOSOrder` en `pos-actions.ts` para enviar campos fiscales
    - _Requisitos: 4.3, 4.4_

- [ ] 7. Checkpoint final - Verificar integración completa
  - Ejecutar todos los tests. Verificar flujo completo: checkout con fiscal → pedido creado con datos fiscales → e-CF generado. Preguntar al usuario si hay dudas.

## Notas

- Las tareas marcadas con `*` son opcionales (tests) y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los property tests validan propiedades universales de correctitud
- Los unit tests validan ejemplos específicos y casos edge
- No se reimplementa ningún servicio fiscal — solo se integra lo existente
