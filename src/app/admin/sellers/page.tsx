"use client";

import { useEffect, useState } from "react";
import { getSellers, toggleSellerRole, getNonSellerUsers, updateUserRole } from "@/lib/skating-store/user-actions";
import { getSellerOrdersAdmin } from "@/lib/skating-store/admin-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, UserPlus, UserX, UserCheck, Users, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRole, Order } from "@/types/skating-store";

interface SellerProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  created_at: string;
}

export default function SellersPage() {
  const [sellers, setSellers] = useState<SellerProfile[]>([]);
  const [nonSellerUsers, setNonSellerUsers] = useState<SellerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Seller detail state
  const [detailSeller, setDetailSeller] = useState<SellerProfile | null>(null);
  const [detailOrders, setDetailOrders] = useState<Order[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadData = async () => {
    try {
      const [sellersData, usersData] = await Promise.all([
        getSellers(),
        getNonSellerUsers(),
      ]);
      setSellers(sellersData as SellerProfile[]);
      setNonSellerUsers(usersData as SellerProfile[]);
    } catch (error) {
      toast.error("Error al cargar datos de vendedores");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeactivateSeller = async (userId: string) => {
    try {
      await toggleSellerRole(userId, false);
      toast.success("Vendedor desactivado correctamente");
      setSelectedUserId("");
      await loadData();
    } catch (error) {
      toast.error("Error al desactivar vendedor");
    }
  };

  const handleAssignSeller = async () => {
    if (!selectedUserId) return;
    try {
      await updateUserRole(selectedUserId, "SELLER");
      toast.success("Rol SELLER asignado correctamente");
      setSelectedUserId("");
      await loadData();
    } catch (error) {
      toast.error("Error al asignar rol de vendedor");
    }
  };

  const handleViewDetail = async (seller: SellerProfile) => {
    setDetailSeller(seller);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const orders = await getSellerOrdersAdmin(seller.id);
      setDetailOrders(orders);
    } catch (error) {
      toast.error("Error al cargar detalle del vendedor");
      setDetailOrders([]);
    } finally {
      setDetailLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const sellerName = (s: SellerProfile) =>
    s.first_name ? `${s.first_name} ${s.last_name || ""}`.trim() : s.email;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Vendedores</h1>
          <p className="text-muted-foreground">Administra los vendedores del sistema POS</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendedores Activos</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sellers.length}</div>
            <p className="text-xs text-muted-foreground">Con rol SELLER activo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Disponibles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nonSellerUsers.length}</div>
            <p className="text-xs text-muted-foreground">Pueden ser asignados como vendedores</p>
          </CardContent>
        </Card>
      </div>

      {/* Assign Seller Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Asignar Rol de Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[350px]">
                <SelectValue placeholder="Seleccionar usuario..." />
              </SelectTrigger>
              <SelectContent>
                {nonSellerUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name
                      ? `${user.first_name} ${user.last_name || ""} — ${user.email}`
                      : user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAssignSeller} disabled={!selectedUserId}>
              <UserPlus className="h-4 w-4 mr-2" />
              Asignar SELLER
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sellers Table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha Registro</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sellers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No hay vendedores registrados.
                </TableCell>
              </TableRow>
            ) : (
              sellers.map((seller) => (
                <TableRow key={seller.id}>
                  <TableCell className="font-medium">
                    {seller.first_name
                      ? `${seller.first_name} ${seller.last_name || ""}`
                      : "—"}
                  </TableCell>
                  <TableCell>{seller.email}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Activo
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(seller.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetail(seller)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeactivateSeller(seller.id)}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Desactivar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Seller Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Ventas de {detailSeller ? sellerName(detailSeller) : ""}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : detailOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Este vendedor no tiene ventas registradas.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <span className="text-muted-foreground">Total ventas: </span>
                  <span className="font-bold">{detailOrders.length}</span>
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <span className="text-muted-foreground">Monto total: </span>
                  <span className="font-bold text-green-600">
                    ${detailOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
                  </span>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="text-sm">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={order.order_type === "in_store" ? "default" : "secondary"}>
                          {order.order_type === "in_store" ? "Tienda" : "Online"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${order.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
