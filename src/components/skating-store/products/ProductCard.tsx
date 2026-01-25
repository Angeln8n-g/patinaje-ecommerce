"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/skating-store";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSkatingCart } from "@/contexts/SkatingCartContext";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useSkatingCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    toast.success(`${product.name} agregado al carrito`);
  };

  return (
    <Link href={`/skating-store/producto/${product.id}`} className="block h-full">
      <Card className="h-full overflow-hidden transition-all hover:shadow-lg flex flex-col group border-border">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Image
            src={product.images[0] || "https://placehold.co/600x600/png?text=Skate"}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <CardContent className="p-4 flex-1">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">{product.name}</h3>
          <p className="text-sm text-muted-foreground capitalize mt-1">{product.category.replace('-', ' ')}</p>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex items-center justify-between mt-auto">
          <span className="font-bold text-lg">${product.price.toFixed(2)}</span>
          <Button size="sm" onClick={handleAddToCart} variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}
