"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Send } from "lucide-react";
import { getFiscalConfig } from "@/lib/skating-store/fiscal-actions";

const ITBIS_RATE = 0.18;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getItemPrice(item: any): number {
  if (item.selectedVariant && item.product?.variant_prices && item.product.variant_prices[item.selectedVariant] != null) {
    return item.product.variant_prices[item.selectedVariant];
  }
  return item.product?.price || 0;
}

interface InvoicePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSendInvoice: () => void;
  sending?: boolean;
}

export function InvoicePreview({ open, onOpenChange, order, onSendInvoice, sending }: InvoicePreviewProps) {
  const [storeConfig, setStoreConfig] = useState<any>(null);

  useEffect(() => {
    if (open) {
      getFiscalConfig().then(setStoreConfig).catch(() => setStoreConfig(null));
    }
  }, [open]);

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

  // Calculate ITBIS from product totals
  const productTotal = items.reduce((sum: number, item: any) => sum + getItemPrice(item) * (item.quantity || 1), 0);
  const subtotalSinItbis = round2(productTotal / (1 + ITBIS_RATE));
  const totalItbis = round2(productTotal - subtotalSinItbis);

  // Fiscal data from order (if stored)
  const fiscalData = order.fiscal_data || order.fiscalData || null;

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
          {storeConfig?.rnc_emisor && (
            <div className="mt-2">
              <p className="text-zinc-400 text-[10px]">
                {storeConfig.razon_social} • RNC: {storeConfig.rnc_emisor}
              </p>
              {storeConfig.direccion_fiscal && (
                <p className="text-zinc-500 text-[9px]">
                  {storeConfig.direccion_fiscal}{storeConfig.telefono ? ` • Tel: ${storeConfig.telefono}` : ""}
                </p>
              )}
            </div>
          )}
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

          {/* Fiscal data section */}
          {fiscalData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-1">
              <p className="font-bold text-blue-800 text-xs">📋 Datos Fiscales</p>
              {fiscalData.rnc && (
                <p className="text-muted-foreground">RNC / Cédula: <span className="font-semibold text-foreground">{fiscalData.rnc}</span></p>
              )}
              <p className="text-muted-foreground">Nombre: <span className="font-semibold text-foreground">{fiscalData.nombre}</span></p>
              <p className="text-muted-foreground">Tipo: <span className="text-foreground">
                {fiscalData.tipoComprador === "persona_juridica" ? "Persona Jurídica" : fiscalData.tipoComprador === "persona_fisica" ? "Persona Física" : "Consumidor Final"}
              </span></p>
              <p className="text-muted-foreground">Comprobante: <span className="text-foreground">
                {fiscalData.tipoComprobante === "31" ? "Crédito Fiscal (31)" : "Consumo (32)"}
              </span></p>
            </div>
          )}

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
                  <th className="text-right py-2 px-3 font-semibold text-xs">ITBIS</th>
                  <th className="text-right py-2 px-3 font-semibold text-xs">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, idx: number) => {
                  const name = item.product?.name || "Producto";
                  const variant = item.selectedVariant ? ` (${item.selectedVariant})` : "";
                  const price = getItemPrice(item);
                  const lineTotal = price * (item.quantity || 1);
                  const lineItbis = round2(lineTotal - round2(lineTotal / (1 + ITBIS_RATE)));
                  return (
                    <tr key={idx} className="border-t">
                      <td className="py-2 px-3">{name}{variant}</td>
                      <td className="py-2 px-3 text-center">{item.quantity}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(price)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrency(lineItbis)}</td>
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
              <span className="text-muted-foreground">Subtotal (sin ITBIS):</span>
              <span>{formatCurrency(subtotalSinItbis)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ITBIS (18%):</span>
              <span>{formatCurrency(totalItbis)}</span>
            </div>
            {order.shipping_cost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Envío:</span>
                <span>{formatCurrency(order.shipping_cost)}</span>
              </div>
            )}
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
