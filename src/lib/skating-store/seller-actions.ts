"use server";

import { createClient } from "@/lib/supabase/server";
import {
  SellerDashboardStats,
  OrderFilters,
  Order,
} from "@/types/skating-store";
import { mapDbOrderToOrder } from "./supabase-queries";

/**
 * Helper: verifies the current user is authenticated and has the SELLER role.
 * Returns the seller's user ID or throws an error.
 */
async function requireSeller() {
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

  if (profile?.role !== "SELLER") {
    throw new Error("Acceso denegado: se requiere rol SELLER");
  }

  return { supabase, userId: user.id };
}

/**
 * getSellerDashboardStats — Returns today's dashboard statistics for the
 * authenticated seller.
 *
 * - today_sales: sum of totals for orders completed (delivered) today by this seller
 * - today_orders_completed: count of orders with status 'delivered' today by this seller
 * - pending_orders: count of orders assigned to this seller that are NOT 'delivered'
 *
 * Validates: Requirement 5.1
 */
export async function getSellerDashboardStats(): Promise<SellerDashboardStats> {
  const { supabase, userId } = await requireSeller();

  // Get the start of today in ISO format (UTC)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  // Fetch all orders assigned to this seller
  const { data: allOrders, error } = await supabase
    .from("skating_orders")
    .select("id, total, status, created_at, dispatched_at")
    .eq("seller_id", userId);

  if (error) {
    console.error("Error fetching seller dashboard stats:", error);
    return { today_sales: 0, today_orders_completed: 0, pending_orders: 0 };
  }

  const orders = allOrders || [];

  // Today's completed orders (delivered today — using dispatched_at or created_at)
  const todayCompleted = orders.filter((o) => {
    if (o.status !== "delivered") return false;
    // Use dispatched_at if available, otherwise created_at
    const relevantDate = o.dispatched_at || o.created_at;
    return relevantDate >= todayISO;
  });

  const today_sales = todayCompleted.reduce(
    (sum, o) => sum + (o.total || 0),
    0
  );
  const today_orders_completed = todayCompleted.length;

  // Pending orders: assigned to this seller but not yet delivered
  const pending_orders = orders.filter((o) => o.status !== "delivered").length;

  return {
    today_sales,
    today_orders_completed,
    pending_orders,
  };
}

/**
 * getSellerOrders — Returns the order history for the authenticated seller,
 * optionally filtered by date range and/or status.
 *
 * - Without filters: returns ALL orders where seller_id matches
 * - With date_from/date_to: filters by created_at within range
 * - With status: filters by order status
 * - Pending orders are ordered by created_at ascending (Req 5.3)
 *
 * Validates: Requirements 5.2, 5.3, 5.4
 */
export async function getSellerOrders(
  filters?: OrderFilters
): Promise<Order[]> {
  const { supabase, userId } = await requireSeller();

  let query = supabase
    .from("skating_orders")
    .select("*")
    .eq("seller_id", userId);

  // Apply date filters
  if (filters?.date_from) {
    query = query.gte("created_at", filters.date_from);
  }
  if (filters?.date_to) {
    // Add end-of-day to include the entire "to" date
    const toDate = new Date(filters.date_to);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte("created_at", toDate.toISOString());
  }

  // Apply status filter
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  // Order by created_at ascending so pending orders appear oldest-first (Req 5.3)
  query = query.order("created_at", { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching seller orders:", error);
    return [];
  }

  return (data || []).map((dbOrder: any) => ({
    ...mapDbOrderToOrder(dbOrder),
    seller_id: dbOrder.seller_id,
    order_type: dbOrder.order_type,
    dispatched_at: dbOrder.dispatched_at,
  }));
}

/**
 * markOrderAsDispatched — Marks an order as dispatched by the authenticated seller.
 *
 * Updates the order's status to 'delivered' and sets dispatched_at to the current
 * timestamp. Only allows the seller who is assigned to the order to dispatch it.
 *
 * Validates: Requirement 4.3
 */
export async function markOrderAsDispatched(orderId: string): Promise<void> {
  const { supabase, userId } = await requireSeller();

  if (!orderId) {
    throw new Error("ID de pedido requerido");
  }

  // Verify the order exists and is assigned to this seller
  const { data: order, error: fetchError } = await supabase
    .from("skating_orders")
    .select("id, seller_id, status")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    throw new Error("Pedido no encontrado");
  }

  if (order.seller_id !== userId) {
    throw new Error("No autorizado: este pedido no está asignado a usted");
  }

  if (order.status === "delivered") {
    throw new Error("Este pedido ya fue despachado");
  }

  // Update order: set status to 'delivered' and dispatched_at to now
  const { error: updateError } = await supabase
    .from("skating_orders")
    .update({
      status: "delivered",
      dispatched_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("Error marking order as dispatched:", updateError);
    throw new Error("Error al marcar el pedido como despachado");
  }
}
