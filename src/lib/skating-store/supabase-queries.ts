// Client-side API queries (replaces direct Supabase calls)
import { apiClient, authFetch } from "@/lib/api/client";
import { Product, Order, ContactMessage, ShippingInfo, CartItem, InventoryMovement, Review } from "@/types/skating-store";

export async function getProductByBarcode(barcode: string) {
  try {
    return await apiClient<Product | null>(`/api/products/barcode/${barcode}`);
  } catch { return null; }
}

export async function addInventoryMovement(movement: Omit<InventoryMovement, "id" | "created_at">) {
  return authFetch("/api/inventory", { method: "POST", body: movement });
}

export async function updateProductStock(
  productId: string, quantityChange: number,
  movementType: "in" | "out" | "adjustment",
  reason?: string, newPrice?: number
) {
  // Update stock via inventory endpoint
  await authFetch("/api/inventory", {
    method: "POST",
    body: { product_id: productId, quantity_change: quantityChange, movement_type: movementType, reason },
  });
  // Update price if changed
  if (newPrice !== undefined) {
    await authFetch(`/api/products/${productId}`, { method: "PUT", body: { price: newPrice } });
  }
  return { newStock: 0, newPrice: newPrice || 0 }; // Caller should refresh
}

export async function quickCreateProduct(productData: Omit<Product, "id" | "created_at" | "updated_at">) {
  return authFetch<Product>("/api/products", { method: "POST", body: productData });
}

export async function getCategories() {
  try {
    return await apiClient("/api/content/categories");
  } catch { return []; }
}

export async function getProducts(category?: string | null, search?: string | null) {
  try {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    const qs = params.toString();
    return await apiClient<Product[]>(`/api/products${qs ? `?${qs}` : ""}`);
  } catch { return []; }
}

export async function getProductById(id: string) {
  try {
    return await apiClient<Product>(`/api/products/${id}`);
  } catch { return null; }
}

export function mapDbOrderToOrder(dbOrder: any): Order {
  return {
    id: dbOrder.id,
    user_id: dbOrder.user_id,
    items: typeof dbOrder.items === "string" ? JSON.parse(dbOrder.items) : dbOrder.items,
    shipping: {
      fullName: dbOrder.customer_name,
      address: dbOrder.customer_address,
      city: dbOrder.customer_city,
      postalCode: dbOrder.customer_postal_code,
      phone: dbOrder.customer_phone,
      email: dbOrder.customer_email,
      lat: dbOrder.shipping_lat ? parseFloat(dbOrder.shipping_lat) : undefined,
      lng: dbOrder.shipping_lng ? parseFloat(dbOrder.shipping_lng) : undefined,
    },
    total: parseFloat(dbOrder.total),
    status: dbOrder.status,
    payment_method: dbOrder.payment_method,
    payment_status: dbOrder.payment_status,
    qr_token: dbOrder.qr_token,
    seller_id: dbOrder.seller_id,
    order_type: dbOrder.order_type,
    dispatched_at: dbOrder.dispatched_at,
    created_at: dbOrder.created_at,
    fiscal_data: dbOrder.fiscal_data ? (typeof dbOrder.fiscal_data === "string" ? JSON.parse(dbOrder.fiscal_data) : dbOrder.fiscal_data) : null,
  };
}

export async function createOrder(
  items: CartItem[], shipping: ShippingInfo, total: number,
  paymentMethod: "card" | "cash" = "card",
  fiscalData?: any
) {
  const body = {
    customer_name: shipping.fullName,
    customer_address: shipping.address,
    customer_city: shipping.city,
    customer_postal_code: shipping.postalCode,
    customer_phone: shipping.phone,
    customer_email: shipping.email,
    items,
    total,
    payment_method: paymentMethod,
    shipping_lat: shipping.lat,
    shipping_lng: shipping.lng,
    fiscal_data: fiscalData || null,
  };
  const order = await authFetch("/api/orders", { method: "POST", body });
  return mapDbOrderToOrder(order);
}

export async function getOrderById(id: string) {
  try {
    // Try direct fetch first (works for authenticated users)
    const order = await authFetch<any>(`/api/orders/${id}`);
    return order ? mapDbOrderToOrder(order) : null;
  } catch {
    // Fallback: search in user's orders list
    try {
      const orders = await authFetch<any[]>("/api/orders/my");
      const order = orders.find((o) => o.id === id);
      return order ? mapDbOrderToOrder(order) : null;
    } catch { return null; }
  }
}

export async function confirmCashPayment(orderId: string, qrToken: string) {
  return authFetch(`/api/orders/${orderId}`, {
    method: "PUT",
    body: { payment_status: "paid", qr_token: qrToken },
  });
}

export async function cancelOrderByDelay(orderId: string) {
  return authFetch(`/api/orders/${orderId}/cancel`, {
    method: "POST",
    body: {
      reasonCode: "DELAY",
      reasonDescription: "Cancelación por retraso en la entrega (más de 24 horas)",
    },
  });
}

export async function createContactMessage(message: Omit<ContactMessage, "id" | "created_at">) {
  return apiClient("/api/contact", { method: "POST", body: message });
}

export async function getProfile(userId: string) {
  try {
    return await authFetch("/api/auth/me");
  } catch { return null; }
}

export async function getUserOrders(userId: string) {
  try {
    const orders = await authFetch<any[]>("/api/orders/my");
    return orders.map(mapDbOrderToOrder);
  } catch { return []; }
}

export async function updateProfile(userId: string, updates: any) {
  return authFetch("/api/auth/profile", { method: "PUT", body: updates });
}

export async function getStaticContentClient(slug: string) {
  try {
    return await apiClient(`/api/content/static/${slug}`);
  } catch { return null; }
}

export async function updateStaticContentClient(slug: string, newData: Record<string, unknown>) {
  return authFetch(`/api/content/static/${slug}`, { method: "PUT", body: { data: newData } });
}

export async function getProductReviews(productId: string) {
  try {
    return await apiClient(`/api/reviews/${productId}`);
  } catch { return []; }
}

export async function createProductReview(review: Omit<Review, "id" | "created_at">) {
  return authFetch("/api/reviews", { method: "POST", body: review });
}

export async function hasPurchasedProduct(userId: string, productId: string) {
  try {
    const orders = await authFetch<any[]>("/api/orders/my");
    return orders.some((order) => {
      const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
      return items.some((item: any) => item.product?.id === productId);
    });
  } catch { return false; }
}
