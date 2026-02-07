# 📱 Send Hello Message Feature

## Overview

This feature allows you to **automatically send a test hello message** to a contact **when your WhatsApp device is linked and active**.

---

## 🚀 Quick Start

### Step 1: Link Your Device
```bash
npm run fresh-start
npm run dev
```
Link your WhatsApp device by scanning the QR code or entering the 6-digit code.

### Step 2: Once Device is Ready
When you see **"LION0 BOT IS READY TO SERVE!"** it means the device is linked!

### Step 3: Send Hello Message
```bash
# Send to default number (971505110636)
npm run send-hello

# Or send to a specific number
npm run send-hello 971505110636
```

---

## 📝 How It Works

```
User runs: npm run send-hello 971505110636
                    ↓
Script checks session status
                    ↓
Creates WhatsApp client
                    ↓
Waits for device to be ready (max 30 seconds)
                    ↓
Device ready event triggered?
    ├─ YES → Format message
    │        Send to contact
    │        Display success
    │        Exit (0)
    │
    └─ NO → Timeout error
            Show troubleshooting tips
            Exit (1)
```

---

## 🛠️ Commands

### Send to Default Number (971505110636)
```bash
npm run send-hello
```

### Send to Custom Number
```bash
npm run send-hello 971505110636
npm run send-hello 971562345678
npm run send-hello <your-phone-number>
```

### Or Use Node Directly
```bash
node tools/sendHelloMessage.js 971505110636
```

---

## ✅ Success Indicator

When the message is sent successfully, you'll see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ MESSAGE SENT SUCCESSFULLY!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📨 Message Details:
   • From: WhatsApp Bot (971505760056)
   • To: 971505110636
   • Status: ✅ SENT
   • Timestamp: 2/7/2026, 3:45:23 PM
   • Message ID: XXXXXXX
```

---

## 📋 Message Content

The hello message sent is:

```
Hello! 👋 This is a test message from WhatsApp Bot Lion0. 
Your device is active and ready to serve!
```

---

## ❌ Troubleshooting

### Error: "No active session found!"
```bash
# Solution: Link your device first
npm run clean-sessions
npm run fresh-start
npm run dev
# Scan QR code or enter 6-digit code
```

### Error: "Timeout: Device not ready after 30 seconds"
```bash
# Possible causes:
# 1. Device not linked
# 2. WhatsApp servers not responding
# 3. Internet connection issue

# Solution:
npm run clean-sessions
npm run fresh-start
npm run dev
# Wait for "LION0 BOT IS READY TO SERVE!"
npm run send-hello
```

### Error: "Error sending message"
```bash
# Possible causes:
# 1. Wrong phone number format
# 2. Contact doesn't exist
# 3. WhatsApp permissions issue

