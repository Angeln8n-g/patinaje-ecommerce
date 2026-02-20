"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

type CancelRole = "USER" | "DELIVERY" | "SELLER" | "ADMIN";

interface ReasonOption {
  code: string;
  label: string;
}

const REASONS_BY_ROLE: Record<Exclude<CancelRole, "ADMIN">, ReasonOption[]> = {
  USER: [
    { code: "user_error", label: "Pedido por error" },
    { code: "user_not_needed", label: "Ya no lo necesito" },
    { code: "user_better_price", label: "Encontré mejor precio" },
    { code: "user_other", label: "Otro" },
  ],
  DELIVERY: [
    { code: "delivery_absent", label: "Cliente no presente" },
    { code: "delivery_no_pay", label: "Cliente no paga" },
    { code: "delivery_unreachable", label: "No es posible llegar al destino" },
    { code: "delivery_other", label: "Otro" },
  ],
  SELLER: [
    { code: "seller_no_pay", label: "Cliente no paga" },
    { code: "seller_dismissed", label: "Cliente desestima la compra" },
    { code: "seller_unavailable", label: "Producto no disponible" },
    { code: "seller_other", label: "Otro" },
  ],
};

interface CancelOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: CancelRole;
  onConfirm: (reasonCode: string, reasonDescription?: string) => Promise<void>;
  loading?: boolean;
}

export function CancelOrderModal({
  open,
  onOpenChange,
  role,
  onConfirm,
  loading = false,
}: CancelOrderModalProps) {
  const [reasonCode, setReasonCode] = useState("");
  const [reasonDescription, setReasonDescription] = useState("");
  const [error, setError] = useState("");

  const isAdmin = role === "ADMIN";
  const reasons = isAdmin ? [] : REASONS_BY_ROLE[role];
  const requiresDescription =
    isAdmin || reasonCode.endsWith("_other");

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setReasonCode("");
      setReasonDescription("");
      setError("");
    }
    onOpenChange(value);
  };

  const handleConfirm = async () => {
    setError("");

    if (!isAdmin && !reasonCode) {
      setError("Debe seleccionar un motivo de cancelación");
      return;
    }

    if (requiresDescription && reasonDescription.trim().length < 10) {
      setError("La descripción debe tener al menos 10 caracteres");
      return;
    }

    const code = isAdmin ? "admin_custom" : reasonCode;
    const description = requiresDescription
      ? reasonDescription.trim()
      : undefined;

    await onConfirm(code, description);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar pedido</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Ingrese el motivo de la cancelación."
              : "Seleccione el motivo por el cual desea cancelar este pedido."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Motivo</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger id="cancel-reason" className="w-full">
                  <SelectValue placeholder="Seleccione un motivo" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {requiresDescription && (
            <div className="space-y-2">
              <Label htmlFor="cancel-description">
                Descripción{" "}
                <span className="text-muted-foreground font-normal">
                  (mínimo 10 caracteres)
                </span>
              </Label>
              <Textarea
                id="cancel-description"
                placeholder="Describa el motivo de la cancelación..."
                value={reasonDescription}
                onChange={(e) => setReasonDescription(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || (!isAdmin && !reasonCode)}
          >
            {loading && <Loader2 className="animate-spin" />}
            Confirmar cancelación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
