"use client";

import { useState } from "react";
import { createFiscalInvoice } from "@/lib/skating-store/fiscal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Receipt } from "lucide-react";

interface FiscalInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  customerName?: string;
}

export function FiscalInvoiceDialog({ open, onOpenChange, orderId, customerName }: FiscalInvoiceDialogProps) {
  const [tipoComprobante, setTipoComprobante] = useState("32");
  const [compradorTipo, setCompradorTipo] = useState("consumidor_final");
  const [compradorNombre, setCompradorNombre] = useState(customerName || "");
  const [compradorRnc, setCompradorRnc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!compradorNombre.trim()) { toast.error("Ingrese el nombre del comprador"); return; }
    if (compradorTipo === "persona_juridica" && !compradorRnc.trim()) { toast.error("RNC requerido para persona jurídica"); return; }

    setIsSubmitting(true);
    try {
      await createFiscalInvoice({
        order_id: orderId,
        tipo_comprobante: tipoComprobante,
        comprador_nombre: compradorNombre,
        comprador_tipo: compradorTipo,
        comprador_rnc: compradorTipo !== "consumidor_final" ? compradorRnc : undefined,
      });
      toast.success("e-CF generado correctamente");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Error al generar e-CF");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Generar Comprobante Fiscal</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium">Tipo de Comprobante</label>
            <Select value={tipoComprobante} onValueChange={(v) => {
              setTipoComprobante(v);
              if (v === "32") setCompradorTipo("consumidor_final");
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="31">31 - Crédito Fiscal</SelectItem>
                <SelectItem value="32">32 - Consumo</SelectItem>
                <SelectItem value="33">33 - Nota de Débito</SelectItem>
                <SelectItem value="34">34 - Nota de Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Tipo de Comprador</label>
            <Select value={compradorTipo} onValueChange={setCompradorTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
                <SelectItem value="persona_juridica">Persona Jurídica</SelectItem>
                <SelectItem value="persona_fisica">Persona Física</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Nombre del Comprador</label>
            <Input value={compradorNombre} onChange={(e) => setCompradorNombre(e.target.value)} />
          </div>
          {compradorTipo !== "consumidor_final" && (
            <div>
              <label className="text-sm font-medium">RNC del Comprador</label>
              <Input value={compradorRnc} onChange={(e) => setCompradorRnc(e.target.value)} placeholder="9 u 11 dígitos" />
            </div>
          )}
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
            Generar e-CF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
