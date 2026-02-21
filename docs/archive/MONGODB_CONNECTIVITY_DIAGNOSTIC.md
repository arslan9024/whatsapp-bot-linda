╔════════════════════════════════════════════════════════════════════════════════╗
║           MONGODB ATLAS CONNECTIVITY - DIAGNOSTIC & RECOVERY GUIDE             ║
║                        Network Troubleshooting Protocol                        ║
╚════════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════════

## QUICK DIAGNOSTICS

Run this complete diagnostic suite to identify the issue:

```powershell
# ============================================================================
# STEP 1: DNS RESOLUTION TEST
# ============================================================================

Write-Host "STEP 1: Testing DNS Resolution..." -ForegroundColor Cyan
$dnsTest = Resolve-DnsName whitecavesdb.opetsag.mongodb.net -Type A -ErrorAction SilentlyContinue

if ($dnsTest) {
    Write-Host "✅ DNS Resolution: SUCCESS" -ForegroundColor Green
    Write-Host "   IP Address: $($dnsTest.IPAddress)"
} else {
    Write-Host "❌ DNS Resolution: FAILED" -ForegroundColor Red
    Write-Host "   MongoDB Atlas host cannot be resolved"
}

# ============================================================================
# STEP 2: NETWORK CONNECTIVITY TEST
# ============================================================================

Write-Host "`nSTEP 2: Testing Network Connectivity..." -ForegroundColor Cyan
$netTest = Test-NetConnection -ComputerName whitecavesdb.opetsag.mongodb.net -Port 27017 -WarningAction SilentlyContinue

Write-Host "   Computer: $($netTest.ComputerName)"
Write-Host "   Port: $($netTest.RemotePort)"
Write-Host "   TCP Test: $(if ($netTest.TcpTestSucceeded) { '✅ SUCCESS' } else { '❌ FAILED' })"

if ($netTest.TcpTestSucceeded) {
    Write-Host "   Latency: $($netTest.LatencyToReachTargetPort)ms"
} else {
    Write-Host "   ⚠️  Cannot connect to MongoDB Atlas server"
}

# ============================================================================
# STEP 3: FIREWALL CHECK
# ============================================================================

Write-Host "`nSTEP 3: Checking Windows Firewall..." -ForegroundColor Cyan
$profiles = Get-NetFirewallProfile
foreach ($profile in $profiles) {
    $status = if ($profile.Enabled) { "ENABLED (🔓 Active)" } else { "DISABLED (🔐 Inactive)" }
    Write-Host "   $($profile.Name): $status"
}

# ============================================================================
# STEP 4: CREDENTIALS TEST
# ============================================================================

Write-Host "`nSTEP 4: Checking MongoDB Credentials..." -ForegroundColor Cyan
$envFile = ".\.env"
if (Test-Path $envFile) {
    $mongoUri = (Get-Content $envFile | Select-String "MONGODB_URI" | Select-Object -First 1).ToString()
    if ($mongoUri) {
        Write-Host "✅ MONGODB_URI found in .env"
        # Don't print actual credentials
        if ($mongoUri -like "*@@*") {
            Write-Host "❌ Credentials appear malformed (double @@)"
        } else {
            Write-Host "✅ Credentials format appears valid"
        }
    } else {
        Write-Host "❌ MONGODB_URI not found in .env"
    }
} else {
    Write-Host "❌ .env file not found"
}

# ============================================================================
# STEP 5: TEST GENERIC INTERNET CONNECTION
# ============================================================================

Write-Host "`nSTEP 5: Testing General Internet Connectivity..." -ForegroundColor Cyan
$googleTest = Test-NetConnection google.com -Port 443 -WarningAction SilentlyContinue

