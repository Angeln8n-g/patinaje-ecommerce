export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon_name?: string;
  icon_url?: string;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  active: boolean;
  display_order: number;
  created_at: string;
}

export interface PromoTextBanner {
  id: string;
  title: string;
  prefix_text: string;
  highlight_text: string;
  suffix_text: string;
  image_url?: string;
  bg_color: string;
  active: boolean;
}

export interface StaticContent {
  slug: string;
  data: Record<string, any>;
  updated_at: string;
}

export type ProductCategory = string; // Now dynamic

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  subcategory?: string;
  images: string[];
  stock: number;
  featured: boolean;
  barcode?: string;
  unit_type?: string;
  supplier?: string;
  purchase_price?: number;
  status: 'active' | 'inactive';
  variant_type?: 'none' | 'size' | 'measurement';
  variant_options?: string[];
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  user_id: string;
  quantity_change: number;
  movement_type: 'in' | 'out' | 'adjustment';
  reason?: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}

export interface ShippingInfo {
  fullName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email?: string;
  lat?: number;
  lng?: number;
}

export interface Order {
  id: string;
  user_id?: string;
  items: CartItem[];
  shipping: ShippingInfo;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  payment_method: 'card' | 'cash';
  payment_status: 'pending' | 'paid' | 'failed';
  qr_token?: string;
  created_at: string;
}

export type ShipmentStatus = 'ASIGNADO' | 'EN_RUTA' | 'CERCA' | 'ENTREGADO';

export interface Shipment {
  id: string;
  order_id: string;
  delivery_man_id: string | null;
  status: ShipmentStatus;
  current_lat: number | null;
  current_lng: number | null;
  estimated_time: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'USER' | 'ADMIN' | 'DELIVERY';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_postal_code?: string;
  address_country?: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}
