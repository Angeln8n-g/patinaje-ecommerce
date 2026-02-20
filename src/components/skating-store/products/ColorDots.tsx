"use client";

import { ColorOption } from "@/lib/skating-store/color-utils";

export interface ColorDotsProps {
  colors: ColorOption[];
  maxVisible?: number;
}

export function ColorDots({ colors, maxVisible = 5 }: ColorDotsProps) {
  if (colors.length === 0) return null;

  const visibleColors = colors.slice(0, maxVisible);
  const remaining = colors.length - maxVisible;

  return (
    <div className="flex items-center gap-1.5">
      {visibleColors.map((color) => (
        <span
          key={color.name}
          className="w-4 h-4 rounded-full border border-border inline-block"
          style={{ backgroundColor: color.hex }}
          title={color.name}
          aria-label={`Color ${color.name}`}
        />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-muted-foreground font-medium">
          +{remaining}
        </span>
      )}
    </div>
  );
}
