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
import { Product, Category, Store } from "@/types/skating-store";
import { createProduct, updateProduct } from "@/lib/skating-store/product-actions";
import { getCategories } from "@/lib/skating-store/content-actions";
import { getStores } from "@/lib/skating-store/store-actions";
import { Plus, X, Image as ImageIcon, RefreshCw, Printer, Store as StoreIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { ColorVariantEditor } from "@/components/admin/ColorVariantEditor";
import { ColorOption, parseColorOptions, formatColorOption } from "@/lib/skating-store/color-utils";

function generateBarcode(): string {
  const prefix = "SK";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return prefix + "-" + timestamp + "-" + random;
}

const formSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().min(10, "La descripción debe tener al menos 10 caracteres"),
  price: z.number().min(0, "El precio no puede ser negativo"),
  stock: z.number().int().min(0, "El stock no puede ser negativo"),
  category: z.string().min(1, "Selecciona una categoría"),
  images: z.array(z.string().url("Debe ser una URL válida")).min(1, "Añade al menos una imagen"),
  featured: z.boolean(),
  barcode: z.string().optional(),
  variant_type: z.enum(["none", "size", "measurement", "color"]),
  variant_options: z.array(z.string()),
  variant_prices: z.record(z.string(), z.number()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  initialData?: Product;
}

export function ProductForm({ initialData }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [variantInput, setVariantInput] = useState("");
  const router = useRouter();

  // Color variant state
  const initialColors = initialData?.variant_type === "color" && initialData.variant_options
    ? parseColorOptions(initialData.variant_options)
    : [];
  const initialColorPrices = initialData?.variant_type === "color" && initialData.variant_prices
    ? initialData.variant_prices
    : {};
  const [colorOptions, setColorOptions] = useState<ColorOption[]>(initialColors);
  const [colorPrices, setColorPrices] = useState<Record<string, number>>(initialColorPrices);
  const initialColorImages = initialData?.variant_type === "color" && initialData.variant_images
    ? initialData.variant_images
    : {};
  const [colorImages, setColorImages] = useState<Record<string, string>>(initialColorImages);

  useEffect(() => {
    Promise.all([getCategories(), getStores()]).then(([cats, storesData]) => {
      setCategories(cats);
      setStores(storesData);
    }).catch(console.error);
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
      barcode: initialData?.barcode || generateBarcode(),
      variant_type: initialData?.variant_type || "none",
      variant_options: initialData?.variant_options || [],
      variant_prices: initialData?.variant_prices || {},
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      // Convert color state to variant_options/variant_prices when saving
      if (values.variant_type === "color") {
        values.variant_options = colorOptions.map(formatColorOption);
        values.variant_prices = { ...colorPrices };
        (values as any).variant_images = { ...colorImages };
      }

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
          store_id: selectedStoreId || undefined,
        });
        toast.success("Producto creado correctamente");
      }
      
      window.location.href = "/admin/products";
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar el producto");
      setIsLoading(false);
    }
  };




  const addVariant = () => {
    if (!variantInput) return;
    const currentVariants = form.getValues("variant_options");
    if (!currentVariants.includes(variantInput)) {
      form.setValue("variant_options", [...currentVariants, variantInput]);
      // Initialize price for new variant with the base price
      const currentPrices = form.getValues("variant_prices") || {};
      form.setValue("variant_prices", { ...currentPrices, [variantInput]: form.getValues("price") });
    }
    setVariantInput("");
  };

  const removeVariant = (option: string) => {
    const currentVariants = form.getValues("variant_options");
    form.setValue("variant_options", currentVariants.filter(v => v !== option));
    // Remove price for this variant
    const currentPrices = { ...(form.getValues("variant_prices") || {}) };
    delete currentPrices[option];
    form.setValue("variant_prices", currentPrices);
  };

  const updateVariantPrice = (option: string, price: number) => {
    const currentPrices = form.getValues("variant_prices") || {};
    form.setValue("variant_prices", { ...currentPrices, [option]: price });
  };

  const currentVariantType = form.watch("variant_type");
  const currentBarcode = form.watch("barcode");

  const printQR = () => {
    const name = form.getValues("name") || "Producto";
    const price = form.getValues("price") || 0;
    const barcode = form.getValues("barcode") || "";
    const svgEl = document.getElementById("qr-preview-svg")?.querySelector("svg");
    if (!svgEl) {
      toast.error("No se pudo generar el QR");
      return;
    }
    const svgMarkup = svgEl.outerHTML;
    const printWindow = window.open("", "_blank", "width=400,height=500");
    if (!printWindow) return;
    printWindow.document.write(
      "<!DOCTYPE html><html><head><title>QR - " + name + "</title>" +
      "<style>" +
      "body{margin:0;padding:20px;font-family:Arial,sans-serif;text-align:center}" +
      ".label{display:inline-block;border:1px dashed #ccc;padding:16px;margin:8px;width:200px}" +
      ".label svg{width:150px;height:150px}" +
      ".label h3{margin:8px 0 4px;font-size:14px}" +
      ".label p{margin:2px 0;font-size:11px;color:#555}" +
      ".label .price{font-size:16px;font-weight:bold;margin-top:6px}" +
      "@media print{.label{border:1px dashed #999}}" +
      "</style></head><body>" +
      '<div class="label">' + svgMarkup +
      "<h3>" + name + "</h3>" +
      "<p>" + barcode + "</p>" +
      '<p class="price">$' + price.toFixed(2) + "</p>" +
      "</div>" +
      "<script>setTimeout(function(){window.print()},200)<\/script>" +
      "</body></html>"
    );
    printWindow.document.close();
  };

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

        {/* Store selector — only for new products */}
        {!initialData && stores.length > 0 && (
          <div className="flex flex-col gap-2 p-4 rounded-lg border bg-muted/20">
            <div className="flex items-center gap-2 mb-1">
              <StoreIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Asignar a Tienda</span>
            </div>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tienda (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {stores.filter(s => s.is_active).map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: store.color }} />
                      {store.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">El stock inicial se asignará al inventario de esta tienda.</p>
          </div>
        )}

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

        {/* Código de barras */}
        <FormField
          control={form.control}
          name="barcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código de Barras / QR</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="SK-XXXXXX-XXXX" {...field} />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => form.setValue("barcode", generateBarcode())}
                  title="Generar nuevo código"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={printQR}
                  title="Imprimir QR"
                  disabled={!currentBarcode}
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </div>
              {currentBarcode && (
                <div id="qr-preview-svg" className="flex items-center gap-4 mt-3 p-3 rounded-lg border bg-white">
                  <QRCodeSVG value={currentBarcode} size={96} level="M" />
                  <div className="text-sm">
                    <p className="font-mono font-medium">{currentBarcode}</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Este QR se puede escanear desde el POS
                    </p>
                  </div>
                </div>
              )}
              <FormDescription>
                Se genera automáticamente. Puedes editarlo, regenerarlo o imprimirlo.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Imágenes */}
        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Imágenes del Producto</FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value}
                  onChange={field.onChange}
                  folder="products"
                  max={10}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    <SelectItem value="color">Color (ej: Rojo, Azul)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Define si el producto tiene opciones seleccionables.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {currentVariantType !== "none" && currentVariantType !== "color" && (
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
                    <div className="flex flex-col gap-3 mt-2">
                      {field.value.map((option, index) => (
                        <div key={index} className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg border">
                          <span className="font-medium text-sm min-w-[4rem]">{option}</span>
                          <div className="flex items-center gap-1 ml-auto">
                            <span className="text-xs text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              className="w-28 h-8 text-sm"
                              value={form.watch("variant_prices")?.[option] ?? form.watch("price") ?? 0}
                              onChange={(e) => updateVariantPrice(option, parseFloat(e.target.value) || 0)}
                              placeholder="Precio"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeVariant(option)}
                            className="hover:text-destructive transition-colors ml-2"
                          >
                            <X className="h-4 w-4" />
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

          {currentVariantType === "color" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <ColorVariantEditor
                colors={colorOptions}
                basePrice={form.watch("price") || 0}
                prices={colorPrices}
                images={colorImages}
                onChange={(colors, prices, images) => {
                  setColorOptions(colors);
                  setColorPrices(prices);
                  setColorImages(images);
                }}
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
