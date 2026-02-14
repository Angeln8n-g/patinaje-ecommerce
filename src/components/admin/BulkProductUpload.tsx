"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download, Loader2, X, Eye } from "lucide-react";
import { bulkCreateProducts } from "@/lib/skating-store/product-actions";

interface ParsedRow {
  name: string;
  description: string;
  price: string | number;
  category: string;
  stock: string | number;
  images: string[];
  featured: boolean;
  barcode: string;
  variant_type: string;
  variant_options: string[];
  supplier: string;
  purchase_price: string | number;
  [key: string]: any;
}

interface UploadResult {
  total: number;
  created: number;
  failed: number;
  errors: { row: number; name: string; error: string }[];
}

// Map common Spanish/English column names to our fields
const COLUMN_MAP: Record<string, string> = {
  nombre: "name", name: "name", producto: "name",
  descripcion: "description", descripción: "description", description: "description",
  precio: "price", price: "price", "precio venta": "price", "precio_venta": "price",
  categoria: "category", categoría: "category", category: "category",
  stock: "stock", cantidad: "stock", inventario: "stock",
  imagen: "images", imagenes: "images", imágenes: "images", images: "images", image: "images", "imagen url": "images", imagen_url: "images",
  destacado: "featured", featured: "featured",
  codigo: "barcode", código: "barcode", barcode: "barcode", "codigo de barras": "barcode", sku: "barcode",
  variante: "variant_type", variant_type: "variant_type", "tipo variante": "variant_type",
  opciones: "variant_options", variant_options: "variant_options", "opciones variante": "variant_options",
  proveedor: "supplier", supplier: "supplier",
  costo: "purchase_price", "precio compra": "purchase_price", "precio_compra": "purchase_price", purchase_price: "purchase_price",
};

function normalizeColumnName(col: string): string {
  const cleaned = col.trim().toLowerCase().replace(/[_\-]/g, " ").replace(/\s+/g, " ");
  return COLUMN_MAP[cleaned] || cleaned;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === "," || ch === ";") { row.push(current.trim()); current = ""; }
      else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        row.push(current.trim()); current = "";
        if (row.some(c => c !== "")) rows.push(row);
        row = [];
        if (ch === "\r") i++;
      } else { current += ch; }
    }
  }
  row.push(current.trim());
  if (row.some(c => c !== "")) rows.push(row);
  return rows;
}

