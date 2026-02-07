/**
 * Analytics Service
 * 
 * Provides comprehensive analytics and insights on:
 * - Deduplication results
 * - Data quality metrics
 * - Record distribution
 * - Bot usage patterns
 */

import { Logger } from '../Utils/Logger.js';

const logger = new Logger('AnalyticsService');

class AnalyticsService {
  constructor() {
    this.metrics = {
      deduplication: {},
      dataQuality: {},
      distribution: {},
      botUsage: {}
    };
  }

  /**
   * Analyze deduplication results
   */
  analyzeDeduplication(deduplicationResult) {
    logger.info('📊 Analyzing deduplication results...');

    const stats = deduplicationResult.stats;
    const analysis = {
      originalCount: stats.normalized,
      duplicateCount: stats.duplicates,
      uniqueCount: stats.merged,
      reductionRatio: stats.duplicates / stats.normalized,
      reductionPercentage: Math.round((stats.duplicates / stats.normalized) * 100),
      duplicateTypes: this._categorizeDuplicates(deduplicationResult.duplicateMap),
      potentialFuzzyMatches: deduplicationResult.potentialDuplicates?.length || 0,
      fuzzyMatchSimilarities: this._analyzeFuzzyMatches(deduplicationResult.potentialDuplicates),
    };

    this.metrics.deduplication = analysis;

    logger.info(`✅ Deduplication Analysis:`);
    logger.info(`   Original: ${analysis.originalCount}`);
    logger.info(`   Duplicates Found: ${analysis.duplicateCount} (${analysis.reductionPercentage}%)`);
    logger.info(`   Unique Records: ${analysis.uniqueCount}`);
    logger.info(`   Fuzzy Matches for Review: ${analysis.potentialFuzzyMatches}`);

    return analysis;
  }

  /**
   * Analyze data quality
   */
  analyzeDataQuality(records) {
    logger.info('🔍 Analyzing data quality...');

    const qualityScores = records.map(r => r._deduplicationStats?.dataQualityScore || 0);
    const avgScore = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;

    const distribution = {
      excellent: qualityScores.filter(s => s >= 90).length,
      good: qualityScores.filter(s => s >= 70 && s < 90).length,
      acceptable: qualityScores.filter(s => s >= 50 && s < 70).length,
      poor: qualityScores.filter(s => s < 50).length
    };

    // Field completeness analysis
    const fieldCompleteness = this._analyzeFieldCompleteness(records);

    const analysis = {
      averageQualityScore: Math.round(avgScore),
      scoreDistribution: distribution,
      percentageByGrade: {
        excellent: Math.round((distribution.excellent / records.length) * 100),
        good: Math.round((distribution.good / records.length) * 100),
        acceptable: Math.round((distribution.acceptable / records.length) * 100),
        poor: Math.round((distribution.poor / records.length) * 100)
      },
      fieldCompleteness,
      recommendedActions: this._generateQualityRecommendations(distribution, fieldCompleteness)
    };

    this.metrics.dataQuality = analysis;

    logger.info(`✅ Data Quality Analysis:`);
    logger.info(`   Average Score: ${analysis.averageQualityScore}%`);
    logger.info(`   Excellent: ${distribution.excellent} (${analysis.percentageByGrade.excellent}%)`);
    logger.info(`   Good: ${distribution.good} (${analysis.percentageByGrade.good}%)`);
    logger.info(`   Acceptable: ${distribution.acceptable} (${analysis.percentageByGrade.acceptable}%)`);
    logger.info(`   Poor: ${distribution.poor} (${analysis.percentageByGrade.poor}%)`);

    return analysis;
  }

  /**
   * Analyze record distribution by type
   */
  analyzeRecordDistribution(codeStats) {
    logger.info('📈 Analyzing record distribution...');

    const total = codeStats.totalCodes;
    const analysis = {
      total,
      byType: {
        properties: {
          count: codeStats.byType.properties,
          percentage: Math.round((codeStats.byType.properties / total) * 100)
        },
        contacts: {
          count: codeStats.byType.contacts,
          percentage: Math.round((codeStats.byType.contacts / total) * 100)
        },
        financials: {
          count: codeStats.byType.financials,
          percentage: Math.round((codeStats.byType.financials / total) * 100)
        },
        others: {
          count: codeStats.byType.others,
          percentage: Math.round((codeStats.byType.others / total) * 100)
        }
      },
      distribution: this._visualizeDistribution(codeStats.byType, total)
    };

    this.metrics.distribution = analysis;

    logger.info(`✅ Record Distribution:`);
    logger.info(`   Total Records: ${total}`);
    logger.info(`   Properties: ${analysis.byType.properties.count} (${analysis.byType.properties.percentage}%)`);
    logger.info(`   Contacts: ${analysis.byType.contacts.count} (${analysis.byType.contacts.percentage}%)`);
    logger.info(`   Financials: ${analysis.byType.financials.count} (${analysis.byType.financials.percentage}%)`);
    logger.info(`   Others: ${analysis.byType.others.count} (${analysis.byType.others.percentage}%)`);

    return analysis;
  }

