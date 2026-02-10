import { ProductForm } from "@/components/admin/ProductForm";
import { getProductByIdServer } from "@/lib/skating-store/product-actions";
import { notFound } from "next/navigation";

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const product = await getProductByIdServer(id);

  if (!product) {
    notFound();
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
