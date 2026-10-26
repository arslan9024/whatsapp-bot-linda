/**
 * DAMAC Bot Message Handler with MongoDB Integration
 * Example: How to integrate MongoDB services into your WhatsApp bot
 * 
 * Usage in your main bot file (index.js or main.js):
 * import { setupDamacBotHandlers, initializeDamac, closeDamac } from './DatabaseBotExample.js';
 */

import { connectToMongoDB, disconnectFromMongoDB } from './config.js';
import * as services from './services.js';

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize MongoDB connection for bot
 * Call this when bot starts
 */
async function initializeDamac() {
  try {
    await connectToMongoDB();
    console.log('✅ DAMAC Bot: MongoDB connected');
    return true;
  } catch (error) {
    console.error('❌ DAMAC Bot: Failed to initialize MongoDB:', error.message);
    return false;
  }
}

/**
 * Close MongoDB connection
 * Call this when bot stops
 */
async function closeDamac() {
  try {
    await disconnectFromMongoDB();
    console.log('✅ DAMAC Bot: MongoDB disconnected');
  } catch (error) {
    console.error('❌ DAMAC Bot: Error closing MongoDB:', error.message);
  }
}

// ============================================
// RESPONSE GENERATORS
// ============================================

/**
 * Generate response for price query
 * User: "How much is a 2BR apartment?"
 */
async function getPriceResponse(bedroomType, propertyType = 'Apartment') {
  try {
    const pricing = await services.getPricingForBedroom(bedroomType, propertyType);
    
    if (!pricing) {
      return `❌ No pricing data found for ${bedroomType} ${propertyType}`;
    }
    
    return `
💰 DAMAC HILLS 2 - ${bedroomType} ${propertyType} PRICING

Price Information:
  💵 Average: AED ${pricing.avgPrice?.aed?.toLocaleString() || 'N/A'}
  💵 USD: USD ${pricing.avgPrice?.usd?.toLocaleString() || 'N/A'}

Property Details:
  📐 Average Size: ${pricing.avgSize?.sqft || 'N/A'} sqft (${pricing.avgSize?.sqm || 'N/A'} m²)
  📊 Available Units: ${pricing.count || 'N/A'}

Investment Information:
  📈 Rental Yield: ${pricing.rentalRange?.percentage || '4-6'}% per year
  💷 Annual Rent: AED ${pricing.rentalRange?.max?.toLocaleString() || 'N/A'}

Would you like information about different unit types or clusters?
    `.trim();
  } catch (error) {
    console.error('Error getting price response:', error);
    return '❌ Unable to get pricing information. Please try again.';
  }
}

/**
 * Generate response for cluster information
 * User: "Tell me about Cluster 5"
 */
async function getClusterResponse(clusterNumber) {
  try {
    const clusters = await services.getAllClusters();
    const cluster = clusters[clusterNumber - 1];
    
    if (!cluster) {
      return `❌ Cluster ${clusterNumber} not found. We have clusters 1-28.`;
    }
    
    const amenitiesText = cluster.amenities
      .slice(0, 8)
      .map(a => `  ✓ ${a}`)
      .join('\n');
    
    return `
🏘️  DAMAC HILLS 2 - ${cluster.name.toUpperCase()}

Basic Information:
  📍 Cluster ID: ${cluster.clusterId}
  🏠 Total Units: ${cluster.unitCount}
  🛏️  Unit Types: ${cluster.unitTypes.join(', ')}

✨ Amenities Available:
${amenitiesText}
${cluster.amenities.length > 8 ? `\n  ... and ${cluster.amenities.length - 8} more!` : ''}

Status: ${cluster.status || 'Available'}

Would you like pricing information or more details about this cluster?
    `.trim();
  } catch (error) {
    console.error('Error getting cluster response:', error);
    return '❌ Unable to get cluster information. Please try again.';
  }
}

/**
 * Generate response for nearby amenities
 * User: "What schools are nearby?"
 */