  /**
   * Track bot usage patterns
   */
  trackBotUsage(messageContext) {
    if (!this.metrics.botUsage.calls) {
      this.metrics.botUsage = {
        calls: 0,
        successfulLookups: 0,
        failedLookups: 0,
        recordsAccessed: [],
        peakHours: {},
        messageTypes: {},
        averageLookupTime: 0
      };
    }

    this.metrics.botUsage.calls++;

    if (messageContext.hasRecords) {
      this.metrics.botUsage.successfulLookups++;
      messageContext.extracted.allMatches.forEach(match => {
        this.metrics.botUsage.recordsAccessed.push({
          code: match.code,
          type: match.type,
          timestamp: new Date().toISOString()
        });
      });
    } else {
      this.metrics.botUsage.failedLookups++;
    }

    return this.metrics.botUsage;
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    logger.info('📋 Generating comprehensive analytics report...');

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalRecords: this.metrics.distribution.total || 0,
        averageQuality: this.metrics.dataQuality.averageQualityScore || 0,
        duplicatesRemoved: this.metrics.deduplication.duplicateCount || 0,
        reductionPercentage: this.metrics.deduplication.reductionPercentage || 0,
        botCalls: this.metrics.botUsage.calls || 0,
        successResult: Math.round(
          ((this.metrics.botUsage.successfulLookups || 0) / 
           Math.max(1, this.metrics.botUsage.calls || 1)) * 100
        )
      },
      details: {
        deduplication: this.metrics.deduplication,
        dataQuality: this.metrics.dataQuality,
        distribution: this.metrics.distribution,
        botUsage: {
          totalCalls: this.metrics.botUsage.calls,
          successfulLookups: this.metrics.botUsage.successfulLookups,
          failedLookups: this.metrics.botUsage.failedLookups,
          successRate: `${Math.round(
            ((this.metrics.botUsage.successfulLookups || 0) / 
             Math.max(1, this.metrics.botUsage.calls || 1)) * 100
          )}%`,
          recordsAccessed: this.metrics.botUsage.recordsAccessed?.length || 0
        }
      },
      recommendations: this._generateOverallRecommendations()
    };

    logger.info('✅ Report generated successfully');
    return report;
  }

  /**
   * Export report as sheet data
   */
  exportAsSheetData() {
    const report = this.generateReport();

    const data = [
      ['ANALYTICS REPORT', report.generatedAt],
      [],
      ['SUMMARY'],
      ['Total Records', report.summary.totalRecords],
      ['Average Quality Score', `${report.summary.averageQuality}%`],
      ['Duplicates Removed', report.summary.duplicatesRemoved],
      ['Reduction Percentage', `${report.summary.reductionPercentage}%`],
      ['Bot Calls', report.summary.botCalls],
      ['Success Rate', `${report.summary.successResult}%`],
      [],
      ['DEDUPLICATION DETAILS'],
      ['Original Records', report.details.deduplication.originalCount],
      ['Duplicate Count', report.details.deduplication.duplicateCount],
      ['Unique Records', report.details.deduplication.uniqueCount],
      ['Fuzzy Matches for Review', report.details.deduplication.potentialFuzzyMatches],
      [],
      ['DATA QUALITY'],
      ['Score Grade', 'Count', 'Percentage'],
      ['Excellent', report.details.dataQuality.scoreDistribution.excellent, `${report.details.dataQuality.percentageByGrade.excellent}%`],
      ['Good', report.details.dataQuality.scoreDistribution.good, `${report.details.dataQuality.percentageByGrade.good}%`],
      ['Acceptable', report.details.dataQuality.scoreDistribution.acceptable, `${report.details.dataQuality.percentageByGrade.acceptable}%`],
      ['Poor', report.details.dataQuality.scoreDistribution.poor, `${report.details.dataQuality.percentageByGrade.poor}%`],
      [],
      ['RECORD DISTRIBUTION'],
      ['Type', 'Count', 'Percentage'],
      ['Properties', report.details.distribution.byType.properties.count, `${report.details.distribution.byType.properties.percentage}%`],
      ['Contacts', report.details.distribution.byType.contacts.count, `${report.details.distribution.byType.contacts.percentage}%`],
      ['Financials', report.details.distribution.byType.financials.count, `${report.details.distribution.byType.financials.percentage}%`],
      ['Others', report.details.distribution.byType.others.count, `${report.details.distribution.byType.others.percentage}%`],
      [],
      ['BOT USAGE'],
      ['Total Calls', report.details.botUsage.totalCalls],
      ['Successful Lookups', report.details.botUsage.successfulLookups],
      ['Failed Lookups', report.details.botUsage.failedLookups],
      ['Success Rate', report.details.botUsage.successRate],
      ['Records Accessed', report.details.botUsage.recordsAccessed],
      [],
      ['RECOMMENDATIONS'],
      ...report.recommendations.map(rec => [rec])
    ];

    return data;
  }

  /**
   * Helper: Categorize duplicates
   */
  _categorizeDuplicates(duplicateMap) {
    const categories = {
      exactPhoneMatches: 0,
      exactEmailMatches: 0,
      exactNameMatches: 0,
      mixed: 0
    };

    duplicateMap.forEach((duplicates) => {
      if (duplicates.length > 0) {
        // Simple categorization based on key pattern
        const key = duplicates[0];
        if (key.split('||')[0]) categories.exactPhoneMatches++;
        else if (key.split('||')[1]) categories.exactEmailMatches++;
        else if (key.split('||')[2]) categories.exactNameMatches++;
        else categories.mixed++;
      }
    });

    return categories;
  }

  /**
   * Helper: Analyze fuzzy matches
   */
  _analyzeFuzzyMatches(potentialDuplicates = []) {
    if (!potentialDuplicates || potentialDuplicates.length === 0) {
      return { count: 0, averageSimilarity: 0, distribution: {} };
    }

    const similarities = potentialDuplicates.map(m => m.similarity);
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;

    const distribution = {
      veryHigh: similarities.filter(s => s >= 0.95).length,
      high: similarities.filter(s => s >= 0.85 && s < 0.95).length,
      medium: similarities.filter(s => s >= 0.75 && s < 0.85).length,
      low: similarities.filter(s => s < 0.75).length
    };

    return {
      count: potentialDuplicates.length,
      averageSimilarity: Math.round(avgSimilarity * 100) / 100,
      distribution
    };
  }

  /**
   * Helper: Analyze field completeness
   */
  _analyzeFieldCompleteness(records) {
    const fieldStats = {};

    records.forEach(record => {
      Object.keys(record).forEach(field => {
        if (!fieldStats[field]) {
          fieldStats[field] = { total: 0, filled: 0 };
        }
        fieldStats[field].total++;
        if (record[field] && String(record[field]).trim() !== '') {
          fieldStats[field].filled++;
        }
      });
    });

    const completeness = {};
    for (const [field, stats] of Object.entries(fieldStats)) {
      completeness[field] = Math.round((stats.filled / stats.total) * 100);
    }

    return completeness;
  }

  /**
   * Helper: Generate quality recommendations
   */
  _generateQualityRecommendations(distribution, fieldCompleteness) {
    const recommendations = [];

    if (distribution.poor > 0) {
      recommendations.push(`${distribution.poor} records have poor quality. Consider reviewing and cleaning these records.`);
    }

    const incompletionFields = Object.entries(fieldCompleteness)
      .filter(([_, completeness]) => completeness < 70)
      .map(([field, _]) => field);

    if (incompletionFields.length > 0) {
      recommendations.push(`The following fields are less than 70% complete: ${incompletionFields.join(', ')}. Consider data cleanup.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Data quality looks good. No major issues detected.');
    }

    return recommendations;
  }

  /**
   * Helper: Visualize distribution
   */
  _visualizeDistribution(typeStats, total) {
    const visualization = {};
    const barLength = 30;

    for (const [type, count] of Object.entries(typeStats)) {
      const percentage = Math.round((count / total) * 100);
      const barFill = Math.round((count / total) * barLength);
      const bar = '█'.repeat(barFill) + '░'.repeat(barLength - barFill);
      visualization[type] = `${bar} ${percentage}%`;
    }

    return visualization;
  }

  /**
   * Helper: Generate overall recommendations
   */
  _generateOverallRecommendations() {
    const recommendations = [];

    if (this.metrics.deduplication.reductionPercentage > 20) {
      recommendations.push(`✅ High deduplication rate (${this.metrics.deduplication.reductionPercentage}%). Data is clean.`);
    }

    if (this.metrics.dataQuality.averageQualityScore < 70) {
      recommendations.push(`⚠️  Data quality is below 70%. Recommend data enrichment and validation.`);
    }

    if (this.metrics.botUsage.failedLookups > this.metrics.botUsage.successfulLookups) {
      recommendations.push(`⚠️  More failed than successful lookups. Check message parsing logic.`);
    }

    if (this.metrics.deduplication.potentialFuzzyMatches > 0) {
      recommendations.push(`🔍 ${this.metrics.deduplication.potentialFuzzyMatches} potential fuzzy matches found. Review and manually merge if needed.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System is operating optimally. No actionable recommendations at this time.');
    }

    return recommendations;
  }
}

export { AnalyticsService };
