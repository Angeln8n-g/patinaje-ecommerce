"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Product, Category } from "@/types/skating-store";
import { createProduct, updateProduct } from "@/lib/skating-store/product-actions";
import { getCategories } from "@/lib/skating-store/content-actions";
import { Plus, X, Image as ImageIcon } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  price: z.number().min(0, "El precio no puede ser negativo"),
  stock: z.number().int().min(0, "El stock no puede ser negativo"),
  category: z.string().min(1, "Selecciona una categoría"),
  images: z.array(z.string().url("Debe ser una URL válida")).min(1, "Añade al menos una imagen"),
  featured: z.boolean(),
  variant_type: z.enum(["none", "size", "measurement"]),
  variant_options: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  initialData?: Product;
}

export function ProductForm({ initialData }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [variantInput, setVariantInput] = useState("");
  const router = useRouter();

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData?.price || 0,
      stock: initialData?.stock || 0,
      category: initialData?.category || "",
      images: initialData?.images && initialData.images.length > 0 ? initialData.images : [],
      featured: initialData?.featured || false,
      variant_type: initialData?.variant_type || "none",
      variant_options: initialData?.variant_options || [],
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const productData = {
        ...values,
        status: (initialData?.status || 'active') as 'active' | 'inactive',
      };

      if (initialData) {
        await updateProduct(initialData.id, {
          ...productData,
          category: productData.category,
        });
        toast.success("Producto actualizado correctamente");
      } else {
        await createProduct({
          ...productData,
          category: productData.category,
        });
        toast.success("Producto creado correctamente");
      }
      
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar el producto");
    } finally {
      setIsLoading(false);
    }
  };

  const addImage = () => {
    if (!imageUrlInput) return;
    try {
      new URL(imageUrlInput); // Validate URL
      const currentImages = form.getValues("images");
      form.setValue("images", [...currentImages, imageUrlInput]);
      setImageUrlInput("");
    } catch {
      toast.error("URL inválida");
    }
  };

  const removeImage = (index: number) => {
    const currentImages = form.getValues("images");
    form.setValue("images", currentImages.filter((_, i) => i !== index));
  };

  const addVariant = () => {
    if (!variantInput) return;
    const currentVariants = form.getValues("variant_options");
    if (!currentVariants.includes(variantInput)) {
      form.setValue("variant_options", [...currentVariants, variantInput]);
    }
    setVariantInput("");
  };

  const removeVariant = (option: string) => {
    const currentVariants = form.getValues("variant_options");
    form.setValue("variant_options", currentVariants.filter(v => v !== option));
  };

  const currentVariantType = form.watch("variant_type");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del producto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.length > 0 ? (
                      categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>Cargando...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Descripción del producto..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="featured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm mt-8">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Destacado</FormLabel>
                  <FormDescription>
                    Mostrar en la página principal
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Imágenes */}
        <div className="space-y-4">
          <FormLabel>Imágenes del Producto</FormLabel>
          <div className="flex gap-2">
            <Input 
              placeholder="https://ejemplo.com/imagen.jpg" 
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addImage();
                }
              }}
            />
            <Button type="button" onClick={addImage} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <FormField
            control={form.control}
            name="images"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {field.value.map((url, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
                      <img src={url} alt={`Product ${index}`} className="object-cover w-full h-full" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {index === 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 text-center">
                          Principal
                        </div>
                      )}
                    </div>
                  ))}
                  {field.value.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mb-2" />
                      <p>No hay imágenes añadidas</p>
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Variantes */}
        <div className="space-y-4 border p-4 rounded-lg bg-muted/20">
          <h3 className="font-semibold flex items-center gap-2">
            Configuración de Medidas / Tallas
          </h3>
          
          <FormField
            control={form.control}
            name="variant_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Variedad</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Ninguno (Producto único)</SelectItem>
                    <SelectItem value="size">Tallas (ej: 7, 8, S, M, L)</SelectItem>
                    <SelectItem value="measurement">Medidas (ej: 10cm, 20x30)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Define si el producto tiene opciones seleccionables.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {currentVariantType !== "none" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <FormLabel>Opciones Disponibles</FormLabel>
              <div className="flex gap-2">
                <Input 
                  placeholder={currentVariantType === 'size' ? "Ej: 42" : "Ej: 100mm"} 
                  value={variantInput}
                  onChange={(e) => setVariantInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addVariant();
                    }
                  }}
                />
                <Button type="button" onClick={addVariant} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <FormField
                control={form.control}
                name="variant_options"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {field.value.map((option, index) => (
                        <div key={index} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/20">
                          <span>{option}</span>
                          <button
                            type="button"
                            onClick={() => removeVariant(option)}
                            className="hover:text-destructive transition-colors ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {field.value.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">Añade opciones para que los clientes elijan.</p>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : initialData ? "Actualizar Producto" : "Crear Producto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
