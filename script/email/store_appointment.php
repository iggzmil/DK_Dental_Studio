<?php
/**
 * Store Appointment Data for Reminder Emails
 * 
 * This script stores appointment details in the database for reminder emails.
 * It should be called after a successful booking is made.
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Configure logging
$logFile = __DIR__ . '/appointment_storage_log.txt';
function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message" . PHP_EOL, FILE_APPEND);
}

// Database configuration
$dbHost = 'localhost';
$dbName = 'dkds_mailing_list';
$dbUser = 'postgres';
$dbPass = ''; // Add password in production environment

/**
 * Store appointment data in the database for reminder emails
 * 
 * @param string $appointmentDateTime ISO 8601 datetime string (e.g. "2023-06-15T10:00:00")
 * @param string $recipientEmail Email address of the recipient
 * @param string $firstName Optional First name of the recipient
 * @param string $service Optional Service type
 * @return bool Success or failure
 */
function storeAppointmentForReminder($appointmentDateTime, $recipientEmail, $firstName = '', $service = '') {
    global $dbHost, $dbName, $dbUser, $dbPass;
    
    try {
        // Format the appointment date
        $appointmentTime = new DateTime($appointmentDateTime);
        $formattedDate = $appointmentTime->format('l, j F Y');
        $formattedTime = $appointmentTime->format('g:ia');
        
        // Connect to the database
        $dbConnectionString = "pgsql:host=$dbHost;dbname=$dbName;";
        $db = new PDO($dbConnectionString, $dbUser, $dbPass);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Generate a subject and message
        $subject = "Appointment Reminder - DK Dental Studio";
        $message = generateReminderEmailBody($firstName, $formattedDate, $formattedTime, $service);
        
        // Insert the appointment
        $query = "
            INSERT INTO appointments 
                (appointment_time, recipient_email, subject, message, reminder_sent) 
            VALUES 
                (:appointment_time, :recipient_email, :subject, :message, FALSE)
            RETURNING id
        ";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':appointment_time', $appointmentDateTime);
        $stmt->bindParam(':recipient_email', $recipientEmail);
        $stmt->bindParam(':subject', $subject);
        $stmt->bindParam(':message', $message);
        $stmt->execute();
        
        $appointmentId = $stmt->fetchColumn();
        
        logMessage("Stored appointment #$appointmentId for reminder: $recipientEmail on $appointmentDateTime");
        return true;
        
    } catch (PDOException $e) {
        logMessage("Failed to store appointment for reminder: " . $e->getMessage());
        return false;
    } catch (Exception $e) {
        logMessage("General error storing appointment: " . $e->getMessage());
        return false;
    }
}

/**
 * Generate reminder email body
 */
function generateReminderEmailBody($firstName, $formattedDate, $formattedTime, $service) {
    // Default service name if not provided
    if (empty($service)) {
        $service = "Appointment";
    }
    
    // Default to "Customer" if name not provided
    if (empty($firstName)) {
        $firstName = "Customer";
    }
    
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
            
            <p>This is a friendly reminder that you have an appointment for <strong>$service</strong> scheduled at DK Dental Studio tomorrow on <strong>$formattedDate</strong> at <strong>$formattedTime</strong>.</p>
            
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

// If this script is called directly and receives params, process them
if (php_sapi_name() === 'cli' && isset($argv[1]) && isset($argv[2])) {
    $datetime = $argv[1];
    $email = $argv[2];
    $name = isset($argv[3]) ? $argv[3] : '';
    $service = isset($argv[4]) ? $argv[4] : '';
    
    if (storeAppointmentForReminder($datetime, $email, $name, $service)) {
        echo "Appointment successfully stored for reminder.\n";
        exit(0);
    } else {
        echo "Failed to store appointment.\n";
        exit(1);
    }
} 