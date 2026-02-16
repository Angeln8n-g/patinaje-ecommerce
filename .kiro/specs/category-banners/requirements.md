# Documento de Requisitos

## Introducción

Actualmente la tienda cuenta con un carrusel de banners en la página principal que muestra promociones y ofertas generales. Para mejorar la visibilidad y relevancia del contenido promocional, se requiere que cada categoría de productos tenga sus propios banners. Cuando un administrador cree un banner, este podrá asociarse a una o más categorías, apareciendo tanto en el carrusel principal de la página de inicio como dentro de la página de su categoría correspondiente.

## Glosario

- **Sistema_Banners**: El módulo de gestión de banners que incluye el backend (API, base de datos) y el frontend (panel admin, carrusel, páginas de categoría).
- **Panel_Admin**: La interfaz de administración ubicada en `/admin/banners` donde los administradores gestionan los banners.
- **Carrusel_Principal**: El componente `PromoCarousel` que muestra banners activos en la página de inicio de la tienda.
- **Página_Categoría**: La página del catálogo filtrada por una categoría específica (`/skating-store/catalogo?category=<slug>`).
- **Banner**: Registro en la tabla `banners` que contiene título, descripción, imagen, enlace, estado activo y orden de visualización.
- **Categoría**: Registro en la tabla `categories` que representa una agrupación de productos con nombre, slug e icono.
- **Administrador**: Usuario con rol `ADMIN` que tiene permisos para crear, editar y eliminar banners.

## Requisitos

### Requisito 1: Asociación de banners a categorías

**Historia de Usuario:** Como administrador, quiero asociar un banner a una o más categorías al crearlo o editarlo, para que el banner aparezca en las páginas de esas categorías.

#### Criterios de Aceptación

1. WHEN un administrador crea un banner, THE Panel_Admin SHALL mostrar un selector de categorías que permita elegir cero o más categorías de la lista existente.
2. WHEN un administrador edita un banner existente, THE Panel_Admin SHALL mostrar las categorías actualmente asociadas y permitir modificarlas.
3. WHEN un administrador guarda un banner sin seleccionar categorías, THE Sistema_Banners SHALL crear el banner como banner general visible solo en el Carrusel_Principal.
4. WHEN un administrador guarda un banner con categorías seleccionadas, THE Sistema_Banners SHALL almacenar la relación entre el banner y cada categoría seleccionada.

### Requisito 2: Persistencia de la relación banner-categoría

**Historia de Usuario:** Como administrador, quiero que la relación entre banners y categorías se almacene de forma confiable, para que los banners se muestren correctamente en cada contexto.

#### Criterios de Aceptación

1. THE Sistema_Banners SHALL almacenar las relaciones banner-categoría en una tabla intermedia `banner_categories` con referencias a `banners.id` y `categories.id`.
2. WHEN se elimina un banner, THE Sistema_Banners SHALL eliminar todas las relaciones de categoría asociadas a ese banner.
3. WHEN se elimina una categoría, THE Sistema_Banners SHALL eliminar todas las relaciones de banner asociadas a esa categoría.
4. WHEN se consultan los banners de una categoría, THE Sistema_Banners SHALL retornar solo los banners activos asociados a esa categoría, ordenados por `display_order`.

### Requisito 3: Visualización de banners en el carrusel principal

**Historia de Usuario:** Como visitante de la tienda, quiero ver todos los banners activos en el carrusel de la página principal, para conocer las promociones disponibles.

#### Criterios de Aceptación

1. THE Carrusel_Principal SHALL mostrar todos los banners activos, independientemente de si tienen categorías asociadas o no.
2. WHEN se cargan los banners del Carrusel_Principal, THE Sistema_Banners SHALL ordenarlos por el campo `display_order` de forma ascendente.

### Requisito 4: Visualización de banners en la página de categoría

**Historia de Usuario:** Como visitante de la tienda, quiero ver banners relevantes cuando navego a una categoría específica, para descubrir promociones relacionadas con los productos que me interesan.

#### Criterios de Aceptación

1. WHEN un visitante accede a la Página_Categoría con un filtro de categoría activo, THE Página_Categoría SHALL mostrar un carrusel con los banners activos asociados a esa categoría.
2. WHEN no existen banners activos asociados a la categoría seleccionada, THE Página_Categoría SHALL omitir la sección del carrusel y mostrar directamente los productos.
3. WHEN se muestran banners en la Página_Categoría, THE Sistema_Banners SHALL reutilizar el componente `PromoCarousel` existente para mantener consistencia visual.

### Requisito 5: API de banners por categoría

**Historia de Usuario:** Como desarrollador frontend, quiero un endpoint que retorne los banners de una categoría específica, para poder cargarlos en la página de categoría.

#### Criterios de Aceptación

1. WHEN se realiza una petición GET a `/api/content/banners?category=<slug>`, THE Sistema_Banners SHALL retornar los banners activos asociados a la categoría con ese slug.
2. WHEN el slug de categoría proporcionado no existe, THE Sistema_Banners SHALL retornar un arreglo vacío.
3. WHEN se realiza una petición GET a `/api/content/banners?active=true` sin parámetro de categoría, THE Sistema_Banners SHALL retornar todos los banners activos (comportamiento actual preservado).

### Requisito 6: Visualización de categorías asociadas en la lista de banners del admin

**Historia de Usuario:** Como administrador, quiero ver qué categorías tiene asociadas cada banner en la tabla de gestión, para tener visibilidad del alcance de cada banner.

#### Criterios de Aceptación

1. WHEN se muestra la tabla de banners en el Panel_Admin, THE Panel_Admin SHALL incluir una columna que muestre las categorías asociadas a cada banner.
2. WHEN un banner no tiene categorías asociadas, THE Panel_Admin SHALL mostrar una etiqueta indicando "General" o "Todas" en la columna de categorías.
