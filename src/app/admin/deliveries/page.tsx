"use client";

import { useEffect, useState } from "react";
import { getDeliveryMenStats } from "@/lib/skating-store/delivery-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Truck } from "lucide-react";
import Link from "next/link";

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Repartidores</h1>
        <Link href="/admin/users">
          <Button variant="outline">
            Gestionar Roles
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         {/* Summary Cards could go here */}
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Envíos Activos</TableHead>
              <TableHead>Fecha Registro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveryMen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No hay repartidores registrados. Ve a la sección de Usuarios para promover a alguien.
                </TableCell>
              </TableRow>
            ) : (
              deliveryMen.map((dm) => (
                <TableRow key={dm.id}>
                  <TableCell className="font-medium">{dm.email}</TableCell>
                  <TableCell className="font-mono text-xs">{dm.id}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                      Activo
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-bold">{dm.activeShipments}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(dm.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
