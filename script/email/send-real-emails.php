<?php
/**
 * Real Email Sender for Google Calendar Appointment Reminders
 * 
 * This script runs the reminder system in ACTUAL LIVE MODE, using PHP's mail() function
 * to send real emails to clients.
 */

// Security measure - require confirmation code
$confirmCode = isset($_GET['confirm']) ? $_GET['confirm'] : '';
$expectedCode = 'SendRealEmails'; // More specific code to indicate real emails

// Set content type for browser output
header('Content-Type: text/plain');

// Check confirmation code
if ($confirmCode !== $expectedCode) {
    echo "SECURITY CHECK FAILED\n";
    echo "-----------------------------------------------------\n";
    echo "To run the reminder system with REAL EMAIL SENDING, you must provide the correct confirmation code.\n";
    echo "Example: send-real-emails.php?confirm=SendRealEmails\n";
    echo "\nThis security measure prevents accidental live emails.\n";
    exit;
}

// Set log path
$logFile = __DIR__ . '/real_email_reminder_log.txt';

// Logging function
function realLogMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message" . PHP_EOL, FILE_APPEND);
    
    // Also echo if running from command line or if in a test script
    echo "[$timestamp] $message" . PHP_EOL;
}

// Initialize counters
$appointmentCount = 0;
$remindersSent = 0;
$businessEventCount = 0;
$clientAppointmentCount = 0;

// Display all errors for monitoring
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Alert that we're in REAL LIVE MODE
echo "RUNNING GOOGLE CALENDAR REMINDER SYSTEM WITH ACTUAL EMAIL SENDING\n";
echo "-----------------------------------------------------\n";
echo "WARNING: REAL EMAILS WILL BE SENT TO CUSTOMERS\n";
echo "-----------------------------------------------------\n\n";

// Allow testing with a specific date (optional)
$testDate = isset($_GET['date']) ? $_GET['date'] : null; 

if ($testDate) {
    echo "Using specific date for testing: $testDate\n\n";
    $tomorrow = new DateTime($testDate);
    realLogMessage("Using test date: " . $tomorrow->format('Y-m-d'));
} else {
    echo "Using tomorrow's date for reminders\n\n";
    $tomorrow = new DateTime('tomorrow');
}

// Get OAuth token (code from google_calendar_reminders.php)
$tokenFile = __DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json';
$clientSecretsFile = __DIR__ . '/../../vendor/google/oauth/secure/client_secrets.json';

// Verify necessary files exist
if (!file_exists($tokenFile)) {
    realLogMessage("ERROR: Token file not found at: $tokenFile");
    exit(1);
}

if (!file_exists($clientSecretsFile)) {
    realLogMessage("ERROR: Client secrets file not found at: $clientSecretsFile");
    exit(1);
}

// Get access token
function getAccessToken() {
    global $tokenFile, $clientSecretsFile;
    
    try {
        $tokenData = json_decode(file_get_contents($tokenFile), true);
        if (!isset($tokenData['access_token']) || !isset($tokenData['refresh_token'])) {
            realLogMessage("ERROR: Token file does not contain required data");
            return null;
        }
        
        $refreshToken = $tokenData['refresh_token'];
        
        // Load client credentials
        $clientSecrets = json_decode(file_get_contents($clientSecretsFile), true);
        $clientId = $clientSecrets['web']['client_id'];
        $clientSecret = $clientSecrets['web']['client_secret'];
        
        // Refresh the token
        $ch = curl_init('https://oauth2.googleapis.com/token');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'refresh_token' => $refreshToken,
            'grant_type' => 'refresh_token'
        ]));
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode == 200) {
            $newTokenData = json_decode($response, true);
            if (isset($newTokenData['access_token'])) {
                // Update the access token in the token file
                $tokenData['access_token'] = $newTokenData['access_token'];
                $tokenData['expires_in'] = $newTokenData['expires_in'];
                file_put_contents($tokenFile, json_encode($tokenData));
                
                realLogMessage("Access token refreshed successfully");
                return $newTokenData['access_token'];
            }
        }
        
        realLogMessage("ERROR: Failed to refresh token. HTTP Code: $httpCode, Response: $response");
        return null;
        
    } catch (Exception $e) {
        realLogMessage("ERROR: Exception getting access token: " . $e->getMessage());
        return null;
    }
}