async function getNearbyFacilitiesResponse(facilityType = 'schools') {
  try {
    let facilities = [];
    
    facilityType = facilityType.toLowerCase();
    
    if (facilityType.includes('school')) {
      facilities = await services.getSchoolsNearby(5);
    } else if (facilityType.includes('hospital') || facilityType.includes('clinic') || facilityType.includes('doctor')) {
      facilities = await services.getHospitalsNearby(5);
    } else if (facilityType.includes('mall') || facilityType.includes('shop') || facilityType.includes('shopping')) {
      facilities = await services.getShoppingNearby(5);
    } else {
      facilities = await services.searchLocations(facilityType);
    }
    
    if (facilities.length === 0) {
      return `❌ No ${facilityType} found nearby.`;
    }
    
    const facilitiesText = facilities
      .map((f, i) => `  ${i + 1}. ${f.name}\n     📍 ${f.distance?.km} km away (${f.distance?.minutes} mins) - ${f.type}`)
      .join('\n');
    
    const categoryName = {
      schools: '🏫 Nearby Schools',
      hospitals: '🏥 Nearby Hospitals',
      malls: '🛍️  Shopping Malls'
    }[facilityType] || `📍 Nearby ${facilityType}`;
    
    return `
${categoryName}

${facilitiesText}

All facilities are accessible from DAMAC Hills 2 by car or public transport.
Need more information about specific facilities?
    `.trim();
  } catch (error) {
    console.error('Error getting facilities response:', error);
    return '❌ Unable to get facility information. Please try again.';
  }
}

/**
 * Generate response for property search
 * User: "Show me 2BR apartments under 1 million"
 */
async function getPropertySearchResponse(filters = {}) {
  try {
    const results = await services.getPropertiesWithFilters(filters, {
      sortBy: 'price',
      sortOrder: 1,
      limit: 5
    });
    
    if (results.data.length === 0) {
      return `⚠️  No properties found matching your criteria.\n\nTry:\n  • Different price range\n  • Different unit type\n  • Different number of bedrooms`;
    }
    
    const propertiesText = results.data
      .map((p, i) => `
  ${i + 1}. Unit ${p.unitNumber} - ${p.clusterName}
     Type: ${p.bedrooms}BR ${p.propertyType}
     Size: ${p.size?.sqm} m² (${p.size?.sqft} sqft)
     Price: AED ${p.price?.aed?.toLocaleString()}
      `.trim())
      .join('\n\n');
    
    return `
🏠 PROPERTY SEARCH RESULTS

${propertiesText}

Total Found: ${results.total}
Showing: ${results.data.length} of ${results.pages} page(s)

Message "show more" to see additional properties.
Interested in any of these? Reply with the unit number for details.
    `.trim();
  } catch (error) {
    console.error('Error getting property search response:', error);
    return '❌ Unable to search properties. Please try again.';
  }
}

/**
 * Generate response for project statistics
 * User: "Tell me about DAMAC Hills 2"
 */
async function getProjectStatsResponse() {
  try {
    const stats = await services.getProjectStats();
    
    return `
📊 DAMAC HILLS 2 - PROJECT OVERVIEW

Location & Developer:
  🏢 Location: Dubai, MotorCity vicinity
  🏗️  Developer: DAMAC Properties
  📈 Status: Completed & Operational

Key Statistics:
  🏠 Total Units: 1,500
  🏘️  Total Clusters: 28
  👥 Estimated Population: 6,000+ residents
  📐 Total Area: 42 hectares
  
Investment Highlights:
  💰 Price Range: AED 450K - AED 5M
  📈 Average Price: AED 1,200,000
  🎯 Rental Yield: 4-6% annually
  📊 Capital Appreciation: 3-5% per year

Amenities:
  ✅ 100+ world-class amenities
  ✅ Professional community management
  ✅ 24/7 security and gated community
  ✅ Multiple sports & recreational facilities

Nearby:
  🎓 4+ International Schools
  🏥 4+ Hospitals & Clinics
  🛍️  Shopping malls & retail centers
  🚗 Easy access to major roads

Ask me about:
  • Specific bedroom types & pricing
  • Available clusters (1-28)
  • Nearby schools, hospitals, shops
  • Individual properties
  • Investment potential
    `.trim();
  } catch (error) {
    console.error('Error getting project stats response:', error);
    return '❌ Unable to get project information. Please try again.';
  }
}

/**
 * Generate response for amenities list
 * User: "What amenities are available?"
 */
async function getAmenitiesResponse() {
  try {
    const summary = await services.getAmenitiesSummary();
    
    let response = '✨ DAMAC HILLS 2 - COMPLETE AMENITIES LIST\n\n';
    
    summary.forEach(category => {
      response += `${emoticon(category._id)} ${category._id.toUpperCase()} (${category.count} items)\n`;
      
      category.amenities
        .slice(0, 5)
        .forEach(amenity => {
          response += `  • ${amenity}\n`;
        });
      
      if (category.amenities.length > 5) {
        response += `  ... and ${category.amenities.length - 5} more\n`;
      }
      response += '\n';
    });
    
    response += 'Ask about any specific amenity for more details!';
    
    return response.trim();
  } catch (error) {
    console.error('Error getting amenities response:', error);
    return '❌ Unable to get amenities information. Please try again.';
  }
}

