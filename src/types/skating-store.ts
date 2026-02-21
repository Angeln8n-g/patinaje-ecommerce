export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon_name?: string;
  icon_url?: string;
  created_at: string;
}

export type PromoStatus = 'none' | 'upcoming' | 'active' | 'expired';

export interface Banner {
  id: string;
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  active: boolean;
  display_order: number;
  promo_status?: PromoStatus;
  promo_start_date?: string;
  promo_end_date?: string;
  created_at: string;
  category_ids?: string[];   // IDs de categorías asociadas
  categories?: Category[];   // Categorías populadas (para admin)
  waitlist_count?: number;
  notified_count?: number;
}

export interface PromoWaitlistEntry {
  id: string;
  banner_id: string;
  user_id?: string;
  email: string;
  name?: string;
  notified: boolean;
  notified_at?: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
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
  variant_type?: 'none' | 'size' | 'measurement' | 'color';
  variant_options?: string[];
  variant_prices?: Record<string, number>;
  variant_images?: Record<string, string>;
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
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: 'card' | 'cash';
  payment_status: 'pending' | 'paid' | 'failed';
  qr_token?: string;
  seller_id?: string;
  order_type?: 'online' | 'in_store';
  dispatched_at?: string;
  created_at: string;
  fiscal_data?: any;
}

export type ShipmentStatus = 'ASIGNADO' | 'EN_RUTA' | 'CERCA' | 'ENTREGADO' | 'CANCELADO';

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

export type UserRole = 'USER' | 'ADMIN' | 'DELIVERY' | 'SELLER';

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

export interface DeliveryZone {
  id: string;
  name: string;
  polygon: Array<{ lat: number; lng: number }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryLocation {
  id: string;
  delivery_man_id: string;
  lat: number;
  lng: number;
  updated_at: string;
}

export interface StoreLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface ShippingConfig {
  base_radius_km: number;
  base_rate: number;
  cost_per_extra_km: number;
  max_distance_km: number;
  out_of_zone_enabled: boolean;
  allow_sales_without_zones?: boolean;
}

export type ShippingZoneType = "within_zone" | "out_of_zone" | "out_of_range";

export interface ShippingCostResult {
  zone_type: ShippingZoneType;
  distance_km: number;
  base_radius_km: number;
  base_rate: number;
  extra_km: number;
  extra_charge: number;
  total_cost: number;
  max_distance_km: number;
  out_of_zone_enabled: boolean;
}


export interface PosSession {
  id: string;
  seller_id: string;
  initial_amount: number;
  reported_amount: number | null;
  expected_amount: number | null;
  total_sales: number;
  total_card_sales: number;
  total_cash_sales: number;
  transaction_count: number;
  status: 'open' | 'closed';
  opened_at: string;
  closed_at: string | null;
}

export interface CashSessionSummary {
  total_sales: number;
  total_card_sales: number;
  total_cash_sales: number;
  transaction_count: number;
  expected_amount: number; // initial_amount + total_cash_sales
  reported_amount: number;
  difference: number; // reported - expected
}

export interface POSCartItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  selectedVariant?: string;
}

export interface PaymentInfo {
  method: 'cash' | 'card';
  amount_received?: number; // solo para efectivo
}

export interface SellerDashboardStats {
  today_sales: number;
  today_orders_completed: number;
  pending_orders: number;
}

export interface OrderFilters {
  date_from?: string;
  date_to?: string;
  status?: string;
}

export interface DateRange {
  from?: string;
  to?: string;
}

export interface SellerStat {
  seller_id: string;
  seller_name: string;
  total_sales: number;
  total_amount: number;
}

export interface DeliveryStat {
  delivery_person_id: string;
  delivery_person_name: string;
  completed_deliveries: number;
  average_rating: number | null;
}

export interface SalesComparison {
  in_store_sales: number;
  in_store_amount: number;
  online_sales: number;
  online_amount: number;
  total_sales: number;
  total_amount: number;
}

