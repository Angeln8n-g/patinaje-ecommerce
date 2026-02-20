import { describe, it, expect } from 'vitest';
import {
  defaultContentProperties,
  defaultStyleProperties,
  getDefaultTemplate,
} from '../default-template';

describe('defaultContentProperties', () => {
  it('has all required content fields with non-empty defaults', () => {
    expect(defaultContentProperties.brandName).toBe('Hunykho Store');
    expect(defaultContentProperties.heroLabel).toBe('NUEVA COLECCIÓN');
    expect(defaultContentProperties.title).toBe('Descubre lo nuevo');
    expect(defaultContentProperties.subtitle).toBe('Los mejores productos te esperan');
    expect(defaultContentProperties.ctaText).toBe('Ver Ahora');
    expect(defaultContentProperties.ctaUrl).toBe('https://hunykho.com/skating-store');
    expect(defaultContentProperties.bodyText).toBe('Texto del cuerpo del email...');
    expect(defaultContentProperties.footerText).toBe('© 2024 Hunykho Store. Todos los derechos reservados.');
  });
});

describe('defaultStyleProperties', () => {
  it('has all required style fields with correct defaults', () => {
    expect(defaultStyleProperties.accentColor).toBe('#7c3aed');
    expect(defaultStyleProperties.heroBackgroundColor).toBe('#1e1b4b');
    expect(defaultStyleProperties.titleFont).toBe('Arial');
    expect(defaultStyleProperties.showNavigation).toBe(true);
    expect(defaultStyleProperties.showCards).toBe(false);
    expect(defaultStyleProperties.showBackgroundPattern).toBe(true);
    expect(defaultStyleProperties.showSocialLinks).toBe(true);
  });
});

describe('getDefaultTemplate', () => {
  it('returns content, style, and config properties', () => {
    const template = getDefaultTemplate();
    expect(template).toHaveProperty('contentProperties');
    expect(template).toHaveProperty('styleProperties');
    expect(template).toHaveProperty('config');
  });

  it('returns default content and style values', () => {
    const template = getDefaultTemplate();
    expect(template.contentProperties).toEqual(defaultContentProperties);
    expect(template.styleProperties).toEqual(defaultStyleProperties);
  });

  it('returns config with empty strings and default trigger/status', () => {
    const template = getDefaultTemplate();
    expect(template.config.name).toBe('');
    expect(template.config.subject).toBe('');
    expect(template.config.senderName).toBe('');
    expect(template.config.replyTo).toBe('');
    expect(template.config.triggerType).toBe('manual-campana');
    expect(template.config.status).toBe('borrador');
  });

  it('returns new object copies on each call (no shared references)', () => {
    const a = getDefaultTemplate();
    const b = getDefaultTemplate();
    expect(a).not.toBe(b);
    expect(a.contentProperties).not.toBe(b.contentProperties);
    expect(a.styleProperties).not.toBe(b.styleProperties);
    expect(a.config).not.toBe(b.config);
  });
});
