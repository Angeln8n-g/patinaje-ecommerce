# Documento de Requisitos: Módulo de Facturación Fiscal (e-CF DGII)

## Introducción

Este documento define los requisitos para un módulo de facturación fiscal electrónica integrado al sistema de e-commerce de la tienda de skating. El módulo permitirá emitir, gestionar y reportar Comprobantes Fiscales Electrónicos (e-CF) conforme a las normativas de la Dirección General de Impuestos Internos (DGII) de la República Dominicana. El módulo se implementará como un componente separado dentro de la arquitectura existente (Next.js + Express + Supabase/PostgreSQL).

## Glosario

- **e-CF**: Comprobante Fiscal Electrónico, documento digital que respalda transacciones comerciales según la DGII.
- **DGII**: Dirección General de Impuestos Internos, entidad reguladora fiscal de la República Dominicana.
- **NCF**: Número de Comprobante Fiscal, secuencia numérica asignada por la DGII para identificar comprobantes.
- **RNC**: Registro Nacional del Contribuyente, identificador fiscal de personas jurídicas.
- **Cédula**: Documento de identidad de personas físicas en República Dominicana.
- **TrackID**: Identificador de seguimiento devuelto por el Web Service de la DGII al enviar un e-CF.
- **Certificado_Digital**: Certificado para procesos tributarios emitido por una entidad autorizada por INDOTEL, utilizado para firmar digitalmente los e-CF.
- **XML_eCF**: Documento XML que contiene la estructura del comprobante fiscal electrónico según el esquema definido por la DGII.
- **Representación_Impresa**: Documento PDF generado a partir de un e-CF que incluye código QR para validación manual.
- **ITBIS**: Impuesto a la Transferencia de Bienes Industrializados y Servicios (impuesto al valor agregado dominicano, 18%).
- **Módulo_Fiscal**: El módulo de facturación fiscal electrónica descrito en este documento.
- **Acuse_de_Recibo**: Confirmación electrónica de que un e-CF fue recibido por el comprador.
- **Aprobación_Comercial**: Confirmación del comprador de que acepta el contenido comercial del e-CF.
- **Secuencia_Fiscal**: Rango de números autorizados por la DGII para emitir comprobantes de un tipo específico.

## Requisitos

### Requisito 1: Generación de Comprobantes Fiscales Electrónicos (e-CF)

**Historia de Usuario:** Como administrador o vendedor, quiero generar comprobantes fiscales electrónicos a partir de las órdenes del sistema, para cumplir con las obligaciones tributarias de la DGII.

#### Criterios de Aceptación

1. CUANDO una orden es completada y se solicita facturación fiscal, EL Módulo_Fiscal DEBERÁ generar un XML_eCF válido conforme al esquema XSD de la DGII.
2. CUANDO se genera un e-CF, EL Módulo_Fiscal DEBERÁ asignar automáticamente el siguiente NCF disponible de la Secuencia_Fiscal autorizada para el tipo de comprobante correspondiente.
3. CUANDO se genera un e-CF, EL Módulo_Fiscal DEBERÁ calcular el ITBIS (18%) sobre los montos gravados y reflejar correctamente los subtotales, impuestos y total en el XML_eCF.
4. CUANDO se genera un e-CF para una persona jurídica, EL Módulo_Fiscal DEBERÁ incluir el RNC del comprador en el documento.
5. CUANDO se genera un e-CF para un consumidor final, EL Módulo_Fiscal DEBERÁ utilizar el tipo de comprobante de consumo sin requerir RNC.
6. SI el esquema XSD de la DGII cambia, ENTONCES EL Módulo_Fiscal DEBERÁ validar el XML_eCF contra el esquema vigente antes de proceder al envío.

### Requisito 2: Firma Digital de Comprobantes

**Historia de Usuario:** Como administrador, quiero que los comprobantes fiscales sean firmados digitalmente, para garantizar la autenticidad e integridad de los documentos ante la DGII.

#### Criterios de Aceptación

1. CUANDO un XML_eCF es generado, EL Módulo_Fiscal DEBERÁ firmarlo digitalmente utilizando el Certificado_Digital configurado en el sistema.
2. CUANDO se firma un XML_eCF, EL Módulo_Fiscal DEBERÁ aplicar el estándar XML Signature (XMLDSig) según las especificaciones de la DGII.
3. SI el Certificado_Digital está expirado o no es válido, ENTONCES EL Módulo_Fiscal DEBERÁ rechazar la operación de firma y notificar al administrador con un mensaje descriptivo del error.
4. CUANDO se almacena el Certificado_Digital, EL Módulo_Fiscal DEBERÁ cifrar las credenciales del certificado en reposo utilizando un mecanismo de cifrado seguro.

### Requisito 3: Envío de e-CF al Web Service de la DGII

