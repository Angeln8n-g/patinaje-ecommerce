"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFiscalInvoice, annulFiscalInvoice, resendFiscalInvoice, getFiscalInvoicePdf } from "@/lib/skating-store/fiscal-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Download, RefreshCw, XCircle } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

const ESTADO_LABELS: Record<string, string> = {
  pendiente_envio: "Pendiente de Envío",
  enviado: "Enviado",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  aceptado_condicional: "Aceptado Condicional",
  en_proceso: "En Proceso",
  anulado: "Anulado",
};

const TIPO_LABELS: Record<string, string> = {
  "31": "Factura de Crédito Fiscal",
  "32": "Factura de Consumo",
  "33": "Nota de Débito",
  "34": "Nota de Crédito",
};

export default function FiscalInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [annulMotivo, setAnnulMotivo] = useState("");
  const [annulOpen, setAnnulOpen] = useState(false);

  const loadInvoice = async () => {
    setIsLoading(true);
    try {
      const data = await getFiscalInvoice(params.id as string);
      setInvoice(data);
    } catch {
      toast.error("Error al cargar comprobante");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadInvoice(); }, [params.id]);

  const handleDownloadPdf = async () => {
    try {
      const blob = await getFiscalInvoicePdf(params.id as string);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ecf-${invoice?.ncf || params.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al descargar PDF");
    }
  };

  const handleResend = async () => {
    try {
      await resendFiscalInvoice(params.id as string);
      toast.success("e-CF reenviado a la DGII");
      loadInvoice();
    } catch {
      toast.error("Error al reenviar");
    }
  };

  const handleAnnul = async () => {
    if (!annulMotivo.trim()) { toast.error("Ingrese un motivo"); return; }
    try {
      await annulFiscalInvoice(params.id as string, annulMotivo);
      toast.success("e-CF anulado correctamente");
      setAnnulOpen(false);
      loadInvoice();
    } catch (e: any) {
      toast.error(e.message || "Error al anular");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return <div className="text-center py-10 text-muted-foreground">Comprobante no encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/fiscal">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
        </Link>
        <h1 className="text-2xl font-bold">e-CF: {invoice.ncf}</h1>
        <Badge variant={invoice.estado_dgii === "aceptado" ? "default" : invoice.estado_dgii === "rechazado" || invoice.estado_dgii === "anulado" ? "destructive" : "secondary"}>
          {ESTADO_LABELS[invoice.estado_dgii] || invoice.estado_dgii}
        </Badge>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleDownloadPdf} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Descargar PDF
        </Button>
        {invoice.estado_dgii === "rechazado" && (
          <Button onClick={handleResend} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Reenviar
          </Button>
        )}
        {invoice.estado_dgii !== "anulado" && (
          <Dialog open={annulOpen} onOpenChange={setAnnulOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <XCircle className="h-4 w-4" /> Anular
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Anular Comprobante</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <Input placeholder="Motivo de anulación" value={annulMotivo} onChange={(e) => setAnnulMotivo(e.target.value)} />
                <Button onClick={handleAnnul} variant="destructive" className="w-full">Confirmar Anulación</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Datos del Comprobante</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">NCF:</span><span className="font-mono">{invoice.ncf}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><span>{TIPO_LABELS[invoice.tipo_comprobante] || invoice.tipo_comprobante}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Track ID:</span><span className="font-mono">{invoice.track_id || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Intentos envío:</span><span>{invoice.intentos_envio}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fecha:</span><span>{new Date(invoice.created_at).toLocaleString("es-DO")}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Comprador</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Nombre:</span><span>{invoice.comprador_nombre}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">RNC:</span><span className="font-mono">{invoice.comprador_rnc || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><span>{invoice.comprador_tipo}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Montos</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span>{formatCurrency(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ITBIS:</span><span>{formatCurrency(invoice.total_itbis)}</span></div>
            <div className="flex justify-between font-bold"><span>Total:</span><span>{formatCurrency(invoice.total)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Acuse y Aprobación</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Acuse recibido:</span><span>{invoice.acuse_recibido ? "Sí" : "No"}</span></div>
            {invoice.acuse_fecha && <div className="flex justify-between"><span className="text-muted-foreground">Fecha acuse:</span><span>{new Date(invoice.acuse_fecha).toLocaleString("es-DO")}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Aprobación comercial:</span><span>{invoice.aprobacion_comercial ? "Sí" : "No"}</span></div>
            {invoice.aprobacion_fecha && <div className="flex justify-between"><span className="text-muted-foreground">Fecha aprobación:</span><span>{new Date(invoice.aprobacion_fecha).toLocaleString("es-DO")}</span></div>}
          </CardContent>
        </Card>
      </div>

      {invoice.motivo_rechazo && (
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-lg text-destructive">Motivo de Rechazo</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{invoice.motivo_rechazo}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
