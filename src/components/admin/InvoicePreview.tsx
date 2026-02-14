"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Send } from "lucide-react";

interface InvoicePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSendInvoice: () => void;
  sending?: boolean;
}

export function InvoicePreview({ open, onOpenChange, order, onSendInvoice, sending }: InvoicePreviewProps) {
  if (!order) return null;

  const shipping = order.shipping || {};
  const items = order.items || [];
  const isPaid = order.payment_status === "paid";
  const date = new Date(order.created_at).toLocaleDateString("es-DO", {
    year: "numeric", month: "long", day: "numeric",
  });
  const paymentLabel = order.payment_method === "card" ? "Tarjeta" : "Efectivo";
  const invoicePrefix = isPaid ? "FAC" : "PRE";
  const invoiceNumber = `${invoicePrefix}-${new Date(order.created_at).getFullYear()}-${order.id.substring(0, 6).toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="bg-black text-center py-5 px-6 rounded-t-lg">
          <DialogTitle className="text-[#D7F000] text-xl font-black uppercase tracking-widest">
            RD PATINA
          </DialogTitle>
          <p className="text-zinc-400 text-xs mt-1">
            {isPaid ? "Factura" : "Pre-Factura"}
          </p>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Header info */}
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Número:</p>
              <p className="font-bold">{invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Fecha:</p>
              <p className="text-sm">{date}</p>
            </div>
          </div>

          {/* Status badge */}
          <div className={`text-center py-2 px-4 rounded-lg border text-xs font-bold uppercase tracking-wider ${
            isPaid
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          }`}>
            {isPaid ? "PAGADO" : "PENDIENTE DE PAGO"}
          </div>

          {/* Customer info */}
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
            <p className="text-xs text-muted-foreground">Cliente:</p>
            <p className="font-semibold">{shipping.fullName || order.customer_name || "—"}</p>
            <p className="text-muted-foreground">
              {shipping.address || order.customer_address || ""}
              {(shipping.city || order.customer_city) && `, ${shipping.city || order.customer_city}`}
            </p>
            <p className="text-muted-foreground">{shipping.phone || order.customer_phone || ""}</p>
            <p className="text-muted-foreground">{order.customer_email || shipping.email || ""}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Método de pago: <span className="font-medium text-foreground">{paymentLabel}</span>
            </p>
          </div>

          {/* Items table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left py-2 px-3 font-semibold text-xs">Producto</th>
                  <th className="text-center py-2 px-3 font-semibold text-xs">Cant.</th>
                  <th className="text-right py-2 px-3 font-semibold text-xs">Precio</th>
                  <th className="text-right py-2 px-3 font-semibold text-xs">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => {
                  const name = item.product?.name || "Producto";
                  const variant = item.selectedVariant ? ` (${item.selectedVariant})` : "";
                  const price = item.product?.price || 0;
                  const lineTotal = price * item.quantity;
                  return (
                    <tr key={idx} className="border-t">
                      <td className="py-2 px-3">{name}{variant}</td>
                      <td className="py-2 px-3 text-center">{item.quantity}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(price)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t-2 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t-2 border-black mt-2">
              <span>TOTAL:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 gap-2"
              onClick={onSendInvoice}
              disabled={sending || !order.customer_email}
            >
              <Send className="h-4 w-4" />
              {sending ? "Enviando..." : "Enviar por Correo"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
          {!order.customer_email && (
            <p className="text-xs text-destructive text-center">
              No se puede enviar: el pedido no tiene email del cliente.
            </p>
          )}
        </div>

        <div className="bg-muted/50 border-t py-3 px-6 text-center rounded-b-lg">
          <p className="text-[10px] text-muted-foreground">
            Pedido #{order.id.slice(0, 8).toUpperCase()} • &copy; {new Date().getFullYear()} RD Patina
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