// Get tomorrow's date range
$tomorrowStart = $tomorrow->format('Y-m-d') . 'T00:00:00Z';
$tomorrowEnd = $tomorrow->format('Y-m-d') . 'T23:59:59Z';

realLogMessage("Checking for appointments on " . $tomorrow->format('l, j F Y'));

// Get access token
$accessToken = getAccessToken();
if (!$accessToken) {
    realLogMessage("Failed to obtain access token. Exiting.");
    exit(1);
}

// Calendar IDs 
$calendarIds = [
    'primary' => 'info@dkdental.au' // Just use one calendar to avoid duplicates
];

// Process each calendar
foreach ($calendarIds as $service => $calendarId) {
    realLogMessage("Checking calendar: $calendarId");
    
    // Get events from Google Calendar for tomorrow
    $apiUrl = "https://www.googleapis.com/calendar/v3/calendars/" . urlencode($calendarId) . "/events";
    $apiUrl .= "?singleEvents=true";
    $apiUrl .= "&orderBy=startTime";
    $apiUrl .= "&timeMin=" . urlencode($tomorrowStart);
    $apiUrl .= "&timeMax=" . urlencode($tomorrowEnd);
    
    // Initialize cURL session
    $ch = curl_init($apiUrl);
    
    // Set cURL options
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Accept: application/json'
    ]);
    
    // Execute cURL request
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    // Process the response
    if ($httpCode >= 200 && $httpCode < 300) {
        $data = json_decode($response, true);
        
        if (isset($data['items']) && is_array($data['items'])) {
            $events = $data['items'];
            realLogMessage("Found " . count($events) . " total calendar items for date");
            
            foreach ($events as $event) {
                $appointmentCount++;
                
                // Extract event details
                $eventSummary = $event['summary'] ?? 'Unnamed Appointment';
                
                // Check if this is a timed event or a business hours/closure event
                if (!isset($event['start']['dateTime'])) {
                    // This is likely a business hours marker or closure - not an actual appointment
                    realLogMessage("Skipping business hours event: $eventSummary - Not a client appointment");
                    $businessEventCount++;
                    continue;
                }
                
                // Check if this is a business-related event
                $businessEventKeywords = ['lunch', 'office', 'open', 'close', 'meeting', 'break', 'away'];
                $isBusinessEvent = false;
                
                foreach ($businessEventKeywords as $keyword) {
                    if (stripos($eventSummary, $keyword) !== false) {
                        $isBusinessEvent = true;
                        break;
                    }
                }
                
                if ($isBusinessEvent) {
                    realLogMessage("Skipping internal business event: $eventSummary");
                    $businessEventCount++;
                    continue;
                }
                
                // Increment client appointment counter for actual appointments
                $clientAppointmentCount++;
                
                // Safe to process the dateTime now
                $eventStart = new DateTime($event['start']['dateTime']);
                $eventTime = $eventStart->format('g:ia');
                
                // Get attendee information
                $attendees = $event['attendees'] ?? [];
                $clientName = null;
                $clientEmail = null;
                
                // Skip events without attendees
                if (empty($attendees)) {
                    // Look for client info in event title/description
                    $clientName = null;
                    $clientEmail = null;
                    
                    // Extract name from event summary as fallback
                    // Assuming format like "Service - FirstName LastName"
                    if (strpos($eventSummary, ' - ') !== false) {
                        $namePart = explode(' - ', $eventSummary, 2)[1];
                        $clientName = trim($namePart);
                    }
                    
                    // Try to extract email from description if available
                    if (isset($event['description'])) {
                        $description = $event['description'];
                        
                        // Look for email pattern in description
                        if (preg_match('/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/', $description, $matches)) {
                            $clientEmail = $matches[0];
                            realLogMessage("Found client email in description: $clientEmail");
                        }
                        
                        // Look for "Email:" field in description
                        if (preg_match('/Email:\s*([^\s,;<>]+@[^\s,;<>]+)/', $description, $matches)) {
                            $clientEmail = $matches[1];
                            realLogMessage("Found client email in Email field: $clientEmail");
                        }
                    }
                    
                    // If we found a name but no email, see if there are any common naming patterns we can use
                    if ($clientName && !$clientEmail && $eventSummary !== 'Lunch' && 
                        strpos($eventSummary, 'Open') === false && 
                        strpos($eventSummary, 'Close') === false) {
                        
                        realLogMessage("Found client name ($clientName) but no email. Checking well-known clients.");
                        
                        // Check for specific known clients - add more as needed
                        if (stripos($clientName, 'Igor Milgrom') !== false) {
                            $clientEmail = 'iggzmil@gmail.com';
                            realLogMessage("Matched known client: Igor Milgrom -> $clientEmail");
                        }
                        // Add more known clients here
                    }
                    
                    // Still no client email found
                    if (!$clientEmail) {
                        realLogMessage("No attendees found for event: $eventSummary at $eventTime - Cannot send reminder");
                        continue;
                    }
                } else {
                    // Find the client attendee (not the organizer)
                    foreach ($attendees as $attendee) {
                        // Skip the organizer (usually the dental office email)
                        if (isset($attendee['organizer']) && $attendee['organizer']) {
                            continue;
                        }
                        
                        if (isset($attendee['email'])) {
                            $clientEmail = $attendee['email'];
                            // Use name from attendee data if available
                            if (isset($attendee['displayName']) && !empty($attendee['displayName'])) {
                                $clientName = $attendee['displayName'];
                            } else {
                                // Extract first name from email as fallback
                                $nameParts = explode('@', $clientEmail);
                                $clientName = ucfirst($nameParts[0]);
                            }
                            break;
                        }
                    }
                }
                
                // Extract service name from event summary or use default
                $serviceName = $service;
                if (strpos($eventSummary, 'Dentures') !== false) {
                    $serviceName = 'Dentures Consultation';
                } else if (strpos($eventSummary, 'Repairs') !== false) {
                    $serviceName = 'Repairs & Maintenance';
                } else if (strpos($eventSummary, 'Mouthguards') !== false) {
                    $serviceName = 'Mouthguards';
                }
                
                // Format date and time for the email
                $formattedDate = $eventStart->format('l, j F Y');
                $formattedTime = $eventStart->format('g:ia');
                
                // Generate email subject and body
                $subject = "Appointment Reminder - DK Dental Studio";
                $message = generateReminderEmailBody($clientName, $formattedDate, $formattedTime, $serviceName);
                
                // Send the reminder email using direct PHP mail() function
                $success = sendRealEmail($clientEmail, $subject, $message);
                
                if ($success) {
                    realLogMessage("REAL reminder email sent to $clientEmail for appointment at $formattedTime");
                    $remindersSent++;
                } else {
                    realLogMessage("FAILED to send REAL reminder email to $clientEmail for appointment at $formattedTime");
                }
            }
        } else {
            realLogMessage("No events found for $service on " . $tomorrow->format('Y-m-d'));
        }
    } else {
        realLogMessage("ERROR: Failed to retrieve events for $service. HTTP Code: $httpCode");
        realLogMessage("Response: $response");
    }
}

// Log summary
realLogMessage("Reminder processing completed:");
realLogMessage("- Total calendar items found: $appointmentCount");
realLogMessage("- Business/non-client events: $businessEventCount");
realLogMessage("- Actual client appointments: $clientAppointmentCount");
realLogMessage("- REAL reminder emails sent: $remindersSent");

echo "\n-----------------------------------------------------\n";
echo "FINISHED RUNNING WITH ACTUAL EMAIL SENDING\n";
echo "Check the log file at: " . $logFile . "\n";
echo "Real emails have been sent to the recipients listed above\n";

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

/**
 * Send a real email using PHP's mail() function
 */
function sendRealEmail($to, $subject, $message) {
    // Set up email headers
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-type: text/html; charset=UTF-8\r\n";
    $headers .= "From: DK Dental Studio <info@dkdental.au>\r\n";
    $headers .= "Reply-To: info@dkdental.au\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    
    // Send the email using PHP's mail() function
    $success = mail($to, $subject, $message, $headers);
    
    return $success;
} 