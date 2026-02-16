# Documento de Requisitos: Integración Fiscal en Checkout y POS

## Introducción

Este documento define los requisitos para integrar el módulo de facturación fiscal (e-CF) existente en los flujos de checkout online y punto de venta (POS). Actualmente, el módulo fiscal está completamente implementado pero no está conectado al flujo de creación de pedidos. Esta integración permitirá a los clientes solicitar comprobantes fiscales al momento de pagar, con cálculo automático de ITBIS (18%) y generación automática del e-CF.

## Glosario

- **Sistema_Checkout**: Componente frontend del flujo de compra online (`CheckoutForm`, `OrderSummary`, `checkout/page.tsx`)
- **Sistema_POS**: Componente frontend del punto de venta en tienda (`POSPayment`, `pos/page.tsx`)
- **API_Pedidos**: Endpoints backend para creación de pedidos (`POST /api/orders`, `POST /api/orders/pos`)
- **Servicio_Fiscal**: Módulo fiscal existente que genera e-CF, XML, firma digital y envía a la DGII (`backend/src/fiscal/`)
- **ITBIS**: Impuesto a la Transferencia de Bienes Industrializados y Servicios, tasa del 18% en República Dominicana
- **RNC**: Registro Nacional del Contribuyente, identificador fiscal de 9 u 11 dígitos
- **e-CF**: Comprobante Fiscal Electrónico
- **NCF**: Número de Comprobante Fiscal
- **Tipo_Comprador**: Clasificación del comprador: `persona_juridica`, `persona_fisica` o `consumidor_final`
- **Comprobante_Fiscal**: Documento fiscal generado por el Servicio_Fiscal que certifica una transacción comercial

## Requisitos

### Requisito 1: Migración de base de datos para campos fiscales en pedidos

**Historia de Usuario:** Como desarrollador, quiero que la tabla `skating_orders` tenga columnas fiscales, para que los pedidos puedan almacenar la intención y datos de facturación fiscal del cliente.

#### Criterios de Aceptación

1. THE API_Pedidos SHALL incluir las columnas `wants_fiscal_invoice` (BOOLEAN DEFAULT FALSE), `fiscal_customer_type` (VARCHAR(20)), `fiscal_customer_rnc` (VARCHAR(11)) y `fiscal_invoice_id` (UUID referencia a `fiscal_invoices`) en la tabla `skating_orders`
2. WHEN la migración se ejecuta sobre una base de datos existente, THE API_Pedidos SHALL preservar todos los pedidos existentes sin modificar sus datos

### Requisito 2: Cálculo y visualización de ITBIS en el resumen de pedido

**Historia de Usuario:** Como cliente, quiero ver el desglose de ITBIS cuando solicito un comprobante fiscal, para que pueda conocer el monto exacto de impuestos antes de confirmar mi compra.

#### Criterios de Aceptación

1. WHEN el cliente activa la opción de comprobante fiscal, THE Sistema_Checkout SHALL calcular el ITBIS como subtotal × 0.18
2. WHEN el ITBIS se calcula, THE Sistema_Checkout SHALL mostrar una línea adicional "ITBIS (18%)" entre el subtotal y el total en el resumen del pedido
3. WHEN el cliente activa la opción de comprobante fiscal, THE Sistema_Checkout SHALL actualizar el total a pagar sumando subtotal + ITBIS + envío
4. WHEN el cliente desactiva la opción de comprobante fiscal, THE Sistema_Checkout SHALL remover la línea de ITBIS y recalcular el total sin impuestos
5. THE Sistema_Checkout SHALL redondear todos los montos de ITBIS a 2 decimales

### Requisito 3: Formulario de datos fiscales en checkout online

**Historia de Usuario:** Como cliente online, quiero poder solicitar un comprobante fiscal durante el checkout, para que pueda obtener mi factura con validez fiscal.

#### Criterios de Aceptación

1. THE Sistema_Checkout SHALL mostrar un toggle/checkbox con la etiqueta "¿Desea comprobante fiscal?" en el formulario de checkout
2. WHEN el cliente activa el toggle de comprobante fiscal, THE Sistema_Checkout SHALL mostrar un selector de tipo de comprador con las opciones: Persona Jurídica, Persona Física y Consumidor Final
3. WHEN el tipo de comprador seleccionado es `persona_juridica` o `persona_fisica`, THE Sistema_Checkout SHALL mostrar un campo de entrada para el RNC
4. WHEN el tipo de comprador seleccionado es `consumidor_final`, THE Sistema_Checkout SHALL ocultar el campo de RNC
5. WHEN el cliente ingresa un RNC, THE Sistema_Checkout SHALL validar que el RNC contenga exactamente 9 u 11 dígitos numéricos antes de permitir el envío del formulario
6. WHEN el cliente intenta enviar el formulario con comprobante fiscal activado y tipo `persona_juridica` o `persona_fisica` sin RNC válido, THE Sistema_Checkout SHALL bloquear el envío y mostrar un mensaje de error descriptivo

