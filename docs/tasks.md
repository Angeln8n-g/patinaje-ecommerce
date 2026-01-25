# Implementation Plan: Skating Ecommerce UI

## Overview

Este plan implementa un ecommerce de productos de patinaje con Next.js App Router, Tailwind CSS, shadcn/ui y Supabase. Las tareas están organizadas para construir incrementalmente desde la estructura base hasta las funcionalidades completas del carrito y checkout.

## Tasks

- [ ] 1. Configurar estructura base y tipos
  - [ ] 1.1 Crear tipos TypeScript para el ecommerce
    - Crear `src/types/skating-store.ts` con interfaces: Product, CartItem, Order, ShippingInfo, ContactMessage, ProductCategory
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ] 1.2 Crear schema de Supabase
    - Crear migración `supabase/migrations/skating_store_schema.sql` con tablas: skating_products, skating_orders, skating_contact_messages
    - Incluir Row Level Security policies
    - _Requirements: 9.1, 9.2, 9.3, 9.6_
  
  - [ ] 1.3 Crear queries de Supabase
    - Crear `src/lib/skating-store/supabase-queries.ts` con funciones: getProducts, getProductById, createOrder, createContactMessage
    - _Requirements: 9.4, 9.5_

- [ ] 2. Implementar contexto del carrito
  - [ ] 2.1 Crear SkatingCartContext
    - Crear `src/contexts/SkatingCartContext.tsx` con estado del carrito, funciones addItem, removeItem, updateQuantity, clearCart
    - Implementar persistencia en localStorage
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 2.2 Write property test for cart total calculation
    - **Property 10: Cart Total Calculation**
    - **Validates: Requirements 5.3, 5.5**
  
  - [ ]* 2.3 Write property test for cart persistence round-trip
    - **Property 12: Cart Persistence Round-Trip**
    - **Validates: Requirements 5.6**

- [ ] 3. Checkpoint - Verificar estructura base
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implementar componentes de layout
  - [ ] 4.1 Crear Navbar component
    - Crear `src/components/skating-store/layout/Navbar.tsx` con logo, links de navegación, icono de carrito con contador
    - Usar shadcn/ui NavigationMenu
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 4.2 Crear Footer component
    - Crear `src/components/skating-store/layout/Footer.tsx` con links de navegación y iconos de redes sociales
    - _Requirements: 1.6_
  
  - [ ] 4.3 Crear CartIcon component
    - Crear `src/components/skating-store/layout/CartIcon.tsx` que muestre el número de items del carrito
    - _Requirements: 1.5_
  
  - [ ]* 4.4 Write property test for cart icon count accuracy
    - **Property 1: Cart Icon Count Accuracy**
    - **Validates: Requirements 1.5, 5.2**
  
  - [ ] 4.5 Crear layout principal del store
    - Crear `src/app/skating-store/layout.tsx` que incluya Navbar, Footer y CartContext provider
    - _Requirements: 1.1, 1.6_

- [ ] 5. Implementar componentes de productos
  - [ ] 5.1 Crear ProductCard component
    - Crear `src/components/skating-store/products/ProductCard.tsx` con imagen, nombre, precio y botón de agregar al carrito
    - Usar shadcn/ui Card
    - _Requirements: 10.1, 10.2_
  
  - [ ]* 5.2 Write property test for product information display
    - **Property 7: Product Information Display**
    - **Validates: Requirements 4.3, 10.1**
  
  - [ ] 5.3 Crear ProductGrid component
    - Crear `src/components/skating-store/products/ProductGrid.tsx` para mostrar productos en grid
    - _Requirements: 3.1, 3.5_
  
  - [ ] 5.4 Crear ProductGallery component
    - Crear `src/components/skating-store/products/ProductGallery.tsx` con imagen principal y thumbnails navegables
    - _Requirements: 4.1, 4.2, 10.3_
  
  - [ ]* 5.5 Write property test for gallery image navigation
    - **Property 6: Gallery Image Navigation**
    - **Validates: Requirements 4.2, 10.3**
  
  - [ ] 5.6 Crear CategoryFilter component
    - Crear `src/components/skating-store/products/CategoryFilter.tsx` con filtros para todas las categorías
    - Usar shadcn/ui ToggleGroup
    - _Requirements: 3.2, 3.3_
  
  - [ ]* 5.7 Write property test for category filter correctness
    - **Property 3: Category Filter Correctness**
    - **Validates: Requirements 3.3**

