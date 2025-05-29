# Live Server Testing Guide - DK Dental Appointment Reminders

## 🚀 **Testing Before Cron Job Setup**

### **Step 1: Upload Files and Set Permissions**

```bash
# Upload all files to server
# Then set proper permissions
chmod 755 script/email/
chmod 644 script/email/*.php
chmod 644 script/email/*.md
chmod 666 script/email/google_calendar_reminder_log.txt

# Make sure OAuth files are secure
chmod 600 vendor/google/oauth/secure/client_secrets.json
chmod 600 vendor/google/oauth/secure/google_refresh_token.json
```

### **Step 2: Test Weekend Logic (No OAuth Required)**

```bash
# Test the standalone weekend logic first
cd /path/to/your/website/script/email/
php test-weekend-logic-standalone.php
```

**Expected Output:**
```
==========================================================
DK DENTAL STUDIO - STANDALONE WEEKEND LOGIC TEST
==========================================================

1. TESTING WEEKEND LOGIC
------------------------
[TEST] 2025-05-29 Testing Monday (2025-06-02):
[TEST] 2025-05-29 Today is Monday - WILL send reminders for tomorrow's appointments
[TEST] 2025-05-29   → Result: ✅ SEND REMINDERS

[TEST] 2025-05-29 Testing Friday (2025-06-06):
[TEST] 2025-05-29 Today is Friday - NOT sending reminders for Saturday (clinic closed on weekends)
[TEST] 2025-05-29   → Result: ❌ SKIP REMINDERS
```

### **Step 3: Test OAuth Authentication**

```bash
# Test OAuth connection (will attempt Google Calendar access)
cd /path/to/your/website/script/email/
php -r "
define('LOG_ONLY_MODE', true);
require_once 'google_calendar_reminders.php';
echo 'OAuth test completed - check log file for results';
"
```

### **Step 4: Test with Log-Only Mode**

```bash
# Test the full system without sending emails
cd /path/to/your/website/script/email/
php -r "
define('LOG_ONLY_MODE', true);
include 'run-live-reminders.php';
" 2>&1
```

### **Step 5: Test Manual Execution**

```bash
# Test the actual execution script manually
cd /path/to/your/website/script/email/
php run-live-reminders.php?confirm=SendLiveReminders 2>&1
```

### **Step 6: Test Specific Date Scenarios**

```bash
# Test Friday (should skip)
php -r "
define('TEST_DATE', '2025-06-06'); // Friday
define('LOG_ONLY_MODE', true);
include 'google_calendar_reminders.php';
" 2>&1

# Test Sunday (should send for Monday)
php -r "
define('TEST_DATE', '2025-06-08'); // Sunday
define('LOG_ONLY_MODE', true);
include 'google_calendar_reminders.php';
" 2>&1
```

### **Step 7: Check Log File**

```bash
# View the log file to verify everything worked
tail -50 script/email/google_calendar_reminder_log.txt

# Or monitor in real-time while testing
tail -f script/email/google_calendar_reminder_log.txt &
```

## 📋 **What to Look For in Tests**

### **✅ Success Indicators:**
- OAuth tokens refresh successfully
- Weekend logic applies correctly
- Business hours validation works
- Appointments are found and processed
- Email content is generated properly
- No fatal PHP errors

### **❌ Issues to Watch For:**
- OAuth 401 errors (token problems)
- "No events found" (calendar access issues)
- PHP syntax errors
- Permission denied errors
- Missing dependencies

## 🔧 **Troubleshooting Common Issues**

### **OAuth Token Issues:**
```bash
# Check if token files exist and are readable
ls -la vendor/google/oauth/secure/
cat vendor/google/oauth/secure/google_refresh_token.json
```

### **Permission Issues:**
```bash
# Fix common permission problems
chown www-data:www-data script/email/ -R
chmod 755 script/email/
chmod 666 script/email/google_calendar_reminder_log.txt
```

### **PHP Issues:**
```bash
# Check PHP syntax
php -l script/email/google_calendar_reminders.php
php -l script/email/run-live-reminders.php

# Check PHP version
php --version
```

---

## ✅ **Pre-Cron Checklist**

Before setting up the cron job, ensure:

- [ ] **Weekend logic test passes**
- [ ] **OAuth authentication works** 
- [ ] **Log file is writable**
- [ ] **No PHP syntax errors**
- [ ] **Appointments can be retrieved**
- [ ] **Email generation works**
- [ ] **Log-only mode produces expected output**
- [ ] **Manual execution completes successfully**

Once all tests pass, you're ready to set up the cron job! 