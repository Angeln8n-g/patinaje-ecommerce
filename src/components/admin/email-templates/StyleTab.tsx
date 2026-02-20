'use client';

import type { StyleProperties } from '@/lib/email-templates/types';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StyleTabProps {
  styleProperties: StyleProperties;
  onUpdateStyle: (partial: Partial<StyleProperties>) => void;
}

const ACCENT_PRESETS = [
  { color: '#7c3aed', label: 'Púrpura' },
  { color: '#2563eb', label: 'Azul' },
  { color: '#dc2626', label: 'Rojo' },
  { color: '#16a34a', label: 'Verde' },
  { color: '#ea580c', label: 'Naranja' },
  { color: '#0d9488', label: 'Teal' },
  { color: '#000000', label: 'Negro' },
];

const FONT_OPTIONS = [
  'Arial',
  'Georgia',
  'Verdana',
  'Trebuchet MS',
  'Times New Roman',
];

const TOGGLE_OPTIONS: { key: keyof StyleProperties; label: string }[] = [
  { key: 'showNavigation', label: 'Navegación' },
  { key: 'showCards', label: 'Tarjetas' },
  { key: 'showBackgroundPattern', label: 'Patrón de fondo' },
  { key: 'showSocialLinks', label: 'Enlaces sociales' },
];

function ColorSwatch({
  color,
  selected,
  label,
  onClick,
}: {
  color: string;
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="size-7 rounded-full border-2 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none"
      style={{
        backgroundColor: color,
        borderColor: selected ? 'var(--ring)' : 'transparent',
      }}
    />
  );
}

export function StyleTab({ styleProperties, onUpdateStyle }: StyleTabProps) {
  const isPresetColor = ACCENT_PRESETS.some(
    (p) => p.color === styleProperties.accentColor
  );

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-4">
        <h3 className="text-sm font-semibold">Estilo</h3>

        {/* Accent color */}
        <div className="flex flex-col gap-2">
          <Label>Color de acento</Label>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((preset) => (
              <ColorSwatch
                key={preset.color}
                color={preset.color}
                label={`Color ${preset.label}`}
                selected={styleProperties.accentColor === preset.color}
                onClick={() => onUpdateStyle({ accentColor: preset.color })}
              />
            ))}
            <label
              className="relative size-7 cursor-pointer"
              aria-label="Color personalizado"
            >
              <span
                className="block size-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background:
                    'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                  borderColor: !isPresetColor ? 'var(--ring)' : 'transparent',
                }}
              />
              <input
                type="color"
                value={styleProperties.accentColor}
                onChange={(e) =>
                  onUpdateStyle({ accentColor: e.target.value })
                }
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        {/* Hero background color */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="hero-bg-color">Color de fondo hero</Label>
          <div className="flex items-center gap-2">
            <label className="relative size-9 cursor-pointer shrink-0">
              <span
                className="block size-9 rounded-md border"
                style={{ backgroundColor: styleProperties.heroBackgroundColor }}
              />
              <input
                id="hero-bg-color"
                type="color"
                value={styleProperties.heroBackgroundColor}
                onChange={(e) =>
                  onUpdateStyle({ heroBackgroundColor: e.target.value })
                }
                className="absolute inset-0 size-full cursor-pointer opacity-0"
              />
            </label>
            <span className="text-xs text-muted-foreground font-mono">
              {styleProperties.heroBackgroundColor}
            </span>
          </div>
        </div>

        {/* Title font */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="title-font">Tipografía del título</Label>
          <Select
            value={styleProperties.titleFont}
            onValueChange={(value) => onUpdateStyle({ titleFont: value })}
          >
            <SelectTrigger id="title-font" className="w-full">
              <SelectValue placeholder="Seleccionar fuente" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font} value={font}>
                  <span style={{ fontFamily: font }}>{font}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Section toggles */}
        <div className="flex flex-col gap-3">
          <Label>Secciones visibles</Label>
          {TOGGLE_OPTIONS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <Label
                htmlFor={`toggle-${key}`}
                className="text-sm font-normal cursor-pointer"
              >
                {label}
              </Label>
              <Switch
                id={`toggle-${key}`}
                checked={styleProperties[key] as boolean}
                onCheckedChange={(checked) =>
                  onUpdateStyle({ [key]: checked })
                }
              />
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
