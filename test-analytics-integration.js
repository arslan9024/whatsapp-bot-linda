/**
 * Test that analytics integration compiles and initializes properly
 */

console.log("📚 Testing Analytics Integration...\n");

try {
  console.log("1. Importing AnalyticsManager...");
  const AnalyticsManager = await import("./code/utils/AnalyticsManager.js").then(m => m.default);
  console.log("   ✅ AnalyticsManager imported");

  console.log("2. Importing UptimeTracker...");
  const UptimeTracker = await import("./code/utils/UptimeTracker.js").then(m => m.default);
  console.log("   ✅ UptimeTracker imported");

  console.log("3. Importing ReportGenerator...");
  const ReportGenerator = await import("./code/utils/ReportGenerator.js").then(m => m.default);
  console.log("   ✅ ReportGenerator imported");

  console.log("4. Importing MetricsDashboard...");
  const MetricsDashboard = await import("./code/utils/MetricsDashboard.js").then(m => m.default);
  console.log("   ✅ MetricsDashboard imported");

  console.log("5. Importing TerminalHealthDashboard...");
  const terminalHealthDashboard = await import("./code/utils/TerminalHealthDashboard.js").then(m => m.default);
  console.log("   ✅ TerminalHealthDashboard imported");

  console.log("6. Testing AnalyticsManager initialization...");
  const analyticsManager = new AnalyticsManager();
  await analyticsManager.initialize();
  console.log("   ✅ AnalyticsManager initialized");

  console.log("7. Testing message recording...");
  analyticsManager.recordMessage("+971505760056", {
    type: "text",
    fromMe: true,
    isGroup: false,
    timestamp: new Date(),
  });
  console.log("   ✅ Message recorded");

  console.log("8. Testing status change recording...");
  analyticsManager.recordStatusChange("+971505760056", {
    event: "authenticated",
    status: "online",
    timestamp: new Date(),
  });
  console.log("   ✅ Status change recorded");

  console.log("9. Testing UptimeTracker initialization...");
  const uptimeTracker = new UptimeTracker({ slaTarget: 0.99 });
  await uptimeTracker.initialize();
  console.log("   ✅ UptimeTracker initialized");

  console.log("10. Testing ReportGenerator initialization...");
  const reportGenerator = new ReportGenerator(analyticsManager, uptimeTracker);
  console.log("   ✅ ReportGenerator initialized");

  console.log("11. Testing MetricsDashboard initialization...");
  const metricsDashboard = new MetricsDashboard(analyticsManager, uptimeTracker);
  console.log("   ✅ MetricsDashboard initialized");

  console.log("\n✅ ALL ANALYTICS INTEGRATION TESTS PASSED!");
  console.log("\nAnalytics pipeline is ready for production integration.\n");

  process.exit(0);
} catch (error) {
  console.error("\n❌ INTEGRATION TEST FAILED:");
  console.error(error.message);
  console.error("\nStack trace:");
  console.error(error.stack);
  process.exit(1);
}
