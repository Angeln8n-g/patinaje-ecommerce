"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, RefreshCw, AlertTriangle, ArrowUp, ArrowDown, Receipt } from "lucide-react";
import { getSellerOrders, markOrderAsDispatched } from "@/lib/skating-store/seller-actions";
import { createProductExchange, searchProductsForPOS } from "@/lib/skating-store/pos-actions";
import { Order, Product } from "@/types/skating-store";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FiscalInvoiceDialog } from "@/components/fiscal/FiscalInvoiceDialog";

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
};

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  // Exchange state
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [exchangeOrder, setExchangeOrder] = useState<Order | null>(null);
  const [exchangeOriginalItem, setExchangeOriginalItem] = useState<any>(null);
  const [exchangeSearch, setExchangeSearch] = useState("");
  const [exchangeResults, setExchangeResults] = useState<Product[]>([]);
  const [exchangeNewProduct, setExchangeNewProduct] = useState<Product | null>(null);
  const [exchangeNewQty, setExchangeNewQty] = useState(1);
  const [exchangeJustification, setExchangeJustification] = useState("");
  const [exchangeProcessing, setExchangeProcessing] = useState(false);
  const [exchangeSearching, setExchangeSearching] = useState(false);

  // Fiscal invoice state
  const [fiscalOpen, setFiscalOpen] = useState(false);
  const [fiscalOrderId, setFiscalOrderId] = useState("");
  const [fiscalCustomerName, setFiscalCustomerName] = useState("");

  const loadOrders = async (from?: string, to?: string) => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (from) filters.date_from = from;
      if (to) filters.date_to = to;
      const data = await getSellerOrders(Object.keys(filters).length > 0 ? filters : undefined);
      setOrders(data);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleFilter = () => {
    loadOrders(dateFrom || undefined, dateTo || undefined);
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    loadOrders();
  };

  const handleDispatch = async (orderId: string) => {
    setDispatchingId(orderId);
    try {
      await markOrderAsDispatched(orderId);
      toast.success("Pedido marcado como despachado");
      await loadOrders(dateFrom || undefined, dateTo || undefined);
    } catch (error: any) {
      toast.error(error.message || "Error al despachar pedido");
    } finally {
      setDispatchingId(null);
    }
  };

  const handleOpenExchange = (order: Order, item: any) => {
    setExchangeOrder(order);
    setExchangeOriginalItem(item);
    setExchangeSearch("");
    setExchangeResults([]);
    setExchangeNewProduct(null);
    setExchangeNewQty(1);
    setExchangeJustification("");
    setExchangeOpen(true);
  };

  const handleExchangeSearch = async () => {
    if (!exchangeSearch.trim()) return;
    setExchangeSearching(true);
    try {
      const results = await searchProductsForPOS(exchangeSearch);
      setExchangeResults(results);
    } catch {
      toast.error("Error al buscar productos");
    } finally {
      setExchangeSearching(false);
    }
  };

  const handleConfirmExchange = async () => {
    if (!exchangeOrder || !exchangeOriginalItem || !exchangeNewProduct) return;

    if (!exchangeJustification.trim() || exchangeJustification.trim().length < 5) {
      toast.error("La justificación debe tener al menos 5 caracteres");
      return;
    }

    setExchangeProcessing(true);
    try {
      await createProductExchange(
        exchangeOrder.id,
        exchangeOriginalItem.product_id,
        exchangeOriginalItem.quantity,
        exchangeNewProduct.id,
        exchangeNewQty,
        exchangeJustification.trim()
      );
      toast.success("Cambio de producto realizado correctamente");
      setExchangeOpen(false);
      await loadOrders(dateFrom || undefined, dateTo || undefined);
    } catch (error: any) {
      toast.error(error.message || "Error al procesar el cambio");
    } finally {
      setExchangeProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Historial de Pedidos</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtrar por Fecha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="date-from">Desde</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date-to">Hasta</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <Button onClick={handleFilter}>Filtrar</Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No se encontraron pedidos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      #{order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{order.shipping?.fullName || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {order.order_type === "in_store" ? "Tienda" : "Online"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${order.total.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={order.status === "delivered" ? "default" : "secondary"}
                      >
                        {statusLabels[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status !== "delivered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDispatch(order.id)}
                            disabled={dispatchingId === order.id}
                          >
                            {dispatchingId === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Despachar"
                            )}
                          </Button>
                        )}
                        {order.items && order.items.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenExchange(order, order.items[0])}
                            title="Cambio de producto"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        {(order.status === "delivered" || order.status === "confirmed") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setFiscalOrderId(order.id);
                              setFiscalCustomerName(order.shipping?.fullName || "");
                              setFiscalOpen(true);
                            }}
                            title="Generar e-CF"
                          >
                            <Receipt className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Exchange Dialog */}
      <Dialog open={exchangeOpen} onOpenChange={setExchangeOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Cambio de Producto
            </DialogTitle>
          </DialogHeader>

          {exchangeOrder && exchangeOriginalItem && (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Pedido #{exchangeOrder.id.slice(0, 8)}</p>
                <p className="font-medium">Producto original a devolver:</p>
              </div>

              {/* Select which item to exchange */}
              <div className="space-y-2">
                {exchangeOrder.items.map((item: any, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setExchangeOriginalItem(item)}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                      exchangeOriginalItem?.product_id === item.product_id
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:bg-muted/50"
                    }`}
                  >
                    <span className="font-medium">{item.name || item.product_name}</span>
                    <span className="text-muted-foreground ml-2">
                      x{item.quantity} — ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="font-medium text-sm">Buscar producto nuevo:</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del producto..."
                    value={exchangeSearch}
                    onChange={(e) => setExchangeSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleExchangeSearch()}
                  />
                  <Button size="sm" onClick={handleExchangeSearch} disabled={exchangeSearching}>
                    {exchangeSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                  </Button>
                </div>

                {exchangeResults.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {exchangeResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setExchangeNewProduct(p)}
                        className={`w-full text-left p-2 rounded text-sm transition-colors ${
                          exchangeNewProduct?.id === p.id
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        {p.name} — ${p.price.toFixed(2)} (Stock: {p.stock})
                      </button>
                    ))}
                  </div>
                )}

                {exchangeNewProduct && (
                  <div className="space-y-2">
                    <Label>Cantidad del producto nuevo</Label>
                    <Input
                      type="number"
                      min={1}
                      max={exchangeNewProduct.stock}
                      value={exchangeNewQty}
                      onChange={(e) => setExchangeNewQty(parseInt(e.target.value) || 1)}
                    />
                  </div>
                )}
              </div>

              {/* Price difference alert */}
              {exchangeNewProduct && exchangeOriginalItem && (() => {
                const originalTotal = (exchangeOriginalItem.price || 0) * (exchangeOriginalItem.quantity || 0);
                const newTotal = exchangeNewProduct.price * exchangeNewQty;
                const difference = newTotal - originalTotal;

                if (Math.abs(difference) < 0.01) return null;

                if (difference > 0) {
                  return (
                    <Alert className="border-amber-300 bg-amber-50">
                      <ArrowUp className="h-4 w-4 text-amber-600" />
                      <AlertTitle className="text-amber-800">Cobrar diferencia al cliente</AlertTitle>
                      <AlertDescription className="text-amber-700">
                        El producto nuevo es más caro. El cliente debe pasar por caja para pagar la diferencia de <span className="font-bold">${difference.toFixed(2)}</span>.
                      </AlertDescription>
                    </Alert>
                  );
                }

                return (
                  <Alert className="border-green-300 bg-green-50">
                    <ArrowDown className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Devolver diferencia al cliente</AlertTitle>
                    <AlertDescription className="text-green-700">
                      El producto nuevo es más barato.
                      {exchangeOrder?.payment_method === "cash" ? (
                        <> Devuelva <span className="font-bold">${Math.abs(difference).toFixed(2)}</span> en efectivo al cliente.</>
                      ) : (
                        <> La diferencia de <span className="font-bold">${Math.abs(difference).toFixed(2)}</span> se registrará como saldo a favor (pago original con tarjeta).</>
                      )}
                    </AlertDescription>
                  </Alert>
                );
              })()}

              <div className="border-t pt-4 space-y-2">
                <Label>Justificación del cambio *</Label>
                <Textarea
                  placeholder="Explique el motivo del cambio (mínimo 5 caracteres)..."
                  value={exchangeJustification}
                  onChange={(e) => setExchangeJustification(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleConfirmExchange}
                disabled={
                  !exchangeNewProduct ||
                  exchangeJustification.trim().length < 5 ||
                  exchangeProcessing
                }
              >
                {exchangeProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Confirmar Cambio
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fiscal Invoice Dialog */}
      <FiscalInvoiceDialog
        open={fiscalOpen}
        onOpenChange={setFiscalOpen}
        orderId={fiscalOrderId}
        customerName={fiscalCustomerName}
      />
    </div>
  );
}
