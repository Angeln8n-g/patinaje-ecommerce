"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ScanBarcode } from "lucide-react";
import { searchProductsForPOS } from "@/lib/skating-store/pos-actions";
import { Product } from "@/types/skating-store";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";

interface POSProductSearchProps {
  onSelectProduct: (product: Product) => void;
}

export function POSProductSearch({ onSelectProduct }: POSProductSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchProductsForPOS(query);
        setResults(data);
        setShowResults(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (product: Product) => {
    onSelectProduct(product);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const handleBarcodeScan = useCallback(async (decodedText: string) => {
    setShowScanner(false);
    setSearching(true);
    try {
      const data = await searchProductsForPOS(decodedText);
      if (data.length === 1) {
        // Exact match — add directly to cart
        onSelectProduct(data[0]);
      } else if (data.length > 1) {
        setResults(data);
        setShowResults(true);
        setQuery(decodedText);
      } else {
        setQuery(decodedText);
        setResults([]);
        setShowResults(true);
      }
    } catch {
      setQuery(decodedText);
    } finally {
      setSearching(false);
    }
  }, [onSelectProduct]);

  return (
    <div ref={containerRef} className="relative space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o código de barras..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            className="pl-10"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          type="button"
          variant={showScanner ? "destructive" : "outline"}
          size="icon"
          onClick={() => setShowScanner(!showScanner)}
          title={showScanner ? "Cerrar escáner" : "Escanear código"}
        >
          <ScanBarcode className="h-4 w-4" />
        </Button>
      </div>

      {showScanner && (
        <div className="rounded-lg border p-3 bg-muted/30">
          <BarcodeScanner onScan={handleBarcodeScan} autoStart />
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-64 overflow-y-auto" style={{ top: showScanner ? "auto" : undefined }}>
          {results.map((product) => (
            <button
              key={product.id}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0"
              onClick={() => handleSelect(product)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Stock: {product.stock}
                    {product.barcode && <span className="ml-2">| Código: {product.barcode}</span>}
                  </p>
                </div>
                <span className="text-sm font-semibold">${product.price.toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && query.trim().length >= 2 && !searching && results.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg p-4">
          <p className="text-sm text-muted-foreground text-center">No se encontraron productos.</p>
        </div>
      )}
    </div>
  );
}
