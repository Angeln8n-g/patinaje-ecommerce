import type { ContentProperties, StyleProperties, TemplateConfig } from './types';

export const defaultContentProperties: ContentProperties = {
  brandName: 'Hunykho Store',
  heroLabel: 'NUEVA COLECCIÓN',
  title: 'Descubre lo nuevo',
  subtitle: 'Los mejores productos te esperan',
  ctaText: 'Ver Ahora',
  ctaUrl: 'https://hunykho.com/skating-store',
  bodyText: 'Texto del cuerpo del email...',
  footerText: '© 2024 Hunykho Store. Todos los derechos reservados.',
};

export const defaultStyleProperties: StyleProperties = {
  accentColor: '#7c3aed',
  heroBackgroundColor: '#1e1b4b',
  titleFont: 'Arial',
  showNavigation: true,
  showCards: false,
  showBackgroundPattern: true,
  showSocialLinks: true,
};

export function getDefaultTemplate(): {
  contentProperties: ContentProperties;
  styleProperties: StyleProperties;
  config: TemplateConfig;
} {
  return {
    contentProperties: { ...defaultContentProperties },
    styleProperties: { ...defaultStyleProperties },
    config: {
      name: '',
      subject: '',
      senderName: '',
      replyTo: '',
      triggerType: 'manual-campana',
      status: 'borrador',
    },
  };
}
