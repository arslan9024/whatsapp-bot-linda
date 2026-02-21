# QR Auto-Regeneration Quick Reference Guide

## For Developers

### File Locations
- **ConnectionManager**: `code/utils/ConnectionManager.js`
- **QRAutoRegenerator**: `code/utils/ConnectionEnhancements.js`
- **Documentation**: `QR_AUTO_REGENERATION_INTEGRATION.md`

### Key Methods

#### ConnectionManager.handleQR(qrCode)
```javascript
// Called when WhatsApp emits 'qr' event
// Initializes and starts auto-regeneration tracking

// Returns: boolean (true if processed, false if debounced)
```

#### QRAutoRegenerator.startTracking(onTimeout, timeoutMs)
```javascript
// Start monitoring for QR timeout
// Default timeout: 120 seconds

// Parameters:
// - onTimeout: Callback function(attemptNum) when timeout occurs
// - timeoutMs: Timeout duration in milliseconds

// Example:
qrRegenerator.startTracking((attempt) => {
  console.log(`Attempt ${attempt}/3`);
  // Trigger new QR generation here
}, 120000);
```

#### QRAutoRegenerator.stop()
```javascript
// Clean shutdown - stops all tracking and clears timers
// Called by ConnectionManager.destroy()

qrRegenerator.stop();
```

### State Tracking

```javascript
// In ConnectionManager instance:
this.qrRegenerator = null;        // Instance of QRAutoRegenerator
this.qrAttempts = 0;             // Total QR displays
this.metrics.qrCodesGenerated = 0; // Total codes shown
this.metrics.qrRegenerationAttempts = 0; // Auto-regen attempts
```

### Event Flow Diagram

```
User scans → WhatsApp 'qr' event
               ↓
         ConnectionManager.handleQR()
               ↓
      QRAutoRegenerator.startTracking()
               ↓
         [wait 120 seconds]
               ↓
      ┌────────┴────────┐
      ↓                 ↓
   SUCCESS:          TIMEOUT:
   QR Scanned    → Regenerate attempt 1/3
                      ↓
                 [wait 120 seconds]
                      ↓
                   Same process...
                      ↓
              After 3 failed attempts:
              Fallback → 6-digit code
```

### Common Tasks

#### 1. Monitor QR Regeneration Attempts
```javascript
const connManager = accountClients.get(phoneNumber);
console.log('QR Regeneration Attempts:', 
  connManager.metrics.qrRegenerationAttempts);
console.log('QR Regenerations Failed:', 
  connManager.metrics.qrRegenerationsFailed);
```

#### 2. Programmatically Check QR Status
```javascript
const timeRemaining = qrRegenerator.getTimeRemaining();
const secondsRemaining = qrRegenerator.getTimeRemainingSeconds();
console.log(`QR valid for ${secondsRemaining}s`);
```

#### 3. Trigger Fallback Manually
```javascript
// If needed, manually trigger fallback when QR fails
qrRegenerator.triggerFallback();
// This will call the registered onFallback callback
```

#### 4. Register Fallback Handler
```javascript
qrRegenerator.onFallback(() => {
  console.log('Fallback triggered - show 6-digit code');
  // Your fallback logic here
});
```

### Debugging Tips

#### Enable Debug Logging
The QRAutoRegenerator logs at these levels:
- `'warn'` - QR timeout detected
- `'error'` - Regeneration failed after 3 attempts
- `'info'` - Regeneration attempts, callbacks

#### Check Metrics
```javascript
// Get complete connection diagnostics
const status = connManager.getStatus();
console.log(status);

// Check QR-specific metrics
console.log('QR codes generated:', status.metrics.qrCodesGenerated);
console.log('QR regen attempts:', status.metrics.qrRegenerationAttempts);
console.log('QR regen failed:', status.metrics.qrRegenerationsFailed);
```

#### Monitor in Real-time
```javascript
// Watch for QR timeout attempts
const originalLog = console.log;
const logFunc = (msg, level) => {
  if (msg.includes('QR')) {
    originalLog(`[${level.toUpperCase()}] ${msg}`);
  }
};
```

