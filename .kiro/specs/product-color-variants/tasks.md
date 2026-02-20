# Tareas de Implementación: Variantes de Color para Productos

## Tarea 1: Funciones utilitarias de color y tipos
- [x] 1.1 Extender el tipo `Product.variant_type` en `src/types/skating-store.ts` para incluir `'color'`: `'none' | 'size' | 'measurement' | 'color'`
- [x] 1.2 Crear `src/lib/skating-store/color-utils.ts` con la interfaz `ColorOption` y las funciones `parseColorOption`, `formatColorOption`, `isValidHex`, `parseColorOptions`, `getColorHex`
- [x] 1.3 Crear tests de propiedades en `src/__tests__/color-variants/color-utils.property.test.ts` para Propiedad 1 (round-trip formato/parseo) y Propiedad 2 (validación hex)

## Tarea 2: Componente ColorVariantEditor para el panel admin
- [x] 2.1 Crear `src/components/admin/ColorVariantEditor.tsx` con campos para nombre, hex (con color picker nativo), vista previa visual, precio por color, y botones agregar/eliminar
- [x] 2.2 Modificar `src/components/admin/ProductForm.tsx`: agregar `"color"` al enum zod de `variant_type`, renderizar `ColorVariantEditor` cuando `variant_type === 'color'`, convertir entre `ColorOption[]` y `variant_options`/`variant_prices` al guardar y cargar

## Tarea 3: Componentes de tienda (ColorPicker y ColorDots)
- [x] 3.1 Crear `src/components/skating-store/products/ColorPicker.tsx` con círculos de color seleccionables, borde de selección, y nombre del color seleccionado
- [x] 3.2 Crear `src/components/skating-store/products/ColorDots.tsx` con mini-círculos de color y truncamiento "+N" cuando hay más de `maxVisible` colores
- [x] 3.3 Modificar `src/components/skating-store/products/ProductActions.tsx`: renderizar `ColorPicker` cuando `variant_type === 'color'`, actualizar precio al seleccionar color, validar selección antes de agregar al carrito
- [x] 3.4 Modificar `src/components/skating-store/products/ProductCard.tsx`: renderizar `ColorDots` cuando `variant_type === 'color'`

## Tarea 4: Integración con carrito y visualización de color en ítems
- [x] 4.1 Modificar `src/components/skating-store/cart/CartItem.tsx`: cuando `variant_type === 'color'`, mostrar círculo pequeño con el hex del color junto al nombre de la variante usando `getColorHex`
- [x] 4.2 Verificar que `SkatingCartContext` ya resuelve correctamente el precio desde `variant_prices` para variantes de color (el código existente ya lo hace genéricamente)

## Tarea 5: Backend - validación y migración
- [x] 5.1 Crear migración `backend/src/db/migrations/007_color_variant_type.sql` documentando el nuevo valor `'color'` para `variant_type`
- [x] 5.2 Agregar validación en `backend/src/routes/products.ts` en POST y PUT: cuando `variant_type === 'color'`, validar que cada elemento de `variant_options` tenga formato `"Nombre:#HexCode"` con hex válido y nombre no vacío

## Tarea 6: Integración con pedidos y facturación
- [x] 6.1 Verificar que el flujo de pedidos en `backend/src/routes/orders.ts` ya propaga `selectedVariant` correctamente (el nombre del color se almacena como string simple)
- [x] 6.2 Modificar la visualización de detalle de pedido para mostrar el nombre del color cuando el ítem tiene variante de color
- [x] 6.3 Modificar `src/components/admin/InvoicePreview.tsx` para incluir el nombre del color en la descripción del ítem facturado cuando aplique

## Tarea 7: Tests de propiedades adicionales
- [x] 7.1 Crear tests de propiedades en `src/__tests__/color-variants/price-resolution.property.test.ts` para Propiedad 5 (resolución de precio) y Propiedad 6 (rango de precios)
- [x] 7.2 Crear tests de propiedades en `src/__tests__/color-variants/color-dots.property.test.ts` para Propiedad 9 (truncamiento de ColorDots)
