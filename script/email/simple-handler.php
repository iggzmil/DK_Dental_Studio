<?php
/**
 * Simple Contact Form Handler for DK Dental Studio
 * 
 * This is a simplified version of the contact form handler that doesn't
 * rely on the Gmail API. It can be used for testing when the Gmail API
 * integration is not working.
 */

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Set content type for AJAX responses
header('Content-Type: application/json');

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
        $phone = preg_replace('/[^0-9+]/', '', $data['phone']);
        if (strlen($phone) < 8 || strlen($phone) > 15) {
            $errors[] = 'Please enter a valid phone number';
        }
    }
    
    return $errors;
}

// Process the form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Log the POST data for debugging
    error_log('POST data: ' . print_r($_POST, true));
    
    // Simple honeypot check
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
    
    // Instead of sending an email, just log the data and return success
    error_log('Form submission: ' . print_r($sanitizedData, true));
    
    // Create a log file in the same directory
    $logFile = __DIR__ . '/form_submissions.log';
    $logData = date('Y-m-d H:i:s') . " - New submission:\n";
    $logData .= "Name: " . $sanitizedData['first-name'] . "\n";
    $logData .= "Email: " . $sanitizedData['email'] . "\n";
    $logData .= "Phone: " . $sanitizedData['phone'] . "\n";
    $logData .= "Subject: " . $sanitizedData['subject'] . "\n";
    $logData .= "Message: " . $sanitizedData['message'] . "\n";
    $logData .= "----------------------------------------\n";
    
    // Append to log file
    file_put_contents($logFile, $logData, FILE_APPEND);
    
    // Return success
    echo json_encode([
        'success' => true,
        'message' => 'Thank you for your message. We will get back to you shortly. (Note: This is a test version that logs submissions instead of sending emails.)'
    ]);
} else {
    // Not a POST request
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request method. This endpoint only accepts POST requests.'
    ]);
}
