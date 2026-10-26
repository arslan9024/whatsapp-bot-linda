/**
 * PropertyLayoutConfig.js
 * Comprehensive property layout and unit type definitions for Damac Hills 2
 */

const DAMAC_HILLS_2_LAYOUTS = {
  STUDIO: {
    code: 'STD',
    label: 'Studio',
    bedrooms: 0,
    bathrooms: 1,
    sqft_range: [450, 550],
    typical_layout: 'Open-plan living with separate bedroom area',
    maid_room: false,
    furnished_options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
    category: 'Entry'
  },

  ONE_BR: {
    code: '1B',
    label: '1 Bedroom',
    bedrooms: 1,
    bathrooms: [1, 1.5],
    sqft_range: [650, 750],
    typical_layout: '1 Master + Living/Dining + Kitchen',
    maid_room: false,
    furnished_options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
    category: 'Standard'
  },

  TWO_BR: {
    code: '2B',
    label: '2 Bedroom',
    bedrooms: 2,
    bathrooms: [2, 2.5],
    sqft_range: [950, 1150],
    typical_layout: '1 Master + 1 Guest + Living/Dining + Kitchen',
    maid_room: false,
    furnished_options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
    category: 'Standard'
  },

  TWO_BR_MAID: {
    code: '2B+M',
    label: '2 Bedroom + Maid Room',
    bedrooms: 2,
    bathrooms: [2.5, 3],
    sqft_range: [1150, 1300],
    typical_layout: '1 Master + 1 Guest + Maid Room + Living/Dining + Kitchen',
    maid_room: true,
    furnished_options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
    category: 'Premium',
    premium: true
  },

  THREE_BR: {
    code: '3B',
    label: '3 Bedroom',
    bedrooms: 3,
    bathrooms: 3,
    sqft_range: [1400, 1600],
    typical_layout: '1 Master + 2 Guest + Living/Dining + Kitchen + Laundry',
    maid_room: false,
    furnished_options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
    category: 'Premium'
  },

  THREE_BR_MAID: {
    code: '3B+M',
    label: '3 Bedroom + Maid Room',
    bedrooms: 3,
    bathrooms: [3.5, 4],
    sqft_range: [1600, 1850],
    typical_layout: '1 Master + 2 Guest + Maid Room + Living/Dining + Kitchen + Laundry',
    maid_room: true,
    furnished_options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
    category: 'Premium',
    premium: true
  },

  VILLA_2BR: {
    code: 'V2B',
    label: '2 Bedroom Villa',
    bedrooms: 2,
    bathrooms: 2,
    sqft_range: [1800, 2200],
    property_type: 'Villa',
    maid_room: false,
    furnished_options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
    category: 'Luxury',
    premium: true
  },

  VILLA_3BR: {
    code: 'V3B',
    label: '3 Bedroom Villa',
    bedrooms: 3,
    bathrooms: 3,
    sqft_range: [2200, 2800],
    property_type: 'Villa',
    maid_room: true,
    furnished_options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
    category: 'Luxury',
    premium: true
  },

  VILLA_4BR: {
    code: 'V4B',
    label: '4 Bedroom Villa',
    bedrooms: 4,
    bathrooms: 4,
    sqft_range: [2800, 3500],
    property_type: 'Villa',
    maid_room: true,
    furnished_options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
    category: 'Luxury',
    premium: true
  },

  PENTHOUSE_2BR: {
    code: 'PH2B',
    label: '2 Bedroom Penthouse',
    bedrooms: 2,
    bathrooms: 2,
    sqft_range: [1800, 2400],
    property_type: 'Penthouse',
    maid_room: false,
    furnished_options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
    category: 'Ultra',
    premium: true,
    luxury: true
  },

  PENTHOUSE_3BR: {
    code: 'PH3B',
    label: '3 Bedroom Penthouse',
    bedrooms: 3,
    bathrooms: 3,
    sqft_range: [2400, 3200],
    property_type: 'Penthouse',
    maid_room: true,
    furnished_options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
    category: 'Ultra',
    premium: true,
    luxury: true
  }
};

const LAYOUT_CODES = {
  'STD': 'STUDIO',
  '1B': 'ONE_BR',
  '2B': 'TWO_BR',
  '2B+M': 'TWO_BR_MAID',
  '3B': 'THREE_BR',
  '3B+M': 'THREE_BR_MAID',
  'V2B': 'VILLA_2BR',
  'V3B': 'VILLA_3BR',
  'V4B': 'VILLA_4BR',
  'PH2B': 'PENTHOUSE_2BR',
  'PH3B': 'PENTHOUSE_3BR'
};

const STANDARD_AMENITIES_BY_SIZE = {
  all: [
    'Central Air Conditioning',
    'Ceramic/Marble Flooring',
    'CCTV Security',
    'Parking Space(s)',
    'Access to Community Facilities'
  ],
  apartments: [
    'Equipped Kitchen (Cooker, Dishwasher)',
    'Laundry Area / Washing Machine Connection',
    'Bathroom Fixtures',
    'Built-in Wardrobes (Master Bedroom)',
    'Balcony/Terrace'
  ],
  premium: [
    'Maid Room with Separate Bathroom',
    'Study/Flex Room Option',
    'Kitchen Island/Breakfast Bar',
    'Master Bedroom Ensuite',
    'Multiple Balconies/Terraces',
    'Premium Finishes',
    'Smart Home Ready'
  ]
};

