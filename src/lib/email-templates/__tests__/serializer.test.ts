import { describe, it, expect } from 'vitest';
import { serializeHtml } from '../serializer';
import { defaultContentProperties, defaultStyleProperties } from '../default-template';
import type { ContentProperties, StyleProperties } from '../types';

function makeContent(overrides: Partial<ContentProperties> = {}): ContentProperties {
  return { ...defaultContentProperties, ...overrides };
}

function makeStyle(overrides: Partial<StyleProperties> = {}): StyleProperties {
  return { ...defaultStyleProperties, ...overrides };
}

describe('serializeHtml', () => {
  it('generates valid HTML document structure', () => {
    const html = serializeHtml(makeContent(), makeStyle());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('<body');
    expect(html).toContain('</body>');
  });

  it('uses table-based layout, not divs for structure', () => {
    const html = serializeHtml(makeContent(), makeStyle());
    expect(html).toContain('<table');
    expect(html).not.toContain('<div');
  });

  it('uses inline styles, not style blocks', () => {
    const html = serializeHtml(makeContent(), makeStyle());
    expect(html).toContain('style="');
    expect(html).not.toMatch(/<style[\s>]/);
  });

  it('includes all non-empty content values', () => {
    const content = makeContent({
      brandName: 'TestBrand',
      heroLabel: 'PROMO',
      title: 'Big Title',
      subtitle: 'Sub here',
      ctaText: 'Click Me',
      ctaUrl: 'https://example.com',
      bodyText: 'Body content here',
      footerText: 'Footer info',
    });
    const html = serializeHtml(content, makeStyle());
    expect(html).toContain('TestBrand');
    expect(html).toContain('PROMO');
    expect(html).toContain('Big Title');
    expect(html).toContain('Sub here');
    expect(html).toContain('Click Me');
    expect(html).toContain('https://example.com');
    expect(html).toContain('Body content here');
    expect(html).toContain('Footer info');
  });

  describe('data-section attributes', () => {
    it('marks navigation section', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showNavigation: true }));
      expect(html).toContain('data-section="navigation"');
    });

    it('marks hero section', () => {
      const html = serializeHtml(makeContent(), makeStyle());
      expect(html).toContain('data-section="hero"');
    });

    it('marks cta section', () => {
      const html = serializeHtml(makeContent({ ctaText: 'Go' }), makeStyle());
      expect(html).toContain('data-section="cta"');
    });

    it('marks body section', () => {
      const html = serializeHtml(makeContent({ bodyText: 'text' }), makeStyle());
      expect(html).toContain('data-section="body"');
    });

    it('marks cards section', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showCards: true }));
      expect(html).toContain('data-section="cards"');
    });

    it('marks footer section', () => {
      const html = serializeHtml(makeContent({ footerText: 'foot' }), makeStyle());
      expect(html).toContain('data-section="footer"');
    });

    it('marks social section when showSocialLinks is true', () => {
      const html = serializeHtml(
        makeContent({ footerText: 'foot' }),
        makeStyle({ showSocialLinks: true })
      );
      expect(html).toContain('data-section="social"');
    });
  });

  describe('accentColor application', () => {
    it('applies accentColor to CTA button background', () => {
      const html = serializeHtml(
        makeContent({ ctaText: 'Go' }),
        makeStyle({ accentColor: '#ff5500' })
      );
      expect(html).toContain('background-color:#ff5500');
    });

    it('applies accentColor to navigation brand text', () => {
      const html = serializeHtml(
        makeContent({ brandName: 'Brand' }),
        makeStyle({ showNavigation: true, accentColor: '#ff5500' })
      );
      expect(html).toContain('color:#ff5500');
    });

    it('applies accentColor to social links', () => {
      const html = serializeHtml(
        makeContent({ footerText: 'foot' }),
        makeStyle({ showSocialLinks: true, accentColor: '#ff5500' })
      );
      const socialSection = html.split('data-section="social"')[1];
      expect(socialSection).toContain('color:#ff5500');
    });
  });

  describe('titleFont application', () => {
    it('applies titleFont to title element', () => {
      const html = serializeHtml(
        makeContent({ title: 'Hello' }),
        makeStyle({ titleFont: 'Georgia' })
      );
      expect(html).toContain('font-family:Georgia,Arial,Helvetica,sans-serif');
    });
  });

  describe('toggle sections', () => {
    it('includes navigation when showNavigation is true', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showNavigation: true }));
      expect(html).toContain('data-section="navigation"');
    });

    it('excludes navigation when showNavigation is false', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showNavigation: false }));
      expect(html).not.toContain('data-section="navigation"');
    });

    it('includes cards when showCards is true', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showCards: true }));
      expect(html).toContain('data-section="cards"');
    });

    it('excludes cards when showCards is false', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showCards: false }));
      expect(html).not.toContain('data-section="cards"');
    });

    it('includes background pattern when showBackgroundPattern is true', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showBackgroundPattern: true }));
      expect(html).toContain('background-image:');
    });

    it('excludes background pattern when showBackgroundPattern is false', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showBackgroundPattern: false }));
      expect(html).not.toContain('background-image:');
    });

    it('includes social links when showSocialLinks is true', () => {
      const html = serializeHtml(
        makeContent({ footerText: 'foot' }),
        makeStyle({ showSocialLinks: true })
      );
      expect(html).toContain('data-section="social"');
    });

    it('excludes social links when showSocialLinks is false', () => {
      const html = serializeHtml(
        makeContent({ footerText: 'foot' }),
        makeStyle({ showSocialLinks: false })
      );
      expect(html).not.toContain('data-section="social"');
    });
  });

  describe('empty content omission', () => {
    it('omits CTA section when ctaText is empty', () => {
      const html = serializeHtml(makeContent({ ctaText: '' }), makeStyle());
      expect(html).not.toContain('data-section="cta"');
    });

    it('omits body section when bodyText is empty', () => {
      const html = serializeHtml(makeContent({ bodyText: '' }), makeStyle());
      expect(html).not.toContain('data-section="body"');
    });

    it('omits footer section when footerText is empty', () => {
      const html = serializeHtml(makeContent({ footerText: '' }), makeStyle());
      expect(html).not.toContain('data-section="footer"');
    });

    it('omits navigation when brandName is empty even if showNavigation is true', () => {
      const html = serializeHtml(
        makeContent({ brandName: '' }),
        makeStyle({ showNavigation: true })
      );
      expect(html).not.toContain('data-section="navigation"');
    });

    it('omits heroLabel from hero when heroLabel is empty', () => {
      const html = serializeHtml(makeContent({ heroLabel: '' }), makeStyle());
      expect(html).not.toContain('data-field="heroLabel"');
    });

    it('omits title from hero when title is empty', () => {
      const html = serializeHtml(makeContent({ title: '' }), makeStyle());
      expect(html).not.toContain('data-field="title"');
    });

    it('omits subtitle from hero when subtitle is empty', () => {
      const html = serializeHtml(makeContent({ subtitle: '' }), makeStyle());
      expect(html).not.toContain('data-field="subtitle"');
    });
  });

  describe('data-field attributes for parser', () => {
    it('marks brandName field', () => {
      const html = serializeHtml(makeContent(), makeStyle({ showNavigation: true }));
      expect(html).toContain('data-field="brandName"');
    });

    it('marks heroLabel field', () => {
      const html = serializeHtml(makeContent({ heroLabel: 'LABEL' }), makeStyle());
      expect(html).toContain('data-field="heroLabel"');
    });

    it('marks title field', () => {
      const html = serializeHtml(makeContent({ title: 'Title' }), makeStyle());
      expect(html).toContain('data-field="title"');
    });

    it('marks subtitle field', () => {
      const html = serializeHtml(makeContent({ subtitle: 'Sub' }), makeStyle());
      expect(html).toContain('data-field="subtitle"');
    });

    it('marks ctaText field', () => {
      const html = serializeHtml(makeContent({ ctaText: 'CTA' }), makeStyle());
      expect(html).toContain('data-field="ctaText"');
    });

    it('marks bodyText field', () => {
      const html = serializeHtml(makeContent({ bodyText: 'Body' }), makeStyle());
      expect(html).toContain('data-field="bodyText"');
    });

    it('marks footerText field', () => {
      const html = serializeHtml(makeContent({ footerText: 'Footer' }), makeStyle());
      expect(html).toContain('data-field="footerText"');
    });
  });

  it('applies heroBackgroundColor to hero section', () => {
    const html = serializeHtml(makeContent(), makeStyle({ heroBackgroundColor: '#123456' }));
    expect(html).toContain('background-color:#123456');
  });
});
