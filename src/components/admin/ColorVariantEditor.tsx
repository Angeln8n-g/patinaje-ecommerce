"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { ColorOption, isValidHex } from "@/lib/skating-store/color-utils";

interface ColorVariantEditorProps {
  colors: ColorOption[];
  basePrice: number;
  prices: Record<string, number>;
  onChange: (colors: ColorOption[], prices: Record<string, number>) => void;
}

export function ColorVariantEditor({
  colors,
  basePrice,
  prices,
  onChange,
}: ColorVariantEditorProps) {
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#000000");
  const [nameError, setNameError] = useState<string | null>(null);
  const [hexError, setHexError] = useState<string | null>(null);

  const addColor = () => {
    setNameError(null);
    setHexError(null);

    const trimmedName = newName.trim();

    if (!trimmedName) {
      setNameError("El nombre del color es requerido");
      return;
    }

    if (!isValidHex(newHex)) {
      setHexError("Formato esperado: #RRGGBB");
      return;
    }

    if (colors.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.warning(`El color "${trimmedName}" ya existe`);
      return;
    }

    const updatedColors = [...colors, { name: trimmedName, hex: newHex }];
    const updatedPrices = { ...prices, [trimmedName]: basePrice };
    onChange(updatedColors, updatedPrices);
    setNewName("");
    setNewHex("#000000");
  };

  const removeColor = (name: string) => {
    const updatedColors = colors.filter((c) => c.name !== name);
    const updatedPrices = { ...prices };
    delete updatedPrices[name];
    onChange(updatedColors, updatedPrices);
  };

  const updatePrice = (name: string, price: number) => {
    onChange(colors, { ...prices, [name]: price });
  };

  return (
    <div className="space-y-4">
      <Label>Colores Disponibles</Label>

      {/* Add new color row */}
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">Nombre</Label>
          <Input
            placeholder="Ej: Rojo"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              if (nameError) setNameError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addColor();
              }
            }}
          />
          {nameError && (
            <p className="text-xs text-destructive">{nameError}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Color</Label>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={newHex}
              onChange={(e) => {
                setNewHex(e.target.value);
                if (hexError) setHexError(null);
              }}
              className="h-9 w-9 cursor-pointer rounded border p-0.5"
            />
            <Input
              placeholder="#000000"
              value={newHex}
              onChange={(e) => {
                setNewHex(e.target.value);
                if (hexError) setHexError(null);
              }}
              className="w-28"
            />
          </div>
          {hexError && (
            <p className="text-xs text-destructive">{hexError}</p>
          )}
        </div>
        <Button type="button" onClick={addColor} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Color list */}
      <div className="flex flex-col gap-3 mt-2">
        {colors.map((color) => (
          <div
            key={color.name}
            className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg border"
          >
            <div
              className="h-6 w-6 rounded-full border shrink-0"
              style={{ backgroundColor: color.hex }}
              title={color.hex}
            />
            <span className="font-medium text-sm min-w-[4rem]">
              {color.name}
            </span>
            <span className="text-xs text-muted-foreground">{color.hex}</span>
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                className="w-28 h-8 text-sm"
                value={prices[color.name] ?? basePrice}
                onChange={(e) =>
                  updatePrice(color.name, parseFloat(e.target.value) || 0)
                }
                placeholder="Precio"
              />
            </div>
            <button
              type="button"
              onClick={() => removeColor(color.name)}
              className="hover:text-destructive transition-colors ml-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {colors.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Añade colores para que los clientes elijan.
          </p>
        )}
      </div>
    </div>
  );
}
