<?php
/**
 * Contact Form Handler for DK Dental Studio
 *
 * This script processes contact form submissions from the website
 * and sends emails using Gmail API with OAuth authentication.
 *
 * The script is designed to be used with the contact form on contact-us.html
 */

// Include the Gmail sender
require_once __DIR__ . '/gmail-sender.php';

// Include session handler for CSRF protection
require_once __DIR__ . '/session-handler.php';

// Set content type for AJAX responses
header('Content-Type: application/json');

// Get CSRF tokens
$csrf_token = isset($_POST['csrf_token']) ? $_POST['csrf_token'] : '';
$valid_csrf = verifyCsrfToken($csrf_token);

// Function to validate form data
function validateContactForm($data) {
    $errors = [];

    // Required fields
    $requiredFields = ['first-name', 'email', 'phone', 'subject', 'message'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            $errors[] = ucfirst(str_replace('-', ' ', $field)) . ' is required';
        }
    }

    // Email validation
    if (isset($data['email']) && !empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address';
    }

    // Phone validation (basic)
    if (isset($data['phone']) && !empty($data['phone'])) {
        // Remove non-numeric characters for validation
        $phone = preg_replace('/[^0-9]/', '', $data['phone']);
        if (strlen($phone) < 8 || strlen($phone) > 15) {
            $errors[] = 'Please enter a valid phone number';
        }
    }

    return $errors;
}

// Function to create HTML email content
function createEmailHtml($data) {
    $firstName = htmlspecialchars($data['first-name']);
    $email = htmlspecialchars($data['email']);
    $phone = htmlspecialchars($data['phone']);
    $subject = htmlspecialchars($data['subject']);
    $message = nl2br(htmlspecialchars($data['message']));

    // Create HTML email
    $html = <<<HTML
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        h1 {
            color: #0576ee;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        .contact-details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .message-content {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
        }
        .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #777;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>New Contact Form Submission</h1>

        <div class="contact-details">
            <p><strong>Name:</strong> {$firstName}</p>
            <p><strong>Email:</strong> {$email}</p>
            <p><strong>Phone:</strong> {$phone}</p>
            <p><strong>Subject:</strong> {$subject}</p>
        </div>

        <div class="message-content">
            <h3>Message:</h3>
            <p>{$message}</p>
        </div>

        <div class="footer">
            <p>This message was sent from the DK Dental Studio website contact form.</p>
            <p>© DK Dental Studio</p>
        </div>
    </div>
</body>
</html>
HTML;

    return $html;
}

// Process the form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Verify CSRF token
    if (!$valid_csrf) {
        echo json_encode([
            'success' => false,
            'message' => 'Security validation failed. Please refresh the page and try again.'
        ]);
        exit;
    }

    // Validate form data
    $errors = validateContactForm($_POST);

    if (!empty($errors)) {
        echo json_encode([
            'success' => false,
            'message' => 'Please correct the following errors:',
            'errors' => $errors
        ]);
        exit;
    }

    // Create email content
    $emailHtml = createEmailHtml($_POST);

    // Set recipient email (can be configured as needed)
    $toEmail = 'info@dkdental.au'; // Default recipient

    // Set email subject
    $emailSubject = 'New Contact Form Submission: ' . $_POST['subject'];

    // Send the email
    $result = sendGmailEmail(
        $toEmail,
        $emailSubject,
        $emailHtml,
        'DK Dental Studio Contact Form'
    );

    // Return the result
    if ($result['success']) {
        echo json_encode([
            'success' => true,
            'message' => 'Thank you for your message. We will get back to you shortly.'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Sorry, there was a problem sending your message. Please try again later or contact us directly.',
            'error' => $result['message']
        ]);
    }
} else {
    // Not a POST request
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method. This endpoint only accepts POST requests.'
    ]);
}
