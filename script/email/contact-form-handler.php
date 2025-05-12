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

    // Name validation
    if (isset($data['first-name']) && !empty($data['first-name'])) {
        $firstName = trim($data['first-name']);

        // Check length
        if (strlen($firstName) < 2) {
            $errors[] = 'Name must be at least 2 characters';
        } elseif (strlen($firstName) > 50) {
            $errors[] = 'Name must be no more than 50 characters';
        }

        // Check for valid characters (letters, spaces, hyphens, apostrophes)
        if (!preg_match('/^[A-Za-z\s\-\']+$/', $firstName)) {
            $errors[] = 'Name can only contain letters, spaces, hyphens, and apostrophes';
        }
    }

    // Email validation
    if (isset($data['email']) && !empty($data['email'])) {
        $email = trim($data['email']);

        // Basic email validation
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Please enter a valid email address';
        }

        // Additional email validation (domain check)
        $parts = explode('@', $email);
        if (count($parts) === 2) {
            $domain = $parts[1];
            if (!checkdnsrr($domain, 'MX') && !checkdnsrr($domain, 'A')) {
                $errors[] = 'Email domain appears to be invalid';
            }
        }
    }

    // Phone validation (Australian format)
    if (isset($data['phone']) && !empty($data['phone'])) {
        $phone = trim($data['phone']);

        // Remove spaces, dashes and other formatting characters
        $cleanPhone = preg_replace('/[^0-9+]/', '', $phone);

        // Australian phone number validation
        // Matches formats like: 0412345678, 0412 345 678, +61412345678, +61 412 345 678
        if (!preg_match('/^(\+?61|0)[2478]\d{8}$/', $cleanPhone)) {
            $errors[] = 'Please enter a valid Australian phone number';
        }
    }

    // Subject validation
    if (isset($data['subject']) && !empty($data['subject'])) {
        $subject = trim($data['subject']);

        // Check length
        if (strlen($subject) < 3) {
            $errors[] = 'Subject must be at least 3 characters';
        } elseif (strlen($subject) > 100) {
            $errors[] = 'Subject must be no more than 100 characters';
        }
    }

    // Message validation
    if (isset($data['message']) && !empty($data['message'])) {
        $message = trim($data['message']);

        // Check length
        if (strlen($message) < 10) {
            $errors[] = 'Message must be at least 10 characters';
        } elseif (strlen($message) > 1000) {
            $errors[] = 'Message must be no more than 1000 characters';
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

    // Rate limiting - prevent spam submissions
    session_start();
    $currentTime = time();
    $lastSubmissionTime = isset($_SESSION['last_form_submission']) ? $_SESSION['last_form_submission'] : 0;

    // Allow only one submission every 60 seconds
    if (($currentTime - $lastSubmissionTime) < 60) {
        echo json_encode([
            'success' => false,
            'message' => 'Please wait a moment before submitting another message.'
        ]);
        exit;
    }

    // Simple honeypot check (if JavaScript is enabled, this should never be filled)
    if (isset($_POST['website']) && !empty($_POST['website'])) {
        // This is likely a bot - silently exit with a fake success message
        echo json_encode([
            'success' => true,
            'message' => 'Thank you for your message. We will get back to you shortly.'
        ]);
        exit;
    }

    // Sanitize input data
    $sanitizedData = [];
    foreach ($_POST as $key => $value) {
        // Skip the honeypot field
        if ($key === 'website') {
            continue;
        }

        // Sanitize string values
        if (is_string($value)) {
            $sanitizedData[$key] = trim(strip_tags($value));
        } else {
            $sanitizedData[$key] = $value;
        }
    }

    // Validate form data
    $errors = validateContactForm($sanitizedData);

    if (!empty($errors)) {
        echo json_encode([
            'success' => false,
            'message' => 'Please correct the following errors:',
            'errors' => $errors
        ]);
        exit;
    }

    // Update last submission time
    $_SESSION['last_form_submission'] = $currentTime;

    // Create email content
    $emailHtml = createEmailHtml($sanitizedData);

    // Set recipient emails (can be configured as needed)
    $toEmail = 'info@dkdental.au'; // Primary recipient
    $ccEmail = 'iggzmil@gmail.com'; // Secondary recipient for testing purposes

    // Set email subject
    $emailSubject = 'New Contact Form Submission: ' . $sanitizedData['subject'];

    // Send the email to both recipients
    $result = sendGmailEmail(
        $toEmail . ',' . $ccEmail, // Send to both emails
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
