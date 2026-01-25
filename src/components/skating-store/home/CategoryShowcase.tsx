import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Category } from "@/types/skating-store";

interface CategoryShowcaseProps {
  categories?: Category[];
}

export function CategoryShowcase({ categories = [] }: CategoryShowcaseProps) {
  // Fallback for when no categories are passed or fetched yet
  // In a real scenario, categories should come from props
  const displayCategories = categories.length > 0 ? categories : [];

  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold tracking-tight mb-8">Explora por Categoría</h2>
      {displayCategories.length === 0 ? (
        <p className="text-muted-foreground">No hay categorías disponibles.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayCategories.map((category) => (
            <Link key={category.id} href={`/skating-store/catalogo?category=${category.slug}`}>
              <Card className="h-full overflow-hidden hover:shadow-md transition-shadow cursor-pointer group border-border">
                <div 
                  className="h-40 bg-cover bg-center transition-transform duration-500 group-hover:scale-110 bg-muted flex items-center justify-center"
                >
                  {/* Placeholder image logic since category doesn't have image_url yet */}
                  <span className="text-4xl text-muted-foreground opacity-20 font-bold">
                    {category.name.charAt(0)}
                  </span>
                </div>
                <CardContent className="p-4 flex items-center justify-center bg-card relative z-10">
                  <h3 className="font-semibold text-lg">{category.name}</h3>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