// ============================================
// MESSAGE HANDLER
// ============================================

/**
 * Main message handler for bot
 * Processes user queries and generates appropriate responses
 */
async function handleDamacQuery(userMessage) {
  const msg = userMessage.toLowerCase().trim();
  
  try {
    // Price queries
    if (msg.includes('price') || msg.includes('cost') || msg.includes('how much')) {
      if (msg.includes('1br') || msg.includes('1 bed')) {
        return await getPriceResponse('1BR');
      } else if (msg.includes('2br') || msg.includes('2 bed')) {
        return await getPriceResponse('2BR');
      } else if (msg.includes('3br') || msg.includes('3 bed')) {
        return await getPriceResponse('3BR');
      } else if (msg.includes('4br') || msg.includes('4 bed')) {
        return await getPriceResponse('4BR');
      }
    }
    
    // Cluster queries
    if (msg.includes('cluster')) {
      const clusterMatch = msg.match(/\d+/);
      if (clusterMatch) {
        return await getClusterResponse(parseInt(clusterMatch[0]));
      }
    }
    
    // Amenities queries
    if (msg.includes('amenities') || msg.includes('facility') || msg.includes('facilities')) {
      return await getAmenitiesResponse();
    }
    
    // Nearby facilities
    if (msg.includes('school')) {
      return await getNearbyFacilitiesResponse('schools');
    }
    if (msg.includes('hospital') || msg.includes('clinic') || msg.includes('doctor')) {
      return await getNearbyFacilitiesResponse('hospitals');
    }
    if (msg.includes('mall') || msg.includes('shopping')) {
      return await getNearbyFacilitiesResponse('malls');
    }
    
    // Project information
    if (msg.includes('about') || msg.includes('information') || msg.includes('damac')) {
      return await getProjectStatsResponse();
    }
    
    // Property search
    if (msg.includes('show') || msg.includes('available') || msg.includes('properties')) {
      return await getPropertySearchResponse({ status: 'Available' });
    }
    
    // Default response
    return `
👋 Welcome to DAMAC Hills 2 Bot!

I can help you with:
  💰 Pricing information (e.g., "2BR price?")
  🏘️  Cluster details (e.g., "Tell me about cluster 5")
  🎓 Nearby schools
  🏥 Hospitals and clinics
  🛍️  Shopping and dining
  ✨ Available amenities
  🏠 Property search
  📊 Investment information

What would you like to know?
    `.trim();
    
  } catch (error) {
    console.error('Error handling query:', error);
    return '❌ Sorry, I encountered an error. Please try again.';
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function emoticon(category) {
  const emojis = {
    'Sports': '⚽',
    'Recreation': '🎭',
    'Community': '🏘️',
    'Family': '👨‍👩‍👧‍👦',
    'Wellness': '💆',
    'Retail': '🛍️',
    'Dining': '🍽️'
  };
  return emojis[category] || '✨';
}

// ============================================
// EXPORT FOR BOT INTEGRATION
// ============================================

export {
  initializeDamac,
  closeDamac,
  handleDamacQuery,
  getPriceResponse,
  getClusterResponse,
  getNearbyFacilitiesResponse,
  getPropertySearchResponse,
  getProjectStatsResponse,
  getAmenitiesResponse,
};

// ============================================
// EXAMPLE USAGE IN YOUR MAIN BOT FILE
// ============================================

/*
// In your index.js or main.js:

import { initializeDamac, closeDamac, handleDamacQuery } from './DatabaseBotExample.js';

// When bot starts
client.on('ready', async () => {
  console.log('Bot is ready!');
  await initializeDamac(); // Initialize DAMAC database
});

// Handle incoming messages
client.on('message', async (message) => {
  if (message.from_me) return; // Ignore own messages
  
  // Check if message is about DAMAC
  if (message.body.toLowerCase().includes('damac') || 
      message.body.toLowerCase().includes('price') ||
      message.body.toLowerCase().includes('cluster')) {
    
    const response = await handleDamacQuery(message.body);
    await message.reply(response);
  }
});

// When bot stops
process.on('SIGINT', async () => {
  console.log('Stopping bot...');
  await closeDamac(); // Close DAMAC database
  process.exit(0);
});
*/
