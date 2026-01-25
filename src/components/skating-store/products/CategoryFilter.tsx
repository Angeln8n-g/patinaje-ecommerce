"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProductCategory, Category } from "@/types/skating-store";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface CategoryFilterProps {
  categories?: Category[];
}

function CategoryFilterContent({ categories = [] }: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") as ProductCategory | null;

  const handleValueChange = (value: string) => {
    if (value) {
      router.push(`/skating-store/catalogo?category=${value}`);
    } else {
      router.push(`/skating-store/catalogo`);
    }
  };

  return (
    <div className="flex justify-center mb-8 overflow-x-auto pb-2">
      <ToggleGroup 
        type="single" 
        value={currentCategory || ""} 
        onValueChange={handleValueChange}
        variant="outline"
        className="justify-start sm:justify-center"
      >
        <ToggleGroupItem value="" aria-label="Todos los productos">Todos</ToggleGroupItem>
        {categories.length > 0 ? (
          categories.map((cat) => (
            <ToggleGroupItem key={cat.id} value={cat.slug} aria-label={cat.name}>
              {cat.name}
            </ToggleGroupItem>
          ))
        ) : (
          // Fallback if no categories loaded yet or empty
          <>
            <ToggleGroupItem value="patines-completos" aria-label="Patines completos">Patines</ToggleGroupItem>
            <ToggleGroupItem value="ruedas" aria-label="Ruedas">Ruedas</ToggleGroupItem>
            <ToggleGroupItem value="bases-frames" aria-label="Bases y Frames">Bases</ToggleGroupItem>
            <ToggleGroupItem value="botas" aria-label="Botas">Botas</ToggleGroupItem>
            <ToggleGroupItem value="protecciones" aria-label="Protecciones">Protecciones</ToggleGroupItem>
            <ToggleGroupItem value="accesorios" aria-label="Accesorios">Accesorios</ToggleGroupItem>
          </>
        )}
      </ToggleGroup>
    </div>
  );
}

export function CategoryFilter({ categories }: CategoryFilterProps) {
  return (
    <Suspense fallback={<div className="h-10 w-full animate-pulse bg-muted rounded-md mb-8" />}>
      <CategoryFilterContent categories={categories} />
    </Suspense>
  );
}
