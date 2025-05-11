<?php
/**
 * Fallback Booking Handler for DK Dental Studio
 * 
 * This script handles appointment booking requests when Google Calendar integration fails.
 * It sends an email to the office with the booking details.
 */

// Set headers to allow AJAX requests
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Only POST requests are allowed']);
    exit;
}

// Get the JSON data from the request
$jsonData = file_get_contents('php://input');
$data = json_decode($jsonData, true);

// Validate required fields
if (!isset($data['firstName']) || !isset($data['lastName']) || !isset($data['email']) || !isset($data['phone']) || 
    !isset($data['service']) || !isset($data['date']) || !isset($data['time'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

// Sanitize input
$firstName = filter_var($data['firstName'], FILTER_SANITIZE_STRING);
$lastName = filter_var($data['lastName'], FILTER_SANITIZE_STRING);
$email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
$phone = filter_var($data['phone'], FILTER_SANITIZE_STRING);
$service = filter_var($data['service'], FILTER_SANITIZE_STRING);
$date = filter_var($data['date'], FILTER_SANITIZE_STRING);
$time = filter_var($data['time'], FILTER_SANITIZE_STRING);
$notes = isset($data['notes']) ? filter_var($data['notes'], FILTER_SANITIZE_STRING) : '';

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Invalid email address']);
    exit;
}

// Format date and time for display
$formattedDate = date('l, j F Y', strtotime($date));
$formattedTime = date('g:ia', strtotime($date . ' ' . $time));

// Map service ID to service name
$serviceNames = [
    'dentures' => 'Dentures Consultation',
    'repairs' => 'Repairs & Maintenance',
    'mouthguards' => 'Mouthguards Consultation'
];

$serviceName = isset($serviceNames[$service]) ? $serviceNames[$service] : 'Appointment';

// Recipient email (office email)
$to = 'info@dkdental.au';

// Email subject
$subject = "New Appointment Request: $serviceName - $firstName $lastName";

// Email message
$message = "
<html>
<head>
    <title>New Appointment Request</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0576ee; color: white; padding: 10px; text-align: center; }
        .content { padding: 20px; }
        .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #666; }
        table { width: 100%; border-collapse: collapse; }
        table td { padding: 8px; border-bottom: 1px solid #eee; }
        .label { font-weight: bold; width: 150px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2>New Appointment Request</h2>
        </div>
        <div class='content'>
            <p>A new appointment request has been submitted through the website:</p>
            
            <table>
                <tr>
                    <td class='label'>Service:</td>
                    <td>$serviceName</td>
                </tr>
                <tr>
                    <td class='label'>Date:</td>
                    <td>$formattedDate</td>
                </tr>
                <tr>
                    <td class='label'>Time:</td>
                    <td>$formattedTime</td>
                </tr>
                <tr>
                    <td class='label'>Name:</td>
                    <td>$firstName $lastName</td>
                </tr>
                <tr>
                    <td class='label'>Email:</td>
                    <td>$email</td>
                </tr>
                <tr>
                    <td class='label'>Phone:</td>
                    <td>$phone</td>
                </tr>
                <tr>
                    <td class='label'>Notes:</td>
                    <td>$notes</td>
                </tr>
            </table>
            
            <p>Please contact the patient to confirm this appointment.</p>
        </div>
        <div class='footer'>
            <p>This is an automated message from the DK Dental Studio website.</p>
        </div>
    </div>
</body>
</html>
";

// Email headers
$headers = "MIME-Version: 1.0\r\n";
$headers .= "Content-type: text/html; charset=UTF-8\r\n";
$headers .= "From: DK Dental Studio Website <noreply@dkdental.au>\r\n";
$headers .= "Reply-To: $email\r\n";

// Send email
$mailSent = mail($to, $subject, $message, $headers);

// Also send a confirmation email to the patient
$patientSubject = "Appointment Request Confirmation - DK Dental Studio";
$patientMessage = "
<html>
<head>
    <title>Appointment Request Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #0576ee; color: white; padding: 10px; text-align: center; }
        .content { padding: 20px; }
        .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #666; }
        .button { display: inline-block; background-color: #0576ee; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2>Appointment Request Confirmation</h2>
        </div>
        <div class='content'>
            <p>Dear $firstName,</p>
            
            <p>Thank you for requesting an appointment at DK Dental Studio. We have received your request for:</p>
            
            <p>
                <strong>Service:</strong> $serviceName<br>
                <strong>Date:</strong> $formattedDate<br>
                <strong>Time:</strong> $formattedTime
            </p>
            
            <p>Our team will contact you shortly to confirm your appointment. If you don't hear from us within 24 hours, please call us at (02) 9398 7578.</p>
            
            <p>If you need to make any changes to your appointment request, please contact us as soon as possible.</p>
            
            <p>We look forward to seeing you!</p>
            
            <p>Best regards,<br>DK Dental Studio Team</p>
            
            <p style='text-align: center; margin-top: 30px;'>
                <a href='https://www.dkdental.au' class='button'>Visit Our Website</a>
            </p>
        </div>
        <div class='footer'>
            <p>DK Dental Studio | Shop 4/126-128 Avoca St, Randwick NSW 2031 | (02) 9398 7578</p>
        </div>
    </div>
</body>
</html>
";

$patientHeaders = "MIME-Version: 1.0\r\n";
$patientHeaders .= "Content-type: text/html; charset=UTF-8\r\n";
$patientHeaders .= "From: DK Dental Studio <info@dkdental.au>\r\n";

$patientMailSent = mail($email, $patientSubject, $patientMessage, $patientHeaders);

// Return response
if ($mailSent) {
    echo json_encode([
        'success' => true, 
        'message' => 'Appointment request received. Our team will contact you shortly to confirm.'
    ]);
} else {
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'success' => false, 
        'message' => 'Failed to send appointment request. Please call us at (02) 9398 7578 to book your appointment.'
    ]);
} 