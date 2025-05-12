<?php
/**
 * Simple mail test script
 * 
 * This script tests if the PHP mail() function works on the server
 */

// Set error reporting to maximum
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set content type
header('Content-Type: text/html');

// Test email parameters
$to = 'iggzmil@gmail.com';
$subject = 'Test Email from DK Dental Studio Server';
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
        <h1>Test Email</h1>
        <p>This is a test email from the DK Dental Studio server.</p>
        <p>If you received this email, it means the PHP mail() function is working correctly.</p>
        <p>Time sent: ' . date('Y-m-d H:i:s') . '</p>
    </div>
</body>
</html>
';

// Headers
$headers = "From: DK Dental Studio <noreply@dkdental.au>\r\n";
$headers .= "Reply-To: noreply@dkdental.au\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";

// Try to send the email
$result = mail($to, $subject, $message, $headers);

// Output the result
?>
<!DOCTYPE html>
<html>
<head>
    <title>Mail Test</title>
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
    <h1>PHP Mail Test</h1>
    
    <div class="section">
        <h2>Mail Function Test</h2>
        <?php if ($result): ?>
            <p class="success">Email sent successfully! Check your inbox at <?php echo htmlspecialchars($to); ?></p>
        <?php else: ?>
            <p class="error">Failed to send email. The mail() function returned false.</p>
        <?php endif; ?>
    </div>
    
    <div class="section">
        <h2>Email Details</h2>
        <p><strong>To:</strong> <?php echo htmlspecialchars($to); ?></p>
        <p><strong>Subject:</strong> <?php echo htmlspecialchars($subject); ?></p>
        <p><strong>Headers:</strong></p>
        <pre><?php echo htmlspecialchars($headers); ?></pre>
    </div>
    
    <div class="section">
        <h2>PHP Information</h2>
        <p>PHP Version: <?php echo phpversion(); ?></p>
        <p>Server: <?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'; ?></p>
        <p>Is mail() function available: <?php echo function_exists('mail') ? 'Yes' : 'No'; ?></p>
    </div>
    
    <div class="section">
        <h2>Next Steps</h2>
        <p>If the email was sent successfully, check your inbox at <?php echo htmlspecialchars($to); ?> to confirm receipt.</p>
        <p>If the email failed to send, check the server's mail logs for more information.</p>
        <p>You can also try using the fallback mode in the contact form by modifying the gmail-sender.php file.</p>
    </div>
</body>
</html>