### Requisito 4: Formulario de datos fiscales en POS

**Historia de Usuario:** Como vendedor en tienda, quiero poder registrar la solicitud de comprobante fiscal durante una venta POS, para que los clientes presenciales también puedan obtener su factura fiscal.

#### Criterios de Aceptación

1. THE Sistema_POS SHALL mostrar un toggle/checkbox con la etiqueta "Comprobante Fiscal" en el componente de pago
2. WHEN el vendedor activa el toggle de comprobante fiscal, THE Sistema_POS SHALL mostrar un selector de tipo de comprador y un campo de RNC condicional, con las mismas reglas de validación que el checkout online
3. WHEN el vendedor activa el comprobante fiscal, THE Sistema_POS SHALL mostrar el ITBIS (18%) calculado sobre el subtotal y actualizar el total de la venta
4. WHEN el vendedor confirma la venta con comprobante fiscal, THE Sistema_POS SHALL enviar los datos fiscales junto con los datos del pedido a la API_Pedidos

### Requisito 5: Aceptación de datos fiscales en la API de pedidos

**Historia de Usuario:** Como sistema, quiero que los endpoints de creación de pedidos acepten datos fiscales, para que la información de facturación se persista correctamente.

#### Criterios de Aceptación

1. WHEN se recibe una solicitud de creación de pedido con `wants_fiscal_invoice=true`, THE API_Pedidos SHALL validar que `fiscal_customer_type` sea uno de los valores permitidos (`persona_juridica`, `persona_fisica`, `consumidor_final`)
2. WHEN `fiscal_customer_type` es `persona_juridica` o `persona_fisica`, THE API_Pedidos SHALL validar que `fiscal_customer_rnc` sea un RNC válido de 9 u 11 dígitos
3. WHEN `fiscal_customer_type` es `consumidor_final`, THE API_Pedidos SHALL aceptar el pedido sin requerir RNC
4. WHEN los datos fiscales son válidos, THE API_Pedidos SHALL almacenar `wants_fiscal_invoice`, `fiscal_customer_type` y `fiscal_customer_rnc` en el registro del pedido
5. WHEN se recibe una solicitud sin datos fiscales o con `wants_fiscal_invoice=false`, THE API_Pedidos SHALL crear el pedido normalmente sin campos fiscales

### Requisito 6: Generación automática de comprobante fiscal tras creación de pedido

**Historia de Usuario:** Como cliente, quiero que mi comprobante fiscal se genere automáticamente después de crear mi pedido, para que no tenga que solicitarlo por separado.

#### Criterios de Aceptación

1. WHEN un pedido se crea con `wants_fiscal_invoice=true` y los datos fiscales son válidos, THE API_Pedidos SHALL invocar al Servicio_Fiscal para generar el e-CF automáticamente
2. WHEN el Servicio_Fiscal genera el e-CF exitosamente, THE API_Pedidos SHALL actualizar el campo `fiscal_invoice_id` del pedido con el ID de la factura fiscal creada
3. IF el Servicio_Fiscal falla al generar el e-CF, THEN THE API_Pedidos SHALL registrar el error en los logs y completar la creación del pedido sin bloquear la transacción
4. WHEN se genera el e-CF automáticamente, THE API_Pedidos SHALL utilizar el tipo de comprobante `31` (Factura de Crédito Fiscal) para `persona_juridica` y `persona_fisica`, y `32` (Factura de Consumo) para `consumidor_final`
5. WHEN se genera el e-CF, THE API_Pedidos SHALL calcular el ITBIS usando la función `calcularITBIS` existente del Servicio_Fiscal

### Requisito 7: Validación de RNC reutilizando validadores existentes

**Historia de Usuario:** Como desarrollador, quiero reutilizar la función `validarRNC` existente en el backend, para que la validación sea consistente entre el módulo fiscal y la integración de checkout.

#### Criterios de Aceptación

1. THE API_Pedidos SHALL utilizar la función `validarRNC` de `backend/src/fiscal/utils/validators.ts` para validar el RNC en los endpoints de creación de pedidos
2. THE Sistema_Checkout SHALL implementar la misma lógica de validación de RNC (9 u 11 dígitos numéricos) en el frontend para retroalimentación inmediata al usuario
