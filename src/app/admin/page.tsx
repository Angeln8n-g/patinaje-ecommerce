"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Users, DollarSign, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getAdminDashboardStats } from "@/lib/skating-store/admin-actions";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminDashboardStats().then(data => {
      setStats(data);
      setLoading(false);
    });
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Resumen de Ventas</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-muted-foreground/20">
              <DollarSign className="h-12 w-12 mb-2 opacity-20" />
              <p className="font-medium">Gráfico de Ventas Mensuales</p>
              <p className="text-xs">Próximamente: Integración con Recharts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
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
    </div>
  );
}
