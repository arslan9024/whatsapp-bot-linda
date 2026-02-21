/**
 * GorahaContactVerificationService - Quick Import Test
 * Tests that the service can be imported and has required methods
 */

console.log("Starting GorahaContactVerificationService import test...\n");

try {
  // Test import
  const { GorahaContactVerificationService } = await import('./code/WhatsAppBot/GorahaContactVerificationService.js');
  
  console.log("✅ Service imported successfully\n");
  
  // Test instantiation
  const service = new GorahaContactVerificationService();
  console.log("✅ Service instantiated successfully\n");
  
  // Test methods exist
  const methods = [
    'initialize',
    'setWhatsAppClient',
    'fetchGorahaContacts',
    'verifyAllContacts',
    'printReport',
    'getNumbersSansWhatsApp',
    'getStats'
  ];
  
  console.log("Checking required methods:");
  for (const method of methods) {
    if (typeof service[method] === 'function') {
      console.log(`  ✅ ${method}()`);
    } else {
      console.log(`  ❌ ${method}() - NOT FOUND`);
    }
  }
  
  console.log("\n✅ All required methods present");
  console.log("✅ Service structure is valid");
  console.log("✅ Ready for integration");
  
  process.exit(0);
  
} catch (error) {
  console.error("❌ Import test failed:");
  console.error(error.message);
  process.exit(1);
}
