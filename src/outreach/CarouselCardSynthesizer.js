/**
 * @file CarouselCardSynthesizer.js
 * @description Formats WhatsApp multi-product catalog cards and interactive carousel
 * message payloads highlighting curated selections of luxury properties.
 * Category: Outreach
 */

export class CarouselCardSynthesizer {
  /**
   * Builds an interactive carousel card collection payload
   * @param {Array<Object>} properties
   * @param {string} [headerText]
   * @returns {Object} Structured carousel message descriptor
   */
  synthesizeCarousel(properties = [], headerText = 'Curated Dubai Luxury Collection') {
    const cards = properties.slice(0, 10).map((p, idx) => {
      const priceFormatted = Number(p.priceAed || 0).toLocaleString();
      return {
        cardIndex: idx + 1,
        propertyRef: p.ref || `PROP-${idx + 1}`,
        title: p.title || 'Luxury Residence',
        community: p.community || 'Dubai Prime',
        priceAed: p.priceAed || 0,
        heroImageUrl: p.imageUrl || 'https://assets.botlinda.ae/img/default_villa.jpg',
        primaryButton: {
          label: 'Book Viewing',
          actionPayload: `VIEWING_${p.ref || idx + 1}`
        },
        secondaryButton: {
          label: 'Download Brochure',
          actionPayload: `BROCHURE_${p.ref || idx + 1}`
        },
        caption: `*${p.title}* — AED ${priceFormatted} (${p.community})`
      };
    });

    return {
      type: 'interactive_carousel',
      header: headerText,
      totalCards: cards.length,
      cards
    };
  }
}

export default new CarouselCardSynthesizer();
