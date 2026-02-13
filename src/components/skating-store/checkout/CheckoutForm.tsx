"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { CreditCard, Banknote, Loader2, CheckCircle2, XCircle, MapPin } from "lucide-react";
import type { DeliveryLocationResult, PickerMode } from "./DeliveryLocationPicker";
import { ShippingBreakdown } from "./ShippingBreakdown";
import { calculateShippingCost } from "@/lib/skating-store/shipping-actions";
import { validateDeliveryZone } from "@/lib/skating-store/zone-actions";

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

/** Geocode an address using Nominatim (OpenStreetMap). */
async function geocodeAddress(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address}, ${city}`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { "Accept-Language": "es" } }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export function CheckoutForm({ onSubmit, isLoading, initialValues, disabled, onLogin }: CheckoutFormProps) {
  // Address geocoding state
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addressInZone, setAddressInZone] = useState<boolean | null>(null);
  const [addressZoneName, setAddressZoneName] = useState<string | undefined>(undefined);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Map picker mode: auto (address-based) or manual (user picks point)
  const [pickerMode, setPickerMode] = useState<PickerMode>("auto");

  // Manual delivery location from map picker (only used when out of zone)
  const [manualLocation, setManualLocation] = useState<DeliveryLocationResult | null>(null);

  // The effective delivery location: manual pick if out of zone, otherwise address coords
  const effectiveLocation: DeliveryLocationResult | null =
    pickerMode === "manual" && manualLocation
      ? manualLocation
      : addressCoords && addressInZone
        ? { lat: addressCoords.lat, lng: addressCoords.lng, inZone: true, zoneName: addressZoneName }
        : null;

  // Shipping cost state
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

  const addressValue = form.watch("address");
  const cityValue = form.watch("city");

  // Geocode address when address+city change (debounced)
  useEffect(() => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);

    // Reset state when fields change
    setAddressCoords(null);
    setAddressInZone(null);
    setAddressZoneName(undefined);
    setGeocodeError(null);
    setPickerMode("auto");
    setManualLocation(null);
    setShippingCost(null);

    if (!addressValue || addressValue.length < 5 || !cityValue || cityValue.length < 2) return;

    geocodeTimer.current = setTimeout(async () => {
      setGeocoding(true);
      setGeocodeError(null);
      try {
        const coords = await geocodeAddress(addressValue, cityValue);
        if (!coords) {
          setGeocodeError("No pudimos ubicar tu dirección. Verifica que sea correcta.");
          setGeocoding(false);
          return;
        }
        setAddressCoords(coords);

        // Check if address is inside delivery zone
        const zoneResult = await validateDeliveryZone(coords.lat, coords.lng);
        setAddressInZone(zoneResult.inZone);
        setAddressZoneName(zoneResult.inZone ? zoneResult.zoneName : undefined);

        if (!zoneResult.inZone) {
          setPickerMode("manual");
        }
      } catch {
        setGeocodeError("Error al verificar la dirección.");
      } finally {
        setGeocoding(false);
      }
    }, 1000);

    return () => { if (geocodeTimer.current) clearTimeout(geocodeTimer.current); };
  }, [addressValue, cityValue]);

  // Calculate shipping cost when effective location changes
  useEffect(() => {
    async function calculate() {
      if (effectiveLocation && effectiveLocation.lat && effectiveLocation.lng) {
        setShippingLoading(true);
        setShippingError(null);
        try {
          const result = await calculateShippingCost(effectiveLocation.lat, effectiveLocation.lng);
          if (result.success) {
            setShippingCost(result.data);
            setShippingError(null);
          } else {
            setShippingCost(null);
            setShippingError(result.error);
          }
        } catch {
          setShippingCost(null);
          setShippingError("Error al calcular el costo de envío");
        } finally {
          setShippingLoading(false);
        }
      } else {
        setShippingCost(null);
        setShippingError(null);
      }
    }
    calculate();
  }, [effectiveLocation?.lat, effectiveLocation?.lng]);

  const handleLocationChange = useCallback((result: DeliveryLocationResult | null) => {
    setManualLocation(result);
  }, []);

  // Block submit conditions
  const isOutsideZone = effectiveLocation !== null && !effectiveLocation.inZone;
  const needsManualPick = pickerMode === "manual" && !manualLocation;
  const isShippingBlocked = shippingCost !== null && (
    shippingCost.zone_type === "out_of_range" ||
    (shippingCost.zone_type === "out_of_zone" && !shippingCost.out_of_zone_enabled)
  );

  const handleFormSubmit = async (data: z.infer<typeof formSchema>) => {
    const shippingData: ShippingInfo & { paymentMethod: 'card' | 'cash' } = {
      ...data,
      lat: effectiveLocation?.lat,
      lng: effectiveLocation?.lng,
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
        <FormField control={form.control} name="fullName" render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre Completo</FormLabel>
            <FormControl><Input placeholder="Juan Pérez" {...field} disabled={disabled} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>Dirección</FormLabel>
            <FormControl><Input placeholder="Calle 123, Sector" {...field} disabled={disabled} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>Ciudad</FormLabel>
              <FormControl><Input placeholder="Santo Domingo" {...field} disabled={disabled} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="postalCode" render={({ field }) => (
            <FormItem>
              <FormLabel>Código Postal</FormLabel>
              <FormControl><Input placeholder="10001" {...field} disabled={disabled} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem>
            <FormLabel>Teléfono</FormLabel>
            <FormControl><Input placeholder="+1 809 000 0000" {...field} disabled={disabled} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Address verification status */}
        <div className="pt-4 border-t space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Verificación de Zona de Entrega</p>
          </div>

          {geocoding && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando tu dirección...
            </div>
          )}

          {geocodeError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{geocodeError}</AlertDescription>
            </Alert>
          )}

          {!geocoding && addressInZone === true && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                ¡Tu dirección está dentro de la zona de entrega
                {addressZoneName ? ` "${addressZoneName}"` : ""}! Entregaremos directamente en tu dirección.
              </AlertDescription>
            </Alert>
          )}

          {!geocoding && addressInZone === false && (
            <Alert className="border-amber-200 bg-amber-50">
              <XCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Tu dirección está fuera de nuestra zona de entrega. Selecciona un punto de encuentro dentro de la zona en el mapa.
              </AlertDescription>
            </Alert>
          )}

          {(!addressValue || addressValue.length < 5 || !cityValue || cityValue.length < 2) && !geocoding && (
            <p className="text-xs text-muted-foreground italic">
              Completa tu dirección y ciudad para verificar la zona de entrega.
            </p>
          )}
        </div>

        {/* Map picker: only shown when address is outside zone */}
        {pickerMode === "manual" && (
          <div className="pt-2">
            <DeliveryLocationPicker
              onLocationChange={handleLocationChange}
              disabled={disabled}
              addressCoords={addressCoords}
              addressInZone={addressInZone ?? false}
              mode="manual"
            />
          </div>
        )}

        {/* Shipping Cost Breakdown */}
        {shippingCost && (
          <div className="pt-4 border-t">
            <ShippingBreakdown result={shippingCost} config={{
              base_radius_km: shippingCost.base_radius_km,
              base_rate: shippingCost.base_rate,
              cost_per_extra_km: 0,
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
          <FormField control={form.control} name="paymentMethod" render={({ field }) => (
            <FormItem className="space-y-3">
              <FormControl>
                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 gap-4" disabled={disabled}>
                  <FormItem>
                    <FormControl><RadioGroupItem value="card" id="card" className="peer sr-only" /></FormControl>
                    <Label htmlFor="card" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5" />
                        <div><p className="font-medium">Tarjeta de Crédito / Débito</p><p className="text-xs text-muted-foreground">Pago seguro online</p></div>
                      </div>
                    </Label>
                  </FormItem>
                  <FormItem>
                    <FormControl><RadioGroupItem value="cash" id="cash" className="peer sr-only" /></FormControl>
                    <Label htmlFor="cash" className="flex items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Banknote className="h-5 w-5" />
                        <div><p className="font-medium">Efectivo al recibir</p><p className="text-xs text-muted-foreground">Paga cuando recibas tu pedido</p></div>
                      </div>
                    </Label>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {!disabled && (
          <Button
            type="submit"
            className="w-full mt-6"
            size="lg"
            disabled={isLoading || isOutsideZone || needsManualPick || isShippingBlocked || shippingLoading || geocoding}
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
