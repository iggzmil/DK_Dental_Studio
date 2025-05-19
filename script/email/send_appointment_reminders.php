<?php
/**
 * Appointment Reminder Email Sender
 * 
 * This script checks for appointments scheduled in the next 24 hours
 * and sends reminder emails to clients if they haven't received one yet.
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Configure logging
$logFile = __DIR__ . '/reminder_log.txt';
function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message" . PHP_EOL, FILE_APPEND);
    
    // Also echo if running from command line
    if (php_sapi_name() === 'cli') {
        echo "[$timestamp] $message" . PHP_EOL;
    }
}

// Log script start
logMessage("Starting appointment reminder check");

// Database configuration
$dbHost = 'localhost';
$dbName = 'dkds_mailing_list';
$dbUser = 'postgres';
$dbPass = ''; // Add password in production environment - consider using a secure method

// Connect to PostgreSQL database
try {
    $dbConnectionString = "pgsql:host=$dbHost;dbname=$dbName;";
    $db = new PDO($dbConnectionString, $dbUser, $dbPass);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    logMessage("Connected to database successfully");
} catch (PDOException $e) {
    logMessage("Database connection failed: " . $e->getMessage());
    exit(1);
}

// Find appointments in the next 24 hours that haven't had reminders sent
try {
    $query = "
        SELECT id, appointment_time, recipient_email, subject, message
        FROM appointments
        WHERE 
            appointment_time BETWEEN NOW() AND (NOW() + INTERVAL '24 hours')
            AND reminder_sent = FALSE
        ORDER BY appointment_time ASC
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $count = count($appointments);
    logMessage("Found $count appointments requiring reminders");
    
} catch (PDOException $e) {
    logMessage("Query failed: " . $e->getMessage());
    exit(1);
}

// Process each appointment and send reminder
foreach ($appointments as $appointment) {
    $id = $appointment['id'];
    $email = $appointment['recipient_email'];
    $appointmentTime = new DateTime($appointment['appointment_time']);
    $formattedTime = $appointmentTime->format('l, j F Y \a\t g:ia');
    
    // Use provided subject/message or generate defaults
    $subject = !empty($appointment['subject']) 
        ? $appointment['subject'] 
        : "Appointment Reminder - DK Dental Studio";
    
    $messageBody = !empty($appointment['message']) 
        ? $appointment['message'] 
        : generateDefaultMessage($email, $formattedTime);
    
    // Send the email
    if (sendReminderEmail($email, $subject, $messageBody)) {
        // Update the database to mark reminder as sent
        try {
            $updateQuery = "UPDATE appointments SET reminder_sent = TRUE WHERE id = :id";
            $updateStmt = $db->prepare($updateQuery);
            $updateStmt->bindParam(':id', $id, PDO::PARAM_INT);
            $updateStmt->execute();
            
            logMessage("Reminder sent successfully for appointment #$id to $email");
        } catch (PDOException $e) {
            logMessage("Failed to update reminder status for appointment #$id: " . $e->getMessage());
        }
    } else {
        logMessage("Failed to send reminder email for appointment #$id to $email");
    }
}

logMessage("Reminder processing completed");

/**
 * Generate a default reminder email message
 */
function generateDefaultMessage($recipientEmail, $appointmentTime) {
    // Extract recipient's first name from email (basic approach)
    $nameParts = explode('@', $recipientEmail);
    $firstName = ucfirst($nameParts[0]);
    
    return "
<html>
<head>
    <title>Appointment Reminder</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0576ee; color: white; padding: 10px; text-align: center; }
        .content { padding: 20px; }
        .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #666; }
        .button { display: inline-block; background-color: #0576ee; color: white !important; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2>Appointment Reminder</h2>
        </div>
        <div class='content'>
            <p>Dear $firstName,</p>
            
            <p>This is a friendly reminder that you have an appointment scheduled at DK Dental Studio tomorrow on <strong>$appointmentTime</strong>.</p>
            
            <p>Please arrive 5-10 minutes before your scheduled time. If you need to reschedule or cancel your appointment, please contact us as soon as possible at (02) 9398 7578.</p>
            
            <p>We look forward to seeing you!</p>
            
            <p>Best regards,<br>DK Dental Studio Team</p>
            
            <p style='text-align: center; margin-top: 30px;'>
                <a href='https://www.dkdental.au' class='button' style='color: white !important;'>Visit Our Website</a>
            </p>
        </div>
        <div class='footer'>
            <p>DK Dental Studio | Shop 4/126-128 Avoca St, Randwick NSW 2031 | (02) 9398 7578</p>
        </div>
    </div>
</body>
</html>
";
}

/**
 * Send a reminder email
 */
function sendReminderEmail($to, $subject, $message) {
    // Check if Gmail API is available (reusing existing email integration)
    $gmailApiPath = __DIR__ . '/../calendar/gmail-sender.php';
    $useGmailApi = file_exists($gmailApiPath);
    
    $success = false;
    
    if ($useGmailApi) {
        // Use Gmail API to send emails (if available from booking system)
        require_once $gmailApiPath;
        
        $emailResult = sendGmailEmail(
            $to,
            $subject,
            $message,
            'DK Dental Studio'
        );
        
        $success = $emailResult['success'];
        
        if (!$success) {
            logMessage("Gmail API email error: " . $emailResult['message']);
        }
    } else {
        // Fall back to PHP mail() function
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: DK Dental Studio <info@dkdental.au>\r\n";
        
        $success = mail($to, $subject, $message, $headers);
        
        if (!$success) {
            logMessage("PHP mail() function failed");
        }
    }
    
    return $success;
} 