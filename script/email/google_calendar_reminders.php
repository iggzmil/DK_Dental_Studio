<?php
/**
 * Google Calendar Appointment Reminder System
 * 
 * This script retrieves appointments scheduled for the next day from Google Calendar
 * and sends reminder emails to the attendees.
 * 
 * Designed to be run daily at 8:00 AM via cron job.
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set Log-Only Mode if not already defined
if (!defined('LOG_ONLY_MODE')) {
    define('LOG_ONLY_MODE', false);
}

// Configure logging
$logFile = __DIR__ . '/google_calendar_reminder_log.txt';
function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message" . PHP_EOL, FILE_APPEND);
    
    // Also echo if running from command line or if in a test script
    if (php_sapi_name() === 'cli' || defined('LOG_ONLY_MODE')) {
        echo "[$timestamp] $message" . PHP_EOL;
    }
}

/**
 * Check if reminders should be sent today based on weekend logic
 * DK Dental Studio is closed on weekends, so:
 * - Friday: Don't send reminders for Saturday (clinic closed)
 * - Saturday: Don't send reminders for Sunday (clinic closed)  
 * - Sunday: DO send reminders for Monday appointments
 * - Monday-Thursday: Send reminders for next business day
 */
function shouldSendRemindersToday() {
    // Use TEST_DATE if defined, otherwise use current date
    if (defined('TEST_DATE')) {
        $today = new DateTime(TEST_DATE);
        logMessage("Using test date for weekend logic: " . TEST_DATE);
    } else {
        $today = new DateTime();
    }
    
    $dayOfWeek = (int)$today->format('w'); // 0=Sunday, 1=Monday, ..., 6=Saturday
    $dayName = $today->format('l');
    
    switch($dayOfWeek) {
        case 5: // Friday
            logMessage("Today is Friday - NOT sending reminders for Saturday (clinic closed on weekends)");
            return false;
            
        case 6: // Saturday  
            logMessage("Today is Saturday - NOT sending reminders for Sunday (clinic closed on weekends)");
            return false;
            
        case 0: // Sunday
            logMessage("Today is Sunday - WILL send reminders for Monday appointments");
            return true;
            
        default: // Monday (1) through Thursday (4)
            logMessage("Today is $dayName - WILL send reminders for tomorrow's appointments");
            return true;
    }
}

/**
 * Validate if appointment is during business hours
 * Business hours:
 * - Dentures/Maintenance: Mon-Fri 10am-4pm  
 * - Mouthguards: Mon-Thu 10am-6pm, Fri 10am-4pm
 */
function isValidBusinessHourAppointment($appointmentDateTime, $service = null) {
    $appointmentDate = new DateTime($appointmentDateTime);
    $dayOfWeek = strtolower($appointmentDate->format('l'));
    $hour = (int)$appointmentDate->format('H');
    
    // Check if appointment is on weekend (should never happen, but good to validate)
    if ($dayOfWeek === 'saturday' || $dayOfWeek === 'sunday') {
        logMessage("WARNING: Found appointment on $dayOfWeek - clinic is closed on weekends");
        return false;
    }
    
    // Define business hours for each service
    $businessHours = [
        'dentures' => [
            'monday' => ['start' => 10, 'end' => 16],
            'tuesday' => ['start' => 10, 'end' => 16],
            'wednesday' => ['start' => 10, 'end' => 16],
            'thursday' => ['start' => 10, 'end' => 16],
            'friday' => ['start' => 10, 'end' => 16]
        ],
        'maintenance' => [
            'monday' => ['start' => 10, 'end' => 16],
            'tuesday' => ['start' => 10, 'end' => 16],
            'wednesday' => ['start' => 10, 'end' => 16],
            'thursday' => ['start' => 10, 'end' => 16],
            'friday' => ['start' => 10, 'end' => 16]
        ],
        'mouthguards' => [
            'monday' => ['start' => 10, 'end' => 18],
            'tuesday' => ['start' => 10, 'end' => 18],
            'wednesday' => ['start' => 10, 'end' => 18],
            'thursday' => ['start' => 10, 'end' => 18],
            'friday' => ['start' => 10, 'end' => 16] // Friday ends at 4pm for mouthguards
        ]
    ];
    
    // Determine service type from appointment title if not provided
    if (!$service) {
        // This will be used later when we have the appointment details
        return true; // Skip validation if service unknown
    }
    
    $serviceKey = strtolower($service);
    
    // Map service names to our business hours keys
    if (stripos($serviceKey, 'denture') !== false) {
        $serviceKey = 'dentures';
    } elseif (stripos($serviceKey, 'maintenance') !== false || stripos($serviceKey, 'repair') !== false) {
        $serviceKey = 'maintenance';
    } elseif (stripos($serviceKey, 'mouthguard') !== false) {
        $serviceKey = 'mouthguards';
    } else {
        // Default to denture hours for unknown services
        $serviceKey = 'dentures';
    }
    
    // Check if day and hour are within business hours
    if (isset($businessHours[$serviceKey][$dayOfWeek])) {
        $hours = $businessHours[$serviceKey][$dayOfWeek];
        $isValid = $hour >= $hours['start'] && $hour < $hours['end'];
        
        if (!$isValid) {
            logMessage("WARNING: Appointment at {$hour}:00 on $dayOfWeek is outside business hours for $serviceKey");
        }
        
        return $isValid;
    }
    
    logMessage("WARNING: No business hours defined for $serviceKey on $dayOfWeek");
    return false;
}

