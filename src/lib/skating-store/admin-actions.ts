"use server";

import { createClient } from "@/lib/supabase/server";
import {
  Order,
  DateRange,
  SellerStat,
  DeliveryStat,
  SalesComparison,
} from "@/types/skating-store";
import { mapDbOrderToOrder } from "./supabase-queries";

export async function getAdminDashboardStats() {
  const supabase = await createClient();
  
  // Fetch total products count
  const { count: productsCount } = await supabase
    .from('skating_products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  // Fetch total orders and total sales
  const { data: orders } = await supabase
    .from('skating_orders')
    .select('total, status, created_at, customer_name, user_id')
    .order('created_at', { ascending: false });

  // Fetch active users count
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const totalSales = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
  const activeOrdersCount = orders?.filter(o => o.status !== 'delivered').length || 0;
  
  // Get recent sales (last 5)
  const recentSales = orders
    ?.slice(0, 5)
    .map(order => ({
      name: order.customer_name,
      amount: order.total,
      date: order.created_at
    })) || [];

  return {
    totalSales,
    activeOrdersCount,
    productsCount: productsCount || 0,
    usersCount: usersCount || 0,
    recentSales
  };
}

/**
 * Helper: verifies the current user is authenticated and has the ADMIN role.
 * Returns the Supabase client and user ID, or throws an error.
 */
async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") {
    throw new Error("Acceso denegado: se requiere rol ADMIN");
  }

  return { supabase, userId: user.id };
}

/**
 * Helper: applies date range filters to a Supabase query.
 * Filters on the specified date column using gte/lte.
 */
function applyDateRangeFilter(query: any, dateRange?: DateRange, dateColumn = "created_at") {
  if (!dateRange) return query;

  if (dateRange.from) {
    query = query.gte(dateColumn, dateRange.from);
  }
  if (dateRange.to) {
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte(dateColumn, toDate.toISOString());
  }

  return query;
}

/**
 * getSellerStats — Returns sales statistics broken down by seller.
 *
 * For each seller, returns:
 * - seller_id, seller_name: identification
 * - total_sales: count of orders created/assigned to this seller
 * - total_amount: sum of order totals
 *
 * Optionally filtered by date range on created_at.
 *
 * Validates: Requirements 6.1, 6.3
 */
export async function getSellerStats(dateRange?: DateRange): Promise<SellerStat[]> {
  const { supabase } = await requireAdmin();

  // Fetch all orders that have a seller_id (both in_store and assigned online orders)
  let query = supabase
    .from("skating_orders")
    .select("seller_id, total, created_at")
    .not("seller_id", "is", null);

  query = applyDateRangeFilter(query, dateRange);

  const { data: orders, error: ordersError } = await query;

  if (ordersError) {
    console.error("Error fetching seller stats orders:", ordersError);
    return [];
  }

  if (!orders || orders.length === 0) return [];

  // Aggregate by seller_id
  const sellerMap = new Map<string, { total_sales: number; total_amount: number }>();
  for (const order of orders) {
    const sellerId = order.seller_id as string;
    const existing = sellerMap.get(sellerId) || { total_sales: 0, total_amount: 0 };
    existing.total_sales += 1;
    existing.total_amount += order.total || 0;
    sellerMap.set(sellerId, existing);
  }

  // Fetch seller profiles for names
  const sellerIds = Array.from(sellerMap.keys());
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", sellerIds);

  if (profilesError) {
    console.error("Error fetching seller profiles:", profilesError);
    return [];
  }

  const profileMap = new Map<string, string>();
  for (const p of profiles || []) {
    const name =
      p.first_name || p.last_name
        ? `${p.first_name || ""} ${p.last_name || ""}`.trim()
        : p.email || "Vendedor desconocido";
    profileMap.set(p.id, name);
  }

  // Build result
  const result: SellerStat[] = [];
  for (const [sellerId, stats] of sellerMap) {
    result.push({
      seller_id: sellerId,
      seller_name: profileMap.get(sellerId) || "Vendedor desconocido",
      total_sales: stats.total_sales,
      total_amount: stats.total_amount,
    });
  }

  // Sort by total_amount descending
  result.sort((a, b) => b.total_amount - a.total_amount);

  return result;
}

/**
 * getDeliveryStats — Returns delivery statistics broken down by delivery person.
 *
 * For each delivery person, returns:
 * - delivery_person_id, delivery_person_name: identification
 * - completed_deliveries: count of shipments with status 'ENTREGADO'
 * - average_rating: average rating from delivery_ratings table (null if no ratings)
 *
 * Optionally filtered by date range on shipments.created_at.
 *
 * Validates: Requirements 6.2, 6.3
 */
