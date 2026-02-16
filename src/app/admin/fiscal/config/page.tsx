"use client";

import { useEffect, useState } from "react";
import { getFiscalConfig, updateFiscalConfig, uploadFiscalCertificate, getFiscalConfigHistory } from "@/lib/skating-store/fiscal-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";

export default function FiscalConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cfg, hist] = await Promise.all([getFiscalConfig(), getFiscalConfigHistory()]);
      setConfig(cfg);
      setHistory(hist || []);
    } catch {
      toast.error("Error al cargar configuración");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    if (!config) return;
    setIsSaving(true);
    try {
      await updateFiscalConfig({
        rnc_emisor: config.rnc_emisor,
        razon_social: config.razon_social,
        nombre_comercial: config.nombre_comercial,
        direccion_fiscal: config.direccion_fiscal,
        telefono: config.telefono,
        correo: config.correo,
        dgii_ws_url_pruebas: config.dgii_ws_url_pruebas,
        dgii_ws_url_produccion: config.dgii_ws_url_produccion,
        ambiente: config.ambiente,
      });
      toast.success("Configuración guardada");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadCert = async () => {
    if (!certFile) { toast.error("Seleccione un archivo .p12"); return; }
    if (!certPassword) { toast.error("Ingrese la contraseña del certificado"); return; }
    const formData = new FormData();
    formData.append("certificate", certFile);
    formData.append("password", certPassword);
    try {
      await uploadFiscalCertificate(formData);
      toast.success("Certificado cargado correctamente");
      setCertFile(null);
      setCertPassword("");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Error al cargar certificado");
    }
  };

  const updateField = (field: string, value: string) => {
    setConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/fiscal"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button></Link>
        <h1 className="text-2xl font-bold">Configuración Fiscal</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Datos del Emisor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">RNC</label>
              <Input value={config?.rnc_emisor || ""} onChange={(e) => updateField("rnc_emisor", e.target.value)} placeholder="9 u 11 dígitos" />
            </div>
            <div>
              <label className="text-sm font-medium">Razón Social</label>
              <Input value={config?.razon_social || ""} onChange={(e) => updateField("razon_social", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Nombre Comercial</label>
              <Input value={config?.nombre_comercial || ""} onChange={(e) => updateField("nombre_comercial", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Dirección Fiscal</label>
              <Input value={config?.direccion_fiscal || ""} onChange={(e) => updateField("direccion_fiscal", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Teléfono</label>
              <Input value={config?.telefono || ""} onChange={(e) => updateField("telefono", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Correo</label>
              <Input value={config?.correo || ""} onChange={(e) => updateField("correo", e.target.value)} type="email" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Conexión DGII</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">Ambiente</label>
                <Select value={config?.ambiente || "pruebas"} onValueChange={(v) => updateField("ambiente", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pruebas">Pruebas</SelectItem>
                    <SelectItem value="produccion">Producción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">URL WS Pruebas</label>
                <Input value={config?.dgii_ws_url_pruebas || ""} onChange={(e) => updateField("dgii_ws_url_pruebas", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">URL WS Producción</label>
                <Input value={config?.dgii_ws_url_produccion || ""} onChange={(e) => updateField("dgii_ws_url_produccion", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Certificado Digital</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {config?.certificado_valido_hasta && (
                <p className="text-sm text-muted-foreground">
                  Válido hasta: {new Date(config.certificado_valido_hasta).toLocaleDateString("es-DO")}
                </p>
              )}
              <Input type="file" accept=".p12,.pfx" onChange={(e) => setCertFile(e.target.files?.[0] || null)} />
              <Input type="password" placeholder="Contraseña del certificado" value={certPassword} onChange={(e) => setCertPassword(e.target.value)} />
              <Button onClick={handleUploadCert} variant="outline" className="gap-2 w-full">
                <Upload className="h-4 w-4" /> Cargar Certificado
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="gap-2">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Guardar Configuración
      </Button>

      {/* Config history */}
      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Historial de Cambios</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Campos Modificados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell>{new Date(h.created_at).toLocaleString("es-DO")}</TableCell>
                    <TableCell>{(h.campos_modificados || []).join(", ")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
