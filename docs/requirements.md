# Requirements Document

## Introduction

Este documento define los requisitos para un ecommerce web de productos de patinaje para escritorio. El sistema presentará una tienda online profesional con productos de patinaje incluyendo ruedas, bases, patines, protecciones, botas y accesorios. El sistema incluye funcionalidad completa de carrito de compras con persistencia en Supabase, gestión de productos y procesamiento de órdenes.

## Glossary

- **Skating_Store**: El sistema de ecommerce web de productos de patinaje
- **Product_Card**: Componente visual que muestra información resumida de un producto (imagen, nombre, precio)
- **Product_Gallery**: Componente que muestra múltiples imágenes de un producto con navegación
- **Category_Filter**: Componente visual para filtrar productos por categoría
- **Shopping_Cart**: Sistema de carrito de compras que almacena productos seleccionados por el usuario
- **Cart_Item**: Un producto individual dentro del carrito con cantidad y precio
- **Order**: Una orden de compra generada a partir del carrito
- **Supabase_Backend**: Sistema de backend usando Supabase para persistencia de datos
- **Navbar**: Barra de navegación fija en la parte superior de la página
- **Hero_Section**: Sección principal destacada en la página de inicio
- **Product_Grid**: Disposición en cuadrícula de las tarjetas de productos
- **Checkout**: Proceso de finalización de compra

## Requirements

### Requirement 1: Navegación Global

**User Story:** As a visitor, I want to navigate between different sections of the store, so that I can explore products and information easily.

#### Acceptance Criteria

1. THE Skating_Store SHALL display a fixed Navbar at the top of all pages
2. WHEN a visitor clicks a navigation link, THE Skating_Store SHALL navigate to the corresponding page
3. THE Navbar SHALL include links to: Home, Catálogo, Sobre Nosotros, and Contacto
4. THE Navbar SHALL display the store logo on the left side
5. THE Navbar SHALL display a cart icon showing the number of items in Shopping_Cart
6. THE Skating_Store SHALL display a professional Footer on all pages with navigation links and social media icons

### Requirement 2: Página de Inicio (Home)

**User Story:** As a visitor, I want to see an attractive landing page, so that I can understand what the store offers and discover featured products.

#### Acceptance Criteria

1. WHEN a visitor loads the home page, THE Skating_Store SHALL display a Hero_Section with promotional content
2. THE Hero_Section SHALL include a main image or banner related to skating
3. WHEN the home page loads, THE Skating_Store SHALL display a section of featured products using Product_Cards
4. THE Skating_Store SHALL display product categories with visual representations
5. WHEN a visitor clicks on a category, THE Skating_Store SHALL navigate to the catalog filtered by that category

### Requirement 3: Catálogo de Productos

**User Story:** As a visitor, I want to browse all products with filtering options, so that I can find products that interest me.

#### Acceptance Criteria

1. WHEN a visitor accesses the catalog page, THE Skating_Store SHALL display all products in a Product_Grid layout
2. THE Skating_Store SHALL display Category_Filters for: Patines completos, Ruedas, Bases/Frames, Botas, Protecciones, and Accesorios
3. WHEN a visitor selects a category filter, THE Skating_Store SHALL display only products matching that category
4. WHEN a visitor clicks on a Product_Card, THE Skating_Store SHALL navigate to the individual product page
5. THE Product_Grid SHALL display products in a grid layout optimized for desktop screens

### Requirement 4: Página de Producto Individual

**User Story:** As a visitor, I want to see detailed information about a product, so that I can make an informed decision.

#### Acceptance Criteria

1. WHEN a visitor accesses a product page, THE Skating_Store SHALL display a Product_Gallery with multiple images
2. THE Product_Gallery SHALL allow navigation between product images
3. THE Skating_Store SHALL display the product name, price, and detailed description
4. THE Skating_Store SHALL display an "Agregar al carrito" button
5. WHEN a visitor clicks the "Agregar al carrito" button, THE Skating_Store SHALL add the product to the Shopping_Cart
6. THE Skating_Store SHALL allow the visitor to select quantity before adding to cart
7. WHEN a product is added to cart, THE Skating_Store SHALL display a confirmation notification

### Requirement 5: Carrito de Compras

**User Story:** As a visitor, I want to manage my shopping cart, so that I can review and modify my selections before purchasing.

