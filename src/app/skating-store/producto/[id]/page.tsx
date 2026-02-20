import { getProductByIdServer, getProductReviewsServer } from "@/lib/skating-store/product-queries";
import { ProductDetail } from "@/components/skating-store/products/ProductDetail";
import { ProductReviews } from "@/components/skating-store/products/ProductReviews";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Star, ShieldCheck, MessageCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ id: string }>;
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
    ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProductDetail product={product} averageRating={averageRating} reviewCount={reviews.length} />

      <Separator className="my-16" />

      <div className="max-w-4xl">
        <ProductReviews productId={product.id} />
      </div>
    </div>
  );
}
