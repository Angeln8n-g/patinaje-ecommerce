"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Users, DollarSign, Loader2, Store, Globe, Truck, Star, CalendarIcon } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { getAdminDashboardStats, getSellerStats, getDeliveryStats, getSalesComparison, getStoreStats, StoreStat } from "@/lib/skating-store/admin-actions";
import { SellerStat, DeliveryStat, SalesComparison, DateRange } from "@/types/skating-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [sellerStats, setSellerStats] = useState<SellerStat[]>([]);
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStat[]>([]);
  const [salesComparison, setSalesComparison] = useState<SalesComparison | null>(null);
  const [storeStats, setStoreStats] = useState<StoreStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({});

  useEffect(() => {
    Promise.all([
      getAdminDashboardStats(),
      getSellerStats(),
      getDeliveryStats(),
      getSalesComparison(),
      getStoreStats(),
    ]).then(([dashStats, sellers, deliveries, comparison, stores]) => {
      setStats(dashStats);
      setSellerStats(sellers);
      setDeliveryStats(deliveries);
      setSalesComparison(comparison);
      setStoreStats(stores);
      setLoading(false);
    });
  }, []);

  const handleFilterApply = useCallback(async () => {
    setMetricsLoading(true);
    const [sellers, deliveries, comparison, stores] = await Promise.all([
      getSellerStats(dateRange),
      getDeliveryStats(dateRange),
      getSalesComparison(dateRange),
      getStoreStats(dateRange),
    ]);
    setSellerStats(sellers);
    setDeliveryStats(deliveries);
    setSalesComparison(comparison);
    setStoreStats(stores);
    setMetricsLoading(false);
  }, [dateRange]);

  const handleFilterClear = useCallback(async () => {
    setDateRange({});
    setMetricsLoading(true);
    const [sellers, deliveries, comparison, stores] = await Promise.all([
      getSellerStats(),
      getDeliveryStats(),
      getSalesComparison(),
      getStoreStats(),
    ]);
    setSellerStats(sellers);
    setDeliveryStats(deliveries);
    setSalesComparison(comparison);
    setStoreStats(stores);
    setMetricsLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Tarjetas de resumen general */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Ingresos brutos acumulados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Activos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.activeOrdersCount}</div>
            <p className="text-xs text-muted-foreground">Pendientes por entregar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productsCount}</div>
            <p className="text-xs text-muted-foreground">En el catálogo público</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Registrados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.usersCount}</div>
            <p className="text-xs text-muted-foreground">Clientes en la plataforma</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro de rango de fechas global */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="h-4 w-4" />
            Filtrar por Rango de Fechas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="date-from" className="text-xs">Desde</Label>
              <Input
                id="date-from"
                type="date"
                value={dateRange.from || ""}
                onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value || undefined }))}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date-to" className="text-xs">Hasta</Label>
              <Input
                id="date-to"
                type="date"
                value={dateRange.to || ""}
                onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value || undefined }))}
                className="w-44"
              />
            </div>
            <Button onClick={handleFilterApply} disabled={metricsLoading} size="sm">
              {metricsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Aplicar
            </Button>
            <Button onClick={handleFilterClear} disabled={metricsLoading} variant="outline" size="sm">
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Métricas de ventas en tienda vs online */}
      {salesComparison && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas en Tienda</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${salesComparison.in_store_amount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{salesComparison.in_store_sales} pedidos presenciales</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas Online</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${salesComparison.online_amount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{salesComparison.online_sales} pedidos online</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Combinado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${salesComparison.total_amount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">{salesComparison.total_sales} pedidos totales</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ventas por Tienda */}
      {storeStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Rendimiento por Tienda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {storeStats.map((store) => (
                <div
                  key={store.store_id}
                  className="rounded-lg border p-4 space-y-3 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: store.color }} />
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: store.color }} />
                    <span className="font-semibold">{store.store_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Ventas</p>
                      <p className="font-bold text-green-600">${store.total_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Pedidos</p>
                      <p className="font-bold">{store.total_orders}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Pendientes</p>
                      <p className="font-bold text-amber-500">{store.pending_orders}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Vendedores</p>
                      <p className="font-bold">{store.seller_count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico comparativo de ventas por vendedor */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas por Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          {sellerStats.length === 0 ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20">
              <Users className="h-12 w-12 mb-2 opacity-20" />
              <p className="font-medium">Sin datos de vendedores</p>
              <p className="text-xs">No hay ventas registradas por vendedores en este período</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sellerStats} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="seller_name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, "Monto"]}
                  labelFormatter={(label) => `Vendedor: ${label}`}
                />
                <Bar dataKey="total_amount" radius={[4, 4, 0, 0]}>
                  {sellerStats.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Tabla de ventas por vendedor */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Ventas por Vendedor</CardTitle>
        </CardHeader>
        <CardContent>
          {sellerStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay datos de vendedores disponibles.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Vendedor</th>
                    <th className="text-right py-3 px-2 font-medium">N° Ventas</th>
                    <th className="text-right py-3 px-2 font-medium">Monto Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sellerStats.map((seller) => (
                    <tr key={seller.seller_id} className="border-b last:border-0">
                      <td className="py-3 px-2">{seller.seller_name}</td>
                      <td className="text-right py-3 px-2">{seller.total_sales}</td>
                      <td className="text-right py-3 px-2 font-medium text-green-600">${seller.total_amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de entregas por repartidor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Entregas por Repartidor
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deliveryStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay datos de repartidores disponibles.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Repartidor</th>
                    <th className="text-right py-3 px-2 font-medium">Entregas Completadas</th>
                    <th className="text-right py-3 px-2 font-medium">Calificación Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryStats.map((dp) => (
                    <tr key={dp.delivery_person_id} className="border-b last:border-0">
                      <td className="py-3 px-2">{dp.delivery_person_name}</td>
                      <td className="text-right py-3 px-2">{dp.completed_deliveries}</td>
                      <td className="text-right py-3 px-2">
                        {dp.average_rating != null ? (
                          <span className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                            {dp.average_rating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Sin calificación</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ventas recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {stats.recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No hay ventas registradas aún.</p>
            ) : stats.recentSales.map((sale: any, i: number) => (
              <div key={i} className="flex items-center">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {sale.name.charAt(0)}
                </div>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">{sale.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(sale.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="ml-auto font-bold text-green-600">+${sale.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
