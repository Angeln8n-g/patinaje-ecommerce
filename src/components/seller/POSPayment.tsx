"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, CreditCard, Loader2 } from "lucide-react";
import { PaymentInfo } from "@/types/skating-store";

interface POSPaymentProps {
  total: number;
  onConfirm: (payment: PaymentInfo, customerName: string, customerPhone?: string) => void;
  processing: boolean;
}

export function POSPayment({ total, onConfirm, processing }: POSPaymentProps) {
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const receivedNum = parseFloat(amountReceived) || 0;
  const change = method === "cash" ? receivedNum - total : 0;
  const canConfirm =
    customerName.trim() !== "" &&
    total > 0 &&
    (method === "card" || receivedNum >= total);

  const handleConfirm = () => {
    const payment: PaymentInfo = {
      method,
      ...(method === "cash" ? { amount_received: receivedNum } : {}),
    };
    onConfirm(payment, customerName.trim(), customerPhone.trim() || undefined);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pago</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="customer-name">Nombre del Cliente *</Label>
          <Input
            id="customer-name"
            placeholder="Nombre del cliente"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="customer-phone">Teléfono (opcional)</Label>
          <Input
            id="customer-phone"
            placeholder="Teléfono de contacto"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Método de Pago</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={method === "cash" ? "default" : "outline"}
              className="gap-2"
              onClick={() => setMethod("cash")}
            >
              <Banknote className="h-4 w-4" />
              Efectivo
            </Button>
            <Button
              type="button"
              variant={method === "card" ? "default" : "outline"}
              className="gap-2"
              onClick={() => setMethod("card")}
            >
              <CreditCard className="h-4 w-4" />
              Tarjeta
            </Button>
          </div>
        </div>

        {method === "cash" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="amount-received">Monto Recibido</Label>
              <Input
                id="amount-received"
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
              />
            </div>
            {receivedNum > 0 && (
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Recibido</span>
                  <span>${receivedNum.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between text-sm font-bold ${change >= 0 ? "text-green-600" : "text-destructive"}`}>
                  <span>Cambio</span>
                  <span>${change.toFixed(2)}</span>
                </div>
              </div>
            )}
            {receivedNum > 0 && receivedNum < total && (
              <p className="text-xs text-destructive">
                Monto insuficiente. Faltan ${(total - receivedNum).toFixed(2)}
              </p>
            )}
          </div>
        )}

        <Button
          className="w-full"
          disabled={!canConfirm || processing}
          onClick={handleConfirm}
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Confirmar Venta — ${total.toFixed(2)}
        </Button>
      </CardContent>
    </Card>
  );
}