**Historia de Usuario:** Como administrador, quiero que los comprobantes fiscales se envíen automáticamente al Web Service de la DGII, para mantener la sincronización con el sistema tributario.

#### Criterios de Aceptación

1. CUANDO un XML_eCF está firmado y validado, EL Módulo_Fiscal DEBERÁ enviarlo al Web Service de la DGII y registrar el TrackID devuelto.
2. CUANDO la DGII responde con un estado (Aceptado, Rechazado, Aceptado Condicional, En Proceso), EL Módulo_Fiscal DEBERÁ actualizar el estado del e-CF en la base de datos con el estado correspondiente.
3. SI el Web Service de la DGII no está disponible, ENTONCES EL Módulo_Fiscal DEBERÁ encolar el e-CF para reintento automático con un máximo de 5 intentos con espera exponencial.
4. SI un e-CF es rechazado por la DGII, ENTONCES EL Módulo_Fiscal DEBERÁ registrar el motivo del rechazo y permitir al administrador corregir y reenviar el comprobante.
5. CUANDO se envía un e-CF, EL Módulo_Fiscal DEBERÁ registrar en un log de auditoría la fecha, hora, TrackID y resultado de cada intento de envío.

### Requisito 4: Gestión de Secuencias Fiscales (NCF)

**Historia de Usuario:** Como administrador, quiero gestionar las secuencias de números de comprobantes fiscales autorizados, para controlar la emisión y evitar el agotamiento de secuencias.

#### Criterios de Aceptación

1. EL Módulo_Fiscal DEBERÁ mantener un registro de las secuencias fiscales autorizadas, incluyendo tipo de comprobante, rango inicial, rango final, número actual y fecha de vencimiento.
2. CUANDO se asigna un NCF, EL Módulo_Fiscal DEBERÁ garantizar que el número sea único y secuencial dentro de su tipo de comprobante.
3. CUANDO una Secuencia_Fiscal alcanza el 80% de uso, EL Módulo_Fiscal DEBERÁ generar una alerta al administrador indicando el porcentaje de uso y la cantidad restante.
4. SI una Secuencia_Fiscal está agotada o vencida, ENTONCES EL Módulo_Fiscal DEBERÁ impedir la emisión de nuevos comprobantes de ese tipo y notificar al administrador.

### Requisito 5: Generación de Representación Impresa (PDF con QR)

**Historia de Usuario:** Como vendedor, quiero generar una versión imprimible del comprobante fiscal con código QR, para entregar al cliente una copia física verificable.

#### Criterios de Aceptación

1. CUANDO se solicita la representación impresa de un e-CF, EL Módulo_Fiscal DEBERÁ generar un documento PDF que contenga todos los datos fiscales requeridos por la DGII.
2. CUANDO se genera la Representación_Impresa, EL Módulo_Fiscal DEBERÁ incluir un código QR que contenga la URL de validación de la DGII con los parámetros del comprobante.
3. CUANDO se genera la Representación_Impresa, EL Módulo_Fiscal DEBERÁ incluir: NCF, RNC del emisor, nombre del emisor, fecha de emisión, detalle de ítems, subtotal, ITBIS, total y datos del comprador.

### Requisito 6: Gestión de Acuse de Recibo y Aprobación Comercial

**Historia de Usuario:** Como administrador, quiero gestionar los acuses de recibo y aprobaciones comerciales de los e-CF, para cumplir con el flujo completo de facturación electrónica de la DGII.

#### Criterios de Aceptación

1. CUANDO se recibe un Acuse_de_Recibo de un comprador, EL Módulo_Fiscal DEBERÁ registrar la fecha y el estado del acuse asociado al e-CF correspondiente.
2. CUANDO se recibe una Aprobación_Comercial de un comprador, EL Módulo_Fiscal DEBERÁ actualizar el estado del e-CF para reflejar la aprobación.
3. CUANDO un e-CF no recibe Acuse_de_Recibo dentro de los 10 días calendario, EL Módulo_Fiscal DEBERÁ marcar el comprobante como pendiente de acuse y generar una alerta al administrador.

### Requisito 7: Anulación de Comprobantes Fiscales

**Historia de Usuario:** Como administrador, quiero poder anular comprobantes fiscales emitidos, para corregir errores o cancelar transacciones conforme a las reglas de la DGII.

#### Criterios de Aceptación

1. CUANDO un administrador solicita anular un e-CF, EL Módulo_Fiscal DEBERÁ generar un XML de anulación y enviarlo al Web Service de la DGII.
2. CUANDO la DGII confirma la anulación, EL Módulo_Fiscal DEBERÁ actualizar el estado del e-CF a "Anulado" en la base de datos.
3. SI un e-CF ya fue anulado previamente, ENTONCES EL Módulo_Fiscal DEBERÁ rechazar la solicitud de anulación duplicada e informar al usuario.
4. CUANDO se anula un e-CF, EL Módulo_Fiscal DEBERÁ registrar en el log de auditoría el motivo de la anulación, el usuario que la solicitó y la fecha.

