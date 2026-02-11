import { getProductByIdServer, getProductReviewsServer, getProductsServer } from "@/lib/skating-store/product-actions";
import { ProductGallery } from "@/components/skating-store/products/ProductGallery";
import { ProductActions } from "@/components/skating-store/products/ProductActions";
import { ProductReviews } from "@/components/skating-store/products/ProductReviews";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Star, ShieldCheck, MessageCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamicParams = true;

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const products = await getProductsServer();
  return (products || []).map((product) => ({
    id: product.id,
  }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const [product, reviews] = await Promise.all([
    getProductByIdServer(id),
    getProductReviewsServer(id)
  ]);

  if (!product) {
    notFound();
  }

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
        <div>
          <ProductGallery images={product.images} productName={product.name} />
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-4xl font-extrabold mb-4 leading-tight">{product.name}</h1>
            
            {/* Meta Badges - Dynamic Data */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2 bg-[#FFFBEB] px-4 py-2 rounded-full border border-[#FEF3C7]">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-sm text-foreground">{averageRating}</span>
                <span className="text-xs text-muted-foreground font-medium">{reviews.length} reseñas</span>
              </div>
              <div className="flex items-center gap-2 bg-[#ECFDF5] px-4 py-2 rounded-full border border-[#D1FAE5]">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-sm text-emerald-700">94%</span>
              </div>
              <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-sm text-muted-foreground">{reviews.length}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <div className="text-4xl font-extrabold">{formatCurrency(product.price)}</div>
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

      <Separator className="my-16" />

      <div className="max-w-4xl">
        <ProductReviews productId={product.id} />
      </div>
    </div>
  );
}
