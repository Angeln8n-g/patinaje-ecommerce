'use client';

import type { ContentProperties, StyleProperties, TemplateConfig } from '@/lib/email-templates/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ContentTab } from './ContentTab';
import { StyleTab } from './StyleTab';
import { ConfigTab } from './ConfigTab';
import { Type, Palette, Settings } from 'lucide-react';

interface PropertiesPanelProps {
  contentProperties: ContentProperties;
  onUpdateContent: (partial: Partial<ContentProperties>) => void;
  styleProperties: StyleProperties;
  onUpdateStyle: (partial: Partial<StyleProperties>) => void;
  config: TemplateConfig;
  htmlContent: string;
  onUpdateConfig: (partial: Partial<TemplateConfig>) => void;
}

export function PropertiesPanel({
  contentProperties,
  onUpdateContent,
  styleProperties,
  onUpdateStyle,
  config,
  htmlContent,
  onUpdateConfig,
}: PropertiesPanelProps) {
  return (
    <Tabs defaultValue="content" className="flex h-full flex-col">
      <TabsList className="w-full shrink-0">
        <TabsTrigger value="content" className="flex-1 gap-1.5">
          <Type className="size-3.5" />
          Contenido
        </TabsTrigger>
        <TabsTrigger value="style" className="flex-1 gap-1.5">
          <Palette className="size-3.5" />
          Estilo
        </TabsTrigger>
        <TabsTrigger value="config" className="flex-1 gap-1.5">
          <Settings className="size-3.5" />
          Configuración
        </TabsTrigger>
      </TabsList>

      <TabsContent value="content" className="flex-1 overflow-hidden mt-0">
        <ContentTab
          contentProperties={contentProperties}
          onUpdateContent={onUpdateContent}
        />
      </TabsContent>

      <TabsContent value="style" className="flex-1 overflow-hidden mt-0">
        <StyleTab
          styleProperties={styleProperties}
          onUpdateStyle={onUpdateStyle}
        />
      </TabsContent>

      <TabsContent value="config" className="flex-1 overflow-hidden mt-0">
        <ConfigTab
          config={config}
          htmlContent={htmlContent}
          onUpdateConfig={onUpdateConfig}
        />
      </TabsContent>
    </Tabs>
  );
}
