/**
 * WhatsApp Client Page Injection Patch
 * Workaround for: Protocol error (Page.addScriptToEvaluateOnNewDocument): Session closed
 * 
 * This patch adds aggressive retry logic specifically for page injection failures
 * which appear to be a race condition in whatsapp-web.js
 */

export async function patchClientInitializeWithRetry(client) {
  const originalInitialize = client.initialize.bind(client);
  
  return new Promise((resolve, reject) => {
    const maxRetries = 5;
    let retryCount = 0;
    
    const attempt = async () => {
      try {
        console.log(`🔧 [PageInjection] Initialization attempt ${retryCount + 1}/${maxRetries}`);
        
        // Add early page ready detection
        if (client.pupBrowser && client.pupBrowser.pages) {
          const pages = await client.pupBrowser.pages();
          for (const page of pages) {
            try {
              // Check if page is ready for script injection
              await page.evaluateOnNewDocument(() => {
                window.__WHATSAPP_INIT_TIME = Date.now();
              });
              console.log(`✅ [PageInjection] Pre-injection test passed`);
            } catch (e) {
              console.log(`⚠️  [PageInjection] Pre-injection test failed: ${e.message}`);
            }
          }
        }
        
        // Try initialize with longer timeout
        const initPromise = originalInitialize();
        const timeoutPromise = new Promise((_, fail) => 
          setTimeout(() => fail(new Error('Initialize timeout (60s)')), 60000)
        );
        
        await Promise.race([initPromise, timeoutPromise]);
        console.log(`✅ [PageInjection] Initialization successful!`);
        resolve(true);
        
      } catch (error) {
        const msg = error?.message || String(error);
        retryCount++;
        
        // Check if it's a page injection error
        const isPageInjectionError = msg.includes('addScriptToEvaluateOnNewDocument') ||
                                     msg.includes('Requesting main frame') ||
                                     msg.includes('Session closed');
        
        if (isPageInjectionError && retryCount < maxRetries) {
          console.log(`⚠️  [PageInjection] Retry ${retryCount}/${maxRetries - 1}: ${msg.substring(0, 60)}...`);
          
          // Exponential backoff: 1s, 2s, 4s, 8s
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 8000);
          console.log(`⏳ [PageInjection] Waiting ${backoffDelay}ms before retry...`);
          
          setTimeout(attempt, backoffDelay);
        } else if (isPageInjectionError) {
          console.log(`❌ [PageInjection] Max retries reached, giving up`);
          reject(error);
        } else {
          // Non-injection error, don't retry
          reject(error);
        }
      }
    };
    
    attempt();
  });
}

/**
 * Apply patch to client before initialize() is called
 */
export function applyPageInjectionPatch(client) {
  // Wrap the initialize method
  const originalInit = client.initialize.bind(client);
  
  client.initialize = async function() {
    return patchClientInitializeWithRetry(client);
  };
  
  return client;
}