#### Acceptance Criteria

1. WHEN a visitor clicks the cart icon, THE Skating_Store SHALL display the Shopping_Cart contents
2. THE Shopping_Cart SHALL display each Cart_Item with image, name, quantity, unit price, and subtotal
3. WHEN a visitor changes the quantity of a Cart_Item, THE Skating_Store SHALL update the subtotal and total
4. WHEN a visitor removes a Cart_Item, THE Skating_Store SHALL remove it from the Shopping_Cart and update totals
5. THE Shopping_Cart SHALL display the total price of all items
6. THE Shopping_Cart SHALL persist items in local storage for session continuity
7. WHEN a visitor clicks "Proceder al pago", THE Skating_Store SHALL navigate to the Checkout page

### Requirement 6: Proceso de Checkout

**User Story:** As a visitor, I want to complete my purchase, so that I can receive my skating products.

#### Acceptance Criteria

1. WHEN a visitor accesses the Checkout page, THE Skating_Store SHALL display an order summary
2. THE Checkout page SHALL display a form for shipping information (name, address, city, postal code, phone)
3. THE Checkout page SHALL display a form for payment information (visual simulation)
4. WHEN a visitor submits the checkout form, THE Skating_Store SHALL validate all required fields
5. IF any required field is empty or invalid, THEN THE Skating_Store SHALL display appropriate error messages
6. WHEN checkout is successful, THE Skating_Store SHALL create an Order in the Supabase_Backend
7. WHEN checkout is successful, THE Skating_Store SHALL clear the Shopping_Cart
8. WHEN checkout is successful, THE Skating_Store SHALL display an order confirmation page

### Requirement 7: Página Sobre Nosotros

**User Story:** As a visitor, I want to learn about the store's history and values, so that I can trust the brand.

#### Acceptance Criteria

1. WHEN a visitor accesses the About page, THE Skating_Store SHALL display the store's history and mission
2. THE Skating_Store SHALL display content in a professional and visually appealing layout
3. THE About page SHALL include relevant imagery related to skating culture

### Requirement 8: Página de Contacto

**User Story:** As a visitor, I want to see contact information and a contact form, so that I can reach out to the store.

#### Acceptance Criteria

1. WHEN a visitor accesses the Contact page, THE Skating_Store SHALL display a contact form with fields for name, email, and message
2. WHEN a visitor submits the contact form, THE Skating_Store SHALL save the message to Supabase_Backend
3. THE Skating_Store SHALL display store contact information
4. WHEN a visitor submits the form successfully, THE Skating_Store SHALL display a confirmation message
5. IF any required field is empty, THEN THE Skating_Store SHALL display validation errors

### Requirement 9: Backend con Supabase

**User Story:** As a developer, I want a Supabase backend, so that I can persist products, orders, and contact messages.

#### Acceptance Criteria

1. THE Supabase_Backend SHALL store products with: id, name, description, price, category, images, stock, and timestamps
2. THE Supabase_Backend SHALL store orders with: id, customer info, items, total, status, and timestamps
3. THE Supabase_Backend SHALL store contact messages with: id, name, email, message, and timestamp
4. WHEN the application loads, THE Skating_Store SHALL fetch products from Supabase_Backend
5. WHEN an order is created, THE Skating_Store SHALL insert it into the Supabase_Backend
6. THE Supabase_Backend SHALL use Row Level Security for data protection

### Requirement 10: Componentes de Producto Reutilizables

**User Story:** As a developer, I want reusable product components, so that I can maintain consistent UI across the application.

#### Acceptance Criteria

1. THE Product_Card component SHALL display product image, name, and price
2. THE Product_Card component SHALL be reusable across different pages
3. THE Product_Gallery component SHALL support multiple images with navigation controls
4. WHEN displaying products, THE Skating_Store SHALL fetch data from Supabase_Backend

### Requirement 11: Diseño Visual y Estilo

**User Story:** As a visitor, I want a modern and professional visual design, so that I have a pleasant shopping experience.

#### Acceptance Criteria

1. THE Skating_Store SHALL use a color palette of black, gray, and white with accent colors
2. THE Skating_Store SHALL use modern and legible typography
3. THE Skating_Store SHALL maintain consistent spacing and visual hierarchy across all pages
4. THE Skating_Store SHALL be optimized for desktop screens only (no mobile responsive design required)
