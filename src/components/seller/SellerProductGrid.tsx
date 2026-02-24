"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Package } from "lucide-react";
import { getProducts } from "@/lib/skating-store/supabase-queries";
import { Product } from "@/types/skating-store";
import { formatCurrency } from "@/lib/utils";

export function SellerProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts()
      .then((data) => {
        setProducts(data);
        setFiltered(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(products);
      return;
    }
    setFiltered(
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q)
      )
    );
  }, [search, products]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar producto por nombre, categoría o código..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          No se encontraron productos.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product) => (
            <SellerProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function SellerProductCard({ product }: { product: Product }) {
  const coverImage =
    product.images?.find((img) => !img.toLowerCase().match(/\.(mp4|webm|ogg)$/)) ||
    product.images?.[0] ||
    "https://placehold.co/400x400/png?text=Producto";

  return (
    <Card className="overflow-hidden border hover:shadow-md transition-shadow">
      <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
        <Image
          src={coverImage}
          alt={product.name}
          fill
          className="object-contain p-3"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        <Badge
          variant={product.status === "active" ? "default" : "secondary"}
          className="absolute top-2 left-2 text-[10px]"
        >
          {product.status === "active" ? "Activo" : "Inactivo"}
        </Badge>
      </div>
      <CardContent className="p-3 space-y-1">
        <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
        <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold text-primary">{formatCurrency(product.price)}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Package className="h-3 w-3" />
            {product.stock}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