function mapRowToProduct(headers: string[], values: string[]): ParsedRow {
  const product: any = {
    name: "", description: "", price: 0, category: "", stock: 0,
    images: [], featured: false, barcode: "", variant_type: "none",
    variant_options: [], supplier: "", purchase_price: 0,
  };

  headers.forEach((header, i) => {
    const field = normalizeColumnName(header);
    const val = (values[i] || "").trim();
    if (!val) return;

    switch (field) {
      case "name": product.name = val; break;
      case "description": product.description = val; break;
      case "price": product.price = parseFloat(val.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0; break;
      case "category": product.category = val.toLowerCase().replace(/\s+/g, "-"); break;
      case "stock": product.stock = parseInt(val) || 0; break;
      case "images":
        product.images = val.split("|").map((u: string) => u.trim()).filter(Boolean);
        break;
      case "featured":
        product.featured = ["si", "sí", "yes", "true", "1"].includes(val.toLowerCase());
        break;
      case "barcode": product.barcode = val; break;
      case "variant_type":
        if (["size", "measurement", "talla", "medida"].includes(val.toLowerCase())) {
          product.variant_type = val.toLowerCase() === "talla" ? "size" : val.toLowerCase() === "medida" ? "measurement" : val.toLowerCase();
        }
        break;
      case "variant_options":
        product.variant_options = val.split("|").map((v: string) => v.trim()).filter(Boolean);
        break;
      case "supplier": product.supplier = val; break;
      case "purchase_price": product.purchase_price = parseFloat(val.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0; break;
    }
  });

  return product;
}

export function BulkProductUpload({ onComplete }: { onComplete?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [parsedProducts, setParsedProducts] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setParsedProducts([]);
    setHeaders([]);
    setFileName("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    setFileName(file.name);

    try {
      if (ext === "csv" || ext === "txt") {
        const text = await file.text();
        const rows = parseCSV(text);
        if (rows.length < 2) { toast.error("El archivo debe tener al menos una fila de encabezados y una de datos"); return; }
        const hdrs = rows[0];
        const products = rows.slice(1).map(row => mapRowToProduct(hdrs, row)).filter(p => p.name);
        setHeaders(hdrs.map(normalizeColumnName));
        setParsedProducts(products);
        setStep("preview");
      } else if (ext === "xlsx" || ext === "xls") {
        // Dynamic import of xlsx library
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        if (rows.length < 2) { toast.error("La hoja debe tener al menos encabezados y una fila de datos"); return; }
        const hdrs = rows[0].map(String);
        const products = rows.slice(1).map(row => mapRowToProduct(hdrs, row.map(String))).filter(p => p.name);
        setHeaders(hdrs.map(normalizeColumnName));
        setParsedProducts(products);
        setStep("preview");
      } else {
        toast.error("Formato no soportado. Usa CSV o Excel (.xlsx)");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al leer el archivo");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleUpload = async () => {
    if (parsedProducts.length === 0) return;
    setIsUploading(true);
    try {
      const res = await bulkCreateProducts(parsedProducts);
      setResult(res);
      setStep("result");
      if (res.created > 0) {
        toast.success(`${res.created} producto${res.created > 1 ? "s" : ""} creado${res.created > 1 ? "s" : ""}`);
        onComplete?.();
      }
      if (res.failed > 0) {
        toast.warning(`${res.failed} producto${res.failed > 1 ? "s" : ""} con errores`);
      }
    } catch (err: any) {
      toast.error(err.message || "Error en la carga masiva");
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = "nombre,descripcion,precio,categoria,stock,imagenes,destacado,codigo,proveedor,precio_compra";
    const example = 'Ruedas Pro 54mm,Ruedas de skateboard profesionales,1500,ruedas,25,https://ejemplo.com/img1.jpg|https://ejemplo.com/img2.jpg,si,SK-001,ProveedorX,800';
    const csv = headers + "\n" + example;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_productos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button variant="outline" onClick={() => { reset(); setIsOpen(true); }}>
        <Upload className="mr-2 h-4 w-4" />
        Carga Masiva
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) setIsOpen(false); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Carga Masiva de Productos
            </DialogTitle>
            <DialogDescription>
              Sube un archivo CSV o Excel con tus productos
            </DialogDescription>
          </DialogHeader>

          {step === "upload" && (
            <div className="space-y-6 py-4">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-1">Arrastra tu archivo aquí</p>
                <p className="text-sm text-muted-foreground mb-4">o haz clic para seleccionar</p>
                <p className="text-xs text-muted-foreground">CSV, Excel (.xlsx, .xls)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                <div>
                  <p className="font-medium text-sm">¿No tienes un archivo listo?</p>
                  <p className="text-xs text-muted-foreground">Descarga nuestra plantilla con las columnas correctas</p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Plantilla
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1 p-4 rounded-lg border bg-muted/30">
                <p className="font-semibold text-foreground mb-2">Columnas soportadas:</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <p><span className="font-mono bg-muted px-1 rounded">nombre</span> — Nombre del producto *</p>
                  <p><span className="font-mono bg-muted px-1 rounded">precio</span> — Precio de venta *</p>
                  <p><span className="font-mono bg-muted px-1 rounded">descripcion</span> — Descripción</p>
                  <p><span className="font-mono bg-muted px-1 rounded">categoria</span> — Slug de categoría</p>
                  <p><span className="font-mono bg-muted px-1 rounded">stock</span> — Cantidad disponible</p>
                  <p><span className="font-mono bg-muted px-1 rounded">imagenes</span> — URLs separadas por |</p>
                  <p><span className="font-mono bg-muted px-1 rounded">destacado</span> — si / no</p>
                  <p><span className="font-mono bg-muted px-1 rounded">codigo</span> — Código de barras / SKU</p>
                  <p><span className="font-mono bg-muted px-1 rounded">proveedor</span> — Nombre del proveedor</p>
                  <p><span className="font-mono bg-muted px-1 rounded">precio_compra</span> — Costo de compra</p>
                </div>
                <p className="mt-2 text-muted-foreground">* Campos obligatorios. Las columnas se detectan automáticamente en español o inglés.</p>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm">{fileName}</Badge>
                  <span className="text-sm text-muted-foreground">{parsedProducts.length} producto{parsedProducts.length !== 1 ? "s" : ""} detectado{parsedProducts.length !== 1 ? "s" : ""}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="mr-1 h-4 w-4" /> Cambiar archivo
                </Button>
              </div>

              <div className="rounded-lg border overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead>Imágenes</TableHead>
                      <TableHead>Código</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedProducts.slice(0, 50).map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{p.category || "—"}</Badge></TableCell>
                        <TableCell className="text-right">${Number(p.price).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{p.stock}</TableCell>
                        <TableCell>
                          {p.images.length > 0 ? (
                            <div className="flex -space-x-2">
                              {p.images.slice(0, 3).map((img, j) => (
                                <img key={j} src={img} alt="" className="h-8 w-8 rounded border-2 border-background object-cover" />
                              ))}
                              {p.images.length > 3 && <span className="text-xs text-muted-foreground ml-2">+{p.images.length - 3}</span>}
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.barcode || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedProducts.length > 50 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Mostrando 50 de {parsedProducts.length} productos</p>
                )}
              </div>

              {parsedProducts.some(p => !p.name || !p.price) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Algunos productos no tienen nombre o precio. Serán omitidos.
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={reset}>Cancelar</Button>
                <Button onClick={handleUpload} disabled={isUploading}>
                  {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...</> : <><Upload className="mr-2 h-4 w-4" /> Crear {parsedProducts.length} Productos</>}
                </Button>
              </div>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50 border">
                  <p className="text-3xl font-bold">{result.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-3xl font-bold text-emerald-600">{result.created}</p>
                  <p className="text-sm text-emerald-600">Creados</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-3xl font-bold text-red-600">{result.failed}</p>
                  <p className="text-sm text-red-600">Errores</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-lg border overflow-auto max-h-[250px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fila</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((err, i) => (
                        <TableRow key={i}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell className="font-medium">{err.name}</TableCell>
                          <TableCell className="text-red-500 text-sm">{err.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => { reset(); }}>Cargar otro archivo</Button>
                <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