/**
 * Detect layout from text/keywords
 * Uses fuzzy matching to find closest layout match
 */
function detectLayout(inputText) {
  if (!inputText || typeof inputText !== 'string') {
    return null;
  }

  const normalized = inputText.toLowerCase();
  const bestMatches = [];

  // Check for exact code matches first
  for (const [code, key] of Object.entries(LAYOUT_CODES)) {
    if (normalized.includes(code.toLowerCase())) {
      bestMatches.push({
        code: code,
        layout: DAMAC_HILLS_2_LAYOUTS[key],
        confidence: 95
      });
    }
  }

  if (bestMatches.length > 0) {
    return bestMatches[0];
  }

  // Check for pattern matches
  const patterns = {
    studio: /studio/,
    onebed: /1\s*bed|one\s*bed|1br/,
    twobed: /2\s*bed|two\s*bed|2br/,
    twomaid: /2.*bed.*maid|2.*\+\s*m|2br\s*\+\s*m/,
    threebed: /3\s*bed|three\s*bed|3br/,
    threemaid: /3.*bed.*maid|3.*\+\s*m|3br\s*\+\s*m/,
    villa: /villa/,
    penthouse: /penthouse|pent\s*house|ph/
  };

  for (const [pattern, regex] of Object.entries(patterns)) {
    if (regex.test(normalized)) {
      if (pattern === 'studio') {
        return {
          code: 'STD',
          layout: DAMAC_HILLS_2_LAYOUTS.STUDIO,
          confidence: 85
        };
      } else if (pattern === 'onebed') {
        return {
          code: '1B',
          layout: DAMAC_HILLS_2_LAYOUTS.ONE_BR,
          confidence: 85
        };
      } else if (pattern === 'twobed') {
        return {
          code: '2B',
          layout: DAMAC_HILLS_2_LAYOUTS.TWO_BR,
          confidence: 85
        };
      } else if (pattern === 'twomaid') {
        return {
          code: '2B+M',
          layout: DAMAC_HILLS_2_LAYOUTS.TWO_BR_MAID,
          confidence: 85
        };
      } else if (pattern === 'threebed') {
        return {
          code: '3B',
          layout: DAMAC_HILLS_2_LAYOUTS.THREE_BR,
          confidence: 85
        };
      } else if (pattern === 'threemaid') {
        return {
          code: '3B+M',
          layout: DAMAC_HILLS_2_LAYOUTS.THREE_BR_MAID,
          confidence: 85
        };
      } else if (pattern === 'villa') {
        // Need more specifics for villa
        if (/4\s*bed/.test(normalized)) {
          return {
            code: 'V4B',
            layout: DAMAC_HILLS_2_LAYOUTS.VILLA_4BR,
            confidence: 85
          };
        } else if (/3\s*bed/.test(normalized)) {
          return {
            code: 'V3B',
            layout: DAMAC_HILLS_2_LAYOUTS.VILLA_3BR,
            confidence: 85
          };
        } else {
          return {
            code: 'V2B',
            layout: DAMAC_HILLS_2_LAYOUTS.VILLA_2BR,
            confidence: 75
          };
        }
      } else if (pattern === 'penthouse') {
        if (/3\s*bed/.test(normalized)) {
          return {
            code: 'PH3B',
            layout: DAMAC_HILLS_2_LAYOUTS.PENTHOUSE_3BR,
            confidence: 85
          };
        } else {
          return {
            code: 'PH2B',
            layout: DAMAC_HILLS_2_LAYOUTS.PENTHOUSE_2BR,
            confidence: 75
          };
        }
      }
    }
  }

  return null;
}

/**
 * Get layout by code
 */
function getLayoutByCode(code) {
  const key = LAYOUT_CODES[code];
  return key ? DAMAC_HILLS_2_LAYOUTS[key] : null;
}

/**
 * Get all valid layout codes
 */
function getAllLayoutCodes() {
  return Object.keys(LAYOUT_CODES);
}

/**
 * Get layouts by category
 */
function getLayoutsByCategory(category) {
  return Object.values(DAMAC_HILLS_2_LAYOUTS).filter(
    layout => layout.category === category
  );
}

/**
 * Get layouts by bedroom count
 */
function getLayoutsByBedrooms(bedrooms) {
  return Object.values(DAMAC_HILLS_2_LAYOUTS).filter(
    layout => layout.bedrooms === bedrooms
  );
}

/**
 * Check if layout is premium
 */
function isPremium(code) {
  const key = LAYOUT_CODES[code];
  return key ? (DAMAC_HILLS_2_LAYOUTS[key].premium === true) : false;
}


export default {
  DAMAC_HILLS_2_LAYOUTS,
  LAYOUT_CODES,
  STANDARD_AMENITIES_BY_SIZE,
  detectLayout,
  getLayoutByCode,
  getAllLayoutCodes,
  getLayoutsByCategory,
  getLayoutsByBedrooms,
  isPremium
};
