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
import { CreditCard, Banknote, Loader2, FileText } from "lucide-react";
import type { DeliveryLocationResult } from "./DeliveryLocationPicker";
import { ShippingBreakdown } from "./ShippingBreakdown";
import { calculateShippingCost, getShippingConfig } from "@/lib/skating-store/shipping-actions";
import { FiscalInvoiceModal, type FiscalData } from "./FiscalInvoiceModal";

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
  onSubmit: (data: ShippingInfo & { paymentMethod: 'card' | 'cash' }, shippingTotal: number, fiscalData?: FiscalData) => Promise<void>;
  isLoading: boolean;
  initialValues?: Partial<ShippingInfo>;
  disabled?: boolean;
  onLogin?: () => void;
  onShippingCostChange?: (cost: number) => void;
  onShippingZoneChange?: (isWithinFreeZone: boolean) => void;
}

/** Geocode an address string to coordinates using Nominatim. */
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

export function CheckoutForm({ onSubmit, isLoading, initialValues, disabled, onLogin, onShippingCostChange, onShippingZoneChange }: CheckoutFormProps) {
  // Delivery location from map (click, GPS, or address geocode)
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocationResult | null>(null);

  // Geocoded coordinates from typed address → passed to map as external coords
  const [geocodedCoords, setGeocodedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Shipping cost state
  const [shippingCost, setShippingCost] = useState<ShippingCostResult | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  // Fiscal invoice state
  const [wantsFiscalInvoice, setWantsFiscalInvoice] = useState(false);
  const [fiscalModalOpen, setFiscalModalOpen] = useState(false);
  const [fiscalData, setFiscalData] = useState<FiscalData | null>(null);

  // Shipping config state (for allow_sales_without_zones and out_of_zone_enabled)
  const [allowSalesWithoutZones, setAllowSalesWithoutZones] = useState(false);
  const [outOfZoneEnabled, setOutOfZoneEnabled] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Track whether the map set the address (to avoid re-geocoding loop)
  const mapSetAddress = useRef(false);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Load shipping config to know if sales without zones are allowed
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await getShippingConfig();
        if (config) {
          setAllowSalesWithoutZones(config.allow_sales_without_zones ?? false);
          setOutOfZoneEnabled(config.out_of_zone_enabled ?? false);
        }
      } catch {
        // Config not available, keep defaults
      } finally {
        setConfigLoaded(true);
      }
    }
    loadConfig();
  }, []);

  // When user types address+city, geocode and send coords to map
  useEffect(() => {
    if (mapSetAddress.current) {
      mapSetAddress.current = false;
      return;
    }

    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    if (!addressValue || addressValue.length < 5 || !cityValue || cityValue.length < 2) return;

    geocodeTimer.current = setTimeout(async () => {
      const coords = await geocodeAddress(addressValue, cityValue);
      if (coords) {
        setGeocodedCoords(coords);
      }
    }, 1200);

    return () => { if (geocodeTimer.current) clearTimeout(geocodeTimer.current); };
  }, [addressValue, cityValue]);

  // Calculate shipping cost when delivery location changes
  useEffect(() => {
    async function calculate() {
      if (deliveryLocation?.lat && deliveryLocation?.lng) {
        setShippingLoading(true);
        setShippingError(null);
        try {
          const result = await calculateShippingCost(deliveryLocation.lat, deliveryLocation.lng);
          if (result.success) {
            setShippingCost(result.data);
            setShippingError(null);
            onShippingCostChange?.(result.data.total_cost);
            onShippingZoneChange?.(result.data.zone_type === "within_zone" && result.data.total_cost === 0);
          } else {
            setShippingCost(null);
            setShippingError(result.error);
            onShippingCostChange?.(0);
            onShippingZoneChange?.(false);
          }
        } catch {
          setShippingCost(null);
          setShippingError("Error al calcular el costo de envío");
          onShippingCostChange?.(0);
        } finally {
          setShippingLoading(false);
        }
      } else {
        setShippingCost(null);
        setShippingError(null);
        onShippingCostChange?.(0);
        onShippingZoneChange?.(false);
      }
    }
    calculate();
  }, [deliveryLocation?.lat, deliveryLocation?.lng]);

  const handleLocationChange = useCallback((result: DeliveryLocationResult | null) => {
    setDeliveryLocation(result);
  }, []);

  // When the map resolves an address (reverse geocode from click/GPS), fill the form fields
  const handleAddressResolve = useCallback((address: string, city: string) => {
    mapSetAddress.current = true;
    if (address) form.setValue("address", address, { shouldValidate: true });
    if (city) form.setValue("city", city, { shouldValidate: true });
  }, [form]);

  const isOutsideZone = deliveryLocation !== null && !deliveryLocation.inZone;
  const noLocation = deliveryLocation === null;
  const isShippingBlocked = shippingCost !== null && (
    shippingCost.zone_type === "out_of_range" ||
    (shippingCost.zone_type === "out_of_zone" && !shippingCost.out_of_zone_enabled)
  );

  // When out_of_zone_enabled is true, being outside the polygon is OK (shipping charges apply)
  // When allow_sales_without_zones is true, not having a location is OK (no map/zones needed)
  const canSubmit = (() => {
    if (isLoading || shippingLoading) return false;
    // If shipping cost was calculated and it's blocked, can't submit
    if (isShippingBlocked) return false;
    // If there's a location selected
    if (deliveryLocation) {
      // Outside zone polygon but out_of_zone shipping is enabled → OK (cost will be calculated)
      if (isOutsideZone && !outOfZoneEnabled) return false;
      return true;
    }
    // No location selected: only allow if sales without zones is enabled
    if (allowSalesWithoutZones) return true;
    return false;
  })();

  const handleFormSubmit = async (data: z.infer<typeof formSchema>) => {
    const shippingData: ShippingInfo & { paymentMethod: 'card' | 'cash' } = {
      ...data,
      lat: deliveryLocation?.lat,
      lng: deliveryLocation?.lng,
    };
    await onSubmit(shippingData, shippingCost?.total_cost ?? 0, wantsFiscalInvoice && fiscalData ? fiscalData : undefined);
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

        {/* Delivery Location Map — always visible */}
        <div className="pt-4 border-t">
          <DeliveryLocationPicker
            onLocationChange={handleLocationChange}
            onAddressResolve={handleAddressResolve}
            disabled={disabled}
            externalCoords={geocodedCoords}
            allowWithoutZones={allowSalesWithoutZones}
            outOfZoneEnabled={outOfZoneEnabled}
          />
        </div>

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
          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-3">Comprobante Fiscal</h3>
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="wantsFiscal"
                checked={wantsFiscalInvoice}
                onChange={(e) => {
                  setWantsFiscalInvoice(e.target.checked);
                  if (e.target.checked && !fiscalData) {
                    setFiscalModalOpen(true);
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="wantsFiscal" className="cursor-pointer">
                ¿Desea comprobante fiscal?
              </Label>
            </div>
            {wantsFiscalInvoice && fiscalData && (
              <div className="mt-3 p-3 bg-muted rounded-md text-sm space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4" />
                  Datos fiscales registrados
                </div>
                <p><span className="text-muted-foreground">Nombre:</span> {fiscalData.nombre}</p>
                {fiscalData.rnc && <p><span className="text-muted-foreground">RNC/Cédula:</span> {fiscalData.rnc}</p>}
                <p><span className="text-muted-foreground">Tipo:</span> {fiscalData.tipoComprador === "persona_juridica" ? "Persona Jurídica" : fiscalData.tipoComprador === "persona_fisica" ? "Persona Física" : "Consumidor Final"}</p>
                <p><span className="text-muted-foreground">Comprobante:</span> {fiscalData.tipoComprobante === "31" ? "Crédito Fiscal (31)" : "Consumo (32)"}</p>
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setFiscalModalOpen(true)}>
                  Editar datos fiscales
                </Button>
              </div>
            )}
            {wantsFiscalInvoice && !fiscalData && (
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setFiscalModalOpen(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Completar datos fiscales
              </Button>
            )}
          </div>
        )}

        <FiscalInvoiceModal
          open={fiscalModalOpen}
          onOpenChange={setFiscalModalOpen}
          onConfirm={(data) => {
            setFiscalData(data);
            setFiscalModalOpen(false);
          }}
        />

        {!disabled && (
          <Button
            type="submit"
            className="w-full mt-6"
            size="lg"
            disabled={!canSubmit}
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
