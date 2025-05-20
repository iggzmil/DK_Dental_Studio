# Setting Up Real Email Sending for Reminders

The current implementation of the Google Calendar Reminder System is using a **simulated** email sending system. When running in "live" mode, it still logs emails but doesn't actually send them to recipients due to limitations in the Google API integration.

## To Set Up Real Email Sending

To make the system send actual emails to clients, you'll need to set up a proper Google API integration:

### Option 1: Full Google API Integration (Recommended)

1. **Install the Google API PHP Client**:
   ```bash
   composer require google/apiclient:^2.12
   ```

2. **Replace the minimal-autoloader.php**: 
   The current implementation uses a simplified mock of the Google API. Replace it with proper autoloading:
   ```php
   // Replace content of minimal-autoloader.php with:
   <?php
   require_once __DIR__ . '/../../vendor/autoload.php';
   ```

3. **Fix the GoogleTokenManager.php**:
   Update the GoogleTokenManager.php file to use the real Google API classes instead of simulations.

### Option 2: Use PHP mail() Function Directly

If you don't need the full Google API integration, you can modify the `sendReminderEmail` function in `google_calendar_reminders.php` to use PHP's mail() function directly:

```php
function sendReminderEmail($to, $subject, $message) {
    // Check if we're in Log-Only Mode
    if (LOG_ONLY_MODE) {
        // Format email for logging
        $logMessage = "\n---------- LOG-ONLY REMINDER EMAIL ----------\n";
        $logMessage .= "To: $to\n";
        $logMessage .= "Subject: $subject\n";
        $logMessage .= "Content: " . substr(strip_tags($message), 0, 500) . (strlen($message) > 500 ? '...' : '') . "\n";
        $logMessage .= "---------- END EMAIL ----------\n";
        
        // Log the email details
        logMessage($logMessage);
        
        // Return success without actually sending
        return true;
    }
    
    // Send email directly using PHP mail() function
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: DK Dental Studio <info@dkdental.au>\r\n";
    
    $success = mail($to, $subject, $message, $headers);
    
    if ($success) {
        logMessage("Email sent successfully to $to using PHP mail()");
    } else {
        logMessage("PHP mail() function failed for $to");
    }
    
    return $success;
}
```

### Option 3: Use a Third-Party Email Service

For more reliable email delivery, you may want to use a third-party email service like SendGrid, Mailgun, or SMTP:

1. **Install an email library**:
   ```bash
   composer require phpmailer/phpmailer
   ```

2. **Update the sendReminderEmail function**:
   ```php
   function sendReminderEmail($to, $subject, $message) {
       // Check if we're in Log-Only Mode
       if (LOG_ONLY_MODE) {
           // (log-only code remains the same)
           return true;
       }
       
       // Use PHPMailer
       $mail = new PHPMailer\PHPMailer\PHPMailer(true);
       try {
           // Server settings
           $mail->isSMTP();
           $mail->Host = 'smtp.example.com';  // Your SMTP server
           $mail->SMTPAuth = true;
           $mail->Username = 'your-username';
           $mail->Password = 'your-password';
           $mail->SMTPSecure = 'tls';
           $mail->Port = 587;
           
           // Recipients
           $mail->setFrom('info@dkdental.au', 'DK Dental Studio');
           $mail->addAddress($to);
           
           // Content
           $mail->isHTML(true);
           $mail->Subject = $subject;
           $mail->Body = $message;
           
           $mail->send();
           logMessage("Email sent successfully to $to using SMTP");
           return true;
       } catch (Exception $e) {
           logMessage("Email sending failed: " . $mail->ErrorInfo);
           return false;
       }
   }
   ```

## Testing Real Email Sending

Once you've implemented one of these options:

1. First test with a controlled recipient (your own email address)
2. Update known email addresses in the script to your test email:
   ```php
   if (stripos($clientName, 'Igor Milgrom') !== false) {
       $clientEmail = 'your-test-email@example.com';  // Replace with your email for testing
   }
   ```

3. Run the test script with the confirmation code:
   ```
   /script/email/run-live-reminders.php?confirm=SendLiveReminders&date=2025-05-29
   ```

4. Check your inbox for the test email

## Production Deployment

After testing is complete:
1. Remove any test email overrides
2. Set up a daily cron job to run the reminder script:
   ```
   # Daily at 8:00 AM
   0 8 * * * /usr/bin/php /var/www/DK_Dental_Studio/script/email/run-live-reminders.php?confirm=SendLiveReminders
   ``` 