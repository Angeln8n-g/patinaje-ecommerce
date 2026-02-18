"use client";

import { useEffect, useState } from "react";
import { getFiscalDashboard, getFiscalInvoices } from "@/lib/skating-store/fiscal-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, FileText, Settings, List, RefreshCw } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

const ESTADO_LABELS: Record<string, string> = {
  pendiente_envio: "Pendiente",
  enviado: "Enviado",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  aceptado_condicional: "Aceptado Cond.",
  en_proceso: "En Proceso",
  anulado: "Anulado",
};

const TIPO_LABELS: Record<string, string> = {
  "31": "Crédito Fiscal",
  "32": "Consumo",
  "33": "Nota Débito",
  "34": "Nota Crédito",
};

const ESTADO_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  aceptado: "default",
  rechazado: "destructive",
  anulado: "destructive",
  pendiente_envio: "outline",
  enviado: "secondary",
  aceptado_condicional: "secondary",
  en_proceso: "secondary",
};

export default function FiscalDashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [dash, inv] = await Promise.all([
        getFiscalDashboard().catch(() => null),
        getFiscalInvoices({
          estado: filtroEstado && filtroEstado !== "all" ? filtroEstado : undefined,
          tipo: filtroTipo && filtroTipo !== "all" ? filtroTipo : undefined,
          desde: filtroDesde || undefined,
          hasta: filtroHasta || undefined,
          limit: 50,
        }).catch(() => null),
      ]);
      setDashboard(dash);
      setInvoices(inv?.data || inv?.invoices || []);
    } catch {
      toast.error("Error al cargar datos fiscales");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleFilter = () => loadData();

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
        <h1 className="text-3xl font-bold">Facturación Fiscal</h1>
        <div className="flex gap-2">
          <Link href="/admin/fiscal/sequences">
            <Button variant="outline" className="gap-2">
              <List className="h-4 w-4" /> Secuencias
            </Button>
          </Link>
          <Link href="/admin/fiscal/config">
            <Button variant="outline" className="gap-2">
              <Settings className="h-4 w-4" /> Configuración
            </Button>
          </Link>
          <Button onClick={loadData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
        </div>
      </div>

      {/* Dashboard cards */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(dashboard.conteos_por_estado || dashboard.porEstado || {}).map(([estado, count]) => (
            <Card key={estado}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {ESTADO_LABELS[estado] || estado}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count as number}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-sm font-medium mb-1 block">Estado</label>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(ESTADO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Tipo</label>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Desde</label>
          <Input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} className="w-[160px]" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Hasta</label>
          <Input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} className="w-[160px]" />
        </div>
        <Button onClick={handleFilter}>Filtrar</Button>
      </div>

      {/* Invoices table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NCF</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Comprador</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No hay comprobantes fiscales
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv: any) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm">{inv.ncf}</TableCell>
                  <TableCell>{TIPO_LABELS[inv.tipo_comprobante] || inv.tipo_comprobante}</TableCell>
                  <TableCell>{inv.comprador_nombre}</TableCell>
                  <TableCell>{formatCurrency(inv.total)}</TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VARIANT[inv.estado_dgii] || "outline"}>
                      {ESTADO_LABELS[inv.estado_dgii] || inv.estado_dgii}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(inv.created_at).toLocaleDateString("es-DO")}</TableCell>
                  <TableCell>
                    <Link href={`/admin/fiscal/${inv.id}`}>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