- [ ] 6. Checkpoint - Verificar componentes de productos
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implementar páginas principales
  - [ ] 7.1 Crear página Home
    - Crear `src/app/skating-store/page.tsx` con HeroSection, FeaturedProducts y CategoryShowcase
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ] 7.2 Crear HeroSection component
    - Crear `src/components/skating-store/home/HeroSection.tsx` con banner promocional
    - _Requirements: 2.1, 2.2_
  
  - [ ] 7.3 Crear FeaturedProducts component
    - Crear `src/components/skating-store/home/FeaturedProducts.tsx` que muestre productos destacados
    - _Requirements: 2.3_
  
  - [ ]* 7.4 Write property test for featured products display
    - **Property 2: Featured Products Display**
    - **Validates: Requirements 2.3**
  
  - [ ] 7.5 Crear CategoryShowcase component
    - Crear `src/components/skating-store/home/CategoryShowcase.tsx` con cards de categorías
    - _Requirements: 2.4, 2.5_
  
  - [ ] 7.6 Crear página de Catálogo
    - Crear `src/app/skating-store/catalogo/page.tsx` con ProductGrid y CategoryFilter
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ]* 7.7 Write property test for product catalog completeness
    - **Property 4: Product Catalog Completeness**
    - **Validates: Requirements 3.1**
  
  - [ ]* 7.8 Write property test for product card navigation
    - **Property 5: Product Card Navigation**
    - **Validates: Requirements 3.4**
  
  - [ ] 7.9 Crear página de Producto Individual
    - Crear `src/app/skating-store/producto/[id]/page.tsx` con ProductGallery, detalles y botón agregar al carrito
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [ ]* 7.10 Write property test for add to cart functionality
    - **Property 8: Add to Cart Functionality**
    - **Validates: Requirements 4.5**

- [ ] 8. Checkpoint - Verificar páginas principales
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implementar carrito y checkout
  - [ ] 9.1 Crear CartItem component
    - Crear `src/components/skating-store/cart/CartItem.tsx` con imagen, nombre, cantidad, precio y subtotal
    - _Requirements: 5.2_
  
  - [ ]* 9.2 Write property test for cart item information display
    - **Property 9: Cart Item Information Display**
    - **Validates: Requirements 5.2**
  
  - [ ] 9.3 Crear CartDrawer component
    - Crear `src/components/skating-store/cart/CartDrawer.tsx` con lista de items, total y botón de checkout
    - Usar shadcn/ui Sheet
    - _Requirements: 5.1, 5.2, 5.5, 5.7_
  
  - [ ]* 9.4 Write property test for cart item removal
    - **Property 11: Cart Item Removal**
    - **Validates: Requirements 5.4**
  
  - [ ] 9.5 Crear página de Carrito
    - Crear `src/app/skating-store/carrito/page.tsx` con vista completa del carrito
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7_
  
  - [ ] 9.6 Crear CheckoutForm component
    - Crear `src/components/skating-store/checkout/CheckoutForm.tsx` con formulario de envío y validación
    - Usar shadcn/ui Form con react-hook-form y zod
    - _Requirements: 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 9.7 Write property test for checkout form validation
    - **Property 13: Checkout Form Validation**
    - **Validates: Requirements 6.4**
  
  - [ ] 9.8 Crear OrderSummary component
    - Crear `src/components/skating-store/checkout/OrderSummary.tsx` con resumen de la orden
    - _Requirements: 6.1_
  
  - [ ] 9.9 Crear página de Checkout
    - Crear `src/app/skating-store/checkout/page.tsx` con CheckoutForm y OrderSummary
    - Implementar creación de orden en Supabase
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_
  
  - [ ]* 9.10 Write property test for order creation on checkout
    - **Property 14: Order Creation on Checkout**
    - **Validates: Requirements 6.6, 9.5**
  
  - [ ]* 9.11 Write property test for cart clear after checkout
    - **Property 15: Cart Clear After Checkout**
    - **Validates: Requirements 6.7**

- [ ] 10. Checkpoint - Verificar carrito y checkout
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implementar páginas informativas
  - [ ] 11.1 Crear página Sobre Nosotros
    - Crear `src/app/skating-store/sobre-nosotros/page.tsx` con historia y misión de la tienda
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ] 11.2 Crear página de Contacto
    - Crear `src/app/skating-store/contacto/page.tsx` con formulario de contacto y información
    - Implementar envío a Supabase
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 11.3 Write property test for contact form submission
    - **Property 16: Contact Form Submission**
    - **Validates: Requirements 8.2**

- [ ] 12. Agregar datos de prueba
  - [ ] 12.1 Crear seed data para productos
    - Crear script o migración con productos de ejemplo para todas las categorías
    - Incluir productos destacados
    - _Requirements: 9.1, 9.4_

- [ ] 13. Aplicar estilos finales
  - [ ] 13.1 Configurar tema de colores
    - Actualizar `tailwind.config.js` con paleta de colores: negro, gris, blanco y acentos
    - _Requirements: 11.1_
  
  - [ ] 13.2 Aplicar tipografía y espaciado consistente
    - Revisar y ajustar estilos en todos los componentes
    - _Requirements: 11.2, 11.3_

- [ ] 14. Checkpoint final
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- El stack técnico es: Next.js (App Router), Tailwind CSS, shadcn/ui, Supabase