### Troubleshooting

#### Problem: QR regeneration not working
**Check**:
1. Is `handleQR()` being called? (Check logs for "📱 QR received")
2. Is QRAutoRegenerator instantiated? (Check `connManager.qrRegenerator`)
3. Are timers being cleared? (Check `destroy()` cleanup)

#### Problem: Memory leak with QR timers
**Solution**:
- Ensure `destroy()` is called when connection closes
- Verify `qrRegenerator.stop()` is executing
- Check that `clearQRTimer()` is called on successful connection

#### Problem: Fallback not triggering
**Check**:
1. Is `onFallback()` callback registered?
2. Have all 3 timeout attempts completed?
3. Check error logs for exceptions in callbacks

### Performance Considerations

- **Timeout Interval**: 120 seconds (default) - can be adjusted
- **Max Attempts**: 3 before fallback
- **Memory Impact**: ~5KB per QRAutoRegenerator instance
- **CPU Impact**: Negligible (just one timeout per 120s)

### Thread Safety

The QRAutoRegenerator is NOT thread-safe. Ensure:
- Only one caller initiates `startTracking()` per instance
- Use separate instances for different phone numbers
- Proper cleanup before reuse

### Integration Checklist

When adding QR auto-regeneration to new code:

- [ ] Import QRAutoRegenerator from ConnectionEnhancements
- [ ] Create instance in `handleQR()` method
- [ ] Register fallback callback with `onFallback()`
- [ ] Call `startTracking()` with proper timeout
- [ ] Call `stop()` in cleanup/destroy methods
- [ ] Track metrics in your system
- [ ] Add user-facing feedback messages
- [ ] Test timeout scenarios

### Code Snippets

#### Complete QR Handling Implementation
```javascript
import { QRAutoRegenerator } from './ConnectionEnhancements.js';

class MyConnectionManager {
  constructor() {
    this.qrRegenerator = null;
  }

  handleQR(qrCode) {
    // Initialize regenerator if not exists
    if (!this.qrRegenerator) {
      this.qrRegenerator = new QRAutoRegenerator(this.log, this.phoneNumber);
      
      // Register fallback
      this.qrRegenerator.onFallback(() => {
        console.log('Use 6-digit code: 123456');
      });
    }

    // Start timeout tracking
    this.qrRegenerator.startTracking((attempt) => {
      console.log(`QR regeneration attempt ${attempt}/3`);
      this.metrics.qrRegenerationAttempts++;
    }, 120000);

    return true;
  }

  clearQRTimer() {
    if (this.qrRegenerator) {
      this.qrRegenerator.stop();
      this.qrRegenerator = null;
    }
  }

  destroy() {
    if (this.qrRegenerator) {
      this.qrRegenerator.stop();
    }
    // ... other cleanup
  }
}
```

#### Monitoring QR Status
```javascript
setInterval(() => {
  const statusReport = {
    totalQRs: connManager.metrics.qrCodesGenerated,
    totalAttempts: connManager.metrics.qrRegenerationAttempts,
    totalFailures: connManager.metrics.qrRegenerationsFailed,
    successRate: ((connManager.metrics.qrCodesGenerated - 
                   connManager.metrics.qrRegenerationsFailed) / 
                  connManager.metrics.qrCodesGenerated * 100).toFixed(2) + '%'
  };
  console.log(statusReport);
}, 60000); // Every minute
```

### Related Documentation

- **Full Integration Guide**: `QR_AUTO_REGENERATION_INTEGRATION.md`
- **Session Summary**: `PHASE_15_SESSION_SUMMARY.md`
- **ConnectionManager**: `code/utils/ConnectionManager.js` (lines 378-449)
- **ConnectionEnhancements**: `code/utils/ConnectionEnhancements.js` (lines 100-213)

### Support & Questions

For issues or questions:
1. Check the related documentation files
2. Review ConnectionManager error categorization (Phase 14)
3. Examine the test files for usage examples
4. Check git commit `db92db2` for complete change details

---

**Last Updated**: Feb 15, 2026  
**Phase**: 15  
**Status**: Production Ready
