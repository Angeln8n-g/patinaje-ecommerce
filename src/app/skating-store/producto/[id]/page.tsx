import { getProductById } from "@/lib/skating-store/supabase-queries";
import { ProductGallery } from "@/components/skating-store/products/ProductGallery";
import { ProductActions } from "@/components/skating-store/products/ProductActions";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";

export const dynamic = 'force-dynamic';

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
      <div>
        <ProductGallery images={product.images} productName={product.name} />
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <p className="text-xl font-medium text-primary mb-4 capitalize">{product.category.replace('-', ' ')}</p>
          <div className="text-3xl font-bold">${product.price.toFixed(2)}</div>
        </div>
        
        <Separator />
        
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <p>{product.description}</p>
        </div>

        <Separator />

        <ProductActions product={product} />
      </div>
    </div>
  );
}
