# Plan de Implementación: Banners por Categoría

## Visión General

Implementación incremental que comienza con la migración de base de datos, luego extiende el backend, y finalmente actualiza el frontend (admin y storefront). Cada paso construye sobre el anterior.

## Tareas

- [x] 1. Crear migración SQL y modelo de datos
  - [x] 1.1 Crear archivo de migración `backend/src/db/migrations/003_banner_categories.sql`
    - Crear tabla `banner_categories` con columnas `id`, `banner_id`, `category_id`, `created_at`
    - Agregar claves foráneas con `ON DELETE CASCADE` a `banners` y `categories`
    - Agregar restricción UNIQUE en `(banner_id, category_id)`
    - Agregar índices en `banner_id` y `category_id`
    - Actualizar `backend/src/db/schema.sql` con la nueva tabla
    - _Requisitos: 2.1, 2.2, 2.3_

- [x] 2. Extender el backend - Rutas de banners
  - [x] 2.1 Modificar GET `/api/content/banners` para soportar filtro por categoría
    - Agregar soporte para query param `category` (slug)
    - Si `category` está presente, hacer JOIN con `banner_categories` y `categories` para filtrar
    - Mantener comportamiento actual cuando no se pasa `category`
    - Para el listado del admin (sin `active=true`), incluir las categorías asociadas en la respuesta usando LEFT JOIN y json_agg
    - _Requisitos: 2.4, 3.1, 3.2, 5.1, 5.2, 5.3, 6.1_

  - [x] 2.2 Modificar POST `/api/content/banners` para aceptar `category_ids`
    - Aceptar campo opcional `category_ids: string[]` en el body
    - Usar transacción: insertar banner, luego insertar filas en `banner_categories`
    - Si `category_ids` está vacío o ausente, solo crear el banner sin relaciones
    - _Requisitos: 1.3, 1.4_

  - [x] 2.3 Modificar PUT `/api/content/banners/:id` para actualizar categorías
    - Aceptar campo opcional `category_ids: string[]` en el body
    - Si `category_ids` está presente, eliminar relaciones existentes e insertar las nuevas (replace strategy) dentro de una transacción
    - _Requisitos: 1.4_

  - [ ]* 2.4 Escribir tests de propiedad para las rutas de banners
    - **Propiedad 1: Round-trip de asociación banner-categoría**
    - **Valida: Requisitos 1.4, 2.4, 5.1**

  - [ ]* 2.5 Escribir tests de propiedad para eliminación en cascada
    - **Propiedad 2: Eliminación en cascada de banner**
    - **Valida: Requisitos 2.2**

  - [ ]* 2.6 Escribir tests de propiedad para eliminación en cascada de categoría
    - **Propiedad 3: Eliminación en cascada de categoría**
    - **Valida: Requisitos 2.3**

  - [ ]* 2.7 Escribir tests de propiedad para el carrusel principal
    - **Propiedad 4: Carrusel principal muestra todos los banners activos ordenados**
    - **Valida: Requisitos 3.1, 3.2, 5.3**

- [x] 3. Checkpoint - Verificar backend
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 4. Actualizar tipos e interfaces del frontend
  - [x] 4.1 Extender la interfaz `Banner` en `src/types/skating-store.ts`
    - Agregar campos opcionales `category_ids?: string[]` y `categories?: Category[]`
    - _Requisitos: 1.4, 6.1_

  - [x] 4.2 Agregar función `getBannersByCategory` en `src/lib/skating-store/content-queries.ts`
    - Crear función que consulte `/api/content/banners?category=<slug>&active=true`
    - _Requisitos: 5.1_

  - [x] 4.3 Actualizar funciones en `src/lib/skating-store/content-actions.ts`
    - Modificar `createBanner` y `updateBanner` para incluir `category_ids` en el payload
    - Actualizar `getBanners` del admin para que retorne las categorías asociadas
    - _Requisitos: 1.3, 1.4_

- [x] 5. Actualizar el panel de administración de banners
  - [x] 5.1 Agregar selector de categorías al formulario de banner en `src/app/admin/banners/page.tsx`
    - Agregar campo `category_ids` al estado del formulario (`BannerForm`)
    - Renderizar checkboxes o multi-select con las categorías disponibles
    - Pre-popular las categorías seleccionadas al editar un banner existente
    - Enviar `category_ids` al crear/actualizar
    - _Requisitos: 1.1, 1.2, 1.3, 1.4_

  - [x] 5.2 Agregar columna de categorías a la tabla de banners del admin
    - Mostrar badges con los nombres de las categorías asociadas
    - Mostrar etiqueta "General" cuando un banner no tiene categorías
    - _Requisitos: 6.1, 6.2_

- [x] 6. Integrar banners en la página de categoría
  - [x] 6.1 Modificar `src/app/skating-store/catalogo/page.tsx` para mostrar banners por categoría
    - Cuando hay un filtro de categoría activo, consultar banners de esa categoría usando `getBannersByCategory`
    - Si hay banners, renderizar `PromoCarousel` encima de la grilla de productos
    - Si no hay banners, no mostrar el carrusel
    - _Requisitos: 4.1, 4.2, 4.3_

  - [ ]* 6.2 Escribir tests unitarios para la integración
    - Verificar que el carrusel no se renderiza cuando no hay banners para la categoría
    - Verificar que el carrusel se renderiza cuando hay banners asociados
    - _Requisitos: 4.1, 4.2_

- [x] 7. Checkpoint final - Verificar integración completa
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia requisitos específicos para trazabilidad.
- Los checkpoints aseguran validación incremental.
- Los tests de propiedades validan correctitud universal.
- Los tests unitarios validan ejemplos específicos y casos borde.
