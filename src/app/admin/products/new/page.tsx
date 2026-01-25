"use client";

import { ProductForm } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Nuevo Producto</h1>
      <div className="bg-card p-6 rounded-lg border">
        <ProductForm />
      </div>
    </div>
  );
}
