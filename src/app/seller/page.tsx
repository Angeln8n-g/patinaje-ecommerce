"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getSellerDashboardStats, getSellerOrders, markOrderAsDispatched } from "@/lib/skating-store/seller-actions";
import { SellerDashboardStats, Order } from "@/types/skating-store";
import { toast } from "sonner";
import { SellerProductGrid } from "@/components/seller/SellerProductGrid";

export default function SellerDashboard() {
  const [stats, setStats] = useState<SellerDashboardStats | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        getSellerDashboardStats(),
        getSellerOrders({ status: "pending" }),
      ]);
      setStats(statsData);
      // Filter non-delivered orders, already sorted ascending by created_at from server
      setPendingOrders(ordersData.filter((o) => o.status !== "delivered"));
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDispatch = async (orderId: string) => {
    setDispatchingId(orderId);
    try {
      await markOrderAsDispatched(orderId);
      toast.success("Pedido marcado como despachado");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Error al despachar pedido");
    } finally {
      setDispatchingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard del Vendedor</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.today_sales.toFixed(2) ?? "0.00"}</div>
            <p className="text-xs text-muted-foreground">Total vendido hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.today_orders_completed ?? 0}</div>
            <p className="text-xs text-muted-foreground">Entregados hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_orders ?? 0}</div>
            <p className="text-xs text-muted-foreground">Por despachar</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <SellerProductGrid />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No hay pedidos pendientes.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Pedido #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.shipping?.fullName || "Cliente"} &middot;{" "}
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {order.order_type === "in_store" ? "Tienda" : "Online"}
                      </Badge>
                      <span className="text-sm font-semibold text-green-600">
                        ${order.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleDispatch(order.id)}
                    disabled={dispatchingId === order.id}
                  >
                    {dispatchingId === order.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Despachar"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
