"use client";

import { ColorOption } from "@/lib/skating-store/color-utils";

interface ColorPickerProps {
  colors: ColorOption[];
  selectedColor: string | null;
  onSelect: (colorName: string) => void;
}

export function ColorPicker({ colors, selectedColor, onSelect }: ColorPickerProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Selecciona Color
      </label>
      <div className="flex flex-wrap gap-3">
        {colors.map((color) => {
          const isSelected = selectedColor === color.name;
          return (
            <button
              key={color.name}
              type="button"
              aria-label={`Color ${color.name}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(color.name)}
              className={`
                w-10 h-10 rounded-full border-2 transition-all
                ${isSelected
                  ? "ring-2 ring-primary ring-offset-2 border-primary scale-110"
                  : "border-muted hover:scale-105 hover:border-primary/50"
                }
              `}
              style={{ backgroundColor: color.hex }}
            />
          );
        })}
      </div>
      {selectedColor && (
        <p className="text-sm text-muted-foreground font-medium">
          Color: <span className="text-foreground font-bold">{selectedColor}</span>
        </p>
      )}
    </div>
  );
}