# Make sure:
# • Phone number format: 97151234567 (no +, no spaces)
# • Contact exists and has WhatsApp
# • Bot has proper permissions
```

---

## 🔍 Phone Number Format

### Correct Format
```
✅ 971505110636        (Country code + number)
✅ 971505760056        (United Arab Emirates)
✅ 447911123456        (United Kingdom)
```

### Incorrect Format
```
❌ +971505110636       (Don't include +)
❌ 0501505110636       (Don't use leading 0)
❌ 971-505-110-636     (Don't use dashes)
❌ +971 505 110 636   (Don't use spaces or +)
```

---

## 🔄 Session Requirements

### Device Must Be:
- ✅ Linked to the WhatsApp bot account
- ✅ Showing "LION0 BOT IS READY TO SERVE!"
- ✅ Connected to internet
- ✅ Active (not disconnected)

### Session Must:
- ✅ Exist in `sessions/session-971505760056/`
- ✅ Have valid authentication keys
- ✅ Pass integrity validation

---

## 📊 Feature Capabilities

✅ **Session Detection**
- Checks if device is linked
- Validates session integrity
- Detects active status

✅ **Automatic Initialization**
- Creates WhatsApp client
- Sets up event listeners
- Waits for ready state

✅ **Message Sending**
- Formats message
- Sends via WhatsApp API
- Captures delivery info

✅ **Error Handling**
- Timeout detection (30 seconds)
- Authentication failures
- Send errors
- Clear error messages

✅ **User Feedback**
- Progress updates
- Success confirmations
- Detailed error info
- Troubleshooting tips

---

## 🎯 Use Cases

### 1. **Verify Bot is Active**
```bash
npm run send-hello
# If message sends, device is active!
```

### 2. **Test Specific Contact**
```bash
npm run send-hello 971505555555
# Verify you can send to this contact
```

### 3. **Monitor Bot Health**
```bash
# Add to cron job or scheduler
npm run send-hello 971505760056
# Check if message sends periodically
```

### 4. **Integration Testing**
```bash
# Part of automated test suite
node tools/sendHelloMessage.js 971505760056
```

---

## 🔧 Advanced Usage

### Send to Multiple Contacts
```bash
# Create a script to send to multiple numbers
npm run send-hello 971505110636
npm run send-hello 971562345678
npm run send-hello 971501234567
```

### With Error Handling
```bash
# Only send if device checks pass
npm run send-hello && echo "Success!" || echo "Failed!"
```

### In Automation
```bash
# Add to your CI/CD pipeline
# In GitHub Actions, Jenkins, etc.
- name: Send test message
  run: npm run send-hello 971505110636
```

---

## 📈 Exit Codes

| Exit Code | Meaning | Action |
|-----------|---------|--------|
| `0` | ✅ Success | Message sent |
| `1` | ❌ Failure | Check error message |

---

## 🔐 Security Notes

✅ **No Credentials Exposed**
- Phone numbers only (no passwords)
- Uses existing authenticated session
- No API keys in logs

✅ **Safe to Share**
- Commands are safe to commit
- No sensitive data in code
- .env stays private

---

## 📚 Related Commands

```bash
# Setup and linking
npm run fresh-start      # Create fresh session
npm run dev             # Start bot with device linking
npm run clean-sessions  # Clean old sessions

# Session management
npm run list-sessions   # List all sessions

# Message sending
npm run send-hello      # Send hello message (NEW!)
```

---

## 💡 Tips for Success

1. **Always Link Device First**
   - Run `npm run dev` before send-hello
   - Scan QR or enter 6-digit code
   - Wait for "BOT IS READY" message

2. **Use Correct Phone Format**
   - Include country code
   - No + sign
   - No spaces or dashes

3. **Check Internet Connection**
   - Both devices need internet
   - Phone must have WhatsApp
   - Check WiFi/mobile signal

4. **Keep Session Active**
   - Don't close bot while sending
   - Keep phone unlocked during linking
   - Don't restart device mid-process

5. **Test with Your Own Number**
   - Send to yourself first
   - Verify message appears in chat
   - Then send to other contacts

---

## 🚀 Next Steps

1. **Link your device:**
   ```bash
   npm run fresh-start
   npm run dev
   ```

2. **Scan the QR code or enter 6-digit code**

3. **Wait for bot ready message**

4. **Send test message:**
   ```bash
   npm run send-hello
   ```

5. **Check your WhatsApp** - Message should appear!

---

## 📞 Support

### Issue: Not Receiving Message
1. Check bot is showing "READY" status
2. Verify phone number is correct
3. Make sure WhatsApp is installed on target device
4. Check internet connection on both devices

### Issue: Timeout Error
1. Device may not be linked
2. Run `npm run fresh-start && npm run dev` again
3. Ensure you scanned QR or entered code
4. Wait for "BOT IS READY" message to appear

### Issue: Command Not Found
1. Make sure npm scripts updated: `npm install`
2. Check `package.json` has `send-hello` script
3. Use: `node tools/sendHelloMessage.js <number>`

---

## ✨ Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Session Check | ✅ | Validates device is linked |
| Auto-Connect | ✅ | Creates client automatically |
| Message Send | ✅ | Sends formatted message |
| Error Handling | ✅ | Clear error messages |
| Timeout Detection | ✅ | 30-second timeout |
| Success Feedback | ✅ | Detailed delivery info |
| Phone Format | ✅ | Flexible input parsing |
| npm Script | ✅ | `npm run send-hello` |

---

**Status:** ✅ Production Ready  
**Version:** 2.1.0  
**Date:** February 7, 2026
