#!/bin/bash
cd /c/Users/HP/Documents/Projects/WhatsApp-Bot-Linda

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║        COMPLETE RELINK TEST EXECUTION SEQUENCE               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Kill all processes
echo "STEP 1: Killing all node processes..."
timeout 5 taskkill /F /IM node.exe 2>/dev/null || true
sleep 3
echo "✅ Node processes killed"
echo ""

# Step 2: Show current status
echo "STEP 2: Checking current environment..."
echo "Current Directory: $(pwd)"
node --version
npm --version
echo "✅ Environment verified"
echo ""

# Step 3: Start bot
echo "STEP 3: Starting bot in background..."
npm run dev > bot-output.log 2>&1 &
BOT_PID=$!
echo "Bot started with PID: $BOT_PID"
sleep 10
echo "✅ Bot started and initialized"
echo ""

# Step 4: Run test
echo "STEP 4: Running test script..."
node test-relink-now.js
TEST_EXIT=$?
echo "✅ Test completed with exit code: $TEST_EXIT"
echo ""

# Step 5: Show process info
echo "STEP 5: Showing running Node processes..."
Get-Process -Name node -ErrorAction SilentlyContinue | Select-Object ProcessName, Id, CPU, StartTime | Format-Table -AutoSize
echo ""

# Step 6: Show bot output
echo "STEP 6: First 30 lines of bot output..."
head -30 bot-output.log
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  TEST EXECUTION COMPLETE                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
