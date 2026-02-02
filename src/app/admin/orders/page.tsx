"use client";

import { useEffect, useState } from "react";
import { getAllOrdersWithShipment, getAllDeliveryMen, assignShipment } from "@/lib/skating-store/delivery-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Truck, FileText } from "lucide-react";
import { generateAndSendInvoice } from "@/lib/skating-store/invoice-actions";
import { formatCurrency } from "@/lib/utils";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveryMen, setDeliveryMen] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [selectedDeliveryMan, setSelectedDeliveryMan] = useState<string>("");

  const [assignmentPopupOpen, setAssignmentPopupOpen] = useState(false);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    if (isRefreshing) return;
    
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    
    try {
      // Execute sequentially or handle errors individually if needed
      const ordersData = await getAllOrdersWithShipment();
      const deliveryMenData = await getAllDeliveryMen();
      
      setOrders(ordersData || []);
      setDeliveryMen(deliveryMenData || []);
      
      const count = (ordersData || []).filter((o: any) => !o.shipment).length;
      
      if (count > unassignedCount && unassignedCount !== 0) {
        setAssignmentPopupOpen(true);
      }
      
      setUnassignedCount(count);
    } catch (error: any) {
      // Ignore abort errors which are common during navigation/HMR
      if (error?.name !== 'AbortError') {
        console.error("Error loading admin data:", error);
        toast.error("Error al cargar datos");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    if (isMounted) {
      loadData();
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAssign = async () => {
    if (!selectedOrder || !selectedDeliveryMan || isRefreshing) return;

    setIsRefreshing(true);
    try {
      await assignShipment(selectedOrder, selectedDeliveryMan);
      toast.success("Repartidor asignado correctamente");
      setSelectedOrder(null);
      setSelectedDeliveryMan("");
      await loadData(true); // Silent refresh
    } catch (error) {
      toast.error("Error al asignar repartidor");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSendInvoice = async (order: any) => {
    try {
      // Intentamos obtener el email del cliente
      const customerEmail = order.customer_email || (order.user_id ? "cliente@example.com" : null); // Fallback si no hay email en la orden
      
      if (!customerEmail) {
        toast.error("No se encontró el email del cliente");
        return;
      }

      await generateAndSendInvoice(order.id, customerEmail, order.total);
      toast.success("Factura generada y enviada correctamente");
    } catch (error) {
      toast.error("Error al generar la factura");
    }
  };

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
        <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
        <Button onClick={() => loadData(false)} variant="outline">Actualizar</Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado Pedido</TableHead>
              <TableHead>Estado Envío</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono">{order.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{order.customer_name}</span>
                    <span className="text-xs text-muted-foreground">{order.customer_city}</span>
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(order.total)}</TableCell>
                <TableCell>
                  <Badge variant={order.status === 'pending' ? 'outline' : 'default'}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {order.shipment ? (
                    <Badge variant="secondary" className="flex items-center w-fit gap-1">
                      <Truck className="h-3 w-3" />
                      {order.shipment.status}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">Sin asignar</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedOrder(order.id)}
                        >
                          {order.shipment ? "Reasignar" : "Asignar"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Asignar Repartidor</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Seleccionar Repartidor</label>
                            <Select 
                              onValueChange={setSelectedDeliveryMan} 
                              value={selectedDeliveryMan}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona..." />
                              </SelectTrigger>
                              <SelectContent>
                                {deliveryMen.map((dm) => (
                                  <SelectItem key={dm.id} value={dm.id}>
                                    {dm.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button className="w-full" onClick={handleAssign} disabled={!selectedDeliveryMan}>
                            Confirmar Asignación
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSendInvoice(order)}
                      title="Enviar Factura"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={assignmentPopupOpen} onOpenChange={setAssignmentPopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedidos Pendientes</DialogTitle>
            <DialogDescription>
              Hay {unassignedCount} pedidos sin asignar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Tienes {deliveryMen.length} repartidores disponibles. Asigna los pedidos lo antes posible.
            </p>
            <Button onClick={() => setAssignmentPopupOpen(false)} className="w-full">
              Revisar Lista
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
