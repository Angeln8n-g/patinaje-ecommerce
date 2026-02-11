import { ProductForm } from "@/components/admin/ProductForm";
import { getProductByIdServer } from "@/lib/skating-store/product-queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const product = await getProductByIdServer(id);

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Producto no encontrado</h1>
        <p className="text-muted-foreground mb-6">
          No se pudo cargar el producto. Verifica que exista o intenta de nuevo.
        </p>
        <Link href="/admin/products" className="text-primary underline">
          Volver a productos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Editar Producto</h1>
      <div className="bg-card p-6 rounded-lg border">
        <ProductForm initialData={product} />
      </div>
    </div>
  );
}
