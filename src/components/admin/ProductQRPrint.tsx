"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Printer, QrCode } from "lucide-react";
import { Product } from "@/types/skating-store";

interface ProductQRPrintProps {
  products: Product[];
}

export function ProductQRPrint({ products }: ProductQRPrintProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showSelector, setShowSelector] = useState(false);

  const productsWithBarcode = products.filter((p) => p.barcode);

  const toggleProduct = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === productsWithBarcode.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(productsWithBarcode.map((p) => p.id)));
    }
  };

  const printSelected = () => {
    const toPrint = productsWithBarcode.filter((p) => selected.has(p.id));
    if (toPrint.length === 0) return;

    // Grab SVGs from the DOM
    const labels: string[] = [];
    toPrint.forEach((p) => {
      const container = document.getElementById("qr-grid-" + p.id);
      const svg = container?.querySelector("svg");
      const svgMarkup = svg ? svg.outerHTML : "";
      labels.push(
        '<div class="label">' + svgMarkup +
        "<h3>" + p.name + "</h3>" +
        '<p class="code">' + p.barcode + "</p>" +
        '<p class="price">$' + p.price.toFixed(2) + "</p>" +
        "</div>"
      );
    });

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(
      "<!DOCTYPE html><html><head><title>Imprimir Códigos QR</title>" +
      "<style>" +
      "body{margin:0;padding:16px;font-family:Arial,sans-serif}" +
      ".grid{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}" +
      ".label{display:inline-flex;flex-direction:column;align-items:center;" +
      "border:1px dashed #ccc;padding:12px;width:180px;page-break-inside:avoid}" +
      ".label svg{width:120px;height:120px}" +
      ".label h3{margin:6px 0 2px;font-size:12px;text-align:center;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".label .code{margin:2px 0;font-size:9px;color:#666;font-family:monospace}" +
      ".label .price{font-size:14px;font-weight:bold;margin-top:4px}" +
      "@media print{.label{border:1px dashed #999}}" +
      "</style></head><body>" +
      '<div class="grid">' + labels.join("") + "</div>" +
      "<script>setTimeout(function(){window.print()},200)<\/script>" +
      "</body></html>"
    );
    printWindow.document.close();
  };

  if (!showSelector) {
    return (
      <Button variant="outline" onClick={() => setShowSelector(true)} className="gap-2">
        <QrCode className="h-4 w-4" />
        Imprimir QR
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowSelector(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={selectAll} variant="ghost">
            {selected.size === productsWithBarcode.length ? "Deseleccionar todo" : "Seleccionar todo"}
          </Button>
          <span className="text-sm text-muted-foreground">
            {selected.size} de {productsWithBarcode.length} seleccionados
          </span>
        </div>
        <Button onClick={printSelected} disabled={selected.size === 0} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir ({selected.size})
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {productsWithBarcode.map((product) => (
          <button
            key={product.id}
            id={"qr-grid-" + product.id}
            type="button"
            onClick={() => toggleProduct(product.id)}
            className={"flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors text-center " +
              (selected.has(product.id) ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent")
            }
          >
            <QRCodeSVG value={product.barcode!} size={72} level="M" />
            <p className="text-xs font-medium truncate w-full">{product.name}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{product.barcode}</p>
          </button>
        ))}
      </div>

      {productsWithBarcode.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay productos con código de barras asignado.
        </p>
      )}
    </div>
  );
}