if ($googleTest.TcpTestSucceeded) {
    Write-Host "✅ Internet: Connected" -ForegroundColor Green
    Write-Host "   Sample connection to google.com:443 succeeded"
} else {
    Write-Host "❌ Internet: No connection" -ForegroundColor Red
    Write-Host "   Cannot reach google.com:443"
    Write-Host "   Your network may be offline or blocked"
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host "`n" + ("="*80)
Write-Host "DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
Write-Host "="*80

if (-not $dnsTest) {
    Write-Host "PRIMARY ISSUE: DNS Resolution Failure"
    Write-Host "SEVERITY: High"
    Write-Host "ACTION: Check network DNS settings or try IP address directly"
}

if (-not $googleTest.TcpTestSucceeded) {
    Write-Host "PRIMARY ISSUE: No Internet Connection"
    Write-Host "SEVERITY: Critical"
    Write-Host "ACTION: Check network connection or corporate firewall"
}

Write-Host "`nNext steps based on your results:"
Write-Host "1. If DNS fails but internet works → MongoDB Atlas may be down"
Write-Host "2. If internet fails → Network/firewall issue"
Write-Host "3. If both work → Firewall may block Port 27017"
```

═══════════════════════════════════════════════════════════════════════════════════

## SOLUTION BY SCENARIO

### Scenario A: DNS Resolution Fails
```
Problem: Cannot resolve whitecavesdb.opetsag.mongodb.net
Solution:
  1. Try alternate DNS servers:
     - OpenDNS: 208.67.222.222
     - Google DNS: 8.8.8.8
  2. Set in Network Settings > IPv4 > DNS Servers
  3. Flush DNS cache:
     ipconfig /flushdns
  4. Try again
```

### Scenario B: Network Connection Fails (Port 27017)
```
Problem: TCP connection to MongoDB fails on port 27017
Solution:
  1. Check Windows Firewall settings
     - Windows Defender Firewall > Allow app through firewall
     - Ensure Node.js is allowed (or remove restrictions)
  2. If on corporate network:
     - Ask IT to allow outbound port 27017
     - Check if you need to use proxy
  3. Check MongoDB Atlas IP whitelist:
     - Go to MongoDB Atlas console
     - Network Access > IP Whitelist
     - Add your current IP address
     - Get your IP: ipconfig or https://icanhazip.com
```

### Scenario C: Internet Works but MongoDB Doesn't
```
Problem: Google.com works but MongoDB doesn't
Solution:
  1. Check if MongoDB Atlas is in maintenance:
     - Check MongoDB status page
     - Monitor the cluster in Atlas console
  2. Verify connection details:
     - Correct username/password
     - Whitelisted IP address
     - Correct database name
  3. Try using IP address instead of domain:
     - Get IP from ping whitecavesdb.opetsag.mongodb.net
     - Update connection string
```

### Scenario D: Everything Appears Down
```
Problem: DNS fails, can't reach MongoDB, internet seems blocked
Solution:
  1. Check corporate firewall/proxy:
     - Test from home network
     - Use VPN if available
     - Ask network admin for MongoDB Atlas access
  2. Immediate fallback: Use Local MongoDB
     - Install MongoDB Community Edition locally
     - Connect to: mongodb://localhost:27017/whatsapp-bot
     - This allows testing without internet access
```

═══════════════════════════════════════════════════════════════════════════════════

## LOCAL MONGODB FALLBACK

If MongoDB Atlas remains unreachable, use local MongoDB:

### Step 1: Install MongoDB
```powershell
# Use Chocolatey (if installed)
choco install mongodb-community

# Or download installer from mongodb.com/try/download/community

# Or use WSL2
wsl --install ubuntu
# Then: sudo apt-get install -y mongodb-org
```

### Step 2: Update Configuration
Edit `/code/Database/config.js`:

```javascript
// Change priority to LOCAL first
const MONGO_CONFIG = {
  PRIMARY: null,  // Skip Atlas
  LOCAL: process.env.MONGO_LOCAL_URI || 'mongodb://localhost:27017/damac-hills-2',
  // ...rest same
}
```

### Step 3: Start MongoDB Locally
```powershell
# Windows
net start MongoDB

# Or manually
mongod --dbpath "C:\Program Files\MongoDB\Server\7.0\data"
```

### Step 4: Run Migration Against Local DB
```powershell
npm run express-server
& '.\scripts\migrateDAMACData.ps1' -Limit 100
```

Expected result: Same data loaded to local MongoDB

═══════════════════════════════════════════════════════════════════════════════════

## ADVANCED: BYPASS DNS WITH IP ADDRESS

If DNS is broken but you have the IP address:

```powershell
# 1. Get the IP address of MongoDB host
nslookup whitecavesdb.opetsag.mongodb.net

# 2. Update connection string in .env
# FROM: mongodb+srv://user:pass@whitecavesdb.opetsag.mongodb.net/...
# TO: mongodb://user:pass@1.2.3.4:27017/...

# 3. Restart server
npm run express-server
```

═══════════════════════════════════════════════════════════════════════════════════

## VERIFY FIXES

After applying any fix, verify with this quick test:

```powershell
# Test 1: Can server start?
npm run express-server --timeout 10s

# Test 2: Can server reach health endpoint?
Invoke-WebRequest http://localhost:5000/health -UseBasicParsing

# Test 3: Can create an owner?
$json = '{"firstName":"Test","lastName":"Owner","primaryPhone":"+971501234567","email":"test@test.com","status":"active"}'
Invoke-WebRequest http://localhost:5000/api/v1/damac/owners `
    -Method POST -ContentType 'application/json' `
    -Body $json -UseBasicParsing | Select-Object StatusCode

# Result should be: 201 (Created)
```

═══════════════════════════════════════════════════════════════════════════════════

## ESCALATION PATH

If none of the above work:

1. **Check MongoDB Atlas Status**
   - Go to https://status.mongodb.com
   - Look for outages in your region

2. **Review MongoDB Atlas Logs**
   - MongoDB Atlas console > Deployment > View Logs
   - Check for connection errors or security issues

3. **Contact MongoDB Support**
   - Create support ticket at mongodb.com
   - Provide connection string (without password)
   - Describe the error and when it started

4. **Network Admin Escalation**
   - If corporate network: Contact IT
   - Provide: MongoDB Atlas IP ranges and port 27017
   - Ask for: Network access to whitecavesdb.opetsag.mongodb.net:27017

═══════════════════════════════════════════════════════════════════════════════════

## ONCE CONNECTED

Execute this to complete data migration:

```powershell
# 1. Start server
npm run express-server

# 2. Wait 3 seconds
Start-Sleep -Seconds 3

# 3. Run migration (creates 100 owners + 100 contacts)
& '.\scripts\migrateDAMACData.ps1' -Limit 100

# 4. Verify data was loaded
Invoke-WebRequest http://localhost:5000/api/v1/damac/owners?limit=1 `
    -UseBasicParsing | ConvertFrom-Json | Select-Object -Expand pagination

# Expected output:
# skip    : 0
# limit   : 1
# total   : 100     ← Should show 100 owners loaded
# pages   : 100
```

═══════════════════════════════════════════════════════════════════════════════════

Last Updated: 2026-02-19 15:55:00 UTC
Diagnostic Version: 1.0
Status: Ready for user execution

════════════════════════════════════════════════════════════════════════════════════
