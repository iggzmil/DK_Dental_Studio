<?php
/**
 * Simple Form Handler for DK Dental Studio
 * 
 * This script processes contact form submissions and logs them to a file.
 * It's a fallback solution when email sending is not available.
 */

// Set content type for AJAX responses
header('Content-Type: application/json');

// Include session handler for CSRF protection
require_once __DIR__ . '/session-handler.php';

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
    }

    // Phone validation (basic)
    if (isset($data['phone']) && !empty($data['phone'])) {
        $phone = trim($data['phone']);

        // Remove spaces, dashes and other formatting characters
        $cleanPhone = preg_replace('/[^0-9+]/', '', $phone);

        // Basic phone number validation
        if (strlen($cleanPhone) < 8 || strlen($cleanPhone) > 15) {
            $errors[] = 'Please enter a valid phone number';
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

// Function to log form submissions to a file
function logFormSubmission($data) {
    // Create a log entry
    $logEntry = [
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'data' => $data
    ];
    
    // Convert to JSON
    $logJson = json_encode($logEntry, JSON_PRETTY_PRINT);
    
    // Create a unique filename based on timestamp
    $filename = __DIR__ . '/../../logs/contact_' . date('Ymd_His') . '_' . uniqid() . '.json';
    
    // Make sure the logs directory exists
    $logsDir = __DIR__ . '/../../logs';
    if (!file_exists($logsDir)) {
        mkdir($logsDir, 0755, true);
    }
    
    // Write to file
    file_put_contents($filename, $logJson);
    
    return $filename;
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
        // Format the error message to be more user-friendly
        $errorMessage = 'Please correct the following errors:';
        
        // Return the detailed error information
        echo json_encode([
            'success' => false,
            'message' => $errorMessage,
            'errors' => $errors
        ]);
        exit;
    }

    // Update last submission time
    $_SESSION['last_form_submission'] = $currentTime;

    // Log the form submission
    $logFile = logFormSubmission($sanitizedData);
    
    // Log success message
    error_log('Contact form submission logged to: ' . $logFile);
    
    // Return success message
    echo json_encode([
        'success' => true,
        'message' => 'Thank you for your message. We will get back to you shortly.'
    ]);
} else {
    // Not a POST request
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method. This endpoint only accepts POST requests.'
    ]);
}
