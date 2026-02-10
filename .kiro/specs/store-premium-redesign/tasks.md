# Plan de Implementación: Rediseño Premium de la Tienda de Skating

## Visión General

Implementación incremental del rediseño visual, comenzando por los tokens de diseño centrales (globals.css), seguido de las clases utilitarias premium, y finalmente la actualización de cada componente individual. Cada paso construye sobre el anterior para mantener coherencia visual en todo momento.

## Tareas

- [x] 1. Actualizar tokens de diseño y clases utilitarias en globals.css
  - [x] 1.1 Reemplazar todas las variables CSS en `:root` con la nueva Paleta_Premium (--primary dorado, --background oscuro, --foreground crema, --card, --secondary, --muted, --accent, --border, --input, --ring, --radius y todas las variantes)
    - Actualizar cada variable según la tabla de valores del diseño
    - Actualizar las variables de sidebar coherentemente
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.6, 11.2_
  - [x] 1.2 Actualizar las variables CSS del modo oscuro (.dark) coherentemente con la paleta premium
    - Ajustar fondos más profundos y acentos dorados más brillantes
    - _Requisitos: 1.5_
  - [x] 1.3 Agregar clases utilitarias premium (glow-primary, vignette, transition-premium) en la capa @layer utilities
    - _Requisitos: 9.1, 9.4_
  - [x] 1.4 Verificar que las animaciones existentes (infinite-scroll, keyframes) se mantienen intactas
    - _Requisitos: 9.5_
  - [ ]* 1.5 Escribir test de propiedad para completitud de variables CSS
    - **Propiedad 3: Completitud de variables CSS**
    - **Valida: Requisitos 1.4, 1.5**
  - [ ]* 1.6 Escribir test de propiedad para ratio de contraste accesible
    - **Propiedad 2: Ratio de contraste accesible**
    - **Valida: Requisito 1.6**
  - [ ]* 1.7 Escribir test de propiedad para luminosidad card > background
    - **Propiedad 1: La tarjeta es más clara que el fondo**
    - **Valida: Requisito 1.3**

- [x] 2. Checkpoint - Verificar que los tokens base están correctos
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 3. Rediseñar componentes de layout (Navbar y Footer)
  - [x] 3.1 Actualizar Navbar.tsx con estilos premium
    - Aplicar fondo oscuro con backdrop-blur, actualizar colores de iconos, search input, barra superior, y estados hover al color primario dorado
    - Eliminar cualquier color hardcodeado legacy
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 3.2 Actualizar Footer.tsx con estilos premium
    - Aplicar fondo oscuro, texto claro, iconos sociales con hover dorado
    - _Requisitos: 4.1, 4.2, 4.3, 4.4_

- [x] 4. Rediseñar componentes de la página principal
  - [x] 4.1 Actualizar PromoCarousel.tsx con estilos premium
    - Reemplazar todos los #D7F000 por bg-primary/text-primary-foreground, aplicar glow-primary al CTA, actualizar indicadores y controles
    - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 4.2 Actualizar HeroSection.tsx con estilos premium
    - Aplicar fondo oscuro con gradiente spotlight, botones con paleta premium, efecto vignette
    - _Requisitos: 10.1, 10.2, 10.3, 10.4_
  - [x] 4.3 Actualizar CategoryShowcase.tsx con estilos premium
    - Aplicar fondos oscuros con bordes sutiles a círculos, hover dorado, texto claro
    - _Requisitos: 7.1, 7.2, 7.3, 7.4_
  - [x] 4.4 Actualizar FeaturedProducts.tsx con estilos premium
    - Reemplazar #D7F000 en badge countdown por bg-primary, texto claro
    - _Requisitos: 8.1, 8.2, 8.5_
  - [x] 4.5 Actualizar DeliveryPromoBanner.tsx con estilos premium
    - Aplicar fondo oscuro, badges con estilo premium, reemplazar colores hardcodeados
    - _Requisitos: 8.3, 8.4, 8.6_

- [x] 5. Rediseñar componentes de productos
  - [x] 5.1 Actualizar ProductCard.tsx con estilos premium
    - Aplicar fondo oscuro, bordes sutiles, sombra cálida en hover, precio dorado, botón favoritos con paleta premium, reemplazar bg-[#F8F9FA]
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  - [ ]* 5.2 Escribir test de propiedad para ausencia de colores legacy
    - **Propiedad 5: Ausencia de colores legacy hardcodeados**
    - **Valida: Requisitos 5.2, 5.3, 8.1, 11.1, 11.3**

- [x] 6. Actualizar layout principal y verificar coherencia
  - [x] 6.1 Actualizar skating-store/layout.tsx si es necesario para coherencia con fondo oscuro
    - Verificar que el contenedor principal hereda correctamente el fondo oscuro
    - _Requisitos: 11.1, 11.4_
  - [x] 6.2 Revisar CartDrawer.tsx y CartItem.tsx para coherencia con la paleta premium
    - Ajustar estilos si hay colores hardcodeados o inconsistencias
    - _Requisitos: 11.1, 11.3_

- [x] 7. Checkpoint final - Verificar coherencia visual completa
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los tests de propiedades validan propiedades universales de correctitud
- Los tests unitarios validan ejemplos específicos y casos borde
