"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText } from "lucide-react";

export interface FiscalData {
  rnc: string;
  nombre: string;
  tipoComprador: "persona_juridica" | "persona_fisica" | "consumidor_final";
  tipoComprobante: "31" | "32";
}

interface FiscalInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: FiscalData) => void;
}

export function FiscalInvoiceModal({ open, onOpenChange, onConfirm }: FiscalInvoiceModalProps) {
  const [rnc, setRnc] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipoComprador, setTipoComprador] = useState<FiscalData["tipoComprador"]>("consumidor_final");
  const [tipoComprobante, setTipoComprobante] = useState<FiscalData["tipoComprobante"]>("32");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const requiresRnc = tipoComprador !== "consumidor_final";

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!nombre.trim() || nombre.trim().length < 2) {
      newErrors.nombre = "El nombre o razón social es requerido";
    }
    if (requiresRnc) {
      const cleaned = rnc.replace(/[-\s]/g, "");
      if (!cleaned || (cleaned.length !== 9 && cleaned.length !== 11)) {
        newErrors.rnc = "RNC inválido (9 dígitos) o Cédula (11 dígitos)";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onConfirm({ rnc: rnc.replace(/[-\s]/g, ""), nombre: nombre.trim(), tipoComprador, tipoComprobante });
  };

  const handleTipoCompradorChange = (value: FiscalData["tipoComprador"]) => {
    setTipoComprador(value);
    if (value === "consumidor_final") {
      setTipoComprobante("32");
    } else {
      setTipoComprobante("31");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Comprobante Fiscal
          </DialogTitle>
          <DialogDescription>
            Complete los datos para generar su comprobante fiscal electrónico (e-CF).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="tipoComprador">Tipo de Comprador</Label>
            <Select value={tipoComprador} onValueChange={handleTipoCompradorChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consumidor_final">Consumidor Final</SelectItem>
                <SelectItem value="persona_fisica">Persona Física</SelectItem>
                <SelectItem value="persona_juridica">Persona Jurídica (Empresa)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoComprobante">Tipo de Comprobante</Label>
            <Select value={tipoComprobante} onValueChange={(v) => setTipoComprobante(v as FiscalData["tipoComprobante"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="32">Factura de Consumo (32)</SelectItem>
                <SelectItem value="31" disabled={tipoComprador === "consumidor_final"}>
                  Factura de Crédito Fiscal (31)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requiresRnc && (
            <div className="space-y-2">
              <Label htmlFor="rnc">RNC / Cédula</Label>
              <Input
                id="rnc"
                placeholder="000-00000-0"
                value={rnc}
                onChange={(e) => setRnc(e.target.value)}
              />
              {errors.rnc && <p className="text-sm text-destructive">{errors.rnc}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre / Razón Social</Label>
            <Input
              id="nombre"
              placeholder="Nombre completo o razón social"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            {errors.nombre && <p className="text-sm text-destructive">{errors.nombre}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Confirmar Datos Fiscales
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
