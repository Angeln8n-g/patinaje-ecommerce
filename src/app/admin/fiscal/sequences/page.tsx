"use client";

import { useEffect, useState } from "react";
import { getFiscalSequences, createFiscalSequence, getFiscalSequencesStatus } from "@/lib/skating-store/fiscal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

const TIPO_LABELS: Record<string, string> = {
  "31": "Crédito Fiscal", "32": "Consumo", "33": "Nota Débito", "34": "Nota Crédito",
  "41": "Compras", "43": "Gastos Menores", "44": "Reg. Especiales", "45": "Gubernamental",
  "46": "Exportaciones", "47": "Pagos Exterior",
};

export default function FiscalSequencesPage() {
  const [sequences, setSequences] = useState<any[]>([]);
  const [status, setStatus] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ tipo_comprobante: "31", prefijo: "E", rango_inicial: "", rango_final: "", fecha_vencimiento: "" });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [seqs, st] = await Promise.all([getFiscalSequences(), getFiscalSequencesStatus()]);
      setSequences(seqs || []);
      setStatus(st || []);
    } catch {
      toast.error("Error al cargar secuencias");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async () => {
    if (!form.rango_inicial || !form.rango_final || !form.fecha_vencimiento) {
      toast.error("Complete todos los campos"); return;
    }
    try {
      await createFiscalSequence({
        tipo_comprobante: form.tipo_comprobante,
        prefijo: form.prefijo,
        rango_inicial: parseInt(form.rango_inicial),
        rango_final: parseInt(form.rango_final),
        fecha_vencimiento: form.fecha_vencimiento,
      });
      toast.success("Secuencia creada");
      setCreateOpen(false);
      setForm({ tipo_comprobante: "31", prefijo: "E", rango_inicial: "", rango_final: "", fecha_vencimiento: "" });
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Error al crear secuencia");
    }
  };

  const getUsagePercent = (seq: any) => {
    const total = seq.rango_final - seq.rango_inicial + 1;
    const used = seq.numero_actual - seq.rango_inicial;
    return total > 0 ? Math.round((used / total) * 100) : 0;
  };

  if (isLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/fiscal"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button></Link>
          <h1 className="text-2xl font-bold">Secuencias Fiscales</h1>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nueva Secuencia</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear Secuencia Fiscal</DialogTitle></DialogHeader>
            <div className="space-y-3 py-4">
              <div>
                <label className="text-sm font-medium">Tipo de Comprobante</label>
                <Select value={form.tipo_comprobante} onValueChange={(v) => setForm({ ...form, tipo_comprobante: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{k} - {v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Prefijo</label>
                <Input value={form.prefijo} onChange={(e) => setForm({ ...form, prefijo: e.target.value })} maxLength={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Rango Inicial</label>
                  <Input type="number" value={form.rango_inicial} onChange={(e) => setForm({ ...form, rango_inicial: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Rango Final</label>
                  <Input type="number" value={form.rango_final} onChange={(e) => setForm({ ...form, rango_final: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Fecha de Vencimiento</label>
                <Input type="date" value={form.fecha_vencimiento} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} />
              </div>
              <Button onClick={handleCreate} className="w-full">Crear Secuencia</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status cards */}
      {status.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {status.map((s: any) => {
            const pct = s.porcentaje_uso || 0;
            return (
              <Card key={s.tipo_comprobante} className={pct >= 80 ? "border-yellow-500" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{TIPO_LABELS[s.tipo_comprobante] || s.tipo_comprobante}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{pct}% usado</div>
                  <div className="text-xs text-muted-foreground">{s.disponibles} disponibles</div>
                  {pct >= 80 && <Badge variant="destructive" className="mt-1 text-xs">Alerta</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sequences table */}
      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Prefijo</TableHead>
              <TableHead>Rango</TableHead>
              <TableHead>Actual</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sequences.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay secuencias</TableCell>
              </TableRow>
            ) : (
              sequences.map((seq: any) => {
                const pct = getUsagePercent(seq);
                return (
                  <TableRow key={seq.id}>
                    <TableCell>{TIPO_LABELS[seq.tipo_comprobante] || seq.tipo_comprobante}</TableCell>
                    <TableCell className="font-mono">{seq.prefijo}</TableCell>
                    <TableCell className="font-mono">{seq.rango_inicial} - {seq.rango_final}</TableCell>
                    <TableCell className="font-mono">{seq.numero_actual}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 80 ? "bg-yellow-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(seq.fecha_vencimiento).toLocaleDateString("es-DO")}</TableCell>
                    <TableCell>
                      <Badge variant={seq.estado === "activa" ? "default" : "destructive"}>
                        {seq.estado}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