### Requisito 8: Almacenamiento Seguro de Datos Fiscales

**Historia de Usuario:** Como administrador, quiero que los datos fiscales y certificados digitales se almacenen de forma segura, para cumplir con los requisitos de conservación de la DGII.

#### Criterios de Aceptación

1. EL Módulo_Fiscal DEBERÁ almacenar cada e-CF (XML original y firmado) en la base de datos con referencia a la orden asociada.
2. EL Módulo_Fiscal DEBERÁ conservar los e-CF y sus datos asociados por un mínimo de 10 años conforme a la normativa fiscal.
3. CUANDO se almacena un Certificado_Digital, EL Módulo_Fiscal DEBERÁ cifrar la clave privada utilizando cifrado AES-256 antes de persistirla.
4. EL Módulo_Fiscal DEBERÁ restringir el acceso a los datos fiscales y certificados digitales exclusivamente a usuarios con rol de administrador.

### Requisito 9: Serialización y Deserialización de XML Fiscal

**Historia de Usuario:** Como desarrollador, quiero que el sistema serialice y deserialice correctamente los documentos XML fiscales, para garantizar la integridad de los datos en el intercambio con la DGII.

#### Criterios de Aceptación

1. CUANDO se genera un e-CF, EL Módulo_Fiscal DEBERÁ serializar el objeto de comprobante fiscal a formato XML conforme al esquema XSD de la DGII.
2. CUANDO se recibe una respuesta XML de la DGII, EL Módulo_Fiscal DEBERÁ deserializar el XML a un objeto estructurado para su procesamiento.
3. PARA TODO objeto de comprobante fiscal válido, serializar a XML y luego deserializar DEBERÁ producir un objeto equivalente al original (propiedad de ida y vuelta).
4. EL Módulo_Fiscal DEBERÁ formatear (pretty-print) los documentos XML generados para facilitar la inspección y depuración.

### Requisito 10: Panel de Administración Fiscal

**Historia de Usuario:** Como administrador, quiero un panel dedicado para gestionar la facturación fiscal, para tener visibilidad y control sobre todos los comprobantes emitidos.

#### Criterios de Aceptación

1. CUANDO un administrador accede al panel fiscal, EL Módulo_Fiscal DEBERÁ mostrar un listado de todos los e-CF emitidos con su estado actual (Aceptado, Rechazado, En Proceso, Anulado, Pendiente).
2. CUANDO un administrador filtra los e-CF por rango de fechas, estado o tipo de comprobante, EL Módulo_Fiscal DEBERÁ retornar únicamente los comprobantes que coincidan con todos los filtros aplicados.
3. CUANDO un administrador selecciona un e-CF del listado, EL Módulo_Fiscal DEBERÁ mostrar el detalle completo incluyendo datos fiscales, estado DGII, historial de envíos y acciones disponibles.
4. CUANDO un administrador accede al panel fiscal, EL Módulo_Fiscal DEBERÁ mostrar un resumen con la cantidad de comprobantes por estado y el uso actual de las secuencias fiscales.

### Requisito 11: Configuración del Módulo Fiscal

**Historia de Usuario:** Como administrador, quiero configurar los datos fiscales del emisor y los parámetros de conexión con la DGII, para que el módulo funcione correctamente con las credenciales de la empresa.

#### Criterios de Aceptación

1. EL Módulo_Fiscal DEBERÁ permitir configurar los datos del emisor: RNC, razón social, nombre comercial, dirección fiscal, teléfono y correo electrónico.
2. EL Módulo_Fiscal DEBERÁ permitir configurar la URL del Web Service de la DGII (ambiente de pruebas y producción).
3. EL Módulo_Fiscal DEBERÁ permitir cargar y gestionar el Certificado_Digital (archivo .p12 y contraseña).
4. CUANDO se guardan los datos de configuración, EL Módulo_Fiscal DEBERÁ validar que el RNC tenga un formato válido (9 u 11 dígitos) antes de persistir los cambios.
5. CUANDO se carga un Certificado_Digital, EL Módulo_Fiscal DEBERÁ verificar que el certificado sea válido y no esté expirado antes de aceptarlo.
6. CUANDO se modifican los datos de configuración del emisor (RNC, razón social, certificado, etc.), EL Módulo_Fiscal DEBERÁ registrar un snapshot de la configuración anterior en un historial de cambios, incluyendo la fecha, el usuario que realizó el cambio y los campos modificados.
7. EL Módulo_Fiscal DEBERÁ permitir consultar el historial de cambios de configuración del emisor, mostrando cada versión anterior con fecha y usuario responsable del cambio.
