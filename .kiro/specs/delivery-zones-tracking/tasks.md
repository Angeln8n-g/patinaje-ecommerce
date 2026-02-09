# Plan de Implementación: Zonas de Entrega y Rastreo en Tiempo Real

## Resumen

Implementación incremental del sistema de zonas de entrega configurables, rastreo en tiempo real de repartidores y estimación de tiempo de entrega. Se construye desde los modelos de datos y funciones puras hasta los componentes de UI, integrando cada pieza progresivamente.

## Tareas

- [x] 1. Crear modelos de datos y migración de base de datos
  - [x] 1.1 Crear migración SQL para la tabla `delivery_zones` (id, name, polygon JSONB, is_active, created_at, updated_at) con políticas RLS para admin
    - _Requisitos: 2.2_
  - [x] 1.2 Crear migración SQL para la tabla `delivery_locations` (id, delivery_man_id UNIQUE, lat, lng, updated_at) con políticas RLS para admin y delivery
    - _Requisitos: 6.1_
  - [x] 1.3 Agregar interfaces TypeScript `DeliveryZone`, `DeliveryLocation` y `StoreLocation` en `src/types/skating-store.ts`
    - _Requisitos: 2.2, 6.1, 1.2_

- [ ] 2. Implementar funciones utilitarias puras (geometría y cálculos)
  - [x] 2.1 Crear `src/lib/skating-store/geo-utils.ts` con las funciones `isPointInPolygon`, `haversineDistance`, `calculateEstimatedTime`, `formatEstimatedTime` y `validateCoordinates`
    - Extraer `haversineDistance` existente de `delivery-actions.ts` a este módulo compartido
    - _Requisitos: 1.4, 3.1, 5.1, 7.1, 7.3_
  - [ ]* 2.2 Escribir property test para `isPointInPolygon`
    - **Propiedad 5: Correctitud de point-in-polygon**
    - **Valida: Requisitos 3.1, 3.2, 3.3**
  - [ ]* 2.3 Escribir property test para `haversineDistance`
    - **Propiedad 6: Propiedades de distancia Haversine (simetría, identidad, no negatividad)**
    - **Valida: Requisitos 5.1**
  - [ ]* 2.4 Escribir property test para `calculateEstimatedTime`
    - **Propiedad 9: Límites del cálculo de ETA**
    - **Valida: Requisitos 7.1**
  - [ ]* 2.5 Escribir property test para `formatEstimatedTime`
    - **Propiedad 10: Formato de ETA contiene valores de tiempo**
    - **Valida: Requisitos 7.3**
  - [ ]* 2.6 Escribir property test para `validateCoordinates`
    - **Propiedad 2: Validación de coordenadas rechaza rangos inválidos**
    - **Valida: Requisitos 1.4**

- [x] 3. Checkpoint - Verificar que todos los tests pasan
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [ ] 4. Implementar server actions para zonas de entrega y ubicaciones
  - [x] 4.1 Crear server actions en `src/lib/skating-store/zone-actions.ts`: `getStoreLocation`, `saveStoreLocation`, `getDeliveryZones`, `createDeliveryZone`, `updateDeliveryZone`, `deleteDeliveryZone`, `toggleDeliveryZone`, `validateDeliveryZone`
    - _Requisitos: 1.2, 2.2, 2.3, 2.4, 2.6, 3.1_
  - [x] 4.2 Crear server actions en `src/lib/skating-store/delivery-actions.ts` (extender archivo existente): `updateDeliveryManLocation`, `getDeliveryMenLocations`, `getNearestDeliveryMen`
    - Refactorizar para usar `haversineDistance` desde `geo-utils.ts`
    - _Requisitos: 4.1, 5.1, 5.2, 6.1, 6.2_
  - [ ]* 4.3 Escribir property test para ordenamiento de repartidores por distancia
    - **Propiedad 7: Ordenamiento de repartidores por distancia**
    - **Valida: Requisitos 5.2**

- [x] 5. Implementar UI de configuración de tienda y zonas en admin
  - [x] 5.1 Crear componente `src/components/admin/StoreLocationConfig.tsx` con formulario y mapa para configurar ubicación de la tienda
    - _Requisitos: 1.1, 1.2, 1.3, 1.4_
  - [x] 5.2 Crear componente `src/components/admin/DeliveryZoneEditor.tsx` con mapa interactivo para crear, editar, activar/desactivar y eliminar zonas de entrega
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 5.3 Crear página admin `src/app/admin/delivery-zones/page.tsx` que integre `StoreLocationConfig` y `DeliveryZoneEditor`
    - _Requisitos: 1.1, 2.1_

- [x] 6. Integrar validación de zona en checkout
  - [x] 6.1 Modificar `src/components/skating-store/checkout/CheckoutForm.tsx` para agregar selección de ubicación en mapa y validación de zona de entrega antes de permitir el submit
    - _Requisitos: 3.1, 3.2, 3.3_

- [x] 7. Implementar rastreo de ubicación de repartidores
  - [x] 7.1 Modificar `src/app/delivery/page.tsx` para enviar ubicación GPS cada 15 segundos a `delivery_locations` (independiente de envíos activos) y mostrar aviso si geolocalización está denegada
    - _Requisitos: 4.1, 4.4, 6.1_
  - [x] 7.2 Extender `src/components/admin/DeliveryMap.tsx` para mostrar posiciones de repartidores desde `delivery_locations`, zonas de entrega como polígonos, y ubicación de la tienda como marcador diferenciado
    - _Requisitos: 4.2, 4.3, 8.1, 8.2, 8.3_

- [x] 8. Implementar asignación por cercanía en admin
  - [x] 8.1 Modificar la página de asignación de pedidos en admin para mostrar repartidores ordenados por distancia a la tienda con la distancia en km visible, y aviso cuando no hay repartidores con ubicación conocida
    - _Requisitos: 5.1, 5.2, 5.3, 5.4_

- [x] 9. Implementar estimación de tiempo de entrega en tracking
  - [x] 9.1 Modificar `src/app/skating-store/tracking/[id]/page.tsx` para mostrar tiempo estimado de entrega calculado y actualizado en tiempo real, con mensaje apropiado cuando no hay repartidor asignado
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Checkpoint final - Verificar integración completa
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los property tests validan propiedades universales de correctitud
- Los unit tests validan ejemplos específicos y edge cases
- Se usa `fast-check` como librería de property-based testing
