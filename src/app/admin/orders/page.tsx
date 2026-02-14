"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getAllOrdersWithShipment, getAllDeliveryMen, assignShipment, getNearestDeliveryMen } from "@/lib/skating-store/delivery-actions";
import { getStoreLocation } from "@/lib/skating-store/zone-actions";
import { getSellers } from "@/lib/skating-store/user-actions";
import { assignOrderToSeller } from "@/lib/skating-store/admin-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Truck, FileText, Star, AlertTriangle, MapPin, UserCheck, Eye, Map } from "lucide-react";
import { generateAndSendInvoice } from "@/lib/skating-store/invoice-actions";
import { InvoicePreview } from "@/components/admin/InvoicePreview";
import { formatCurrency } from "@/lib/utils";

const OrdersMap = dynamic(() => import("@/components/admin/OrdersMap"), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full flex items-center justify-center bg-muted rounded-lg border">Cargando mapa...</div>,
});

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [deliveryMen, setDeliveryMen] = useState<any[]>([]);
  const [nearestDeliveryMen, setNearestDeliveryMen] = useState<any[]>([]);
  const [noLocationWarning, setNoLocationWarning] = useState(false);
  const [storeLocationMissing, setStoreLocationMissing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [selectedDeliveryMan, setSelectedDeliveryMan] = useState<string>("");

  const [assignmentPopupOpen, setAssignmentPopupOpen] = useState(false);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Seller assignment state
  const [sellersList, setSellersList] = useState<any[]>([]);
  const [sellerAssignOpen, setSellerAssignOpen] = useState(false);
  const [sellerAssignOrderId, setSellerAssignOrderId] = useState<string | null>(null);
  const [sellerAssignOrderSellerId, setSellerAssignOrderSellerId] = useState<string | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [confirmReassign, setConfirmReassign] = useState(false);

  // Invoice preview state
  const [previewOrder, setPreviewOrder] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);

  // Map toggle
  const [showMap, setShowMap] = useState(false);

  const loadData = async (silent = false) => {
    if (isRefreshing) return;
    
    if (!silent) setIsLoading(true);
    setIsRefreshing(true);
    
    try {
      const ordersData = await getAllOrdersWithShipment();
      const deliveryMenData = await getAllDeliveryMen();
      const sellersData = await getSellers();
      
      setOrders(ordersData || []);
      setDeliveryMen(deliveryMenData || []);
      setSellersList(sellersData || []);
      
      // Load store location and nearest delivery men sorted by distance
      const storeLocation = await getStoreLocation();
      if (storeLocation && storeLocation.lat && storeLocation.lng) {
        setStoreLocationMissing(false);
        const nearest = await getNearestDeliveryMen(storeLocation.lat, storeLocation.lng);
        setNearestDeliveryMen(nearest);
        // If there are delivery men but none have known locations, show warning
        if ((deliveryMenData || []).length > 0 && nearest.length === 0) {
          setNoLocationWarning(true);
        } else {
          setNoLocationWarning(false);
        }
      } else {
        setStoreLocationMissing(true);
        setNearestDeliveryMen([]);
        setNoLocationWarning(false);
      }
      
      const count = (ordersData || []).filter((o: any) => !o.shipment).length;
      
      if (count > unassignedCount && unassignedCount !== 0) {
        setAssignmentPopupOpen(true);
      }
      
      setUnassignedCount(count);
    } catch (error: any) {
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
    setSendingInvoice(true);
    try {
      const customerEmail = order.customer_email || order.shipping?.email;
      
      if (!customerEmail) {
        toast.error("No se encontró el email del cliente");
        return;
      }

      const shipping = order.shipping || {};
      await generateAndSendInvoice({
        orderId: order.id,
        customerEmail,
        customerName: shipping.fullName || order.customer_name || "Cliente",
        address: shipping.address || order.customer_address || "",
        city: shipping.city || order.customer_city || "",
        phone: shipping.phone || order.customer_phone || "",
        items: order.items || [],
        subtotal: order.total,
        shippingCost: 0,
        total: order.total,
        paymentMethod: order.payment_method || "card",
      });
      toast.success("Factura generada y enviada correctamente");
    } catch (error) {
      toast.error("Error al generar la factura");
    } finally {
      setSendingInvoice(false);
    }
  };

  const handleOpenPreview = (order: any) => {
    setPreviewOrder(order);
    setPreviewOpen(true);
  };

  const handleOpenSellerAssign = (order: any) => {
    setSellerAssignOrderId(order.id);
    setSellerAssignOrderSellerId(order.seller_id || null);
    setSelectedSellerId("");
    setConfirmReassign(false);
    setSellerAssignOpen(true);
  };

  const handleAssignToSeller = async () => {
    if (!sellerAssignOrderId || !selectedSellerId) return;

    // If order already has a seller and we're assigning a different one, require confirmation
    if (sellerAssignOrderSellerId && sellerAssignOrderSellerId !== selectedSellerId && !confirmReassign) {
      setConfirmReassign(true);
      return;
    }

    try {
      await assignOrderToSeller(sellerAssignOrderId, selectedSellerId);
      toast.success("Pedido asignado al vendedor correctamente");
      setSellerAssignOpen(false);
      setSellerAssignOrderId(null);
      setSelectedSellerId("");
      setConfirmReassign(false);
      await loadData(true);
    } catch (error) {
      toast.error("Error al asignar pedido al vendedor");
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
        <div className="flex gap-2">
          <Button onClick={() => setShowMap(!showMap)} variant={showMap ? "default" : "outline"} className="gap-2">
            <Map className="h-4 w-4" />
            {showMap ? "Ocultar Mapa" : "Ver Mapa"}
          </Button>
          <Button onClick={() => loadData(false)} variant="outline">Actualizar</Button>
        </div>
      </div>

      {showMap && <OrdersMap orders={orders} />}

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado Pedido</TableHead>
              <TableHead>Vendedor</TableHead>
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
                  {order.seller_id ? (
                    <span className="text-sm">
                      {sellersList.find((s: any) => s.id === order.seller_id)
                        ? (() => {
                            const s = sellersList.find((s: any) => s.id === order.seller_id);
                            return s.first_name ? `${s.first_name} ${s.last_name || ""}`.trim() : s.email;
                          })()
                        : order.seller_id.slice(0, 8)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">Sin asignar</span>
                  )}
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
                    {order.status !== "delivered" && order.status !== "cancelled" ? (
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
                            {noLocationWarning && (
                              <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Sin ubicación conocida</AlertTitle>
                                <AlertDescription>
                                  No se puede determinar la cercanía de los repartidores. Ningún repartidor tiene ubicación conocida.
                                </AlertDescription>
                              </Alert>
                            )}
                            {storeLocationMissing && (
                              <Alert>
                                <MapPin className="h-4 w-4" />
                                <AlertTitle>Ubicación de tienda no configurada</AlertTitle>
                                <AlertDescription>
                                  Configure la ubicación de la tienda en Zonas de Entrega para ver las distancias de los repartidores.
                                </AlertDescription>
                              </Alert>
                            )}
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Seleccionar Repartidor</label>
                              {nearestDeliveryMen.length > 0 ? (
                                <Select 
                                  onValueChange={setSelectedDeliveryMan} 
                                  value={selectedDeliveryMan}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecciona..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                  {nearestDeliveryMen.map((dm) => (
                                    <SelectItem key={dm.delivery_man_id} value={dm.delivery_man_id}>
                                      <div className="flex items-center justify-between w-full min-w-[200px] gap-2">
                                        <span>{dm.first_name ? `${dm.first_name} ${dm.last_name || ''}` : dm.email}</span>
                                        <span className="text-xs text-muted-foreground font-medium">
                                          — {dm.distance_km.toFixed(1)} km
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                  </SelectContent>
                                </Select>
                              ) : (
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
                                      <div className="flex items-center justify-between w-full min-w-[200px] gap-2">
                                        <span>{dm.first_name ? `${dm.first_name} ${dm.last_name || ''}` : dm.email}</span>
                                        {dm.avg_rating > 0 && (
                                          <div className="flex items-center gap-1 text-yellow-500">
                                            <Star className="w-3 h-3 fill-current" />
                                            <span className="text-xs font-bold">{dm.avg_rating.toFixed(1)}</span>
                                            <span className="text-xs text-muted-foreground">({dm.rating_count})</span>
                                          </div>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                            <Button className="w-full" onClick={handleAssign} disabled={!selectedDeliveryMan}>
                              Confirmar Asignación
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {order.status === "delivered" ? "Entregado" : "Cancelado"}
                      </Badge>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleOpenPreview(order)}
                      title="Ver Factura"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {order.status !== "delivered" && order.status !== "cancelled" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenSellerAssign(order)}
                        title="Asignar Vendedor"
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    )}
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

      {/* Seller Assignment Dialog */}
      <Dialog open={sellerAssignOpen} onOpenChange={(open) => {
        setSellerAssignOpen(open);
        if (!open) {
          setConfirmReassign(false);
          setSelectedSellerId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Pedido a Vendedor</DialogTitle>
            {sellerAssignOrderSellerId && (
              <DialogDescription>
                Este pedido ya está asignado a un vendedor. Selecciona otro para reasignar.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccionar Vendedor</label>
              <Select onValueChange={setSelectedSellerId} value={selectedSellerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un vendedor..." />
                </SelectTrigger>
                <SelectContent>
                  {sellersList.map((seller: any) => (
                    <SelectItem key={seller.id} value={seller.id}>
                      {seller.first_name
                        ? `${seller.first_name} ${seller.last_name || ""}`.trim()
                        : seller.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {confirmReassign && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Confirmar reasignación</AlertTitle>
                <AlertDescription>
                  Este pedido ya está asignado a otro vendedor. ¿Deseas reasignarlo?
                </AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full"
              onClick={handleAssignToSeller}
              disabled={!selectedSellerId}
            >
              {confirmReassign ? "Confirmar Reasignación" : "Asignar Vendedor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview */}
      <InvoicePreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        order={previewOrder}
        onSendInvoice={() => previewOrder && handleSendInvoice(previewOrder)}
        sending={sendingInvoice}
      />
    </div>
  );
}
