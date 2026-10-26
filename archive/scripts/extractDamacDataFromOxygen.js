import fs from 'fs';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sheet IDs
const OXYGEN_SHEET_ID = '1yyPp2fP1shP9KY2fDY0kKTSmTvdvE_M2FsJDjoAyvdk'; // Original Oxygen2023
const ORGANIZED_SHEET_ID = '1Ld63kXe1nFLWBYsHSRxZEkExHOmqAvxLp4vShQdAVvc'; // Organized sheet

async function extractDamacData() {
  try {
    // Load credentials
    const keyPath = path.join(__dirname, 'code', 'GoogleAPI', 'keys.json');
    const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  EXTRACTING DAMAC HILLS 2 REAL DATA        ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Get the original Oxygen2023 sheet data
    console.log('📖 Reading original Oxygen2023 sheet...');
    const response = await sheets.spreadsheets.get({
      spreadsheetId: OXYGEN_SHEET_ID
    });

    const sheetsInfo = response.data.sheets;
    console.log(`✓ Found ${sheetsInfo.length} sheets in Oxygen2023`);
    
    // Get sheet names
    sheetsInfo.forEach((sheet, idx) => {
      console.log(`  ${idx + 1}. ${sheet.properties.title}`);
    });

    // Use the Raw Data Backup sheet (which has the actual data)
    let targetSheet = sheetsInfo.find(s => s.properties.title.includes('Raw'));
    if (!targetSheet) {
      targetSheet = sheetsInfo[0]; // fallback to first sheet
    }
    
    const firstSheetName = targetSheet.properties.title;
    console.log(`\n📖 Using sheet: "${firstSheetName}"`);

    // Get all data from sheet
    console.log('\n📊 Extracting data from sheet...');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: OXYGEN_SHEET_ID,
      range: `'${firstSheetName}'!A1:Z100000`
    });

    const rows = dataResponse.data.values || [];
    
    if (!rows || rows.length === 0) {
      console.log('✗ No data found in sheet. Trying Clusters sheet instead...');
      
      // Try Clusters sheet
      const clustersSheet = sheetsInfo.find(s => s.properties.title.includes('Clusters'));
      if (clustersSheet) {
        const clustersResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: OXYGEN_SHEET_ID,
          range: `'${clustersSheet.properties.title}'!A1:Z100000`
        });
        rows.push(...(clustersResponse.data.values || []));
      }
    }
    
    if (!rows || rows.length === 0) {
      throw new Error('No data found in any sheet');
    }
    
    const headers = rows[0];
    const data = rows.slice(1);

    console.log(`✓ Found ${data.length} property records`);
    console.log(`✓ Found ${headers.length} columns`);
    
    // Debug: Show first row
    if (headers && headers.length > 0) {
      console.log(`\n📋 Column headers:`);
      headers.slice(0, 20).forEach((h, i) => {
        console.log(`  ${i + 1}. ${h}`);
      });
    }
    
    // Debug: Show first data row
    if (data.length > 0 && data[0]) {
      console.log(`\n📊 First record (first 20 columns):`);
      data[0].slice(0, 20).forEach((v, i) => {
        console.log(`  ${i + 1}. ${v}`);
      });
    }

    // Analyze the data
    console.log('\n🔍 Analyzing data structure...');

    // Find column indices
    const projectIdx = headers.findIndex(h => h && h.toLowerCase().includes('project'));
    const clusterIdx = headers.findIndex(h => h && h.toLowerCase().includes('cluster'));
    const priceIdx = headers.findIndex(h => h && h.toLowerCase().includes('price'));
    const bedroomIdx = headers.findIndex(h => h && h.toLowerCase().includes('bedroom'));
    const unitIdx = headers.findIndex(h => h && h.toLowerCase().includes('unit'));
    const areaIdx = headers.findIndex(h => h && h.toLowerCase().includes('area'));
    const statusIdx = headers.findIndex(h => h && h.toLowerCase().includes('status'));

    // Extract unique values
    const projects = new Set();
    const clusters = new Set();
    const units = new Set();
    const bedrooms = new Set();
    const statuses = new Set();
    let totalPrice = 0;
    let priceCount = 0;

    data.forEach((row, idx) => {
      if (row[projectIdx]) projects.add(row[projectIdx]);
      if (row[clusterIdx]) clusters.add(row[clusterIdx]);
      if (row[unitIdx]) units.add(row[unitIdx]);
      if (row[bedroomIdx]) bedrooms.add(row[bedroomIdx]);
      if (row[statusIdx]) statuses.add(row[statusIdx]);
      if (row[priceIdx] && !isNaN(row[priceIdx])) {
        totalPrice += parseFloat(row[priceIdx]);
        priceCount++;
      }
    });

    console.log(`✓ Unique Projects: ${projects.size}`);
    console.log(`✓ Unique Clusters: ${clusters.size}`);
    console.log(`✓ Unique Units: ${units.size}`);
    console.log(`✓ Unique Bedrooms: ${bedrooms.size}`);
    console.log(`✓ Property Statuses: ${statuses.size}`);

    const avgPrice = priceCount > 0 ? totalPrice / priceCount : 0;
    console.log(`✓ Average Price: AED ${avgPrice.toFixed(0)}`);

    // Build summary data
    console.log('\n📋 Building accurate data summary...');

    const summaryData = {
      metadata: {
        source: 'Oxygen2023 Google Sheet',
        extraction_date: new Date().toISOString(),
        total_records: data.length,
        total_columns: headers.length,
        headers: headers
      },
      project_stats: {
        total_units: data.length,
        unique_projects: Array.from(projects).length,
        projects_list: Array.from(projects).slice(0, 20),
        unique_clusters: Array.from(clusters).length,
        clusters_list: Array.from(clusters).sort(),
        property_statuses: Array.from(statuses),
        bedroom_types: Array.from(bedrooms).sort()
      },
      pricing_analysis: {
        average_price_aed: Math.round(avgPrice),
        average_price_usd: Math.round(avgPrice * 0.27),
        total_records_with_price: priceCount,
        currency_usd_to_aed_rate: 3.67
      },
      sample_records: data.slice(0, 10).map(row => ({
        project: row[projectIdx],
        cluster: row[clusterIdx],
        unit: row[unitIdx],
        bedrooms: row[bedroomIdx],
        area: row[areaIdx],
        price: row[priceIdx],
        status: row[statusIdx]
      }))
    };

    // Save to JSON file
    const outputPath = path.join(__dirname, 'DAMAC_HILLS_2_FROM_OXYGEN.json');
    fs.writeFileSync(outputPath, JSON.stringify(summaryData, null, 2));

    console.log(`\n✓ Data extraction complete!`);
    console.log(`✓ Summary saved to: DAMAC_HILLS_2_FROM_OXYGEN.json`);

    // Display summary
    console.log('\n📊 EXTRACTED DATA SUMMARY:');
    console.log('═════════════════════════════════════════');
    console.log(`Total Properties: ${data.length}`);
    console.log(`Projects: ${summaryData.project_stats.unique_projects}`);
    console.log(`Clusters: ${summaryData.project_stats.unique_clusters}`);
    console.log(`Avg Price: AED ${summaryData.pricing_analysis.average_price_aed.toLocaleString()}`);
    console.log(`Avg Price: USD ${summaryData.pricing_analysis.average_price_usd.toLocaleString()}`);
    console.log('\n📍 Top Clusters Found:');
    summaryData.project_stats.clusters_list.slice(0, 10).forEach((cluster, i) => {
      console.log(`   ${i + 1}. ${cluster}`);
    });
    console.log('\n📊 Bedroom Types Found:');
    summaryData.project_stats.bedroom_types.forEach((br, i) => {
      console.log(`   ${i + 1}. ${br}BR`);
    });
    console.log('\n✓ Data ready to update JSON file');

    return summaryData;

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

// Run extraction
extractDamacData();
