<?php
/**
 * Gmail API Email Test Script
 * 
 * This script allows testing of the Gmail API email sender
 */

// Include the Gmail sender
require_once __DIR__ . '/gmail-sender.php';

// Output content type
header('Content-Type: text/html; charset=UTF-8');

// Handle form submission
$result = null;
$emailSent = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['send-test'])) {
    // Validate form
    $to = isset($_POST['to']) ? trim($_POST['to']) : '';
    $subject = isset($_POST['subject']) ? trim($_POST['subject']) : '';
    $message = isset($_POST['message']) ? trim($_POST['message']) : '';
    $fromName = isset($_POST['fromName']) ? trim($_POST['fromName']) : 'DK Dental Studio';
    
    // Simple validation
    $errors = [];
    if (empty($to)) {
        $errors[] = 'Recipient email is required';
    } elseif (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Invalid recipient email format';
    }
    
    if (empty($subject)) {
        $errors[] = 'Subject is required';
    }
    
    if (empty($message)) {
        $errors[] = 'Message is required';
    }
    
    if (empty($errors)) {
        // Send the test email
        $result = sendGmailEmail($to, $subject, $message, $fromName);
        $emailSent = $result['success'];
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gmail API Email Test</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <style>
        body {
            padding: 20px;
            font-family: Arial, sans-serif;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            max-width: 800px;
            margin: 30px auto;
        }
        h1 {
            color: #0576ee;
            margin-bottom: 20px;
        }
        .form-group label {
            font-weight: bold;
        }
        .alert {
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Gmail API Email Test</h1>
        
        <?php if (isset($errors) && !empty($errors)): ?>
            <div class="alert alert-danger">
                <h4>Error</h4>
                <ul>
                    <?php foreach ($errors as $error): ?>
                        <li><?php echo htmlspecialchars($error); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>
        
        <?php if ($result !== null): ?>
            <div class="alert alert-<?php echo $emailSent ? 'success' : 'danger'; ?>">
                <h4><?php echo $emailSent ? 'Success' : 'Error'; ?></h4>
                <p><?php echo htmlspecialchars($result['message']); ?></p>
                <?php if ($emailSent && isset($result['id'])): ?>
                    <p>Message ID: <?php echo htmlspecialchars($result['id']); ?></p>
                <?php endif; ?>
            </div>
        <?php endif; ?>
        
        <form method="post">
            <div class="form-group">
                <label for="to">To:</label>
                <input type="email" class="form-control" id="to" name="to" 
                    value="<?php echo isset($_POST['to']) ? htmlspecialchars($_POST['to']) : ''; ?>" 
                    placeholder="recipient@example.com" required>
            </div>
            
            <div class="form-group">
                <label for="subject">Subject:</label>
                <input type="text" class="form-control" id="subject" name="subject" 
                    value="<?php echo isset($_POST['subject']) ? htmlspecialchars($_POST['subject']) : 'Test Email from DK Dental Studio'; ?>" 
                    placeholder="Email Subject" required>
            </div>
            
            <div class="form-group">
                <label for="fromName">From Name:</label>
                <input type="text" class="form-control" id="fromName" name="fromName" 
                    value="<?php echo isset($_POST['fromName']) ? htmlspecialchars($_POST['fromName']) : 'DK Dental Studio'; ?>" 
                    placeholder="Sender Name">
            </div>
            
            <div class="form-group">
                <label for="message">Message:</label>
                <textarea class="form-control" id="message" name="message" rows="6" required
                    placeholder="Enter your message here..."><?php echo isset($_POST['message']) ? htmlspecialchars($_POST['message']) : ''; ?></textarea>
            </div>
            
            <button type="submit" name="send-test" class="btn btn-primary">Send Test Email</button>
        </form>
        
        <div class="mt-4">
            <h4>Instructions:</h4>
            <ol>
                <li>Ensure Google OAuth authorization has been completed with Gmail scope.</li>
                <li>Fill out the form above to send a test email.</li>
                <li>Check your email inbox to verify receipt.</li>
            </ol>
        </div>
    </div>
</body>
</html> 