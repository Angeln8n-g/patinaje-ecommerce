"use client";

import { useEffect, useState } from "react";
import { getDeliveryMenStats } from "@/lib/skating-store/delivery-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Truck, Star, Award, TrendingUp, DollarSign, Package } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";

export default function DeliveriesPage() {
  const [deliveryMen, setDeliveryMen] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await getDeliveryMenStats();
      setDeliveryMen(data);
    } catch (error) {
      toast.error("Error al cargar repartidores");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const topPerformer = deliveryMen[0];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ranking de Repartidores</h1>
          <p className="text-muted-foreground">Monitorización de rendimiento y ventas</p>
        </div>
        <Link href="/admin/users">
          <Button variant="outline">
            Gestionar Roles
          </Button>
        </Link>
      </div>

      {/* Top Stats Cards */}
      {topPerformer && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Repartidor</CardTitle>
              <Award className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">
                {topPerformer.first_name ? `${topPerformer.first_name} ${topPerformer.last_name || ''}` : topPerformer.email.split('@')[0]}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-foreground">{topPerformer.avgRating.toFixed(1)}</span>
                rating promedio
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas Entregadas (Total)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(deliveryMen.reduce((acc, curr) => acc + curr.totalSales, 0))}
              </div>
              <p className="text-xs text-muted-foreground">
                Suma de todos los repartidores
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pedidos Entregados</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {deliveryMen.reduce((acc, curr) => acc + curr.deliveredCount, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Pedidos completados exitosamente
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Rank</TableHead>
              <TableHead>Repartidor</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Ventas Totales</TableHead>
              <TableHead>Entregados</TableHead>
              <TableHead>Activos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveryMen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  No hay datos disponibles.
                </TableCell>
              </TableRow>
            ) : (
              deliveryMen.map((dm, index) => {
                let rankColor = "text-muted-foreground";
                if (index === 0) rankColor = "text-yellow-500 font-bold text-lg";
                if (index === 1) rankColor = "text-slate-400 font-bold text-lg";
                if (index === 2) rankColor = "text-amber-700 font-bold text-lg";

                let levelBadge = { label: "En Riesgo", color: "bg-red-100 text-red-800" };
                if (dm.avgRating >= 4.8) levelBadge = { label: "Elite", color: "bg-purple-100 text-purple-800 border-purple-200" };
                else if (dm.avgRating >= 4.5) levelBadge = { label: "Profesional", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
                else if (dm.avgRating >= 4.0) levelBadge = { label: "Estándar", color: "bg-blue-100 text-blue-800 border-blue-200" };

                return (
                  <TableRow key={dm.id}>
                    <TableCell className={cn("text-center", rankColor)}>
                      #{index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {dm.first_name ? `${dm.first_name} ${dm.last_name || ''}` : dm.email}
                        </span>
                        <span className="text-xs text-muted-foreground">{dm.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={levelBadge.color}>
                        {levelBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className={cn("h-4 w-4", dm.avgRating > 0 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                        <span className="font-bold">{dm.avgRating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({dm.ratingCount})</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {formatCurrency(dm.totalSales)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{dm.deliveredCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {dm.activeShipments > 0 ? (
                        <Badge variant="secondary" className="animate-pulse bg-green-100 text-green-800">
                          {dm.activeShipments} en curso
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
