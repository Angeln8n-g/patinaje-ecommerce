"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, DollarSign } from "lucide-react";
import { openCashSession, closeCashSession } from "@/lib/skating-store/pos-actions";
import { PosSession, CashSessionSummary } from "@/types/skating-store";
import { toast } from "sonner";

interface CashSessionManagerProps {
  activeSession: PosSession | null;
  onSessionChange: (session: PosSession | null) => void;
}

export function CashSessionManager({ activeSession, onSessionChange }: CashSessionManagerProps) {
  const [initialAmount, setInitialAmount] = useState("");
  const [reportedAmount, setReportedAmount] = useState("");
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [summary, setSummary] = useState<CashSessionSummary | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);

  const handleOpen = async () => {
    const amount = parseFloat(initialAmount) || 0;
    if (amount < 0) {
      toast.error("El monto inicial no puede ser negativo");
      return;
    }

    setOpening(true);
    try {
      const session = await openCashSession(amount);
      onSessionChange(session);
      setInitialAmount("");
      toast.success("Sesión de caja abierta");
    } catch (error: any) {
      toast.error(error.message || "Error al abrir sesión de caja");
    } finally {
      setOpening(false);
    }
  };

  const handleClose = async () => {
    if (!activeSession) return;

    const reported = parseFloat(reportedAmount);
    if (isNaN(reported) || reported < 0) {
      toast.error("Ingrese un monto válido");
      return;
    }

    setClosing(true);
    try {
      const result = await closeCashSession(activeSession.id, reported);
      setSummary(result);
      setShowCloseDialog(false);
      setShowSummaryDialog(true);
      setReportedAmount("");
      onSessionChange(null);
      toast.success("Sesión de caja cerrada");
    } catch (error: any) {
      toast.error(error.message || "Error al cerrar sesión de caja");
    } finally {
      setClosing(false);
    }
  };

  // No active session — show open form
  if (!activeSession) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Abrir Sesión de Caja
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Debe abrir una sesión de caja antes de realizar ventas.
          </p>
          <div className="space-y-1">
            <Label htmlFor="initial-amount">Monto Inicial en Caja</Label>
            <Input
              id="initial-amount"
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={handleOpen} disabled={opening}>
            {opening && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Abrir Caja
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Active session — show status badge and close button
  return (
    <>
      <div className="flex items-center gap-3">
        <Badge variant="default" className="gap-1">
          <DollarSign className="h-3 w-3" />
          Caja Abierta
        </Badge>
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Cerrar Caja
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cerrar Sesión de Caja</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ingrese el monto real en caja para comparar con el esperado.
              </p>
              <div className="space-y-1">
                <Label htmlFor="reported-amount">Monto Real en Caja</Label>
                <Input
                  id="reported-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={reportedAmount}
                  onChange={(e) => setReportedAmount(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleClose} disabled={closing}>
                {closing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirmar Cierre
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary dialog after closing */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resumen de Caja</DialogTitle>
          </DialogHeader>
          {summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Ventas</p>
                  <p className="font-bold text-lg">${summary.total_sales.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Transacciones</p>
                  <p className="font-bold text-lg">{summary.transaction_count}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Ventas en Efectivo</span>
                  <span className="font-medium">${summary.total_cash_sales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas con Tarjeta</span>
                  <span className="font-medium">${summary.total_card_sales.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Monto Esperado</span>
                  <span className="font-medium">${summary.expected_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monto Reportado</span>
                  <span className="font-medium">${summary.reported_amount.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between font-bold ${summary.difference >= 0 ? "text-green-600" : "text-destructive"}`}>
                  <span>Diferencia</span>
                  <span>${summary.difference.toFixed(2)}</span>
                </div>
              </div>

              <Button className="w-full" onClick={() => setShowSummaryDialog(false)}>
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