// Log script start
logMessage("Starting Google Calendar appointment reminder check" . (LOG_ONLY_MODE ? " (LOG-ONLY MODE)" : ""));

// Check if we should send reminders today based on weekend logic
if (!shouldSendRemindersToday()) {
    logMessage("Reminder system completed - no reminders sent due to weekend schedule");
    exit(0);
}

// OAuth token handling
$tokenFile = __DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json';
$clientSecretsFile = __DIR__ . '/../../vendor/google/oauth/secure/client_secrets.json';

// Verify necessary files exist
if (!file_exists($tokenFile)) {
    logMessage("ERROR: Token file not found at: $tokenFile");
    exit(1);
}

if (!file_exists($clientSecretsFile)) {
    logMessage("ERROR: Client secrets file not found at: $clientSecretsFile");
    exit(1);
}

// Get access token (reusing existing token handling code)
function getAccessToken() {
    global $tokenFile, $clientSecretsFile;
    
    try {
        $tokenData = json_decode(file_get_contents($tokenFile), true);
        if (!isset($tokenData['access_token']) || !isset($tokenData['refresh_token'])) {
            logMessage("ERROR: Token file does not contain required data");
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
                
                logMessage("Access token refreshed successfully");
                return $newTokenData['access_token'];
            }
        }
        
        logMessage("ERROR: Failed to refresh token. HTTP Code: $httpCode, Response: $response");
        return null;
        
    } catch (Exception $e) {
        logMessage("ERROR: Exception getting access token: " . $e->getMessage());
        return null;
    }
}

// Get access token
$accessToken = getAccessToken();
if (!$accessToken) {
    logMessage("Failed to obtain access token. Exiting.");
    exit(1);
}

// Calendar IDs 
$calendarIds = [
    'primary' => 'info@dkdental.au' // Just use one calendar to avoid duplicates
];

// Get tomorrow's date range (or use test date if specified)
if (defined('TEST_DATE')) {
    $today = new DateTime(TEST_DATE);
    $tomorrow = clone $today;
    $tomorrow->add(new DateInterval('P1D')); // Add 1 day to get tomorrow
    logMessage("Using test date as 'today': " . $today->format('Y-m-d') . " (looking for appointments on: " . $tomorrow->format('Y-m-d') . ")");
} else {
    $tomorrow = new DateTime('tomorrow');
}

$tomorrowStart = $tomorrow->format('Y-m-d') . 'T00:00:00Z';
$tomorrowEnd = $tomorrow->format('Y-m-d') . 'T23:59:59Z';

logMessage("Checking for appointments on " . $tomorrow->format('l, j F Y'));

// Counter for tracking processed appointments
$appointmentCount = 0;
$remindersSent = 0;
$businessEventCount = 0; // Count for business-related events like Office, Lunch, etc.
$clientAppointmentCount = 0; // Count for actual client appointments

