/**
 * @file DldOpenDataIngestionParser.js
 * @description Ingestion parser for Dubai Land Department (DLD) open data exports.
 * Normalizes sales, mortgages, and off-plan registration records into structured metrics.
 * Category: Integrations
 */

export class DldOpenDataIngestionParser {
  constructor(config = {}) {
    this.minValidAmount = config.minValidAmount || 100000;
  }

  /**
   * Normalizes a raw DLD transaction record
   * @param {Object} rawRecord
   * @returns {Object|null}
   */
  parseRecord(rawRecord) {
    if (!rawRecord) return null;

    const txDate = rawRecord.instance_date || rawRecord.date || rawRecord.transaction_date;
    const procedure = (rawRecord.procedure_name || rawRecord.transaction_type || 'Sale').trim();
    const area = (rawRecord.area_name_en || rawRecord.area_name || rawRecord.location || 'Unknown').trim();
    const propertyType = (rawRecord.property_type_en || rawRecord.property_usage_en || rawRecord.type || 'Unit').trim();
    const actualWorth = parseFloat(rawRecord.actual_worth || rawRecord.amount || rawRecord.price || 0);
    const meterPrice = parseFloat(rawRecord.meter_sale_price || rawRecord.price_per_sqm || 0);
    const sqft = parseFloat(rawRecord.procedure_area || rawRecord.size_sqft || 0);

    if (actualWorth < this.minValidAmount) {
      return null;
    }

    return {
      transactionId: rawRecord.transaction_id || rawRecord.id || `DLD-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      date: txDate ? new Date(txDate).toISOString() : new Date().toISOString(),
      procedure,
      area,
      propertyType,
      amountAed: actualWorth,
      sqft: sqft > 0 ? sqft : (meterPrice > 0 ? Math.round(actualWorth / (meterPrice / 10.764)) : null),
      meterPriceAed: meterPrice,
      isOffPlan: /off-plan|registration/i.test(procedure) || Boolean(rawRecord.is_offplan)
    };
  }

  /**
   * Ingests and aggregates a batch of raw DLD records
   * @param {Array<Object>} records
   * @returns {Object} Aggregated area performance statistics
   */
  aggregateBatch(records) {
    if (!Array.isArray(records)) return { totalProcessed: 0, validRecords: 0, areas: {} };

    const areasMap = {};
    let totalWorth = 0;
    let validCount = 0;

    for (const raw of records) {
      const parsed = this.parseRecord(raw);
      if (!parsed) continue;

      validCount++;
      totalWorth += parsed.amountAed;

      if (!areasMap[parsed.area]) {
        areasMap[parsed.area] = {
          txCount: 0,
          totalSalesAed: 0,
          offPlanCount: 0,
          readyCount: 0,
          avgPriceAed: 0
        };
      }

      const areaStat = areasMap[parsed.area];
      areaStat.txCount++;
      areaStat.totalSalesAed += parsed.amountAed;
      if (parsed.isOffPlan) {
        areaStat.offPlanCount++;
      } else {
        areaStat.readyCount++;
      }
    }

    // Compute averages
    for (const key of Object.keys(areasMap)) {
      const st = areasMap[key];
      st.avgPriceAed = Math.round(st.totalSalesAed / st.txCount);
    }

    return {
      totalProcessed: records.length,
      validRecords: validCount,
      totalVolumeAed: totalWorth,
      areas: areasMap
    };
  }
}

export default new DldOpenDataIngestionParser();
