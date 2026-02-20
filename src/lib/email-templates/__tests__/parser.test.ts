import { describe, it, expect } from 'vitest';
import { parseHtml } from '../parser';
import { serializeHtml } from '../serializer';
import { defaultContentProperties, defaultStyleProperties } from '../default-template';
import type { ContentProperties, StyleProperties } from '../types';

function makeContent(overrides: Partial<ContentProperties> = {}): ContentProperties {
  return { ...defaultContentProperties, ...overrides };
}

function makeStyle(overrides: Partial<StyleProperties> = {}): StyleProperties {
  return { ...defaultStyleProperties, ...overrides };
}

describe('parseHtml', () => {
  describe('content extraction', () => {
    it('extracts all content fields from serialized HTML', () => {
      const content = makeContent({
        brandName: 'TestBrand',
        heroLabel: 'PROMO',
        title: 'Big Title',
        subtitle: 'Sub here',
        ctaText: 'Click Me',
        ctaUrl: 'https://example.com/go',
        bodyText: 'Body content here',
        footerText: 'Footer info',
      });
      const html = serializeHtml(content, makeStyle());
      const result = parseHtml(html);

      expect(result.content.brandName).toBe('TestBrand');
      expect(result.content.heroLabel).toBe('PROMO');
      expect(result.content.title).toBe('Big Title');
      expect(result.content.subtitle).toBe('Sub here');
      expect(result.content.ctaText).toBe('Click Me');
      expect(result.content.ctaUrl).toBe('https://example.com/go');
      expect(result.content.bodyText).toBe('Body content here');
      expect(result.content.footerText).toBe('Footer info');
    });

    it('extracts CTA URL from href attribute', () => {
      const content = makeContent({ ctaText: 'Go', ctaUrl: 'https://shop.example.com/sale' });
      const html = serializeHtml(content, makeStyle());
      const result = parseHtml(html);
      expect(result.content.ctaUrl).toBe('https://shop.example.com/sale');
    });
  });

  describe('style extraction', () => {
    it('extracts accentColor from CTA button', () => {
      const html = serializeHtml(makeContent(), makeStyle({ accentColor: '#ff5500' }));
      const result = parseHtml(html);
      expect(result.style.accentColor).toBe('#ff5500');
    });

    it('extracts heroBackgroundColor', () => {
      const html = serializeHtml(makeContent(), makeStyle({ heroBackgroundColor: '#123456' }));
      const result = parseHtml(html);
      expect(result.style.heroBackgroundColor).toBe('#123456');
    });

    it('extracts titleFont', () => {
      const html = serializeHtml(
        makeContent({ title: 'Hello' }),
        makeStyle({ titleFont: 'Georgia' })
      );
      const result = parseHtml(html);
      expect(result.style.titleFont).toBe('Georgia');
    });
  });

  describe('toggle detection', () => {
    it('detects showNavigation true', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showNavigation: true }));
      const result = parseHtml(html);
      expect(result.style.showNavigation).toBe(true);
    });

    it('detects showNavigation false', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showNavigation: false }));
      const result = parseHtml(html);
      expect(result.style.showNavigation).toBe(false);
    });

    it('detects showCards true', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showCards: true }));
      const result = parseHtml(html);
      expect(result.style.showCards).toBe(true);
    });

    it('detects showCards false', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showCards: false }));
      const result = parseHtml(html);
      expect(result.style.showCards).toBe(false);
    });

    it('detects showBackgroundPattern true', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showBackgroundPattern: true }));
      const result = parseHtml(html);
      expect(result.style.showBackgroundPattern).toBe(true);
    });

    it('detects showBackgroundPattern false', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showBackgroundPattern: false }));
      const result = parseHtml(html);
      expect(result.style.showBackgroundPattern).toBe(false);
    });

    it('detects showSocialLinks true', () => {
      const html = serializeHtml(
        makeContent({ footerText: 'foot' }),
        makeStyle({ showSocialLinks: true })
      );
      const result = parseHtml(html);
      expect(result.style.showSocialLinks).toBe(true);
    });

    it('detects showSocialLinks false', () => {
      const html = serializeHtml(
        makeContent({ footerText: 'foot' }),
        makeStyle({ showSocialLinks: false })
      );
      const result = parseHtml(html);
      expect(result.style.showSocialLinks).toBe(false);
    });
  });

  describe('best-effort resilience', () => {
    it('returns defaults for empty string', () => {
      const result = parseHtml('');
      expect(result.content).toEqual(defaultContentProperties);
      expect(result.style.showNavigation).toBe(false);
      expect(result.style.showCards).toBe(false);
      expect(result.style.showSocialLinks).toBe(false);
    });

    it('returns defaults for invalid HTML', () => {
      const result = parseHtml('<not-valid>garbage</not-valid>');
      expect(result.content.brandName).toBe(defaultContentProperties.brandName);
      expect(result.style.heroBackgroundColor).toBe(defaultStyleProperties.heroBackgroundColor);
    });

    it('never throws on malformed input', () => {
      expect(() => parseHtml('')).not.toThrow();
      expect(() => parseHtml('null')).not.toThrow();
      expect(() => parseHtml('<<<<>>>>')).not.toThrow();
      expect(() => parseHtml('data-field="title"')).not.toThrow();
    });
  });

  describe('round-trip with serializer', () => {
    it('round-trips default properties', () => {
      const html = serializeHtml(defaultContentProperties, defaultStyleProperties);
      const result = parseHtml(html);
      expect(result.content).toEqual(defaultContentProperties);
      expect(result.style).toEqual(defaultStyleProperties);
    });

    it('round-trips custom properties', () => {
      const content = makeContent({
        brandName: 'MyShop',
        heroLabel: 'SALE',
        title: 'Summer Sale',
        subtitle: 'Up to 50% off',
        ctaText: 'Shop Now',
        ctaUrl: 'https://myshop.com/sale',
        bodyText: 'Check out our deals',
        footerText: '© 2024 MyShop',
      });
      const style = makeStyle({
        accentColor: '#e11d48',
        heroBackgroundColor: '#0f172a',
        titleFont: 'Verdana',
        showNavigation: true,
        showCards: true,
        showBackgroundPattern: false,
        showSocialLinks: true,
      });
      const html = serializeHtml(content, style);
      const result = parseHtml(html);
      expect(result.content).toEqual(content);
      expect(result.style).toEqual(style);
    });
  });
});
