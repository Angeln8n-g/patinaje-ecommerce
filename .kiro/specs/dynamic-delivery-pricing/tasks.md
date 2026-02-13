# Plan de Implementación: Tarificación Dinámica de Envío por Distancia

## Resumen

Implementación incremental del sistema de tarificación dinámica de envío. Se comienza con los tipos e interfaces, luego la lógica pura de cálculo con sus tests, después las server actions con persistencia, y finalmente los componentes de UI (admin y checkout).

## Tareas

- [x] 1. Definir tipos e interfaces de configuración de envío
  - Agregar `ShippingConfig`, `ShippingZoneType` y `ShippingCostResult` en `src/types/skating-store.ts`
  - _Requisitos: 3.1, 3.2, 3.3, 4.1_

- [x] 2. Implementar funciones puras de cálculo y validación
  - [x] 2.1 Implementar `validateShippingConfig` en `src/lib/skating-store/geo-utils.ts`
    - Validar que ningún valor numérico sea negativo
    - Validar que `max_distance_km > base_radius_km`
    - Retornar `{ valid: true }` o `{ valid: false, error: string }`
    - _Requisitos: 4.4, 4.5_

  - [x] 2.2 Implementar `computeShippingCost` en `src/lib/skating-store/geo-utils.ts`
    - Clasificar zona según distancia vs radio base vs distancia máxima
    - Calcular kilómetros excedentes redondeados a 2 decimales
    - Calcular costo total según fórmula: tarifa_base + (km_excedentes × costo_km_adicional)
    - Retornar `ShippingCostResult` completo
    - _Requisitos: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x]* 2.3 Escribir property tests para `computeShippingCost` y `validateShippingConfig`
    - **Propiedad 1: Clasificación correcta de zona por distancia**
    - **Valida: Requisitos 2.1, 2.2, 2.3**
    - **Propiedad 2: Fórmula de precio fuera de zona**
    - **Valida: Requisitos 3.1, 3.2, 3.3**
    - **Propiedad 3: Invariantes del cálculo de envío**
    - **Valida: Requisitos 3.4, 3.5**
    - **Propiedad 4: Validación rechaza configuraciones inválidas**
    - **Valida: Requisitos 4.4, 4.5**
    - **Propiedad 6: Bloqueo cuando envíos fuera de zona están deshabilitados**
    - **Valida: Requisitos 5.3**

  - [x]* 2.4 Escribir unit tests para casos borde de `computeShippingCost`
    - Distancia = 0 (cliente en la tienda)
    - Distancia exactamente igual al radio base
    - Distancia exactamente igual a la distancia máxima
    - _Requisitos: 2.1, 2.2, 2.3, 3.1_

- [x] 3. Checkpoint - Verificar que todos los tests pasan
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 4. Implementar server actions de configuración de envío
  - [x] 4.1 Crear `src/lib/skating-store/shipping-actions.ts` con `getShippingConfig` y `saveShippingConfig`
    - `getShippingConfig`: leer de `static_content` con slug `shipping-config`
    - `saveShippingConfig`: validar con `validateShippingConfig`, luego guardar vía API
    - Seguir el mismo patrón que `getStoreLocation`/`saveStoreLocation` en `zone-actions.ts`
    - _Requisitos: 4.2, 4.3, 4.6_

  - [x] 4.2 Implementar `calculateShippingCost` server action en `shipping-actions.ts`
    - Obtener ubicación de tienda con `getStoreLocation`
    - Obtener configuración con `getShippingConfig`
    - Calcular distancia con `haversineDistance`
    - Delegar a `computeShippingCost` para el cálculo
    - Manejar errores (tienda sin ubicación, config no existe, coordenadas inválidas)
    - _Requisitos: 1.1, 1.2, 1.3_

  - [ ]* 4.3 Escribir property test para round-trip de configuración
    - **Propiedad 5: Round-trip de configuración de envío**
    - **Valida: Requisitos 4.2, 4.6**
    - Usar mock de Supabase API

- [x] 5. Implementar componente admin de configuración de precios
  - [x] 5.1 Crear componente `DeliveryPricingConfig` en `src/components/admin/DeliveryPricingConfig.tsx`
    - Formulario con campos: radio base (km), tarifa base ($), costo por km adicional ($), distancia máxima (km)
    - Toggle para habilitar/deshabilitar envíos fuera de zona
    - Validación client-side antes de enviar
    - Llamar a `saveShippingConfig` al guardar
    - Cargar valores actuales con `getShippingConfig` al montar
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.2 Agregar visualización de radios en el mapa del componente admin
    - Renderizar círculo verde para radio base centrado en ubicación de tienda
    - Renderizar círculo naranja para distancia máxima centrado en ubicación de tienda
    - Actualizar círculos en tiempo real al cambiar valores del formulario
    - Usar `react-leaflet` Circle component
    - _Requisitos: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.3 Integrar `DeliveryPricingConfig` en la página `/admin/delivery-zones`
    - Agregar el componente con dynamic import (SSR deshabilitado, igual que los existentes)
    - _Requisitos: 4.1_

- [x] 6. Implementar desglose de envío en el checkout
  - [x] 6.1 Crear componente `ShippingBreakdown` en `src/components/skating-store/checkout/ShippingBreakdown.tsx`
    - Mostrar desglose para "dentro de zona": distancia y tarifa base
    - Mostrar desglose para "fuera de zona": distancia, radio base, km excedentes, tarifa base, recargo, total
    - Mostrar mensaje de bloqueo para "fuera de alcance" con distancia máxima
    - Mostrar mensaje de bloqueo cuando envíos fuera de zona están deshabilitados
    - Formatear moneda local y distancias con 2 decimales
    - _Requisitos: 5.1, 5.2, 5.3, 6.1, 6.2, 6.4_

  - [x] 6.2 Integrar cálculo de envío en `CheckoutForm`
    - Llamar a `calculateShippingCost` cuando se obtienen coordenadas del cliente
    - Recalcular cuando cambia la dirección/coordenadas
    - Mostrar `ShippingBreakdown` con el resultado
    - Bloquear submit si zona es "out_of_range" o si out_of_zone_enabled es false y está fuera del radio
    - Pasar costo de envío al handler de checkout
    - _Requisitos: 1.1, 5.1, 5.3, 6.3_

- [x] 7. Checkpoint final - Verificar integración completa
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los property tests validan propiedades universales de correctitud
- Los unit tests validan ejemplos específicos y casos borde