// Process each calendar (service type)
foreach ($calendarIds as $service => $calendarId) {
    logMessage("Checking calendar: $calendarId");
    
    // Get events for tomorrow
    $url = "https://www.googleapis.com/calendar/v3/calendars/" . urlencode($calendarId) . "/events?" . http_build_query([
        'timeMin' => $tomorrowStart,
        'timeMax' => $tomorrowEnd,
        'singleEvents' => 'true',
        'orderBy' => 'startTime'
    ]);
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Accept: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode == 200) {
        $events = json_decode($response, true);
        
        if (isset($events['items']) && !empty($events['items'])) {
            logMessage("Found " . count($events['items']) . " events for $service");
            
            foreach ($events['items'] as $event) {
                $appointmentCount++;
                
                $eventSummary = isset($event['summary']) ? $event['summary'] : 'Unnamed event';
                $eventTime = isset($event['start']['dateTime']) ? date('g:ia', strtotime($event['start']['dateTime'])) : 'No time specified';
                
                logMessage("Processing event: $eventSummary at $eventTime");
                
                // Skip known internal/business events
                $skipKeywords = ['lunch', 'office', 'closed', 'meeting', 'break', 'staff'];
                $isBusinessEvent = false;
                
                foreach ($skipKeywords as $keyword) {
                    if (stripos($eventSummary, $keyword) !== false) {
                        $isBusinessEvent = true;
                        logMessage("Skipping business event: $eventSummary");
                        $businessEventCount++;
                        break;
                    }
                }
                
                if ($isBusinessEvent) {
                    continue;
                }
                
                // Try to extract client information from event
                $clientName = null;
                $clientEmail = null;
                $serviceName = null;
                
                // Extract client name and service name from summary (e.g., "Dentures - John Smith")
                if (strpos($eventSummary, '-') !== false) {
                    list($serviceName, $clientName) = array_map('trim', explode('-', $eventSummary, 2));
                } else {
                    $clientName = $eventSummary;
                    $serviceName = "Appointment"; // Default if not specified
                }
                
                // Calculate event duration in minutes
                $duration = 60; // Default duration of 60 minutes
                if (isset($event['start']['dateTime']) && isset($event['end']['dateTime'])) {
                    $startTime = new DateTime($event['start']['dateTime']);
                    $endTime = new DateTime($event['end']['dateTime']);
                    $interval = $startTime->diff($endTime);
                    $duration = ($interval->h * 60) + $interval->i;
                }
                // Format duration text
                $durationText = $duration . " minutes";
                
                // Extract email from attendees if available
                if (isset($event['attendees']) && is_array($event['attendees'])) {
                    foreach ($event['attendees'] as $attendee) {
                        // Skip the calendar owner (us) and resources
                        if (isset($attendee['self']) && $attendee['self'] === true) {
                            continue;
                        }
                        if (isset($attendee['resource']) && $attendee['resource'] === true) {
                            continue;
                        }
                        
                        // Use the first attendee that isn't us or a resource
                        if (isset($attendee['email'])) {
                            $clientEmail = $attendee['email'];
                            
                            // If attendee has a display name, use it
                            if (isset($attendee['displayName']) && !empty($attendee['displayName'])) {
                                $clientName = $attendee['displayName'];
                            }
                            
                            break;
                        }
                    }
                }
                
                // Check description for email address if not found in attendees
                if (!$clientEmail && isset($event['description'])) {
                    $description = $event['description'];
                    // Look for email pattern in description
                    if (preg_match('/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/', $description, $matches)) {
                        $clientEmail = $matches[0];
                    }
                    
                    // Extract client name from the description if not already set
                    if (!$clientName || $clientName === $eventSummary) {
                        if (preg_match('/Name:\s*([^\r\n]+)/i', $description, $matches)) {
                            $clientName = trim($matches[1]);
                        }
                    }
                    
                    // Extract service from the description if not already set
                    if (!$serviceName || $serviceName === "Appointment") {
                        if (preg_match('/Service:\s*([^\r\n]+)/i', $description, $matches)) {
                            $serviceName = trim($matches[1]);
                        }
                    }
                }
                
                // Try to extract first name from client name
                $firstName = $clientName;
                if (strpos($clientName, ' ') !== false) {
                    $nameParts = explode(' ', $clientName, 2);
                    $firstName = $nameParts[0];
                }
                
                // Format date for display
                $formattedDate = date('l, j F Y', strtotime($event['start']['dateTime']));
                
                // Format time for display - use DateTime object to handle timezone correctly
                $dateTimeObj = new DateTime($event['start']['dateTime']);
                $formattedTime = $dateTimeObj->format('g:ia'); // e.g., "3:00pm"
                
                // Log for debugging
                logMessage("Event time: " . $event['start']['dateTime'] . " formatted as: " . $formattedTime);
                
                // Validate business hours BEFORE checking email
                if (isset($event['start']['dateTime'])) {
                    if (!isValidBusinessHourAppointment($event['start']['dateTime'], $serviceName)) {
                        logMessage("Skipping appointment outside business hours: $eventSummary at $formattedTime");
                        continue;
                    }
                }
                
                // If we don't have an email, we can't send a reminder
                if (!$clientEmail) {
                    logMessage("No email found for event: $eventSummary - Cannot send reminder");
                    continue;
                }
                
                // Count this as a valid client appointment
                $clientAppointmentCount++;
                
                logMessage("Validated appointment for reminder: $serviceName appointment for $firstName ($clientEmail) at $formattedTime");
                
                // Generate email subject and body
                $subject = "Appointment Reminder - DK Dental Studio";
                $message = generateReminderEmailBody($firstName, $formattedDate, $formattedTime, $serviceName, $durationText);
                
                // Send the reminder email
                if (sendReminderEmail($clientEmail, $subject, $message)) {
                    logMessage("Reminder email sent to $clientEmail for appointment at $formattedTime");
                    $remindersSent++;
                } else {
                    logMessage("Failed to send reminder email to $clientEmail for appointment at $formattedTime");
                }
            }
        } else {
            logMessage("No events found for $service on " . $tomorrow->format('Y-m-d'));
        }
    } else {
        logMessage("ERROR: Failed to retrieve events for $service. HTTP Code: $httpCode");
        logMessage("Response: $response");
    }
}

