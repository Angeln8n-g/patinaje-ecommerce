import { getProductById } from "@/lib/skating-store/supabase-queries";
import { ProductGallery } from "@/components/skating-store/products/ProductGallery";
import { ProductActions } from "@/components/skating-store/products/ProductActions";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Star, ShieldCheck, MessageCircle, Info } from "lucide-react";

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
    <div className="grid md:grid-cols-2 gap-8 lg:gap-16 py-8">
      <div>
        <ProductGallery images={product.images} productName={product.name} />
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-4xl font-extrabold mb-4 leading-tight">{product.name}</h1>
          
          {/* Meta Badges - Updated Colors */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2 bg-[#FFFBEB] px-4 py-2 rounded-full border border-[#FEF3C7]">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-sm text-foreground">4.8</span>
              <span className="text-xs text-muted-foreground font-medium">117 reviews</span>
            </div>
            <div className="flex items-center gap-2 bg-[#ECFDF5] px-4 py-2 rounded-full border border-[#D1FAE5]">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="font-bold text-sm text-emerald-700">94%</span>
            </div>
            <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="font-bold text-sm text-muted-foreground">8</span>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl font-extrabold">£{product.price.toFixed(2)}</div>
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <span>from £{(product.price / 12).toFixed(0)} per month</span>
              <Info className="h-4 w-4" />
            </div>
          </div>
        </div>
        
        <div className="prose prose-sm max-w-none text-muted-foreground text-base leading-relaxed">
          <p>{product.description}</p>
        </div>

        <div className="mt-auto pt-6">
          <ProductActions product={product} />
        </div>
      </div>
    </div>
  );
}
