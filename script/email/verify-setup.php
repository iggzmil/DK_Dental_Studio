<?php
/**
 * Verification Script for Contact Form Email System
 * 
 * This script checks if all required components are available and properly configured.
 * It should be run on the live server to verify the setup.
 */

// Set content type
header('Content-Type: text/html; charset=UTF-8');

// Start output buffering
ob_start();

// Function to check if a file exists and is readable
function checkFile($path, $description) {
    echo "<tr>";
    echo "<td>{$description}</td>";
    
    if (file_exists($path) && is_readable($path)) {
        echo "<td class='text-success'>Available</td>";
        return true;
    } else {
        echo "<td class='text-danger'>Not found or not readable</td>";
        return false;
    }
    
    echo "</tr>";
}

// Function to check if a directory exists and is writable
function checkDirectory($path, $description) {
    echo "<tr>";
    echo "<td>{$description}</td>";
    
    if (is_dir($path)) {
        if (is_writable($path)) {
            echo "<td class='text-success'>Available and writable</td>";
            return true;
        } else {
            echo "<td class='text-warning'>Available but not writable</td>";
            return false;
        }
    } else {
        echo "<td class='text-danger'>Not found</td>";
        return false;
    }
    
    echo "</tr>";
}

// Function to check PHP extension
function checkExtension($extension, $description) {
    echo "<tr>";
    echo "<td>{$description}</td>";
    
    if (extension_loaded($extension)) {
        echo "<td class='text-success'>Enabled</td>";
        return true;
    } else {
        echo "<td class='text-danger'>Not enabled</td>";
        return false;
    }
    
    echo "</tr>";
}

// Function to check token file
function checkToken() {
    $tokenFile = __DIR__ . '/../../vendor/google/oauth/secure/google_refresh_token.json';
    
    echo "<tr>";
    echo "<td>OAuth Token</td>";
    
    if (file_exists($tokenFile) && is_readable($tokenFile)) {
        $token = json_decode(file_get_contents($tokenFile), true);
        
        if (is_array($token) && isset($token['refresh_token'])) {
            echo "<td class='text-success'>Valid token found</td>";
            return true;
        } else {
            echo "<td class='text-warning'>Token file exists but may be invalid</td>";
            return false;
        }
    } else {
        echo "<td class='text-danger'>Token file not found or not readable</td>";
        return false;
    }
    
    echo "</tr>";
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Form Email System Verification</title>
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
        .table th {
            background-color: #f1f1f1;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Contact Form Email System Verification</h1>
        
        <div class="card mb-4">
            <div class="card-header">
                <h4>System Requirements</h4>
            </div>
            <div class="card-body">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Component</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        // Check PHP version
                        echo "<tr>";
                        echo "<td>PHP Version</td>";
                        if (version_compare(PHP_VERSION, '7.4.0') >= 0) {
                            echo "<td class='text-success'>" . PHP_VERSION . " (OK)</td>";
                        } else {
                            echo "<td class='text-danger'>" . PHP_VERSION . " (Minimum 7.4.0 required)</td>";
                        }
                        echo "</tr>";
                        
                        // Check required extensions
                        checkExtension('curl', 'cURL Extension');
                        checkExtension('json', 'JSON Extension');
                        checkExtension('openssl', 'OpenSSL Extension');
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="card mb-4">
            <div class="card-header">
                <h4>File System</h4>
            </div>
            <div class="card-body">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Component</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        // Check required files
                        checkFile(__DIR__ . '/gmail-sender.php', 'Gmail Sender Script');
                        checkFile(__DIR__ . '/contact-form-handler.php', 'Contact Form Handler');
                        checkFile(__DIR__ . '/session-handler.php', 'Session Handler');
                        checkFile(__DIR__ . '/contact-form.js', 'Contact Form JavaScript');
                        
                        // Check token manager
                        checkFile(__DIR__ . '/../../vendor/google/oauth/GoogleTokenManager.php', 'Google Token Manager');
                        
                        // Check token
                        checkToken();
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h4>Next Steps</h4>
            </div>
            <div class="card-body">
                <p>If all checks passed, the contact form email system should be working correctly. You can:</p>
                <ol>
                    <li>Test sending an email using the <a href="test-email.php">test script</a></li>
                    <li>Try submitting the contact form on the website</li>
                </ol>
                
                <p>If any checks failed, please address the issues before using the system.</p>
            </div>
        </div>
    </div>
</body>
</html>
<?php
// End output buffering and send output
ob_end_flush();
?>
