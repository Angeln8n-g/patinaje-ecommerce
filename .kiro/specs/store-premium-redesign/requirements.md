# Documento de Requisitos: Rediseño Premium de la Tienda de Skating

## Introducción

Rediseño visual completo de la tienda e-commerce de skating (Next.js + Tailwind CSS + shadcn/ui) para transformar la estética actual (verde lima brillante, fondos blancos, estilo minimalista) en una experiencia premium, moderna y elegante. La nueva identidad visual se inspira en conceptos de lujo con iluminación cálida, tonos sofisticados, tipografía refinada y animaciones sutiles, adaptados al contexto deportivo/skating.

## Glosario

- **Sistema_de_Diseño**: Conjunto de variables CSS, tokens de color, tipografía y espaciado definidos en `globals.css` y `tailwind.config`
- **Paleta_Premium**: Nueva paleta de colores cálidos y sofisticados que reemplaza al verde lima (#10F400) actual
- **Navbar**: Componente de navegación superior fijo (`Navbar.tsx`)
- **Footer**: Componente de pie de página (`Footer.tsx`)
- **PromoCarousel**: Carrusel hero de banners promocionales en la página principal
- **ProductCard**: Tarjeta de presentación de producto individual
- **CategoryShowcase**: Sección de categorías con scroll infinito
- **FeaturedProducts**: Sección de productos destacados / Flash Sale
- **DeliveryPromoBanner**: Banner promocional de entrega
- **HeroSection**: Sección hero alternativa con CTA
- **Efecto_Iluminación**: Efectos visuales CSS que simulan iluminación cálida tipo spotlight (gradientes, sombras, glows)
- **Modo_Oscuro**: Variante de tema oscuro definida en la clase `.dark` de CSS

## Requisitos

### Requisito 1: Transformación de la Paleta de Colores

**Historia de Usuario:** Como visitante de la tienda, quiero ver una paleta de colores cálida y sofisticada, para que la tienda transmita una experiencia premium y moderna.

#### Criterios de Aceptación

1. THE Sistema_de_Diseño SHALL definir una nueva variable `--primary` con un tono dorado cálido (rango aproximado amber/gold) reemplazando el verde lima (#10F400)
2. THE Sistema_de_Diseño SHALL definir `--background` con un tono oscuro elegante para el tema principal, creando contraste con elementos claros
3. THE Sistema_de_Diseño SHALL definir `--card` con un tono ligeramente más claro que el fondo para crear profundidad visual entre capas
4. THE Sistema_de_Diseño SHALL mantener todas las variables CSS existentes (primary, secondary, muted, accent, destructive, border, input, ring, chart-1 a chart-5, sidebar-*) actualizadas coherentemente con la nueva paleta
5. THE Sistema_de_Diseño SHALL definir variables de Modo_Oscuro coherentes con la paleta premium
6. THE Sistema_de_Diseño SHALL mantener un ratio de contraste mínimo de 4.5:1 entre texto y fondo en todas las combinaciones de color

### Requisito 2: Actualización Tipográfica Premium

**Historia de Usuario:** Como visitante de la tienda, quiero ver una tipografía elegante y refinada, para que el texto refuerce la sensación de calidad y sofisticación.

#### Criterios de Aceptación

1. THE Sistema_de_Diseño SHALL conservar la fuente Archivo Black para encabezados con estilo italic uppercase
2. THE Sistema_de_Diseño SHALL aplicar un tracking más amplio (letter-spacing) en encabezados para un aspecto más lujoso
3. THE Sistema_de_Diseño SHALL definir tamaños de fuente consistentes que mantengan jerarquía visual clara entre h1, h2, h3 y texto de cuerpo
4. WHEN un encabezado se renderiza, THE Sistema_de_Diseño SHALL aplicar las propiedades font-archivo, italic, uppercase y tracking definidas en la capa base de CSS

### Requisito 3: Rediseño del Navbar

**Historia de Usuario:** Como usuario de la tienda, quiero un navbar con aspecto premium y sofisticado, para que la navegación se sienta elegante y profesional.

#### Criterios de Aceptación

1. THE Navbar SHALL utilizar un fondo oscuro con efecto de transparencia (backdrop-blur) que refuerce la estética premium
2. THE Navbar SHALL mostrar el logo y título de la tienda con la nueva paleta de colores premium
3. THE Navbar SHALL aplicar la Paleta_Premium a todos los iconos de navegación, estados hover y elementos interactivos
4. WHEN el usuario hace hover sobre un elemento de navegación, THE Navbar SHALL mostrar una transición suave de color hacia el tono primario dorado
5. THE Navbar SHALL mantener la barra superior de dirección con estilos coherentes con la nueva paleta oscura
6. THE Navbar SHALL mantener toda la funcionalidad existente (búsqueda, carrito, perfil, menú móvil) sin cambios en el comportamiento

### Requisito 4: Rediseño del Footer

**Historia de Usuario:** Como usuario de la tienda, quiero un footer elegante y coherente con el nuevo diseño, para que la experiencia visual sea consistente en toda la página.

#### Criterios de Aceptación

1. THE Footer SHALL utilizar un fondo oscuro coherente con la Paleta_Premium
2. THE Footer SHALL aplicar colores de texto claros con opacidad reducida para información secundaria
3. THE Footer SHALL aplicar el color primario dorado a los iconos de redes sociales en estado hover
4. THE Footer SHALL mantener toda la funcionalidad y enlaces existentes sin cambios

### Requisito 5: Rediseño del PromoCarousel

**Historia de Usuario:** Como visitante de la tienda, quiero ver un carrusel hero con estética cinematográfica y premium, para que las promociones se presenten de forma impactante y elegante.

#### Criterios de Aceptación

1. THE PromoCarousel SHALL aplicar gradientes oscuros más intensos sobre las imágenes de fondo para mejorar la legibilidad del texto
2. THE PromoCarousel SHALL utilizar el color primario dorado en el botón CTA principal reemplazando el verde lima (#D7F000)
3. THE PromoCarousel SHALL aplicar el color primario dorado en los indicadores de slide activo
4. THE PromoCarousel SHALL aplicar efectos de glow sutil (box-shadow con color primario) en los botones CTA
5. WHEN el usuario hace hover sobre los controles de navegación, THE PromoCarousel SHALL mostrar transición al color primario dorado
6. THE PromoCarousel SHALL mantener toda la funcionalidad existente (auto-advance, navegación, video support) sin cambios

### Requisito 6: Rediseño del ProductCard

**Historia de Usuario:** Como comprador, quiero ver las tarjetas de producto con un diseño premium y sofisticado, para que los productos se presenten de forma atractiva y elegante.

#### Criterios de Aceptación

1. THE ProductCard SHALL utilizar un fondo de tarjeta oscuro coherente con la Paleta_Premium
2. THE ProductCard SHALL aplicar bordes sutiles con opacidad reducida para definir los límites de la tarjeta
3. WHEN el usuario hace hover sobre una tarjeta, THE ProductCard SHALL mostrar una elevación sutil con sombra cálida (tono dorado/amber)
4. THE ProductCard SHALL mostrar el precio con el color primario dorado para destacarlo visualmente
5. THE ProductCard SHALL aplicar la Paleta_Premium al botón de favoritos y sus estados (activo, hover)
6. THE ProductCard SHALL mantener toda la funcionalidad existente (enlace al detalle, video hover, favoritos, agregar al carrito) sin cambios

### Requisito 7: Rediseño del CategoryShowcase

**Historia de Usuario:** Como visitante, quiero ver las categorías presentadas con un estilo premium, para que la navegación por categorías se sienta elegante y moderna.

#### Criterios de Aceptación

1. THE CategoryShowcase SHALL aplicar fondos oscuros con bordes sutiles a los círculos de categoría
2. WHEN el usuario hace hover sobre una categoría, THE CategoryShowcase SHALL aplicar el color primario dorado como fondo con transición suave
3. THE CategoryShowcase SHALL utilizar texto claro coherente con la Paleta_Premium
4. THE CategoryShowcase SHALL mantener la funcionalidad de scroll infinito y la animación existente sin cambios

### Requisito 8: Rediseño del FeaturedProducts y DeliveryPromoBanner

**Historia de Usuario:** Como visitante, quiero que las secciones de productos destacados y banners promocionales reflejen la nueva estética premium, para una experiencia visual coherente.

#### Criterios de Aceptación

1. THE FeaturedProducts SHALL aplicar la Paleta_Premium al badge de countdown del Flash Sale, utilizando el color primario dorado
2. THE FeaturedProducts SHALL utilizar texto claro y encabezados coherentes con la nueva paleta
3. THE DeliveryPromoBanner SHALL utilizar un fondo oscuro con acentos del color primario dorado
4. THE DeliveryPromoBanner SHALL aplicar texto claro y badges con estilo coherente con la Paleta_Premium
5. THE FeaturedProducts SHALL mantener toda la funcionalidad del countdown timer sin cambios
6. THE DeliveryPromoBanner SHALL mantener el soporte para imágenes/videos de fondo sin cambios

### Requisito 9: Efectos de Iluminación y Animaciones Premium

**Historia de Usuario:** Como visitante, quiero percibir efectos de iluminación cálida y animaciones sutiles, para que la tienda transmita una atmósfera premium y acogedora.

#### Criterios de Aceptación

1. THE Sistema_de_Diseño SHALL definir clases CSS utilitarias para efectos de glow cálido (box-shadow con tonos dorados/amber)
2. WHEN un botón primario se renderiza, THE Sistema_de_Diseño SHALL aplicar un efecto de glow sutil con el color primario
3. WHEN el usuario hace hover sobre elementos interactivos, THE Sistema_de_Diseño SHALL aplicar transiciones suaves con duración entre 200ms y 300ms
4. THE Sistema_de_Diseño SHALL definir un efecto de viñeta sutil (vignette) disponible como clase utilitaria para secciones hero
5. THE Sistema_de_Diseño SHALL mantener las animaciones existentes (infinite-scroll, transiciones de opacidad) funcionando correctamente

### Requisito 10: Rediseño del HeroSection

**Historia de Usuario:** Como visitante, quiero ver una sección hero con estética cinematográfica y premium, para que la primera impresión de la tienda sea impactante y elegante.

#### Criterios de Aceptación

1. THE HeroSection SHALL utilizar un fondo oscuro con gradiente que simule iluminación cálida tipo spotlight
2. THE HeroSection SHALL aplicar la Paleta_Premium a los botones CTA (primario dorado, secundario con borde)
3. THE HeroSection SHALL aplicar efectos de glow sutil en los botones CTA
4. THE HeroSection SHALL mantener el diseño responsive existente adaptándose correctamente a móvil y desktop

### Requisito 11: Coherencia Visual Global

**Historia de Usuario:** Como visitante, quiero que todos los componentes de la tienda mantengan una estética visual coherente, para que la experiencia de navegación sea fluida y profesional.

#### Criterios de Aceptación

1. WHEN cualquier componente de la tienda se renderiza, THE Sistema_de_Diseño SHALL aplicar las variables CSS de la Paleta_Premium de forma consistente
2. THE Sistema_de_Diseño SHALL actualizar el valor de `--radius` para utilizar bordes redondeados que complementen la estética premium (mantener o ajustar los 1.5rem actuales)
3. IF un componente utiliza colores hardcodeados (#D7F000, #10F400, #E9F7E8), THEN THE componente SHALL reemplazar dichos valores por las variables CSS correspondientes de la Paleta_Premium
4. THE Sistema_de_Diseño SHALL asegurar que los componentes de shadcn/ui (Button, Card, Input, Sheet, DropdownMenu) hereden correctamente los nuevos tokens de color