// Log summary
logMessage("Reminder processing completed:");
logMessage("- Total calendar items found: $appointmentCount");
logMessage("- Business/non-client events: $businessEventCount");
logMessage("- Actual client appointments: $clientAppointmentCount");
logMessage("- Reminder emails " . (LOG_ONLY_MODE ? "that would be sent" : "sent") . ": $remindersSent");

/**
 * Generate reminder email body
 * 
 * @param string $firstName Client's first name
 * @param string $formattedDate Formatted appointment date
 * @param string $formattedTime Formatted appointment time
 * @param string $service Service name/type
 * @param string $duration Appointment duration
 * @return string HTML email body
 */
function generateReminderEmailBody($firstName, $formattedDate, $formattedTime, $service, $duration = "60 minutes") {
    // Default service name if not provided
    if (empty($service)) {
        $service = "Appointment";
    }
    
    // Default to "Customer" if name not provided
    if (empty($firstName)) {
        $firstName = "Customer";
    }
    
    // Get first name from email if it contains @ (meaning the name field has an email address)
    if (strpos($firstName, '@') !== false) {
        // Extract the part before @ for the first name
        $parts = explode('@', $firstName);
        $firstName = $parts[0];
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
            
            <p><strong>Duration:</strong> $duration</p>
            
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
 * 
 * @param string $to Recipient email address
 * @param string $subject Email subject
 * @param string $message Email body (HTML)
 * @return bool Success or failure
 */
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
    
    // In LIVE mode, actually send the email using Gmail API
    
    // Check if Gmail API integration is available
    $gmailApiPath = __DIR__ . '/gmail-sender.php';
    if (file_exists($gmailApiPath)) {
        // Use Gmail API to send emails
        require_once $gmailApiPath;
        
        logMessage("Sending actual email to $to via Gmail API");
        
        $emailResult = sendGmailEmail(
            $to,
            $subject,
            $message,
            'DK Dental Studio'
        );
        
        $success = $emailResult['success'];
        
        if ($success) {
            logMessage("Email successfully sent via Gmail API: " . $emailResult['message']);
        } else {
            logMessage("Gmail API email error: " . $emailResult['message']);
        }
    } else {
        // Fall back to PHP mail() function
        logMessage("Gmail API not available, falling back to PHP mail()");
        
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: DK Dental Studio <info@dkdental.au>\r\n";
        $headers .= "Reply-To: info@dkdental.au\r\n";
        
        $success = mail($to, $subject, $message, $headers);
        
        if ($success) {
            logMessage("Email sent successfully using PHP mail() function");
        } else {
            logMessage("PHP mail() function failed");
        }
    }
    
    return $success;
} 