export async function getDeliveryStats(dateRange?: DateRange): Promise<DeliveryStat[]> {
  const { supabase } = await requireAdmin();

  // Fetch completed shipments
  let shipmentsQuery = supabase
    .from("shipments")
    .select("delivery_man_id, status, created_at")
    .eq("status", "ENTREGADO")
    .not("delivery_man_id", "is", null);

  shipmentsQuery = applyDateRangeFilter(shipmentsQuery, dateRange);

  const { data: shipments, error: shipmentsError } = await shipmentsQuery;

  if (shipmentsError) {
    console.error("Error fetching delivery stats shipments:", shipmentsError);
    return [];
  }

  if (!shipments || shipments.length === 0) return [];

  // Aggregate completed deliveries by delivery person
  const deliveryMap = new Map<string, number>();
  for (const s of shipments) {
    const dpId = s.delivery_man_id as string;
    deliveryMap.set(dpId, (deliveryMap.get(dpId) || 0) + 1);
  }

  const deliveryPersonIds = Array.from(deliveryMap.keys());

  // Fetch delivery person profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", deliveryPersonIds);

  if (profilesError) {
    console.error("Error fetching delivery person profiles:", profilesError);
    return [];
  }

  const profileMap = new Map<string, string>();
  for (const p of profiles || []) {
    const name =
      p.first_name || p.last_name
        ? `${p.first_name || ""} ${p.last_name || ""}`.trim()
        : p.email || "Repartidor desconocido";
    profileMap.set(p.id, name);
  }

  // Fetch ratings for these delivery persons
  let ratingsQuery = supabase
    .from("delivery_ratings")
    .select("delivery_man_id, rating")
    .in("delivery_man_id", deliveryPersonIds);

  if (dateRange) {
    ratingsQuery = applyDateRangeFilter(ratingsQuery, dateRange);
  }

  const { data: ratings, error: ratingsError } = await ratingsQuery;

  // Build ratings map: delivery_man_id -> { sum, count }
  const ratingsMap = new Map<string, { sum: number; count: number }>();
  if (!ratingsError && ratings) {
    for (const r of ratings) {
      const dpId = r.delivery_man_id as string;
      const existing = ratingsMap.get(dpId) || { sum: 0, count: 0 };
      existing.sum += r.rating;
      existing.count += 1;
      ratingsMap.set(dpId, existing);
    }
  }

  // Build result
  const result: DeliveryStat[] = [];
  for (const [dpId, completedCount] of deliveryMap) {
    const ratingData = ratingsMap.get(dpId);
    result.push({
      delivery_person_id: dpId,
      delivery_person_name: profileMap.get(dpId) || "Repartidor desconocido",
      completed_deliveries: completedCount,
      average_rating: ratingData ? ratingData.sum / ratingData.count : null,
    });
  }

  // Sort by completed_deliveries descending
  result.sort((a, b) => b.completed_deliveries - a.completed_deliveries);

  return result;
}

/**
 * getSalesComparison — Returns a comparison of in-store vs online sales.
 *
 * Returns:
 * - in_store_sales / in_store_amount: count and total for order_type = 'in_store'
 * - online_sales / online_amount: count and total for order_type = 'online' (or null)
 * - total_sales / total_amount: combined totals
 *
 * Optionally filtered by date range on created_at.
 *
 * Validates: Requirements 6.6, 6.3
 */
export async function getSalesComparison(dateRange?: DateRange): Promise<SalesComparison> {
  const { supabase } = await requireAdmin();

  let query = supabase
    .from("skating_orders")
    .select("order_type, total, created_at");

  query = applyDateRangeFilter(query, dateRange);

  const { data: orders, error } = await query;

  if (error) {
    console.error("Error fetching sales comparison:", error);
    return {
      in_store_sales: 0,
      in_store_amount: 0,
      online_sales: 0,
      online_amount: 0,
      total_sales: 0,
      total_amount: 0,
    };
  }

  let inStoreSales = 0;
  let inStoreAmount = 0;
  let onlineSales = 0;
  let onlineAmount = 0;

  for (const order of orders || []) {
    const amount = order.total || 0;
    if (order.order_type === "in_store") {
      inStoreSales += 1;
      inStoreAmount += amount;
    } else {
      // 'online' or null (legacy orders default to online)
      onlineSales += 1;
      onlineAmount += amount;
    }
  }

  return {
    in_store_sales: inStoreSales,
    in_store_amount: inStoreAmount,
    online_sales: onlineSales,
    online_amount: onlineAmount,
    total_sales: inStoreSales + onlineSales,
    total_amount: inStoreAmount + onlineAmount,
  };
}

/**
 * assignOrderToSeller — Assigns an online order to a seller for dispatch.
 *
 * Sets the order's seller_id to the given sellerId and changes the status
 * to 'asignado_vendedor'. Verifies that the seller exists and has the SELLER role.
 *
 * Validates: Requirement 4.1
 */
export async function assignOrderToSeller(orderId: string, sellerId: string): Promise<void> {
  const { supabase } = await requireAdmin();

  if (!orderId) {
    throw new Error("ID de pedido requerido");
  }
  if (!sellerId) {
    throw new Error("ID de vendedor requerido");
  }

  // Verify the seller exists and has SELLER role
  const { data: sellerProfile, error: sellerError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", sellerId)
    .single();

  if (sellerError || !sellerProfile) {
    throw new Error("Vendedor no encontrado");
  }

  if (sellerProfile.role !== "SELLER") {
    throw new Error("El usuario seleccionado no tiene rol de vendedor");
  }

  // Verify the order exists
  const { data: order, error: orderError } = await supabase
    .from("skating_orders")
    .select("id, seller_id, status")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error("Pedido no encontrado");
  }

  // Update the order: assign seller and change status
  const { error: updateError } = await supabase
    .from("skating_orders")
    .update({
      seller_id: sellerId,
      status: "asignado_vendedor",
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("Error assigning order to seller:", updateError);
    throw new Error("Error al asignar el pedido al vendedor");
  }
}


/**
 * getSellerOrdersAdmin — Returns all orders for a specific seller (admin view).
 * Validates: Requirement 6.4
 */
export async function getSellerOrdersAdmin(sellerId: string): Promise<Order[]> {
  const { supabase } = await requireAdmin();

  if (!sellerId) {
    throw new Error("ID de vendedor requerido");
  }

  const { data, error } = await supabase
    .from("skating_orders")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching seller orders:", error);
    return [];
  }

  return (data || []).map(mapDbOrderToOrder);
}

