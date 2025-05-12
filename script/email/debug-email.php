<?php
/**
 * Debug Email Script for DK Dental Studio
 * 
 * This script helps diagnose issues with the email sending functionality.
 */

// Set error reporting to maximum
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Include the Gmail sender
require_once __DIR__ . '/gmail-sender.php';

// Output header
header('Content-Type: text/html');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Email Debug Tool</title>
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
    <h1>Email Debug Tool</h1>
    
    <div class="section">
        <h2>PHP Information</h2>
        <p>PHP Version: <?php echo phpversion(); ?></p>
        <p>Extensions Loaded:</p>
        <ul>
            <?php
            $requiredExtensions = ['json', 'openssl', 'curl', 'mbstring'];
            foreach ($requiredExtensions as $ext) {
                echo '<li>' . $ext . ': ' . (extension_loaded($ext) ? '<span class="success">Loaded</span>' : '<span class="error">Not Loaded</span>') . '</li>';
            }
            ?>
        </ul>
    </div>
    
    <div class="section">
        <h2>File System Check</h2>
        <?php
        $paths = [
            'Gmail Sender' => __DIR__ . '/gmail-sender.php',
            'Minimal Autoloader' => __DIR__ . '/minimal-autoloader.php',
            'Token File' => __DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json',
            'GoogleTokenManager' => __DIR__ . '/minimal-gmail-api/GoogleTokenManager.php',
            'Google Client' => __DIR__ . '/minimal-gmail-api/Google/Client.php'
        ];
        
        echo '<ul>';
        foreach ($paths as $name => $path) {
            $exists = file_exists($path);
            $readable = $exists && is_readable($path);
            echo '<li>' . $name . ' (' . $path . '): ' . 
                 ($exists ? '<span class="success">Exists</span>' : '<span class="error">Missing</span>') . 
                 ($readable ? ', <span class="success">Readable</span>' : ($exists ? ', <span class="error">Not Readable</span>' : '')) . 
                 '</li>';
        }
        echo '</ul>';
        ?>
    </div>
    
    <div class="section">
        <h2>Token Check</h2>
        <?php
        $tokenFile = __DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json';
        if (file_exists($tokenFile) && is_readable($tokenFile)) {
            $token = json_decode(file_get_contents($tokenFile), true);
            echo '<p>Token Structure:</p>';
            echo '<pre>' . json_encode($token, JSON_PRETTY_PRINT) . '</pre>';
            
            if (isset($token['refresh_token'])) {
                echo '<p class="success">Refresh token is present</p>';
            } else {
                echo '<p class="error">Refresh token is missing</p>';
            }
            
            if (isset($token['access_token'])) {
                echo '<p class="success">Access token is present</p>';
            } else {
                echo '<p class="error">Access token is missing</p>';
            }
        } else {
            echo '<p class="error">Cannot read token file</p>';
        }
        ?>
    </div>
    
    <div class="section">
        <h2>Test Email</h2>
        <form method="post">
            <p>
                <label for="to">To:</label><br>
                <input type="email" name="to" id="to" value="<?php echo isset($_POST['to']) ? htmlspecialchars($_POST['to']) : 'iggzmil@gmail.com'; ?>" style="width: 100%;">
            </p>
            <p>
                <label for="subject">Subject:</label><br>
                <input type="text" name="subject" id="subject" value="<?php echo isset($_POST['subject']) ? htmlspecialchars($_POST['subject']) : 'Test Email from Debug Tool'; ?>" style="width: 100%;">
            </p>
            <p>
                <label for="message">Message:</label><br>
                <textarea name="message" id="message" rows="5" style="width: 100%;"><?php echo isset($_POST['message']) ? htmlspecialchars($_POST['message']) : 'This is a test email from the debug tool.'; ?></textarea>
            </p>
            <p>
                <button type="submit" name="send" value="1">Send Test Email</button>
            </p>
        </form>
        
        <?php
        if (isset($_POST['send'])) {
            $to = isset($_POST['to']) ? trim($_POST['to']) : '';
            $subject = isset($_POST['subject']) ? trim($_POST['subject']) : '';
            $message = isset($_POST['message']) ? trim($_POST['message']) : '';
            
            if (empty($to) || empty($subject) || empty($message)) {
                echo '<p class="error">All fields are required</p>';
            } else {
                // Create HTML email
                $html = '<html><body><h1>' . htmlspecialchars($subject) . '</h1><p>' . nl2br(htmlspecialchars($message)) . '</p></body></html>';
                
                // Send the email
                try {
                    $result = sendGmailEmail($to, $subject, $html, 'DK Dental Studio Debug');
                    
                    echo '<h3>Result:</h3>';
                    echo '<pre>' . json_encode($result, JSON_PRETTY_PRINT) . '</pre>';
                    
                    if ($result['success']) {
                        echo '<p class="success">Email sent successfully!</p>';
                    } else {
                        echo '<p class="error">Failed to send email: ' . htmlspecialchars($result['message']) . '</p>';
                    }
                } catch (Exception $e) {
                    echo '<p class="error">Exception: ' . htmlspecialchars($e->getMessage()) . '</p>';
                }
            }
        }
        ?>
    </div>
</body>
</html>
