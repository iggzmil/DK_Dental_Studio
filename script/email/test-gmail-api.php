<?php
/**
 * Test Gmail API Script for DK Dental Studio
 * 
 * This script tests the Gmail API functionality
 */

// Set error reporting to maximum
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include the Gmail sender
require_once __DIR__ . '/gmail-sender.php';

// Set content type
header('Content-Type: text/html');

// Test email parameters
$to = 'iggzmil@gmail.com';
$subject = 'Test Email from Gmail API';
$message = '
<html>
<head>
    <title>Test Email</title>
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
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Test Email from Gmail API</h1>
        <p>This is a test email sent using the Gmail API.</p>
        <p>If you received this email, it means the Gmail API is working correctly.</p>
        <p>Time sent: ' . date('Y-m-d H:i:s') . '</p>
    </div>
</body>
</html>
';

// Try to send the email
$result = sendGmailEmail($to, $subject, $message, 'DK Dental Studio Test');

// Output the result
?>
<!DOCTYPE html>
<html>
<head>
    <title>Gmail API Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 20px;
            max-width: 800px;
        }
        h1 {
            color: #0576ee;
        }
        .section {
            margin-bottom: 20px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .success {
            color: green;
        }
        .error {
            color: red;
        }
        pre {
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <h1>Gmail API Test</h1>
    
    <div class="section">
        <h2>Test Result</h2>
        <?php if ($result['success']): ?>
            <p class="success">Email sent successfully! Check your inbox at <?php echo htmlspecialchars($to); ?></p>
            <p>Message ID: <?php echo htmlspecialchars($result['id'] ?? 'N/A'); ?></p>
        <?php else: ?>
            <p class="error">Failed to send email: <?php echo htmlspecialchars($result['message']); ?></p>
        <?php endif; ?>
    </div>
    
    <div class="section">
        <h2>Email Details</h2>
        <p><strong>To:</strong> <?php echo htmlspecialchars($to); ?></p>
        <p><strong>Subject:</strong> <?php echo htmlspecialchars($subject); ?></p>
        <p><strong>Result:</strong></p>
        <pre><?php echo htmlspecialchars(print_r($result, true)); ?></pre>
    </div>
    
    <div class="section">
        <h2>Debug Information</h2>
        <p><strong>PHP Version:</strong> <?php echo phpversion(); ?></p>
        <p><strong>Server:</strong> <?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'; ?></p>
        <p><strong>Token File Path:</strong> <?php echo htmlspecialchars(__DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json'); ?></p>
        <p><strong>Token File Exists:</strong> <?php echo file_exists(__DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json') ? 'Yes' : 'No'; ?></p>
        <?php if (file_exists(__DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json')): ?>
            <p><strong>Token File Content:</strong></p>
            <pre><?php echo htmlspecialchars(file_get_contents(__DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json')); ?></pre>
        <?php endif; ?>
    </div>
    
    <div class="section">
        <h2>Next Steps</h2>
        <p>If the email was sent successfully, check your inbox at <?php echo htmlspecialchars($to); ?> to confirm receipt.</p>
        <p>If the email failed to send, check the error message above for more information.</p>
        <p>You can also try using the contact form to see if it works with the Gmail API.</p>
    </div>
</body>
</html>
