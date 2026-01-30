"use server";

import { createClient } from "@/lib/supabase/server";
import { Order } from "@/types/skating-store";
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
