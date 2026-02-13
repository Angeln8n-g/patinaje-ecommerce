"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ShippingInfo, ShippingCostResult } from "@/types/skating-store";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button as UIButton } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, Banknote, Loader2 } from "lucide-react";
import type { DeliveryLocationResult } from "./DeliveryLocationPicker";
import { ShippingBreakdown } from "./ShippingBreakdown";
import { calculateShippingCost } from "@/lib/skating-store/shipping-actions";

// Dynamically import the map component with SSR disabled (Leaflet requires browser APIs)
const DeliveryLocationPicker = dynamic(
  () => import("./DeliveryLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Cargando mapa...
      </div>
    ),
  }
);

const formSchema = z.object({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  address: z.string().min(5, "La dirección es muy corta"),
  city: z.string().min(2, "La ciudad es requerida"),
  postalCode: z.string().regex(/^\d{5}$/, "Código postal inválido (5 dígitos)"),
  phone: z.string().min(9, "Teléfono inválido"),
  paymentMethod: z.enum(["card", "cash"]),
});

interface CheckoutFormProps {
  onSubmit: (data: ShippingInfo & { paymentMethod: 'card' | 'cash' }) => Promise<void>;
  isLoading: boolean;
  initialValues?: Partial<ShippingInfo>;
  disabled?: boolean;
  onLogin?: () => void;
}

export function CheckoutForm({ onSubmit, isLoading, initialValues, disabled, onLogin }: CheckoutFormProps) {
  // Delivery location state from map picker
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocationResult | null>(null);

  // Shipping cost calculation state
  const [shippingCost, setShippingCost] = useState<ShippingCostResult | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: initialValues?.fullName || "",
      address: initialValues?.address || "",
      city: initialValues?.city || "",
      postalCode: initialValues?.postalCode || "",
      phone: initialValues?.phone || "",
      paymentMethod: "card",
    },
  });

  // Calculate shipping cost when delivery location changes
  useEffect(() => {
    async function calculate() {
      if (deliveryLocation && deliveryLocation.lat && deliveryLocation.lng) {
        setShippingLoading(true);
        setShippingError(null);
        try {
          const result = await calculateShippingCost(deliveryLocation.lat, deliveryLocation.lng);
          if (result.success) {
            setShippingCost(result.data);
            setShippingError(null);
          } else {
            setShippingCost(null);
            setShippingError(result.error);
          }
        } catch (err) {
          setShippingCost(null);
          setShippingError("Error al calcular el costo de envío");
          console.error("Shipping cost calculation error:", err);
        } finally {
          setShippingLoading(false);
        }
      } else {
        setShippingCost(null);
        setShippingError(null);
      }
    }
    calculate();
  }, [deliveryLocation]);

  const handleLocationChange = useCallback((result: DeliveryLocationResult | null) => {
    setDeliveryLocation(result);
  }, []);

  // Determine if the submit button should be blocked:
  // - If shipping cost result indicates out_of_range, block submit
  // - If shipping cost result indicates out_of_zone and out_of_zone_enabled is false, block submit
  // - If no location was selected yet (and the map is shown), we don't block
  //   because the map might not render (graceful degradation when no zones exist)
  const isOutsideZone = deliveryLocation !== null && !deliveryLocation.inZone;
  
  // Check if shipping cost indicates blocking conditions
  const isShippingBlocked = shippingCost !== null && (
    shippingCost.zone_type === "out_of_range" ||
    (shippingCost.zone_type === "out_of_zone" && !shippingCost.out_of_zone_enabled)
  );

  const handleFormSubmit = async (data: z.infer<typeof formSchema>) => {
    // Include delivery coordinates in the shipping info if available
    const shippingData: ShippingInfo & { paymentMethod: 'card' | 'cash' } = {
      ...data,
      lat: deliveryLocation?.lat,
      lng: deliveryLocation?.lng,
    };
    await onSubmit(shippingData);
  };

  return (
    <Form {...form}>
      <div className="space-y-4">
        {disabled && (
          <Alert>
            <AlertTitle>Inicia sesión para continuar</AlertTitle>
            <AlertDescription>
              Debes iniciar sesión para confirmar el pedido. Puedes iniciar sesión y volver, los datos se autocompletarán.
            </AlertDescription>
          </Alert>
        )}
      </div>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo</FormLabel>
              <FormControl>
                <Input placeholder="Juan Pérez" {...field} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input placeholder="Calle 123" {...field} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad</FormLabel>
                <FormControl>
                  <Input placeholder="Madrid" {...field} disabled={disabled} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="postalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código Postal</FormLabel>
                <FormControl>
                  <Input placeholder="28001" {...field} disabled={disabled} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input placeholder="+34 600 000 000" {...field} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Delivery Location Map Picker */}
        <div className="pt-4 border-t">
          <DeliveryLocationPicker
            onLocationChange={handleLocationChange}
            disabled={disabled}
          />
        </div>

        {/* Shipping Cost Breakdown */}
        {shippingCost && (
          <div className="pt-4 border-t">
            <ShippingBreakdown result={shippingCost} config={{
              base_radius_km: shippingCost.base_radius_km,
              base_rate: shippingCost.base_rate,
              cost_per_extra_km: 0, // Not available in result, using 0 as placeholder
              max_distance_km: shippingCost.max_distance_km,
              out_of_zone_enabled: shippingCost.out_of_zone_enabled,
            }} />
          </div>
        )}
        {shippingError && !shippingCost && (
          <div className="pt-4 border-t">
            <Alert variant="destructive">
              <AlertDescription>{shippingError}</AlertDescription>
            </Alert>
          </div>
        )}
        {shippingLoading && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Calculando costo de envío...
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <h3 className="text-lg font-semibold mb-4">Método de Pago</h3>
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-1 gap-4"
                    disabled={disabled}
                  >
                    <FormItem>
                      <FormControl>
                        <RadioGroupItem value="card" id="card" className="peer sr-only" />
                      </FormControl>
                      <Label
                        htmlFor="card"
                        className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5" />
                          <div>
                            <p className="font-medium">Tarjeta de Crédito / Débito</p>
                            <p className="text-xs text-muted-foreground">Pago seguro online</p>
                          </div>
                        </div>
                      </Label>
                    </FormItem>
                    <FormItem>
                      <FormControl>
                        <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                      </FormControl>
                      <Label
                        htmlFor="cash"
                        className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Banknote className="h-5 w-5" />
                          <div>
                            <p className="font-medium">Efectivo al recibir</p>
                            <p className="text-xs text-muted-foreground">Paga cuando recibas tu pedido</p>
                          </div>
                        </div>
                      </Label>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!disabled && (
          <Button
            type="submit"
            className="w-full mt-6"
            size="lg"
            disabled={isLoading || isOutsideZone || isShippingBlocked || shippingLoading}
          >
            {isLoading ? "Procesando..." : "Confirmar Pedido"}
          </Button>
        )}
        {disabled && (
          <UIButton type="button" className="w-full mt-6" size="lg" onClick={onLogin}>
            Iniciar Sesión
          </UIButton>
        )}
      </form>
    </Form>
  );
}
