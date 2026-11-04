/**
 * @file RealEstateGraphQLResolver.js
 * @description GraphQL query and mutation resolvers for complex real estate inquiries:
 * filtering communities, querying price per sqft trends, and managing lead stages.
 * Category: API / Server
 */

export class RealEstateGraphQLResolver {
  constructor(dataSource = {}) {
    this.properties = dataSource.properties || [
      { id: 'p1', title: 'Burj Crown 2BR', community: 'Downtown', priceAed: 2800000, type: 'Apartment' },
      { id: 'p2', title: 'Palm Beach Villa', community: 'Palm Jumeirah', priceAed: 18500000, type: 'Villa' },
      { id: 'p3', title: 'Dubai Hills Estate Townhouse', community: 'Dubai Hills', priceAed: 4200000, type: 'Townhouse' }
    ];
  }

  /**
   * Resolves property listings with flexible filtering
   * @param {Object} args
   * @param {string} [args.community]
   * @param {number} [args.maxPriceAed]
   * @param {string} [args.type]
   * @returns {Array<Object>}
   */
  resolveProperties(args = {}) {
    return this.properties.filter(prop => {
      if (args.community && !prop.community.toLowerCase().includes(args.community.toLowerCase())) {
        return false;
      }
      if (args.type && !prop.type.toLowerCase().includes(args.type.toLowerCase())) {
        return false;
      }
      if (args.maxPriceAed && prop.priceAed > args.maxPriceAed) {
        return false;
      }
      return true;
    });
  }

  /**
   * Resolves single property by ID
   * @param {string} id
   * @returns {Object|null}
   */
  resolvePropertyById(id) {
    return this.properties.find(p => p.id === id) || null;
  }
}

export default new RealEstateGraphQLResolver();

