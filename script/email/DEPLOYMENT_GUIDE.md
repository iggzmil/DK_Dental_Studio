# DK Dental Studio Appointment Reminder System - Deployment Guide

## 🎯 **System Overview**

The appointment reminder system automatically sends email reminders to clients for next-day appointments, with intelligent weekend logic to ensure reminders are only sent for business days.

## ✅ **Weekend Logic Implementation**

### **Smart Reminder Schedule:**
- **Monday-Thursday**: Send reminders for next business day appointments
- **Friday**: ❌ **NO REMINDERS** (clinic closed Saturday)
- **Saturday**: ❌ **NO REMINDERS** (clinic closed Sunday)  
- **Sunday**: ✅ **SEND REMINDERS** for Monday appointments

### **Business Hours Validation:**
- **Dentures/Maintenance**: Mon-Fri 10am-4pm
- **Mouthguards**: Mon-Thu 10am-6pm, Fri 10am-4pm
- **Weekends**: Clinic closed - no appointments processed

## 📁 **File Structure**

```
script/email/
├── google_calendar_reminders.php    # Main reminder logic (WITH WEEKEND LOGIC)
├── run-live-reminders.php          # Live execution wrapper
├── test-weekend-logic.php          # Test script for validation
├── gmail-sender.php                # Email sending via Gmail API
├── GoogleTokenManager.php          # OAuth token management
├── google_calendar_reminder_log.txt # Activity logs
└── DEPLOYMENT_GUIDE.md             # This file
```

## 🚀 **Deployment Steps**

### **1. Pre-Deployment Testing**

```bash
# Test the weekend logic (run this first!)
php script/email/test-weekend-logic.php

# Test with log-only mode (no actual emails sent)
define('LOG_ONLY_MODE', true);
php script/email/google_calendar_reminders.php
```

### **2. Server Requirements**

- **PHP**: 7.4 or higher
- **Extensions**: cURL, JSON
- **Permissions**: Read/write access to log files
- **Google OAuth**: Valid credentials and tokens

### **3. Configure OAuth Authentication**

Ensure these files exist on the live server:
```
vendor/google/oauth/secure/
├── client_secrets.json              # Google OAuth client credentials
└── google_refresh_token.json        # Valid refresh token
```

### **4. Set Up Cron Job**

#### **Recommended Cron Schedule:**
```bash
# Run at 8 AM, Sunday through Thursday (days 0-4)
0 8 * * 0-4 /usr/bin/php /path/to/script/email/run-live-reminders.php?confirm=SendLiveReminders >/dev/null 2>&1
```

#### **Alternative (if weekend logic handles filtering):**
```bash
# Run at 8 AM daily, let weekend logic decide
0 8 * * * /usr/bin/php /path/to/script/email/run-live-reminders.php?confirm=SendLiveReminders >/dev/null 2>&1
```

### **5. Security Configuration**

Update the confirmation code in `run-live-reminders.php`:
```php
$expectedCode = 'YourSecureConfirmationCode'; // Change this!
```

### **6. Monitoring Setup**

#### **Log File Location:**
```
script/email/google_calendar_reminder_log.txt
```

#### **Monitor for:**
- OAuth token refresh failures
- Weekend logic execution
- Business hours validation
- Email delivery status

## 🧪 **Testing Scenarios**

### **Weekend Logic Tests:**

```bash
# Test Friday (should skip)
php script/email/run-live-reminders.php?confirm=SendLiveReminders&date=2025-06-06

# Test Saturday (should skip)  
php script/email/run-live-reminders.php?confirm=SendLiveReminders&date=2025-06-07

# Test Sunday (should send for Monday)
php script/email/run-live-reminders.php?confirm=SendLiveReminders&date=2025-06-08

# Test Thursday (should send for Friday)
php script/email/run-live-reminders.php?confirm=SendLiveReminders&date=2025-06-05
```

### **Expected Log Outputs:**

**Friday Test:**
```
[2025-06-06 08:00:00] Today is Friday - NOT sending reminders for Saturday (clinic closed on weekends)
[2025-06-06 08:00:00] Reminder system completed - no reminders sent due to weekend schedule
```

**Sunday Test:**
```
[2025-06-08 08:00:00] Today is Sunday - WILL send reminders for Monday appointments
[2025-06-08 08:00:00] Checking for appointments on Monday, 9 June 2025
```

## ⚙️ **Configuration Options**

### **Log-Only Mode (Testing):**
```php
define('LOG_ONLY_MODE', true);  // No emails sent, only logging
```

### **Test Specific Date:**
```php
define('TEST_DATE', '2025-06-06'); // Override current date
```

### **Gmail API Fallback:**
If Gmail API fails, system falls back to PHP `mail()` function.

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **OAuth Token Expired**
   ```
   [ERROR] Failed to refresh token. HTTP Code: 401
   ```
   **Solution**: Refresh Google OAuth tokens in Google Cloud Console

2. **Weekend Logic Not Working**
   ```
   # Check if weekend logic functions exist
   grep -n "shouldSendRemindersToday" script/email/google_calendar_reminders.php
   ```

3. **Business Hours Validation Failing**
   ```
   [WARNING] Appointment at 9:00 on monday is outside business hours
   ```
   **Solution**: Check business hours configuration in `isValidBusinessHourAppointment()`

4. **No Appointments Found**
   ```
   No events found for primary on 2025-06-09
   ```
   **Solution**: Verify calendar access and appointment formatting

## 📊 **Monitoring Dashboard**

### **Daily Checks:**
- [ ] Cron job executed successfully
- [ ] Weekend logic applied correctly
- [ ] Appropriate number of reminders sent
- [ ] No OAuth authentication errors
- [ ] Business hours validation working

### **Weekly Review:**
- [ ] Log file rotation/cleanup
- [ ] Token expiration dates
- [ ] System performance metrics
- [ ] False positive/negative reminder checks

## 🚨 **Emergency Procedures**

### **Disable System Quickly:**
```bash
# Temporarily disable cron job
crontab -l | grep -v "run-live-reminders" | crontab -

# Or add this to top of google_calendar_reminders.php:
exit("Reminder system temporarily disabled");
```

### **Emergency Contacts:**
- System Administrator: [contact info]
- Google OAuth Issues: Google Cloud Console
- Email Delivery Issues: Gmail API logs

## ✅ **Deployment Checklist**

**Pre-Deployment:**
- [ ] Weekend logic tests pass
- [ ] Business hours validation works
- [ ] OAuth authentication functional
- [ ] Log-only mode testing complete
- [ ] Email templates reviewed

**Deployment:**
- [ ] Files uploaded to live server
- [ ] Cron job configured
- [ ] Security settings applied
- [ ] Monitoring setup complete
- [ ] Emergency procedures documented

**Post-Deployment:**
- [ ] First week manual monitoring
- [ ] Weekend logic verified in production
- [ ] Client feedback monitoring
- [ ] System performance baseline established

## 📞 **Support Information**

For technical support with this system:
1. Check the log file first: `google_calendar_reminder_log.txt`
2. Run test script: `php test-weekend-logic.php`
3. Verify OAuth tokens are valid
4. Test with LOG_ONLY_MODE before making changes

---

**Last Updated**: 2025-05-29  
**Version**: 2.0 (With Weekend Logic Implementation)  
**Status**: Ready for Production Deployment 